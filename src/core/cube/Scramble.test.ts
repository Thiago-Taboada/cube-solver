import { describe, expect, it } from "vitest";
import { faceOf } from "./Move";
import {
  DEFAULT_SCRAMBLE_LENGTH,
  generateBandagedScramble,
  generateScramble,
  scrambleToFacelets,
} from "./Scramble";
import { CubeState } from "./CubeState";
import { faceletsToCube } from "./FaceletIO";
import {
  applyBandageMove,
  bandageKey,
  emptyBandageState,
  type BandageState,
} from "./Bandage";
import { isBandagedPathLegal } from "../solver/BandagedSolver";

describe("generateScramble", () => {
  it("returns the requested length", () => {
    expect(generateScramble(15)).toHaveLength(15);
    expect(generateScramble()).toHaveLength(DEFAULT_SCRAMBLE_LENGTH);
  });

  it("never repeats the same face consecutively", () => {
    for (let trial = 0; trial < 30; trial++) {
      const moves = generateScramble(40);
      for (let i = 1; i < moves.length; i++) {
        expect(faceOf(moves[i]!)).not.toBe(faceOf(moves[i - 1]!));
      }
    }
  });

  it("produces a cube that is not solved (almost always)", () => {
    const moves = generateScramble(20);
    const cube = CubeState.solved().applySequence(moves);
    expect(cube.isSolved()).toBe(false);
  });

  it("roundtrips through facelets", () => {
    const moves = generateScramble(12);
    const facelets = scrambleToFacelets(moves);
    const cube = faceletsToCube(facelets);
    expect(cube.equals(CubeState.solved().applySequence(moves))).toBe(true);
  });
});

describe("generateBandagedScramble", () => {
  it("falls back to a free scramble when there are no fusions", () => {
    const { moves } = generateBandagedScramble(emptyBandageState(), 15);
    expect(moves).toHaveLength(15);
  });

  it("only produces moves legal under the fusions, every trial", () => {
    // Fuse two adjacent cubies on the U layer (URF corner + UR edge).
    const bandage = new Set([bandageKey("C0", "E0")]);
    for (let trial = 0; trial < 30; trial++) {
      const { moves } = generateBandagedScramble(bandage, 25);
      expect(moves.length).toBeGreaterThan(0);
      // The whole sequence must be legal with bandages tracking the cube.
      expect(isBandagedPathLegal(bandage, moves)).toBe(true);
    }
  });

  it("never repeats the same face consecutively", () => {
    const bandage = new Set([bandageKey("C0", "E0")]);
    for (let trial = 0; trial < 20; trial++) {
      const { moves } = generateBandagedScramble(bandage, 25);
      for (let i = 1; i < moves.length; i++) {
        expect(faceOf(moves[i]!)).not.toBe(faceOf(moves[i - 1]!));
      }
    }
  });

  it("returns the bandage advanced to the pieces' new positions", () => {
    const bandage = new Set([bandageKey("C0", "E0")]);
    const { moves, bandage: nextBandage } = generateBandagedScramble(
      bandage,
      20,
    );
    // Same number of fusions, and applying the moves to the start bandage
    // yields exactly the returned bandage (consistent with the scramble).
    expect(nextBandage.size).toBe(bandage.size);
    let replayed: BandageState = bandage;
    for (const move of moves) replayed = applyBandageMove(replayed, move);
    expect([...nextBandage].sort()).toEqual([...replayed].sort());
  });
});
