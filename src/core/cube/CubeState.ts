import {
  type Face,
  type Move,
  faceOf,
  invertMove,
  movePower,
} from "./Move";

/**
 * Corner positions (cubie slots):
 * 0 URF, 1 UFL, 2 ULB, 3 UBR, 4 DFR, 5 DLF, 6 DBL, 7 DRB
 *
 * Edge positions:
 * 0 UR, 1 UF, 2 UL, 3 UB, 4 DR, 5 DF, 6 DL, 7 DB, 8 FR, 9 FL, 10 BL, 11 BR
 *
 * Face turns are clockwise when looking at that face (WCA).
 */
export class CubeState {
  readonly cp: readonly number[];
  readonly co: readonly number[];
  readonly ep: readonly number[];
  readonly eo: readonly number[];

  private constructor(
    cp: readonly number[],
    co: readonly number[],
    ep: readonly number[],
    eo: readonly number[],
  ) {
    this.cp = cp;
    this.co = co;
    this.ep = ep;
    this.eo = eo;
  }

  static solved(): CubeState {
    return new CubeState(
      [0, 1, 2, 3, 4, 5, 6, 7],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    );
  }

  static fromCubies(
    cp: readonly number[],
    co: readonly number[],
    ep: readonly number[],
    eo: readonly number[],
  ): CubeState {
    if (cp.length !== 8 || co.length !== 8) {
      throw new Error("Corners must have length 8");
    }
    if (ep.length !== 12 || eo.length !== 12) {
      throw new Error("Edges must have length 12");
    }
    return new CubeState([...cp], [...co], [...ep], [...eo]);
  }

  apply(move: Move): CubeState {
    const face = faceOf(move);
    const times = movePower(move);
    let state: CubeState = this;
    for (let i = 0; i < times; i++) {
      state = state.applyQuarterTurn(face);
    }
    return state;
  }

  applySequence(moves: readonly Move[]): CubeState {
    return moves.reduce((state, move) => state.apply(move), this as CubeState);
  }

  undo(move: Move): CubeState {
    return this.apply(invertMove(move));
  }

  isSolved(): boolean {
    return this.equals(CubeState.solved());
  }

  equals(other: CubeState): boolean {
    return (
      arraysEqual(this.cp, other.cp) &&
      arraysEqual(this.co, other.co) &&
      arraysEqual(this.ep, other.ep) &&
      arraysEqual(this.eo, other.eo)
    );
  }

  clone(): CubeState {
    return CubeState.fromCubies(this.cp, this.co, this.ep, this.eo);
  }

  private applyQuarterTurn(face: Face): CubeState {
    const cp = [...this.cp];
    const co = [...this.co];
    const ep = [...this.ep];
    const eo = [...this.eo];

    const turn = FACE_TURNS[face];
    cycle4(cp, co, turn.corners);
    cycle4(ep, eo, turn.edges);

    if (turn.cornerTwist) {
      const [a, b, c, d] = turn.corners;
      co[a] = (co[a]! + turn.cornerTwist[0]) % 3;
      co[b] = (co[b]! + turn.cornerTwist[1]) % 3;
      co[c] = (co[c]! + turn.cornerTwist[2]) % 3;
      co[d] = (co[d]! + turn.cornerTwist[3]) % 3;
    }

    if (turn.flipEdges) {
      for (const i of turn.edges) {
        eo[i]! ^= 1;
      }
    }

    return new CubeState(cp, co, ep, eo);
  }
}

interface FaceTurn {
  corners: readonly [number, number, number, number];
  edges: readonly [number, number, number, number];
  cornerTwist?: readonly [number, number, number, number];
  flipEdges?: boolean;
}

const FACE_TURNS: Record<Face, FaceTurn> = {
  // Corner/edge indices listed clockwise when looking at the face (WCA).
  U: {
    corners: [0, 1, 2, 3],
    edges: [0, 1, 2, 3],
  },
  D: {
    corners: [4, 7, 6, 5],
    edges: [4, 7, 6, 5],
  },
  R: {
    corners: [0, 3, 7, 4],
    edges: [0, 11, 4, 8],
    cornerTwist: [2, 1, 2, 1],
  },
  L: {
    corners: [1, 5, 6, 2],
    edges: [2, 9, 6, 10],
    cornerTwist: [1, 2, 1, 2],
  },
  F: {
    corners: [0, 4, 5, 1],
    edges: [1, 8, 5, 9],
    cornerTwist: [1, 2, 1, 2],
    flipEdges: true,
  },
  B: {
    corners: [3, 2, 6, 7],
    edges: [3, 10, 7, 11],
    cornerTwist: [2, 1, 2, 1],
    flipEdges: true,
  },
};

/**
 * Cycle four slots a→b→c→d→a (and their orientations together).
 * FACE_TURNS must list corners/edges clockwise when looking at the face.
 */
function cycle4(
  perm: number[],
  ori: number[],
  [a, b, c, d]: readonly [number, number, number, number],
): void {
  const p = perm[a]!;
  const o = ori[a]!;
  perm[a] = perm[d]!;
  ori[a] = ori[d]!;
  perm[d] = perm[c]!;
  ori[d] = ori[c]!;
  perm[c] = perm[b]!;
  ori[c] = ori[b]!;
  perm[b] = p;
  ori[b] = o;
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
