import { CubeState } from "../cube/CubeState";
import {
  applyBandageMove,
  canMove,
  emptyBandageState,
  type BandageState,
} from "../cube/Bandage";
import { faceOf, MOVES, type Move } from "../cube/Move";
import { solveCube, type SolveOutcome } from "./Kociemba";

const MAX_BFS_NODES = 250_000;
const MAX_BFS_DEPTH = 14;

function cubeKey(cube: CubeState): string {
  return `${cube.cp.join(",")}|${cube.co.join(",")}|${cube.ep.join(",")}|${cube.eo.join(",")}`;
}

function bandageFingerprint(state: BandageState): string {
  if (state.size === 0) return "";
  return [...state].sort().join(";");
}

function stateKey(cube: CubeState, bandage: BandageState): string {
  return `${cubeKey(cube)}#${bandageFingerprint(bandage)}`;
}

/** True if every move is legal while bandages track with the cube. */
export function isBandagedPathLegal(
  startBandage: BandageState,
  moves: readonly Move[],
): boolean {
  let bandage = startBandage;
  for (const move of moves) {
    if (!canMove(bandage, move)) return false;
    bandage = applyBandageMove(bandage, move);
  }
  return true;
}

/**
 * Solve a cube respecting bandage fusions.
 * Empty bandage → unrestricted Kociemba.
 * Otherwise: try free solution if legal, else BFS on legal moves.
 */
export function solveBandaged(
  cube: CubeState,
  bandage: BandageState = emptyBandageState(),
): SolveOutcome {
  const started = performance.now();

  if (cube.isSolved()) {
    return { ok: true, moves: [], timeMs: 1 };
  }

  if (bandage.size === 0) {
    return solveCube(cube);
  }

  // Fast path: unrestricted solution that never splits a fused pair.
  const free = solveCube(cube);
  if (free.ok && isBandagedPathLegal(bandage, free.moves)) {
    return {
      ok: true,
      moves: free.moves,
      timeMs: Math.max(1, Math.round(performance.now() - started)),
    };
  }

  const restricted = bfsBandaged(cube, bandage);
  const timeMs = Math.max(1, Math.round(performance.now() - started));

  if (restricted) {
    return { ok: true, moves: restricted, timeMs };
  }

  return {
    ok: false,
    error: "BANDAGED_UNSOLVABLE",
    timeMs,
  };
}

function bfsBandaged(
  start: CubeState,
  startBandage: BandageState,
): Move[] | null {
  type Node = {
    cube: CubeState;
    bandage: BandageState;
    path: Move[];
    lastFace: string | null;
  };

  const queue: Node[] = [
    { cube: start, bandage: startBandage, path: [], lastFace: null },
  ];
  const visited = new Set<string>([stateKey(start, startBandage)]);
  let nodes = 0;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.path.length >= MAX_BFS_DEPTH) continue;

    for (const move of MOVES) {
      const face = faceOf(move);
      // Don't turn the same face twice in a row (redundant with U/U2/U').
      if (face === cur.lastFace) continue;
      if (!canMove(cur.bandage, move)) continue;

      const nextCube = cur.cube.apply(move);
      const nextBandage = applyBandageMove(cur.bandage, move);
      const key = stateKey(nextCube, nextBandage);
      if (visited.has(key)) continue;
      visited.add(key);

      const path = [...cur.path, move];
      if (nextCube.isSolved()) return path;

      nodes++;
      if (nodes > MAX_BFS_NODES) return null;

      queue.push({
        cube: nextCube,
        bandage: nextBandage,
        path,
        lastFace: face,
      });
    }
  }

  return null;
}

/** Verify a solution under bandage constraints (cube + fusion legality). */
export function verifyBandagedSolution(
  cube: CubeState,
  bandage: BandageState,
  moves: readonly Move[],
): boolean {
  if (!isBandagedPathLegal(bandage, moves)) return false;
  return cube.applySequence(moves).isSolved();
}
