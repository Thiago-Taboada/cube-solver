import type { CubeState } from "../cube/CubeState";
import {
  cubeToFacelets,
  type Color,
  type Facelets,
} from "../cube/FaceletIO";
import { invertMove, isMove, type Move } from "../cube/Move";
import min2phase from "./vendor/min2phase.js";

const COLOR_TO_FACE: Record<Color, string> = {
  W: "U",
  R: "R",
  G: "F",
  Y: "D",
  O: "L",
  B: "B",
};

let initialized = false;

export function initSolver(): void {
  if (initialized) return;
  min2phase.initFull();
  initialized = true;
}

export interface SolveOk {
  ok: true;
  moves: Move[];
  timeMs: number;
}

export interface SolveErr {
  ok: false;
  error: string;
  timeMs: number;
}

export type SolveOutcome = SolveOk | SolveErr;

/** Solve from cubie state via its facelet coloring (Kociemba / min2phase). */
export function solveCube(cube: CubeState): SolveOutcome {
  return solveFacelets(cubeToFacelets(cube));
}

/**
 * Solve from 54 facelet colors W/R/G/Y/O/B in U,R,F,D,L,B order.
 * This is the source of truth for the UI (matches the physical cube).
 */
export function solveFacelets(facelets: Facelets): SolveOutcome {
  const started = performance.now();
  initSolver();

  const faceletString = toMin2PhaseFacelets(facelets);
  const raw = min2phase.solve(faceletString);
  const timeMs = Math.max(1, Math.round(performance.now() - started));

  if (raw.startsWith("Error")) {
    return {
      ok: false,
      error: `No se pudo resolver el cubo (${raw}).`,
      timeMs,
    };
  }

  const moves = parseSolution(raw);
  if (moves === null) {
    return {
      ok: false,
      error: `Solución inválida del solver: "${raw}"`,
      timeMs,
    };
  }

  return { ok: true, moves, timeMs };
}

export function toMin2PhaseFacelets(facelets: Facelets): string {
  if (facelets.length !== 54) {
    throw new Error("Se necesitan 54 facelets");
  }
  return facelets.map((c) => COLOR_TO_FACE[c]).join("");
}

/** Parse "R2 U' F ..." into Move[]. */
export function parseSolution(solution: string): Move[] | null {
  const cleaned = solution
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  const moves: Move[] = [];
  for (const token of cleaned.split(" ")) {
    if (!token) continue;
    if (!isMove(token)) return null;
    moves.push(token);
  }
  return moves;
}

/**
 * Verify a solution against facelets using min2phase:
 * applying the inverse solution to the solved cube must reproduce the facelets.
 */
export function verifySolution(facelets: Facelets, moves: readonly Move[]): boolean {
  initSolver();
  const expected = toMin2PhaseFacelets(facelets);
  if (moves.length === 0) {
    return expected === toMin2PhaseFacelets(solvedFaceColoring());
  }
  const inverseAlg = [...moves].reverse().map(invertMove).join(" ");
  const reconstructed = min2phase.fromScramble(inverseAlg);
  return reconstructed === expected;
}

function solvedFaceColoring(): Facelets {
  return [
    ..."WWWWWWWWW",
    ..."RRRRRRRRR",
    ..."GGGGGGGGG",
    ..."YYYYYYYYY",
    ..."OOOOOOOOO",
    ..."BBBBBBBBB",
  ] as Color[];
}
