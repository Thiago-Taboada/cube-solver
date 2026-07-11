import { CubeState } from "./CubeState";

/** Face colors in the TXT format (centers: U=W, R=R, F=G, D=Y, L=O, B=B). */
export const COLORS = ["W", "R", "G", "Y", "O", "B"] as const;
export type Color = (typeof COLORS)[number];

export type Facelets = readonly Color[];

const COLOR_SET = new Set<string>(COLORS);

/** Facelet indices: U 0–8, R 9–17, F 18–26, D 27–35, L 36–44, B 45–53. */
const U = 0;
const R = 9;
const F = 18;
const D = 27;
const L = 36;
const B = 45;

/**
 * Corner facelets (URF … DRB). Index 0 of each triple is the U/D reference sticker.
 */
const CORNER_FACELETS: ReadonlyArray<readonly [number, number, number]> = [
  [U + 8, R + 0, F + 2], // URF
  [U + 6, F + 0, L + 2], // UFL
  [U + 0, L + 0, B + 2], // ULB
  [U + 2, B + 0, R + 2], // UBR (U → B → R, mismo sentido que el resto)
  [D + 2, F + 8, R + 6], // DFR
  [D + 0, L + 8, F + 6], // DLF
  [D + 6, B + 8, L + 6], // DBL
  [D + 8, R + 8, B + 6], // DRB
];

/**
 * Edge facelets (UR … BR). Index 0 is the U/D sticker when present, else F/B.
 */
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

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"] as const;

const SOLVED_FACELETS: Facelets = FACE_ORDER.flatMap((face) => {
  const color: Color =
    face === "U"
      ? "W"
      : face === "R"
        ? "R"
        : face === "F"
          ? "G"
          : face === "D"
            ? "Y"
            : face === "L"
              ? "O"
              : "B";
  return Array.from({ length: 9 }, () => color);
});

const CORNER_COLORS: Color[][] = CORNER_FACELETS.map(([a, b, c]) => [
  SOLVED_FACELETS[a]!,
  SOLVED_FACELETS[b]!,
  SOLVED_FACELETS[c]!,
]);

const EDGE_COLORS: Color[][] = EDGE_FACELETS.map(([a, b]) => [
  SOLVED_FACELETS[a]!,
  SOLVED_FACELETS[b]!,
]);

export class FaceletParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaceletParseError";
  }
}

/** Parse the net TXT into 54 facelet colors (U,R,F,D,L,B × 9). */
export function parseFaceletNet(text: string): Facelets {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length !== 9) {
    throw new FaceletParseError(
      `Se esperaban 9 líneas de caras (hay ${lines.length})`,
    );
  }

  const u = lines.slice(0, 3).map(parseTripletLine);
  const mid = lines.slice(3, 6).map(parseMiddleLine);
  const d = lines.slice(6, 9).map(parseTripletLine);

  const ordered: Color[] = [
    ...flattenFace(u),
    ...flattenFace(mid.map((row) => row.R)),
    ...flattenFace(mid.map((row) => row.F)),
    ...flattenFace(d),
    ...flattenFace(mid.map((row) => row.L)),
    ...flattenFace(mid.map((row) => row.B)),
  ];

  validateColorCounts(ordered);
  validateCenters(ordered);
  return ordered;
}

/** Serialize 54 facelets back to the net TXT format. */
export function formatFaceletNet(facelets: Facelets): string {
  if (facelets.length !== 54) {
    throw new FaceletParseError("Se necesitan exactamente 54 facelets");
  }

  const face = (start: number): Color[][] => [
    [facelets[start]!, facelets[start + 1]!, facelets[start + 2]!],
    [facelets[start + 3]!, facelets[start + 4]!, facelets[start + 5]!],
    [facelets[start + 6]!, facelets[start + 7]!, facelets[start + 8]!],
  ];

  const u = face(U);
  const r = face(R);
  const f = face(F);
  const d = face(D);
  const l = face(L);
  const b = face(B);

  // 4 spaces: U/D align under F (GGG), not R
  const indent = "    ";
  const lines: string[] = [];

  for (const row of u) {
    lines.push(indent + row.join(""));
  }
  lines.push("");
  for (let i = 0; i < 3; i++) {
    lines.push(
      `${l[i]!.join("")} ${f[i]!.join("")} ${r[i]!.join("")} ${b[i]!.join("")}`,
    );
  }
  lines.push("");
  for (const row of d) {
    lines.push(indent + row.join(""));
  }
  lines.push("");

  return lines.join("\n");
}

export function cubeToFacelets(cube: CubeState): Facelets {
  const facelets: Color[] = Array.from({ length: 54 }, () => "W");

  // Centers
  for (let i = 0; i < 6; i++) {
    facelets[i * 9 + 4] = SOLVED_FACELETS[i * 9 + 4]!;
  }

  for (let pos = 0; pos < 8; pos++) {
    const cubie = cube.cp[pos]!;
    const ori = cube.co[pos]!;
    for (let k = 0; k < 3; k++) {
      const faceletIndex = CORNER_FACELETS[pos]![(k + ori) % 3]!;
      facelets[faceletIndex] = CORNER_COLORS[cubie]![k]!;
    }
  }

  for (let pos = 0; pos < 12; pos++) {
    const cubie = cube.ep[pos]!;
    const ori = cube.eo[pos]!;
    for (let k = 0; k < 2; k++) {
      const faceletIndex = EDGE_FACELETS[pos]![(k + ori) % 2]!;
      facelets[faceletIndex] = EDGE_COLORS[cubie]![k]!;
    }
  }

  return facelets;
}

