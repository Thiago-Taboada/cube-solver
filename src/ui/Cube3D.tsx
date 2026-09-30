import { useEffect, useMemo } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import type { BandageState } from "../core/cube/Bandage";
import {
  cubieIdAtCell,
  sameBandageComponent,
  stickerJoins,
} from "../core/cube/Bandage";
import type { Color } from "../core/cube/FaceletIO";
import { useT } from "../i18n";
import { CENTER_INDICES, hexFor } from "./colors";
import { cubieGroups, type FaceletPlacement } from "./cube3dGeometry";

interface Cube3DViewsProps {
  facelets: readonly Color[];
  selectedSticker: number | null;
  highlightedStickers?: ReadonlySet<number>;
  selectedBlockStickers?: ReadonlySet<number> | null;
  pickStickers?: ReadonlySet<number> | null;
  bandageState: BandageState;
  allowCenterClick?: boolean;
  onStickerClick: (index: number) => void;
}

/** World-space size of one cubie cell. */
const CELL = 1;
/** Gap between cubie bodies (the black frame shows through here). */
const CUBIE_SIZE = 1;
/** Sticker tile size relative to a face (before bandage-join growth). */
const STICKER_SIZE = 0.82;
/** How far a sticker sits above the cubie surface. */
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.006;
/**
 * How far a bond filler (see below) extends past each cubie's flat face
 * into the neighboring cubie. Needs to be a bit more than the plastic
 * body's corner radius so it fully buries the rounded seam between two
 * bandaged cubies, not just close the gap between their boxes.
 */
const BOND_OVERLAP = 0.12;
/** Cross-section margin so the filler slightly overlaps the rounded edge
 * running along the seam (not just the flat face). */
const BOND_CROSS_MARGIN = 0.0025;
/** Corner radius of the cubie body's `RoundedBox`. Reused for the bond
 * filler so its own edges curve the same way instead of looking flat next
 * to the rounded cubie corners. */
const CUBIE_RADIUS = 0.09;
/** The three positive axis directions; checking only these once per cubie
 * covers every face-adjacent pair in the lattice exactly once. */
const POSITIVE_AXES: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const ERROR_COLOR = "#e5484d";

/** Default camera direction/distance, tuned for the desktop panel's wide
 * aspect ratio. Narrow viewports (mobile portrait) need the camera pulled
 * further back — see `ResponsiveCameraFit` below — or the cube overflows
 * the shorter horizontal frustum and reads as badly over-zoomed. */
const CAMERA_POSITION: readonly [number, number, number] = [4.6, 4.0, 5.6];
const CAMERA_DISTANCE = Math.hypot(...CAMERA_POSITION);
const CAMERA_DIRECTION = CAMERA_POSITION.map(
  (n) => n / CAMERA_DISTANCE,
) as [number, number, number];
/** Half-extent (world units) the view must fit so the cube isn't clipped:
 * the cube reaches ~1.5 from center to a corner; this adds a small margin.
 * Kept modest so the default framing stays roomy rather than zoomed in. */
const CUBE_FIT_RADIUS = 1.7;
/** Furthest the responsive fit will ever push the camera. Keeps it inside
 * `OrbitControls`' own `maxDistance`, and stops it from also honoring
 * extreme aspect ratios by zooming out forever. */
const CAMERA_MAX_DISTANCE = 20;
/** Global zoom-out multiplier applied to the *final* fitted distance. This
 * is the single knob for "less zoom everywhere": >1 pulls the camera back
 * (smaller cube) on every screen, <1 pushes it in. Unlike CUBE_FIT_RADIUS,
 * it also scales the tuned default distance, so it has an effect even when
 * the default is what's framing the cube (e.g. on desktop). */
const CAMERA_ZOOM_OUT = 1.5;

/**
 * Keeps the whole cube in frame regardless of the canvas's aspect ratio.
 * The tuned default camera assumes a wide panel; on a narrow (or tall)
 * frustum the cube would overflow, so we back the camera out along its
 * original viewing direction only as far as the more restrictive of the
 * two axes requires. The default distance is always the minimum, so this
 * never zooms *in* past the tuned framing — it only pulls back when needed.
 */
