import { describe, expect, it } from "vitest";
import { CubeState } from "./CubeState";
import { MOVES, invertMove, type Move } from "./Move";

describe("CubeState", () => {
  it("creates a solved cube", () => {
    const cube = CubeState.solved();
    expect(cube.isSolved()).toBe(true);
    expect(cube.cp).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(cube.ep).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(cube.co.every((x) => x === 0)).toBe(true);
    expect(cube.eo.every((x) => x === 0)).toBe(true);
  });

  it("equals compares full state", () => {
    const a = CubeState.solved();
    const b = CubeState.solved();
    expect(a.equals(b)).toBe(true);
    expect(a.apply("R").equals(b)).toBe(false);
  });

  it.each(MOVES)("four quarter-equivalent turns of %s restore solved", (move) => {
    const face = move[0] as Move;
    const quarter = face; // U, D, L, R, F, B
    let cube = CubeState.solved();
    for (let i = 0; i < 4; i++) {
      cube = cube.apply(quarter);
    }
    expect(cube.isSolved()).toBe(true);
  });

  it.each(MOVES)("apply(%s) then undo returns to solved", (move) => {
    const cube = CubeState.solved().apply(move).undo(move);
    expect(cube.isSolved()).toBe(true);
  });

  it.each(MOVES)("apply(%s) then invertMove restores solved", (move) => {
    const cube = CubeState.solved().apply(move).apply(invertMove(move));
    expect(cube.isSolved()).toBe(true);
  });

  it("applySequence matches chained apply", () => {
    const moves: Move[] = ["R", "U", "R'", "U'"];
    const a = CubeState.solved().applySequence(moves);
    const b = CubeState.solved()
      .apply("R")
      .apply("U")
      .apply("R'")
      .apply("U'");
    expect(a.equals(b)).toBe(true);
  });

  it("sexy move six times returns to solved", () => {
    const sexy: Move[] = ["R", "U", "R'", "U'"];
    let cube = CubeState.solved();
    for (let i = 0; i < 6; i++) {
      cube = cube.applySequence(sexy);
    }
    expect(cube.isSolved()).toBe(true);
  });

  it("keeps corner orientation sum divisible by 3", () => {
    let cube = CubeState.solved();
    const scramble: Move[] = [
      "R",
      "U",
      "F'",
      "D2",
      "L",
      "B'",
      "U2",
      "R'",
      "F",
      "D",
    ];
    cube = cube.applySequence(scramble);
    const sum = cube.co.reduce((a, b) => a + b, 0);
    expect(sum % 3).toBe(0);
  });

  it("keeps edge orientation sum even", () => {
    let cube = CubeState.solved();
    const scramble: Move[] = ["F", "R", "U'", "B2", "L", "D'", "F2", "R'"];
    cube = cube.applySequence(scramble);
    const sum = cube.eo.reduce((a, b) => a + b, 0);
    expect(sum % 2).toBe(0);
  });

  it("double moves equal two quarter turns", () => {
    for (const face of ["U", "D", "L", "R", "F", "B"] as const) {
      const double = CubeState.solved().apply(`${face}2` as Move);
      const twice = CubeState.solved().apply(face).apply(face);
      expect(double.equals(twice)).toBe(true);
    }
  });

  it("prime moves equal three quarter turns", () => {
    for (const face of ["U", "D", "L", "R", "F", "B"] as const) {
      const prime = CubeState.solved().apply(`${face}'` as Move);
      const thrice = CubeState.solved().apply(face).apply(face).apply(face);
      expect(prime.equals(thrice)).toBe(true);
    }
  });
});
