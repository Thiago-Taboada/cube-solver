export const MOVES = [
  "U",
  "U2",
  "U'",
  "D",
  "D2",
  "D'",
  "L",
  "L2",
  "L'",
  "R",
  "R2",
  "R'",
  "F",
  "F2",
  "F'",
  "B",
  "B2",
  "B'",
] as const;

export type Move = (typeof MOVES)[number];

export type Face = "U" | "D" | "L" | "R" | "F" | "B";

const INVERSE: Record<Move, Move> = {
  U: "U'",
  "U'": "U",
  U2: "U2",
  D: "D'",
  "D'": "D",
  D2: "D2",
  L: "L'",
  "L'": "L",
  L2: "L2",
  R: "R'",
  "R'": "R",
  R2: "R2",
  F: "F'",
  "F'": "F",
  F2: "F2",
  B: "B'",
  "B'": "B",
  B2: "B2",
};

export function isMove(value: string): value is Move {
  return (MOVES as readonly string[]).includes(value);
}

export function faceOf(move: Move): Face {
  return move[0] as Face;
}

export function invertMove(move: Move): Move {
  return INVERSE[move];
}

/** Quarter-turn count: 1, 2, or 3 (for '). */
export function movePower(move: Move): 1 | 2 | 3 {
  if (move.endsWith("2")) return 2;
  if (move.endsWith("'")) return 3;
  return 1;
}
