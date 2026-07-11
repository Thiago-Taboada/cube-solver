import { type Face, type Move } from "./Move";
import { CubeState } from "./CubeState";
import { cubeToFacelets, type Facelets } from "./FaceletIO";

const FACES: readonly Face[] = ["U", "D", "L", "R", "F", "B"];

const OPPOSITE: Record<Face, Face> = {
  U: "D",
  D: "U",
  L: "R",
  R: "L",
  F: "B",
  B: "F",
};

const SUFFIXES = ["", "2", "'"] as const;

/** Default length for a random 3×3 scramble (WCA-style move sequence). */
export const DEFAULT_SCRAMBLE_LENGTH = 20;

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

/**
 * Generate a random scramble: no two consecutive moves on the same face,
 * and no move on the opposite face immediately after (e.g. U then D).
 */
export function generateScramble(
  length: number = DEFAULT_SCRAMBLE_LENGTH,
): Move[] {
  if (length < 1) {
    throw new Error("La mezcla debe tener al menos 1 movimiento");
  }

  const moves: Move[] = [];
  let prevFace: Face | null = null;
  let prevPrevFace: Face | null = null;

  for (let i = 0; i < length; i++) {
    const forbidden = new Set<Face>();
    if (prevFace) {
      forbidden.add(prevFace);
      // Avoid U D U-style: if last two were opposite axis, also block that axis pair
      if (prevPrevFace && OPPOSITE[prevFace] === prevPrevFace) {
        forbidden.add(prevPrevFace);
      }
    }

    const candidates = FACES.filter((f) => !forbidden.has(f));
    const face = candidates[randomInt(candidates.length)]!;
    const suffix = SUFFIXES[randomInt(SUFFIXES.length)]!;
    const move = `${face}${suffix}` as Move;

    moves.push(move);
    prevPrevFace = prevFace;
    prevFace = face;
  }

  return moves;
}

/** Apply a scramble from the solved cube and return facelet colors. */
export function scrambleToFacelets(moves: readonly Move[]): Facelets {
  return cubeToFacelets(CubeState.solved().applySequence(moves));
}

/** Generate a scramble and the resulting facelet coloring. */
export function randomScramble(length?: number): {
  moves: Move[];
  facelets: Facelets;
} {
  const moves = generateScramble(length);
  return { moves, facelets: scrambleToFacelets(moves) };
}