function ResponsiveCameraFit() {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useEffect(() => {
    if (!("fov" in camera)) return;
    const aspect = width / height;
    const verticalFov = (camera.fov * Math.PI) / 180;
    const halfVTan = Math.tan(verticalFov / 2);
    // Distance so CUBE_FIT_RADIUS fits vertically, and (accounting for the
    // aspect ratio) horizontally. Whichever is larger frames both axes.
    const distanceForHeight = CUBE_FIT_RADIUS / halfVTan;
    const distanceForWidth = CUBE_FIT_RADIUS / (halfVTan * aspect);
    const fitted =
      Math.max(CAMERA_DISTANCE, distanceForHeight, distanceForWidth) *
      CAMERA_ZOOM_OUT;
    // Never closer than the tuned default (no extra zoom-in on wide panels).
    const distance = Math.min(CAMERA_MAX_DISTANCE, fitted);

    // Preserve the current viewing direction so re-running this effect (e.g.
    // when the parent re-renders on a paint/bandage toggle) only adjusts the
    // distance and never snaps the user's orbit back to the default corner.
    // The cube is centered at the origin, so the direction is the normalized
    // current position; fall back to the tuned default if it's degenerate.
    const currentDistance = camera.position.length();
    const dir =
      currentDistance > 1e-6
        ? [
            camera.position.x / currentDistance,
            camera.position.y / currentDistance,
            camera.position.z / currentDistance,
          ]
        : CAMERA_DIRECTION;
    camera.position.set(
      dir[0] * distance,
      dir[1] * distance,
      dir[2] * distance,
    );
    camera.updateProjectionMatrix();
  }, [camera, width, height]);

  return null;
}

/**
 * Directions (of the 3 positive axes) along which this cubie's plastic body
 * should visually fuse with its neighbor, because the two cubies are in the
 * same bandage component. Checking only positive directions (instead of all
 * 6) avoids rendering the same seam filler twice from both sides.
 */
function bondDirections(
  cell: readonly [number, number, number],
  bandageState: BandageState,
): Array<readonly [number, number, number]> {
  const selfId = cubieIdAtCell(cell);
  if (!selfId) return [];
  const dirs: Array<readonly [number, number, number]> = [];
  for (const dir of POSITIVE_AXES) {
    const neighborCell: [number, number, number] = [
      cell[0] + dir[0],
      cell[1] + dir[1],
      cell[2] + dir[2],
    ];
    const neighborId = cubieIdAtCell(neighborCell);
    if (!neighborId) continue;
    if (sameBandageComponent(bandageState, selfId, neighborId)) {
      dirs.push(dir);
    }
  }
  return dirs;
}

/**
 * Single interactive 3D cube rendered with react-three-fiber. Replaces the
 * former two-corner CSS view. Cubies are grouped so future layer-turn
 * animations can rotate a whole layer's `<group>`.
 */
