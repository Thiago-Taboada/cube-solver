/**
 * Facelet → 3D geometry mapping for the interactive Three.js cube.
 *
 * Facelets are stored URFDLB, 9 per face, row-major (local 0–8):
 *   U 0–8, R 9–17, F 18–26, D 27–35, L 36–44, B 45–53.
 *
 * The cube is centered at the origin. Each cubie occupies a unit cell in
 * {-1,0,1}^3 (the same lattice used by CUBIE_POS in Bandage.ts):
 *   U = +Y, D = -Y, R = +X, L = -X, F = +Z, B = -Z.
 *
 * Each facelet sits on the outer surface of its cubie, on the face whose
 * normal points outward. We compute, per facelet, the cubie cell (x,y,z) it
 * belongs to and the outward normal of the sticker. That is enough to place a
 * flat sticker tile and to group stickers by cubie for future layer-turn
 * animation.
 */

export type Axis = "x" | "y" | "z";

export interface FaceletPlacement {
  /** Facelet index 0–53. */
  index: number;
  /** Which face (URFDLB) this facelet belongs to. */
  face: "U" | "R" | "F" | "D" | "L" | "B";
  /** Local row-major index within the face, 0–8. */
  local: number;
  /** Integer cubie cell in {-1,0,1}^3. */
  cell: readonly [number, number, number];
  /** Outward unit normal of the sticker (which face of the cubie it is on). */
  normal: readonly [number, number, number];
  /** True for the 6 face centers (local === 4). */
  isCenter: boolean;
}

const FACE_STARTS = {
  U: 0,
  R: 9,
  F: 18,
  D: 27,
  L: 36,
  B: 45,
} as const;

/**
 * For each face we describe how the row-major grid (row 0 top, col 0 left, as
 * you read the face straight-on the way the flat net draws it) maps to the two
 * in-plane axes of the cube, plus the constant outward normal.
 *
 * The mapping must be consistent with:
 *   - CENTER colors (local 4) landing on the face center cell, and
 *   - the corner/edge facelet tables in FaceletIO.ts / Bandage.ts, which pin
 *     e.g. URF corner at U8 · R0 · F2.
 *
 * We express each face as: outward normal, plus `right` and `down` unit
 * vectors describing the direction of increasing column and increasing row
 * when looking straight at the face from outside.
 *
 * Deriving `right`/`down` from the corner table (looking at the face from
 * outside, +normal toward viewer):
 *   U (normal +Y): viewed from above with B at the top edge and F at the
 *     bottom edge, L on the left. local0=ULB corner (x=-1,z=-1),
 *     local2=UBR (x=+1,z=-1), local6=UFL (x=-1,z=+1), local8=URF (x=+1,z=+1).
 *     => right = +X, down = +Z.
 *   D (normal -Y): viewed from below. local0=DLF? Using table:
 *     DFR=D2, DLF=D0, DBL=D6, DRB=D8. local0=DLF (x=-1,z=+1),
 *     local2=DFR (x=+1,z=+1), local6=DBL (x=-1,z=-1), local8=DRB (x=+1,z=-1).
 *     => right = +X, down = -Z.
 *   F (normal +Z): local0=UFL (x=-1,y=+1), local2=URF (x=+1,y=+1),
 *     local6=DLF (x=-1,y=-1), local8=DFR (x=+1,y=-1).
 *     => right = +X, down = -Y.
 *   B (normal -Z): local0=UBR (x=+1,y=+1), local2=ULB (x=-1,y=+1),
 *     local6=DRB (x=+1,y=-1), local8=DBL (x=-1,y=-1).
 *     => right = -X, down = -Y.
 *   R (normal +X): local0=URF (y=+1,z=+1), local2=UBR (y=+1,z=-1),
 *     local6=DFR (y=-1,z=+1), local8=DRB (y=-1,z=-1).
 *     => right = -Z, down = -Y.
 *   L (normal -X): local0=ULB (y=+1,z=-1), local2=UFL (y=+1,z=+1),
 *     local6=DBL (y=-1,z=-1), local8=DLF (y=-1,z=+1).
 *     => right = +Z, down = -Y.
 */
interface FaceBasis {
  normal: readonly [number, number, number];
  right: readonly [number, number, number];
  down: readonly [number, number, number];
}

const FACE_BASIS: Record<FaceletPlacement["face"], FaceBasis> = {
  U: { normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  D: { normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
  F: { normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  B: { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
  R: { normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  L: { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
};

function addScaled(
  base: readonly [number, number, number],
  v: readonly [number, number, number],
  s: number,
): [number, number, number] {
  return [base[0] + v[0] * s, base[1] + v[1] * s, base[2] + v[2] * s];
}

/**
 * Build placements for all 54 facelets.
 *
 * For a face with outward `normal`, `right`, `down`:
 *   col ∈ {0,1,2} -> offset (col-1) along `right`
 *   row ∈ {0,1,2} -> offset (row-1) along `down`
 * The in-plane axis component is the normal itself (±1). Combining gives the
 * integer cubie cell in {-1,0,1}^3.
 */
function buildPlacements(): FaceletPlacement[] {
  const out: FaceletPlacement[] = [];
  for (const face of ["U", "R", "F", "D", "L", "B"] as const) {
    const start = FACE_STARTS[face];
    const basis = FACE_BASIS[face];
    for (let local = 0; local < 9; local++) {
      const row = Math.floor(local / 3);
      const col = local % 3;
      // Start at the face center cell (normal points out; other axes 0).
      let cell: [number, number, number] = [
        basis.normal[0],
        basis.normal[1],
        basis.normal[2],
      ];
      cell = addScaled(cell, basis.right, col - 1);
      cell = addScaled(cell, basis.down, row - 1);
      out.push({
        index: start + local,
        face,
        local,
        cell: [round(cell[0]), round(cell[1]), round(cell[2])],
        normal: basis.normal,
        isCenter: local === 4,
      });
    }
  }
  return out;
}

function round(n: number): number {
  return Math.round(n);
}

/** All 54 facelet placements, indexed by facelet index. */
export const FACELET_PLACEMENTS: readonly FaceletPlacement[] = (() => {
  const built = buildPlacements();
  const byIndex: FaceletPlacement[] = new Array(54);
  for (const p of built) byIndex[p.index] = p;
  return byIndex;
})();

/** Stable string key for a cubie cell, e.g. "1,1,1". */
export function cellKey(cell: readonly [number, number, number]): string {
  return `${cell[0]},${cell[1]},${cell[2]}`;
}

export interface CubieGroup {
  key: string;
  cell: readonly [number, number, number];
  facelets: FaceletPlacement[];
}

/**
 * Group facelets by cubie cell. Returns the 26 visible cubies (the hidden core
 * cell 0,0,0 never appears since every facelet has a nonzero normal component).
 * Grouping enables future layer-turn animation: rotate the group whose cell
 * lies on the turning layer.
 */
export function cubieGroups(): CubieGroup[] {
  const map = new Map<string, CubieGroup>();
  for (const p of FACELET_PLACEMENTS) {
    const key = cellKey(p.cell);
    let group = map.get(key);
    if (!group) {
      group = { key, cell: p.cell, facelets: [] };
      map.set(key, group);
    }
    group.facelets.push(p);
  }
  return [...map.values()];
}
