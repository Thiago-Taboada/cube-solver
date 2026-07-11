import { describe, expect, it } from "vitest";
import { faceOf } from "./Move";
import {
  DEFAULT_SCRAMBLE_LENGTH,
  generateScramble,
  scrambleToFacelets,
} from "./Scramble";
import { CubeState } from "./CubeState";
import { faceletsToCube } from "./FaceletIO";

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
