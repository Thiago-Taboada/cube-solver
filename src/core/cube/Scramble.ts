import { faceOf, MOVES, type Face, type Move } from "./Move";
import { CubeState } from "./CubeState";
import { cubeToFacelets, type Facelets } from "./FaceletIO";
import {
  applyBandageMove,
  canMove,
  emptyBandageState,
  type BandageState,
} from "./Bandage";

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

/**
 * Generate a scramble that respects bandage fusions. Because a fused pair
 * rotates with the layer it's on, the set of legal moves changes after
 * every turn — so we recompute legality at each step via `canMove` and
 * advance the bandage with `applyBandageMove`. The resulting sequence is
 * always reachable under the constraints (and thus solvable back by the
 * bandaged solver), unlike a free 3×3 scramble applied blindly.
 *
 * Falls back to the free generator when there are no fusions. If a step has
 * no legal move left (a fully locked state), it stops early and returns the
 * moves accumulated so far rather than forcing an illegal turn.
 */
export function generateBandagedScramble(
  bandage: BandageState,
  length: number = DEFAULT_SCRAMBLE_LENGTH,
): { moves: Move[]; bandage: BandageState } {
  if (bandage.size === 0) {
    return { moves: generateScramble(length), bandage };
  }
  if (length < 1) {
    throw new Error("La mezcla debe tener al menos 1 movimiento");
  }

  const moves: Move[] = [];
  let state = bandage;
  let prevFace: Face | null = null;

  for (let i = 0; i < length; i++) {
    // Legal moves this step: allowed by the current fusions, and not another
    // turn of the face we just turned (would be redundant: U then U2 = U').
    const candidates = MOVES.filter(
      (move) => faceOf(move) !== prevFace && canMove(state, move),
    );
    if (candidates.length === 0) break;

    const move = candidates[randomInt(candidates.length)]!;
    moves.push(move);
    state = applyBandageMove(state, move);
    prevFace = faceOf(move);
  }

  // `state` is the bandage after the whole sequence: the fusions now sit on
  // the cubies' new positions, so callers can render the joins where the
  // pieces actually ended up (not where they started).
  return { moves, bandage: state };
}

/** Apply a scramble from the solved cube and return facelet colors. */
export function scrambleToFacelets(moves: readonly Move[]): Facelets {
  return cubeToFacelets(CubeState.solved().applySequence(moves));
}

/**
 * Generate a scramble and the resulting facelet coloring. When a bandage
 * state is given, the scramble honors its fusions (see
 * `generateBandagedScramble`) and the returned `bandage` reflects the
 * fusions on their post-scramble positions; otherwise it's a plain 3×3
 * scramble and `bandage` is returned unchanged.
 */
export function randomScramble(
  length?: number,
  bandage: BandageState = emptyBandageState(),
): {
  moves: Move[];
  facelets: Facelets;
  bandage: BandageState;
} {
  if (bandage.size === 0) {
    const moves = generateScramble(length);
    return { moves, facelets: scrambleToFacelets(moves), bandage };
  }
  const { moves, bandage: nextBandage } = generateBandagedScramble(
    bandage,
    length,
  );
  return { moves, facelets: scrambleToFacelets(moves), bandage: nextBandage };
}
