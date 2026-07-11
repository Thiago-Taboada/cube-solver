import { describe, expect, it } from "vitest";
import { CubeState } from "./CubeState";
import { cubeToFacelets, formatFaceletNet } from "./FaceletIO";
import { toMin2PhaseFacelets } from "../solver/Kociemba";
import min2phase from "../solver/vendor/min2phase.js";

describe("move direction vs min2phase", () => {
  it.each([
    "U",
    "U'",
    "D",
    "D'",
    "R",
    "R'",
    "F",
    "F'",
    "L",
    "L'",
    "B",
    "B'",
    "D U",
    "D' U'",
  ] as const)("CubeState+%s matches min2phase.fromScramble", (moves) => {
    min2phase.initFull();
    const cube = CubeState.solved().applySequence(moves.split(" ") as never);
    const ours = toMin2PhaseFacelets(cubeToFacelets(cube));
    const theirs = min2phase.fromScramble(moves);
    expect(ours, formatFaceletNet(cubeToFacelets(cube))).toBe(theirs);
  });
});
