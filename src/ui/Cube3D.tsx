import { useMemo } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import type { BandageState } from "../core/cube/Bandage";
import { stickerJoins } from "../core/cube/Bandage";
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
const CUBIE_SIZE = 0.94;
/** Sticker tile size relative to a face (before bandage-join growth). */
const STICKER_SIZE = 0.82;
/** How far a sticker sits above the cubie surface. */
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.006;

const ERROR_COLOR = "#e5484d";

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
        camera={{ position: [4.6, 4.0, 5.6], fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
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
                radius={0.09}
                smoothness={4}
              >
                <meshStandardMaterial
                  color="#0d0b10"
                  roughness={0.5}
                  metalness={0.08}
                />
              </RoundedBox>

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
          maxDistance={12}
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