export function Cube3DViews({
  facelets,
  selectedSticker,
  highlightedStickers,
  selectedBlockStickers,
  pickStickers,
  bandageState,
  allowCenterClick = false,
  onStickerClick,
}: Cube3DViewsProps) {
  const t = useT();
  const groups = useMemo(() => cubieGroups(), []);

  return (
    <div className="cube3d-stage" aria-label={t("cube.3dTitle")}>
      <Canvas
        camera={{ position: CAMERA_POSITION, fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Pulls the camera back on narrow (mobile) aspect ratios so the
            cube isn't over-zoomed; no-op once the panel is wide enough. */}
        <ResponsiveCameraFit />

        {/* Lighting: soft ambient + key/fill/rim for plastic volume. */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 9, 7]} intensity={1.05} />
        <directionalLight position={[-7, 2, -4]} intensity={0.4} />
        <directionalLight position={[0, -6, 3]} intensity={0.2} />

        {/* The whole cube. Each cubie is its own <group> keyed by cell so a
            future layer turn can rotate exactly the groups in LAYER_SPECS. */}
        <group>
          {groups.map((group) => (
            <group key={group.key} position={cellCenter(group.cell)}>
              {/* Black plastic body */}
              <RoundedBox
                args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]}
                radius={CUBIE_RADIUS}
                smoothness={4}
              >
                <meshStandardMaterial
                  color="#0d0b10"
                  roughness={0.5}
                  metalness={0.08}
                />
              </RoundedBox>

              {/* Bandaged neighbors: fill the rounded seam between the two
                  cubie bodies with a small plain box straddling the shared
                  face, so the black frame reads as one continuous piece
                  instead of two rounded boxes pushed together. */}
              {bondDirections(group.cell, bandageState).map((dir) => (
                <BondFiller key={`bond-${dir[0]}-${dir[1]}-${dir[2]}`} dir={dir} />
              ))}

              {group.facelets.map((placement) => (
                <Sticker
                  key={placement.index}
                  placement={placement}
                  color={facelets[placement.index]!}
                  isCenter={CENTER_INDICES.has(placement.index)}
                  selected={
                    selectedSticker === placement.index &&
                    !(selectedBlockStickers?.has(placement.index) ?? false) &&
                    !(pickStickers?.has(placement.index) ?? false)
                  }
                  inBlock={selectedBlockStickers?.has(placement.index) ?? false}
                  inPick={pickStickers?.has(placement.index) ?? false}
                  highlighted={
                    highlightedStickers?.has(placement.index) ?? false
                  }
                  bandageState={bandageState}
                  allowCenterClick={allowCenterClick}
                  onStickerClick={onStickerClick}
                />
              ))}
            </group>
          ))}
        </group>

        {/* Soft contact shadow grounds the cube without any external HDRI. */}
        <ContactShadows
          position={[0, -2.15, 0]}
          scale={9}
          blur={2.6}
          opacity={0.42}
          far={4.5}
          resolution={512}
          color="#000000"
        />

        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enablePan={false}
          minDistance={5}
          maxDistance={CAMERA_MAX_DISTANCE}
          enableDamping
          dampingFactor={0.12}
          rotateSpeed={0.9}
          zoomSpeed={0.8}
        />
      </Canvas>
    </div>
  );
}

/** World-space center of a cubie cell. */
function cellCenter(cell: readonly [number, number, number]): [number, number, number] {
  return [cell[0] * CELL, cell[1] * CELL, cell[2] * CELL];
}

/**
 * A plain (non-rounded) box that bridges the gap + rounded corners between
 * this cubie and its bandaged neighbor along `dir`. Sized just wide enough
 * to bury both bodies' rounded edges along the seam, so the two plastic
 * shells read as one uninterrupted block.
 */
function BondFiller({ dir }: { dir: readonly [number, number, number] }) {
  // Spans the gap between the two cubies' flat faces, extended by
  // BOND_OVERLAP on each side to bury both bodies' rounded edges too.
  const length = CELL - CUBIE_SIZE + 2 * BOND_OVERLAP;
  const cross = CUBIE_SIZE - 2 * BOND_CROSS_MARGIN;
  const size: [number, number, number] =
    dir[0] !== 0
      ? [length, cross, cross]
      : dir[1] !== 0
        ? [cross, length, cross]
        : [cross, cross, length];
  // Centered on the midpoint between the two cubie centers.
  const offset = CELL / 2;
  const position: [number, number, number] = [
    dir[0] * offset,
    dir[1] * offset,
    dir[2] * offset,
  ];
  return (
    // RoundedBox (not a plain box) so the filler's own edges curve the same
    // way as the cubie bodies it bridges — otherwise the seam disappears
    // but a flat-edged sliver still reads as a visible straight line where
    // it meets each cubie's rounded corner.
    <RoundedBox
      args={size}
      radius={CUBIE_RADIUS}
      smoothness={4}
      position={position}
      raycast={() => null}
    >
      <meshStandardMaterial color="#0d0b10" roughness={0.5} metalness={0.08} />
    </RoundedBox>
  );
}

