/**
 * Cubie-level bandaging for visual fusion of adjacent pieces.
 * Corner / edge order matches FaceletIO / diagnose tables.
 */

export type CubieId = string;

/** Directions of hidden seams between adjacent stickers on the same face. */
export type SeamDir = "n" | "e" | "s" | "w";

export interface SeamJoins {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
}

/** Undirected bandage edge as sorted "a|b" key. */
export type BandageEdgeKey = string;

export type BandageState = ReadonlySet<BandageEdgeKey>;

const U = 0;
const R = 9;
const F = 18;
const D = 27;
const L = 36;
const B = 45;

const CORNER_FACELETS: ReadonlyArray<readonly [number, number, number]> = [
  [U + 8, R + 0, F + 2], // URF
  [U + 6, F + 0, L + 2], // UFL
  [U + 0, L + 0, B + 2], // ULB
  [U + 2, B + 0, R + 2], // UBR
  [D + 2, F + 8, R + 6], // DFR
  [D + 0, L + 8, F + 6], // DLF
  [D + 6, B + 8, L + 6], // DBL
  [D + 8, R + 8, B + 6], // DRB
];

const EDGE_FACELETS: ReadonlyArray<readonly [number, number]> = [
  [U + 5, R + 1], // UR
  [U + 7, F + 1], // UF
  [U + 3, L + 1], // UL
  [U + 1, B + 1], // UB
  [D + 5, R + 7], // DR
  [D + 1, F + 7], // DF
  [D + 3, L + 7], // DL
  [D + 7, B + 7], // DB
  [F + 5, R + 3], // FR
  [F + 3, L + 5], // FL
  [B + 5, L + 3], // BL
  [B + 3, R + 5], // BR
];

const CENTER_FACELETS = [U + 4, R + 4, F + 4, D + 4, L + 4, B + 4] as const;

const CORNER_IDS = [
  "C0",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
] as const;
const EDGE_IDS = [
  "E0",
  "E1",
  "E2",
  "E3",
  "E4",
  "E5",
  "E6",
  "E7",
  "E8",
  "E9",
  "E10",
  "E11",
] as const;
const CENTER_IDS = ["U", "R", "F", "D", "L", "B"] as const;

