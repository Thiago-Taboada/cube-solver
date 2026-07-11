import { CubeState } from "./CubeState";
import {
  COLORS,
  type Color,
  type Facelets,
  faceletsToCube,
} from "./FaceletIO";

/** Re-declared locally to avoid exporting internal tables; keep in sync with FaceletIO. */
const U = 0;
const R = 9;
const F = 18;
const D = 27;
const L = 36;
const B = 45;

const CORNER_FACELETS: ReadonlyArray<readonly [number, number, number]> = [
  [U + 8, R + 0, F + 2],
  [U + 6, F + 0, L + 2],
  [U + 0, L + 0, B + 2],
  [U + 2, B + 0, R + 2],
  [D + 2, F + 8, R + 6],
  [D + 0, L + 8, F + 6],
  [D + 6, B + 8, L + 6],
  [D + 8, R + 8, B + 6],
];

const EDGE_FACELETS: ReadonlyArray<readonly [number, number]> = [
  [U + 5, R + 1],
  [U + 7, F + 1],
  [U + 3, L + 1],
  [U + 1, B + 1],
  [D + 5, R + 7],
  [D + 1, F + 7],
  [D + 3, L + 7],
  [D + 7, B + 7],
  [F + 5, R + 3],
  [F + 3, L + 5],
  [B + 5, L + 3],
  [B + 3, R + 5],
];

const CORNER_NAMES = [
  "URF",
  "UFL",
  "ULB",
  "UBR",
  "DFR",
  "DLF",
  "DBL",
  "DRB",
] as const;

const EDGE_NAMES = [
  "UR",
  "UF",
  "UL",
  "UB",
  "DR",
  "DF",
  "DL",
  "DB",
  "FR",
  "FL",
  "BL",
  "BR",
] as const;

const OPPOSITE: Record<Color, Color> = {
  W: "Y",
  Y: "W",
  R: "O",
  O: "R",
  G: "B",
  B: "G",
};

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"] as const;
const EXPECTED_CENTERS: Color[] = ["W", "R", "G", "Y", "O", "B"];

export type DiagnosticKind =
  | "count"
  | "center"
  | "corner"
  | "edge"
  | "duplicate"
  | "generic";

/** Stable i18n keys for validation messages (`diag.*` in locale files). */
export type DiagnosticCode =
  | "need54"
  | "countExcess"
  | "countMissing"
  | "centerWrong"
  | "cornerRepeat"
  | "cornerOpposite"
  | "cornerNoUD"
  | "cornerImpossible"
  | "cornerDuplicate"
  | "edgeSame"
  | "edgeOpposite"
  | "edgeImpossible"
  | "edgeDuplicate"
  | "piecesIncomplete"
  | "invalidState";

export type DiagnosticParams = Record<string, string | number>;

export interface FaceletDiagnostic {
  kind: DiagnosticKind;
  code: DiagnosticCode;
  params?: DiagnosticParams;
  stickers: number[];
}

export interface DiagnoseResult {
  ok: boolean;
  diagnostics: FaceletDiagnostic[];
  highlighted: number[];
  cube: CubeState | null;
}

/**
 * Collects all validation problems with i18n codes
 * and sticker indices to highlight on the net.
 */
export function diagnoseFacelets(facelets: Facelets): DiagnoseResult {
  if (facelets.length !== 54) {
    return {
      ok: false,
      diagnostics: [
        {
          kind: "generic",
          code: "need54",
          params: { count: facelets.length },
          stickers: [],
        },
      ],
      highlighted: [],
      cube: null,
    };
  }

  const diagnostics: FaceletDiagnostic[] = [];

  const counts = countColors(facelets);
  for (const color of COLORS) {
    const n = counts[color];
    if (n === 9) continue;
    const stickers = indicesOfColor(facelets, color);
    if (n > 9) {
      diagnostics.push({
        kind: "count",
        code: "countExcess",
        params: { count: n, color },
        stickers,
      });
    } else {
      diagnostics.push({
        kind: "count",
        code: "countMissing",
        params: { count: n, color },
        stickers,
      });
    }
  }

  for (let i = 0; i < 6; i++) {
    const idx = i * 9 + 4;
    const center = facelets[idx]!;
    const expected = EXPECTED_CENTERS[i]!;
    if (center !== expected) {
      diagnostics.push({
        kind: "center",
        code: "centerWrong",
        params: {
          face: FACE_ORDER[i]!,
          expected,
          actual: center,
        },
        stickers: [idx],
      });
    }
  }

  if (diagnostics.length > 0) {
    const highlighted = unique(diagnostics.flatMap((d) => d.stickers));
    return { ok: false, diagnostics, highlighted, cube: null };
  }

  const cornerIds: number[] = [];
  for (let pos = 0; pos < 8; pos++) {
    const slots = [...CORNER_FACELETS[pos]!];
    const colors = slots.map((i) => facelets[i]!);
    const name = CORNER_NAMES[pos]!;
    const issue = describeCornerIssue(name, colors);
    if (issue) {
      diagnostics.push({ ...issue, kind: "corner", stickers: slots });
      cornerIds.push(-1);
      continue;
    }

    const ori = colors.findIndex((c) => c === "W" || c === "Y");
    const ordered: Color[] = [
      colors[ori]!,
      colors[(ori + 1) % 3]!,
      colors[(ori + 2) % 3]!,
    ];
    const id = findCornerId(ordered);
    if (id < 0) {
      diagnostics.push({
        kind: "corner",
        code: "cornerImpossible",
        params: { piece: name, colors: joinColors(colors) },
        stickers: slots,
      });
      cornerIds.push(-1);
    } else {
      cornerIds.push(id);
    }
  }

  {
    const dupCorners = findDuplicates(cornerIds);
    if (dupCorners.length > 0) {
      const stickers = dupCorners.flatMap((id) => {
        const positions = cornerIds
          .map((v, i) => (v === id ? i : -1))
          .filter((i) => i >= 0);
        return positions.flatMap((p) => [...CORNER_FACELETS[p]!]);
      });
      diagnostics.push({
        kind: "duplicate",
        code: "cornerDuplicate",
        stickers: unique(stickers),
      });
    }
  }

  const edgeIds: number[] = [];
  for (let pos = 0; pos < 12; pos++) {
    const slots = [...EDGE_FACELETS[pos]!];
    const colors: [Color, Color] = [facelets[slots[0]]!, facelets[slots[1]]!];
    const name = EDGE_NAMES[pos]!;
    const issue = describeEdgeIssue(name, colors);
    if (issue) {
      diagnostics.push({ ...issue, kind: "edge", stickers: slots });
      edgeIds.push(-1);
      continue;
    }
    const id = findEdgeId(colors);
    if (id < 0) {
      diagnostics.push({
        kind: "edge",
        code: "edgeImpossible",
        params: { piece: name, colors: joinColors(colors) },
        stickers: slots,
      });
      edgeIds.push(-1);
    } else {
      edgeIds.push(id);
    }
  }

  {
    const dupEdges = findDuplicates(edgeIds);
    if (dupEdges.length > 0) {
      const stickers = dupEdges.flatMap((id) => {
        const positions = edgeIds
          .map((v, i) => (v === id ? i : -1))
          .filter((i) => i >= 0);
        return positions.flatMap((p) => [...EDGE_FACELETS[p]!]);
      });
      diagnostics.push({
        kind: "duplicate",
        code: "edgeDuplicate",
        stickers: unique(stickers),
      });
    }
  }

  const highlighted = unique(diagnostics.flatMap((d) => d.stickers));

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics, highlighted, cube: null };
  }

  try {
    const cube = faceletsToCube(facelets);
    return { ok: true, diagnostics: [], highlighted: [], cube };
  } catch (error) {
    const code =
      error instanceof Error && error.message.includes("Permutación")
        ? "piecesIncomplete"
        : "invalidState";
    return {
      ok: false,
      diagnostics: [{ kind: "generic", code, stickers: [] }],
      highlighted: [],
      cube: null,
    };
  }
}