/** Build a quaternion that rotates +Z to the sticker's outward normal. */
function normalQuaternion(
  normal: readonly [number, number, number],
): THREE.Quaternion {
  const from = new THREE.Vector3(0, 0, 1);
  const to = new THREE.Vector3(normal[0], normal[1], normal[2]).normalize();
  return new THREE.Quaternion().setFromUnitVectors(from, to);
}

function Sticker({
  placement,
  color,
  isCenter,
  selected,
  inBlock,
  inPick,
  highlighted,
  bandageState,
  allowCenterClick,
  onStickerClick,
}: {
  placement: FaceletPlacement;
  color: Color;
  isCenter: boolean;
  selected: boolean;
  inBlock: boolean;
  inPick: boolean;
  highlighted: boolean;
  bandageState: BandageState;
  allowCenterClick: boolean;
  onStickerClick: (index: number) => void;
}) {
  const t = useT();
  const disabled = isCenter && !allowCenterClick;

  // Grow the tile toward fused neighbors so bandaged stickers read as one
  // continuous block (the 3D analogue of the flat view's --join-* classes).
  // stickerJoins works in facelet space: n=up row, s=down row, e=right col,
  // w=left col. On the tile, +local-x is `right`(e/w) and +local-y is `up`.
  const joins = useMemo(
    () => stickerJoins(placement.index, bandageState),
    [placement.index, bandageState],
  );
  const gap = (1 - STICKER_SIZE) / 2; // half-gap to the cell edge on each side
  const grow = gap + 0.03; // extend slightly past the seam to overlap
  const left = joins.w ? grow : 0;
  const right = joins.e ? grow : 0;
  const up = joins.n ? grow : 0;
  const down = joins.s ? grow : 0;
  const width = STICKER_SIZE + left + right;
  const height = STICKER_SIZE + up + down;
  // Shift the tile center by half the asymmetric growth.
  const shiftX = (right - left) / 2;
  const shiftY = (up - down) / 2;

  const quaternion = useMemo(
    () => normalQuaternion(placement.normal),
    [placement.normal],
  );
  const position = useMemo<[number, number, number]>(() => {
    const n = placement.normal;
    return [
      n[0] * STICKER_OFFSET,
      n[1] * STICKER_OFFSET,
      n[2] * STICKER_OFFSET,
    ];
  }, [placement.normal]);

  const baseColor = hexFor(color);
  const displayColor = highlighted ? ERROR_COLOR : baseColor;

  // Selection/emphasis is shown by lifting the outline ring and emissive glow.
  const ringColor = highlighted
    ? ERROR_COLOR
    : selected
      ? "#ffffff"
      : inBlock
        ? "#7c5cff"
        : inPick
          ? "#38bdf8"
          : null;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (disabled) return;
    onStickerClick(placement.index);
  };

  const name = t(`color.${color}`);
  const ariaLabel = `${name}${isCenter ? t("cube.centerFixed") : ""}${
    highlighted ? t("cube.errorAria") : ""
  }`;

  return (
    <group position={position} quaternion={quaternion}>
      {/* Sticker face */}
      <mesh
        position={[shiftX, shiftY, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          if (!disabled) {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color={displayColor}
          roughness={0.35}
          metalness={0.0}
          emissive={displayColor}
          emissiveIntensity={selected || inBlock || inPick ? 0.18 : 0.04}
          // Keep colors readable from both sides while orbiting.
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Selection / block / pick / error outline ring */}
      {ringColor && (
        <lineSegments position={[shiftX, shiftY, 0.004]} raycast={() => null}>
          <edgesGeometry
            args={[new THREE.PlaneGeometry(width * 1.01, height * 1.01)]}
          />
          <lineBasicMaterial color={ringColor} linewidth={2} />
        </lineSegments>
      )}

      {/* Center lock marker */}
      {isCenter && (
        <mesh position={[0, 0, 0.006]} raycast={() => null}>
          <ringGeometry args={[0.06, 0.12, 16]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Accessible label for the sticker (screen readers read the canvas
          aria-label; per-sticker names are attached via userData for tests). */}
      <group userData={{ ariaLabel }} />
    </group>
  );
}