/** xyz in {-1,0,1}^3 excluding origin — used for adjacency. */
const CUBIE_POS: Record<CubieId, readonly [number, number, number]> = {
  C0: [1, 1, 1], // URF
  C1: [-1, 1, 1], // UFL
  C2: [-1, 1, -1], // ULB
  C3: [1, 1, -1], // UBR
  C4: [1, -1, 1], // DFR
  C5: [-1, -1, 1], // DLF
  C6: [-1, -1, -1], // DBL
  C7: [1, -1, -1], // DRB
  E0: [1, 1, 0], // UR
  E1: [0, 1, 1], // UF
  E2: [-1, 1, 0], // UL
  E3: [0, 1, -1], // UB
  E4: [1, -1, 0], // DR
  E5: [0, -1, 1], // DF
  E6: [-1, -1, 0], // DL
  E7: [0, -1, -1], // DB
  E8: [1, 0, 1], // FR
  E9: [-1, 0, 1], // FL
  E10: [-1, 0, -1], // BL
  E11: [1, 0, -1], // BR
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

const STICKER_TO_CUBIE: CubieId[] = (() => {
  const map: CubieId[] = Array.from({ length: 54 }, () => "");
  for (let i = 0; i < 8; i++) {
    const id = CORNER_IDS[i]!;
    for (const s of CORNER_FACELETS[i]!) map[s] = id;
  }
  for (let i = 0; i < 12; i++) {
    const id = EDGE_IDS[i]!;
    for (const s of EDGE_FACELETS[i]!) map[s] = id;
  }
  for (let i = 0; i < 6; i++) {
    map[CENTER_FACELETS[i]!] = CENTER_IDS[i]!;
  }
  return map;
})();

export function stickerToCubie(sticker: number): CubieId {
  if (sticker < 0 || sticker >= 54) {
    throw new RangeError(`Invalid sticker index: ${sticker}`);
  }
  return STICKER_TO_CUBIE[sticker]!;
}

export function areCubiesAdjacent(a: CubieId, b: CubieId): boolean {
  if (a === b) return false;
  const pa = CUBIE_POS[a];
  const pb = CUBIE_POS[b];
  if (!pa || !pb) return false;
  const dx = Math.abs(pa[0] - pb[0]);
  const dy = Math.abs(pa[1] - pb[1]);
  const dz = Math.abs(pa[2] - pb[2]);
  return dx + dy + dz === 1;
}

export function bandageKey(a: CubieId, b: CubieId): BandageEdgeKey {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function parseBandageKey(key: BandageEdgeKey): [CubieId, CubieId] {
  const [a, b] = key.split("|") as [CubieId, CubieId];
  return [a, b];
}

export function emptyBandageState(): BandageState {
  return new Set();
}

export function hasBandage(
  state: BandageState,
  a: CubieId,
  b: CubieId,
): boolean {
  return state.has(bandageKey(a, b));
}

/** Toggle bandage between two adjacent cubies. Returns null if not adjacent. */
export function toggleBandage(
  state: BandageState,
  a: CubieId,
  b: CubieId,
): BandageState | null {
  if (!areCubiesAdjacent(a, b)) return null;
  const key = bandageKey(a, b);
  const next = new Set(state);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Union-Find root for cubie within bandage graph. */
export function findBandageRoot(
  state: BandageState,
  cubie: CubieId,
): CubieId {
  const parent = new Map<CubieId, CubieId>();
  for (const key of state) {
    const [a, b] = parseBandageKey(key);
    if (!parent.has(a)) parent.set(a, a);
    if (!parent.has(b)) parent.set(b, b);
  }
  if (!parent.has(cubie)) return cubie;

  function find(x: CubieId): CubieId {
    let p = parent.get(x) ?? x;
    while (p !== (parent.get(p) ?? p)) {
      parent.set(p, parent.get(parent.get(p)!) ?? p);
      p = parent.get(p)!;
    }
    parent.set(x, p);
    return p;
  }

  for (const key of state) {
    const [a, b] = parseBandageKey(key);
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  return find(cubie);
}

export function sameBandageComponent(
  state: BandageState,
  a: CubieId,
  b: CubieId,
): boolean {
  if (a === b) return true;
  if (state.size === 0) return false;
  return findBandageRoot(state, a) === findBandageRoot(state, b);
}

export function faceNeighbors(
  sticker: number,
): Partial<Record<SeamDir, number>> {
  const face = Math.floor(sticker / 9);
  const local = sticker % 9;
  const row = Math.floor(local / 3);
  const col = local % 3;
  const base = face * 9;
  const out: Partial<Record<SeamDir, number>> = {};
  if (row > 0) out.n = base + (row - 1) * 3 + col;
  if (row < 2) out.s = base + (row + 1) * 3 + col;
  if (col > 0) out.w = base + row * 3 + (col - 1);
  if (col < 2) out.e = base + row * 3 + (col + 1);
  return out;
}

/** Seams to hide for a sticker given bandage connections. */
export function stickerJoins(
  sticker: number,
  state: BandageState,
): SeamJoins {
  const cubie = stickerToCubie(sticker);
  const neighbors = faceNeighbors(sticker);
  const joins: SeamJoins = { n: false, e: false, s: false, w: false };
  for (const dir of ["n", "e", "s", "w"] as const) {
    const other = neighbors[dir];
    if (other === undefined) continue;
    joins[dir] = sameBandageComponent(state, cubie, stickerToCubie(other));
  }
  return joins;
}

/**
 * Joins in visual grid space (local 0–8 row-major).
 * Use when facelets are remapped (e.g. rot180 on D in 3D).
 */
export function visualGridJoins(
  local: number,
  resolveFacelet: (local: number) => number,
  state: BandageState,
): SeamJoins {
  const facelet = resolveFacelet(local);
  const cubie = stickerToCubie(facelet);
  const row = Math.floor(local / 3);
  const col = local % 3;
  const neighbors: Partial<Record<SeamDir, number>> = {};
  if (row > 0) neighbors.n = (row - 1) * 3 + col;
  if (row < 2) neighbors.s = (row + 1) * 3 + col;
  if (col > 0) neighbors.w = row * 3 + (col - 1);
  if (col < 2) neighbors.e = row * 3 + (col + 1);

  const joins: SeamJoins = { n: false, e: false, s: false, w: false };
  for (const dir of ["n", "e", "s", "w"] as const) {
    const otherLocal = neighbors[dir];
    if (otherLocal === undefined) continue;
    joins[dir] = sameBandageComponent(
      state,
      cubie,
      stickerToCubie(resolveFacelet(otherLocal)),
    );
  }
  return joins;
}

export function joinClassNames(
  joins: SeamJoins,
  prefix: string,
): string {
  return (["n", "e", "s", "w"] as const)
    .filter((d) => joins[d])
    .map((d) => `${prefix}--join-${d}`)
    .join(" ");
}

/**
 * Stickers on the same face that form one continuous bandaged block
 * with `sticker` (face BFS through same bandage component).
 */
export function faceBlockStickers(
  sticker: number,
  state: BandageState,
): number[] {
  const face = Math.floor(sticker / 9);
  const startCubie = stickerToCubie(sticker);
  const out: number[] = [];
  const visited = new Set<number>();
  const queue = [sticker];
  visited.add(sticker);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    out.push(cur);
    const neighbors = faceNeighbors(cur);
    for (const dir of ["n", "e", "s", "w"] as const) {
      const other = neighbors[dir];
      if (other === undefined || visited.has(other)) continue;
      if (Math.floor(other / 9) !== face) continue;
      if (!sameBandageComponent(state, startCubie, stickerToCubie(other))) {
        continue;
      }
      visited.add(other);
      queue.push(other);
    }
  }
  return out;
}

/** All stickers belonging to cubies in the same bandage component. */
export function componentStickers(
  cubie: CubieId,
  state: BandageState,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < 54; i++) {
    if (sameBandageComponent(state, cubie, stickerToCubie(i))) out.push(i);
  }
  return out;
}

/**
 * Every 2×2 on a face (local indices). An L is any 3 cells of one of these.
 */
const FACE_2X2_BLOCKS: ReadonlyArray<readonly [number, number, number, number]> =
  [
    [0, 1, 3, 4], // top-left
    [1, 2, 4, 5], // top-right
    [3, 4, 6, 7], // bottom-left
    [4, 5, 7, 8], // bottom-right
  ];

/**
 * Fill any L-tromino on a face into a 2×2 by bandaging the missing cubie
 * to its face-adjacent cubies already in the L. No L shapes remain.
 */
export function autoFillFaceLs(state: BandageState): BandageState {
  let current: Set<BandageEdgeKey> = new Set(state);
  let changed = true;

  while (changed) {
    changed = false;
    for (let face = 0; face < 6; face++) {
      const base = face * 9;
      for (const block of FACE_2X2_BLOCKS) {
        const stickers = block.map((local) => base + local);
        for (let missing = 0; missing < 4; missing++) {
          const present = stickers.filter((_, i) => i !== missing);
          const absent = stickers[missing]!;
          const firstCubie = stickerToCubie(present[0]!);
          if (
            !sameBandageComponent(
              current,
              firstCubie,
              stickerToCubie(present[1]!),
            ) ||
            !sameBandageComponent(
              current,
              firstCubie,
              stickerToCubie(present[2]!),
            )
          ) {
            continue;
          }
          const absentCubie = stickerToCubie(absent);
          if (sameBandageComponent(current, firstCubie, absentCubie)) {
            continue;
          }

          for (const neighbor of present) {
            const nCubie = stickerToCubie(neighbor);
            if (!areCubiesAdjacent(absentCubie, nCubie)) continue;
            // Must also be orthogonal neighbors on this face
            const dirs = faceNeighbors(absent);
            const isFaceNeighbor = (["n", "e", "s", "w"] as const).some(
              (d) => dirs[d] === neighbor,
            );
            if (!isFaceNeighbor) continue;
            const key = bandageKey(absentCubie, nCubie);
            if (!current.has(key)) {
              current.add(key);
              changed = true;
            }
          }
        }
      }
    }
  }

  return current;
}

/** @deprecated Use autoFillFaceLs — centers and any other L are covered. */
export function autoJoinCentersForFaceLs(state: BandageState): BandageState {
  return autoFillFaceLs(state);
}

/**
 * True when this sticker's face-block includes the face center
 * (locked paint — colors follow the center until split).
 */
export function isFaceBlockLockedToCenter(
  sticker: number,
  state: BandageState,
): boolean {
  const center = Math.floor(sticker / 9) * 9 + 4;
  const block = faceBlockStickers(sticker, state);
  return block.length > 1 && block.includes(center);
}

/**
 * Paint every face-block that includes that face's center with the center color.
 */
export function applyCenterColorsToLockedBlocks<T extends string>(
  facelets: readonly T[],
  state: BandageState,
): T[] {
  const next = [...facelets];
  for (let face = 0; face < 6; face++) {
    const center = face * 9 + 4;
    const block = faceBlockStickers(center, state);
    if (block.length <= 1) continue;
    const color = next[center]!;
    for (const i of block) next[i] = color;
  }
  return next;
}

/**
 * After a join: each face-block of the component is painted with the
 * first cubie's sticker color *on that same face*. Blocks that include a
 * face center use the center color instead. Other faces are never filled
 * with a color taken from a different face.
 */
export function applyJoinPaintColors<T extends string>(
  facelets: readonly T[],
  state: BandageState,
  componentCubie: CubieId,
  firstCubie: CubieId,
): T[] {
  const next = [...facelets];
  const firstColorByFace = new Map<number, T>();
  for (let i = 0; i < 54; i++) {
    if (stickerToCubie(i) === firstCubie) {
      firstColorByFace.set(Math.floor(i / 9), facelets[i]!);
    }
  }

  const seenBlocks = new Set<string>();
  for (const sticker of componentStickers(componentCubie, state)) {
    const block = faceBlockStickers(sticker, state);
    if (block.length <= 1) continue;
    const key = [...block].sort((a, b) => a - b).join(",");
    if (seenBlocks.has(key)) continue;
    seenBlocks.add(key);

    const face = Math.floor(sticker / 9);
    const center = face * 9 + 4;
    if (block.includes(center)) continue;

    const paintColor = firstColorByFace.get(face);
    if (paintColor === undefined) continue;
    for (const i of block) next[i] = paintColor;
  }

  return applyCenterColorsToLockedBlocks(next, state);
}

const KNOWN_CUBIE_IDS = new Set<string>([
  ...CORNER_IDS,
  ...EDGE_IDS,
  ...CENTER_IDS,
]);

/**
 * Split optional trailing BANDAGE section from a cube TXT.
 * Files without BANDAGE still parse as colors-only.
 */
export function splitCubeFile(text: string): {
  colorText: string;
  bandage: BandageState;
} {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  const idx = lines.findIndex((line) => line.trim().toUpperCase() === "BANDAGE");
  if (idx < 0) {
    return { colorText: text, bandage: emptyBandageState() };
  }
  return {
    colorText: lines.slice(0, idx).join("\n"),
    bandage: parseBandageLines(lines.slice(idx + 1)),
  };
}

function parseBandageLines(lines: readonly string[]): BandageState {
  const state = new Set<BandageEdgeKey>();
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    for (const token of trimmed.split(/[\s,;]+/)) {
      if (!token) continue;
      const key = normalizeBandageToken(token);
      if (!key) {
        throw new Error(`Par bandage inválido: "${token}"`);
      }
      const [a, b] = parseBandageKey(key);
      if (!KNOWN_CUBIE_IDS.has(a) || !KNOWN_CUBIE_IDS.has(b)) {
        throw new Error(`Cubie desconocido en bandage: "${token}"`);
      }
      if (!areCubiesAdjacent(a, b)) {
        throw new Error(`Cubies no adyacentes en bandage: "${token}"`);
      }
      state.add(key);
    }
  }
  return state;
}

function normalizeBandageToken(token: string): BandageEdgeKey | null {
  const m = token.trim().match(/^([A-Za-z0-9]+)\s*[|\-–—]\s*([A-Za-z0-9]+)$/);
  if (!m) return null;
  return bandageKey(m[1]!.toUpperCase(), m[2]!.toUpperCase());
}

/** Append BANDAGE pairs after the color net (omitted when empty). */
export function formatBandageSection(state: BandageState): string {
  if (state.size === 0) return "";
  return `BANDAGE\n${[...state].sort().join("\n")}\n`;
}

export function formatCubeFileWithBandage(
  colorNet: string,
  state: BandageState,
): string {
  const section = formatBandageSection(state);
  if (!section) return colorNet.endsWith("\n") ? colorNet : `${colorNet}\n`;
  const base = colorNet.endsWith("\n") ? colorNet : `${colorNet}\n`;
  return `${base}\n${section}`;
}

/**
 * Shell cubies that turn with each face (matches CubeState FACE_TURNS).
 * Centers stay in their layer.
 */
const FACE_LAYER: Record<string, ReadonlySet<CubieId>> = {
  U: new Set(["C0", "C1", "C2", "C3", "E0", "E1", "E2", "E3", "U"]),
  D: new Set(["C4", "C5", "C6", "C7", "E4", "E5", "E6", "E7", "D"]),
  R: new Set(["C0", "C3", "C4", "C7", "E0", "E4", "E8", "E11", "R"]),
  L: new Set(["C1", "C2", "C5", "C6", "E2", "E6", "E9", "E10", "L"]),
  F: new Set(["C0", "C1", "C4", "C5", "E1", "E5", "E8", "E9", "F"]),
  B: new Set(["C2", "C3", "C6", "C7", "E3", "E7", "E10", "E11", "B"]),
};

/** Clockwise quarter-turn of shell slots (a→b→c→d→a), matching CubeState. */
const FACE_SLOT_CYCLES: Record<
  string,
  {
    corners: readonly [number, number, number, number];
    edges: readonly [number, number, number, number];
  }
> = {
  U: { corners: [0, 1, 2, 3], edges: [0, 1, 2, 3] },
  D: { corners: [4, 7, 6, 5], edges: [4, 7, 6, 5] },
  R: { corners: [0, 3, 7, 4], edges: [0, 11, 4, 8] },
  L: { corners: [1, 5, 6, 2], edges: [2, 9, 6, 10] },
  F: { corners: [0, 4, 5, 1], edges: [1, 8, 5, 9] },
  B: { corners: [3, 2, 6, 7], edges: [3, 10, 7, 11] },
};

/**
 * A move is legal iff every bandage edge has both ends in the turning
 * layer or both outside it (no fused pair is split by the turn).
 */
export function canMove(state: BandageState, move: string): boolean {
  if (state.size === 0) return true;
  const face = move[0]!;
  const layer = FACE_LAYER[face];
  if (!layer) return true;
  for (const key of state) {
    const [a, b] = parseBandageKey(key);
    if (layer.has(a) !== layer.has(b)) return false;
  }
  return true;
}

function mapSlotQuarter(face: string, cubie: CubieId): CubieId {
  if (
    cubie === "U" ||
    cubie === "R" ||
    cubie === "F" ||
    cubie === "D" ||
    cubie === "L" ||
    cubie === "B"
  ) {
    return cubie;
  }
  const cycles = FACE_SLOT_CYCLES[face];
  if (!cycles) return cubie;

  if (cubie.startsWith("C")) {
    const i = Number(cubie.slice(1));
    const [a, b, c, d] = cycles.corners;
    if (i === a) return `C${b}`;
    if (i === b) return `C${c}`;
    if (i === c) return `C${d}`;
    if (i === d) return `C${a}`;
    return cubie;
  }
  if (cubie.startsWith("E")) {
    const i = Number(cubie.slice(1));
    const [a, b, c, d] = cycles.edges;
    if (i === a) return `E${b}`;
    if (i === b) return `E${c}`;
    if (i === c) return `E${d}`;
    if (i === d) return `E${a}`;
    return cubie;
  }
  return cubie;
}

function mapSlotByPower(face: string, cubie: CubieId, power: number): CubieId {
  let id = cubie;
  for (let i = 0; i < power; i++) id = mapSlotQuarter(face, id);
  return id;
}

/** Permute bandage edges with the face turn (fusions move with the shell). */
export function applyBandageMove(
  state: BandageState,
  move: string,
): BandageState {
  if (state.size === 0) return state;
  const face = move[0]!;
  const power: 1 | 2 | 3 = move.endsWith("2")
    ? 2
    : move.endsWith("'")
      ? 3
      : 1;
  const next = new Set<BandageEdgeKey>();
  for (const key of state) {
    const [a, b] = parseBandageKey(key);
    next.add(
      bandageKey(
        mapSlotByPower(face, a, power),
        mapSlotByPower(face, b, power),
      ),
    );
  }
  return next;
}