function countColors(facelets: Facelets): Record<Color, number> {
  const counts: Record<Color, number> = {
    W: 0,
    R: 0,
    G: 0,
    Y: 0,
    O: 0,
    B: 0,
  };
  for (const c of facelets) counts[c]++;
  return counts;
}

function indicesOfColor(facelets: Facelets, color: Color): number[] {
  const out: number[] = [];
  for (let i = 0; i < facelets.length; i++) {
    if (facelets[i] === color) out.push(i);
  }
  return out;
}

function describeCornerIssue(
  name: string,
  colors: Color[],
): Omit<FaceletDiagnostic, "kind" | "stickers"> | null {
  const uniqueColors = new Set(colors);
  if (uniqueColors.size < 3) {
    return {
      code: "cornerRepeat",
      params: { piece: name, colors: joinColors(colors) },
    };
  }
  for (const c of colors) {
    if (colors.includes(OPPOSITE[c]!)) {
      return {
        code: "cornerOpposite",
        params: {
          piece: name,
          colors: joinColors(colors),
          a: c,
          b: OPPOSITE[c]!,
        },
      };
    }
  }
  if (!colors.some((c) => c === "W" || c === "Y")) {
    return {
      code: "cornerNoUD",
      params: { piece: name, colors: joinColors(colors) },
    };
  }
  return null;
}

function describeEdgeIssue(
  name: string,
  colors: [Color, Color],
): Omit<FaceletDiagnostic, "kind" | "stickers"> | null {
  if (colors[0] === colors[1]) {
    return {
      code: "edgeSame",
      params: { piece: name, color: colors[0] },
    };
  }
  if (OPPOSITE[colors[0]] === colors[1]) {
    return {
      code: "edgeOpposite",
      params: { piece: name, colors: joinColors(colors) },
    };
  }
  return null;
}

function joinColors(colors: readonly Color[]): string {
  return colors.join(",");
}

function findCornerId(ordered: Color[]): number {
  const solved: Color[][] = [
    ["W", "R", "G"],
    ["W", "G", "O"],
    ["W", "O", "B"],
    ["W", "B", "R"],
    ["Y", "G", "R"],
    ["Y", "O", "G"],
    ["Y", "B", "O"],
    ["Y", "R", "B"],
  ];
  for (let i = 0; i < 8; i++) {
    const ref = solved[i]!;
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

function findEdgeId(colors: readonly [Color, Color]): number {
  const solved: Array<[Color, Color]> = [
    ["W", "R"],
    ["W", "G"],
    ["W", "O"],
    ["W", "B"],
    ["Y", "R"],
    ["Y", "G"],
    ["Y", "O"],
    ["Y", "B"],
    ["G", "R"],
    ["G", "O"],
    ["B", "O"],
    ["B", "R"],
  ];
  for (let i = 0; i < 12; i++) {
    const ref = solved[i]!;
    if (
      (ref[0] === colors[0] && ref[1] === colors[1]) ||
      (ref[0] === colors[1] && ref[1] === colors[0])
    ) {
      return i;
    }
  }
  return -1;
}

function findDuplicates(ids: number[]): number[] {
  const seen = new Map<number, number>();
  const dups = new Set<number>();
  for (const id of ids) {
    if (id < 0) continue;
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) dups.add(id);
  }
  return [...dups];
}

function unique(xs: number[]): number[] {
  return [...new Set(xs)];
}