export function faceletsToCube(facelets: Facelets): CubeState {
  if (facelets.length !== 54) {
    throw new FaceletParseError("Se necesitan exactamente 54 facelets");
  }
  validateColorCounts(facelets);
  validateCenters(facelets);

  const cp = Array.from({ length: 8 }, () => -1);
  const co = Array.from({ length: 8 }, () => 0);
  const ep = Array.from({ length: 12 }, () => -1);
  const eo = Array.from({ length: 12 }, () => 0);

  for (let pos = 0; pos < 8; pos++) {
    const slots = CORNER_FACELETS[pos]!;
    const colors = slots.map((i) => facelets[i]!);

    let ori = -1;
    for (let k = 0; k < 3; k++) {
      if (colors[k] === "W" || colors[k] === "Y") {
        ori = k;
        break;
      }
    }
    if (ori < 0) {
      throw new FaceletParseError(
        `Esquina en posición ${pos} sin color U/D (W/Y)`,
      );
    }

    const ordered: Color[] = [
      colors[ori]!,
      colors[(ori + 1) % 3]!,
      colors[(ori + 2) % 3]!,
    ];
    const cubie = findCornerCubie(ordered);
    if (cubie < 0) {
      throw new FaceletParseError(
        `Esquina desconocida en posición ${pos}: ${ordered.join("")}`,
      );
    }
    cp[pos] = cubie;
    co[pos] = ori;
  }

  for (let pos = 0; pos < 12; pos++) {
    const slots = EDGE_FACELETS[pos]!;
    const colors: [Color, Color] = [facelets[slots[0]]!, facelets[slots[1]]!];
    const cubie = findEdgeCubie(colors);
    if (cubie < 0) {
      throw new FaceletParseError(
        `Arista desconocida en posición ${pos}: ${colors.join("")}`,
      );
    }

    ep[pos] = cubie;
    if (colors[0] === EDGE_COLORS[cubie]![0]) {
      eo[pos] = 0;
    } else if (colors[0] === EDGE_COLORS[cubie]![1]) {
      eo[pos] = 1;
    } else {
      throw new FaceletParseError(`Orientación de arista inválida en ${pos}`);
    }
  }

  assertUnique(cp, "esquinas");
  assertUnique(ep, "aristas");

  return CubeState.fromCubies(cp, co, ep, eo);
}

export function parseCubeFile(text: string): CubeState {
  return faceletsToCube(parseFaceletNet(text));
}

export function serializeCube(cube: CubeState): string {
  return formatFaceletNet(cubeToFacelets(cube));
}

export function solvedFacelets(): Facelets {
  return [...SOLVED_FACELETS];
}

function parseTripletLine(line: string): [Color, Color, Color] {
  const trimmed = line.trim();
  if (!/^[WROYGB]{3}$/.test(trimmed)) {
    throw new FaceletParseError(`Línea de cara inválida: "${line}"`);
  }
  return [asColor(trimmed[0]!), asColor(trimmed[1]!), asColor(trimmed[2]!)];
}

function parseMiddleLine(line: string): {
  L: [Color, Color, Color];
  F: [Color, Color, Color];
  R: [Color, Color, Color];
  B: [Color, Color, Color];
} {
  const parts = line.trim().split(/\s+/);
  if (parts.length !== 4 || parts.some((p) => !/^[WROYGB]{3}$/.test(p))) {
    throw new FaceletParseError(
      `Línea equatorial inválida (se esperaba "OOO GGG RRR BBB"): "${line}"`,
    );
  }
  return {
    L: parseTripletLine(parts[0]!),
    F: parseTripletLine(parts[1]!),
    R: parseTripletLine(parts[2]!),
    B: parseTripletLine(parts[3]!),
  };
}

function flattenFace(rows: Array<[Color, Color, Color]>): Color[] {
  return rows.flat();
}

function asColor(ch: string): Color {
  if (!COLOR_SET.has(ch)) {
    throw new FaceletParseError(`Color inválido: ${ch}`);
  }
  return ch as Color;
}

function validateColorCounts(facelets: Facelets): void {
  const counts: Record<Color, number> = {
    W: 0,
    R: 0,
    G: 0,
    Y: 0,
    O: 0,
    B: 0,
  };
  for (const c of facelets) {
    counts[c]++;
  }
  for (const color of COLORS) {
    if (counts[color] !== 9) {
      throw new FaceletParseError(
        `Se esperaban 9 stickers ${color}, hay ${counts[color]}`,
      );
    }
  }
}

function validateCenters(facelets: Facelets): void {
  const expected: Color[] = ["W", "R", "G", "Y", "O", "B"];
  for (let i = 0; i < 6; i++) {
    const center = facelets[i * 9 + 4];
    if (center !== expected[i]) {
      throw new FaceletParseError(
        `Centro de ${FACE_ORDER[i]} debe ser ${expected[i]}, es ${center}`,
      );
    }
  }
}

function findCornerCubie(ordered: Color[]): number {
  for (let i = 0; i < 8; i++) {
    const ref = CORNER_COLORS[i]!;
    if (
      ref[0] === ordered[0] &&
      ref[1] === ordered[1] &&
      ref[2] === ordered[2]
    ) {
      return i;
    }
  }
  return -1;
}

function findEdgeCubie(colors: readonly [Color, Color]): number {
  for (let i = 0; i < 12; i++) {
    const ref = EDGE_COLORS[i]!;
    if (
      (ref[0] === colors[0] && ref[1] === colors[1]) ||
      (ref[0] === colors[1] && ref[1] === colors[0])
    ) {
      return i;
    }
  }
  return -1;
}

function assertUnique(perm: number[], label: string): void {
  const seen = new Set(perm);
  if (seen.size !== perm.length || [...seen].some((x) => x < 0)) {
    throw new FaceletParseError(`Permutación de ${label} inválida o con duplicados`);
  }
}
