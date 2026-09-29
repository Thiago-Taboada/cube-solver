import { describe, expect, it } from "vitest";
import {
  applyBandageMove,
  canMove,
  emptyBandageState,
  toggleBandage,
} from "../cube/Bandage";
import { CubeState } from "../cube/CubeState";
import {
  isBandagedPathLegal,
  solveBandaged,
  verifyBandagedSolution,
} from "./BandagedSolver";
import { initSolver } from "./Kociemba";

describe("canMove / applyBandageMove", () => {
  it("allows any move when there are no bandages", () => {
    const empty = emptyBandageState();
    expect(canMove(empty, "U")).toBe(true);
    expect(canMove(empty, "F'")).toBe(true);
  });

  it("blocks a turn that would split a fused pair", () => {
    // C0 (URF) + E0 (UR): both on U and R, but F splits them (only C0 on F).
    let state = emptyBandageState();
    state = toggleBandage(state, "C0", "E0")!;
    expect(canMove(state, "U")).toBe(true);
    expect(canMove(state, "U2")).toBe(true);
    expect(canMove(state, "R")).toBe(true);
    expect(canMove(state, "F")).toBe(false);
    expect(canMove(state, "F'")).toBe(false);
    expect(canMove(state, "L")).toBe(true); // neither cubie on L
  });

  it("blocks U when an edge is fused to the F center", () => {
    let state = emptyBandageState();
    state = toggleBandage(state, "E1", "F")!;
    expect(canMove(state, "F")).toBe(true);
    expect(canMove(state, "U")).toBe(false);
  });

  it("permutes bandage slots with the face turn", () => {
    let state = emptyBandageState();
    state = toggleBandage(state, "C0", "E0")!;
    // U clockwise: C0→C1, E0→E1
    const afterU = applyBandageMove(state, "U");
    expect(afterU.has("C1|E1")).toBe(true);
    expect(afterU.has("C0|E0")).toBe(false);

    const afterU4 = applyBandageMove(
      applyBandageMove(applyBandageMove(applyBandageMove(state, "U"), "U"), "U"),
      "U",
    );
    expect(afterU4.has("C0|E0")).toBe(true);

    const afterUPrime = applyBandageMove(afterU, "U'");
    expect(afterUPrime.has("C0|E0")).toBe(true);
  });
});

describe("solveBandaged", () => {
  it("falls back to free Kociemba with empty bandage", () => {
    initSolver();
    const cube = CubeState.solved().applySequence(["R", "U", "R'", "U'"]);
    const result = solveBandaged(cube, emptyBandageState());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(verifyBandagedSolution(cube, emptyBandageState(), result.moves)).toBe(
      true,
    );
  });

  it("rejects a free path that uses illegal moves and finds a legal one", () => {
    initSolver();
    // Fuse C0|E0 so F turns are illegal while the pair sits on URF–UR.
    let bandage = emptyBandageState();
    bandage = toggleBandage(bandage, "C0", "E0")!;

    expect(isBandagedPathLegal(bandage, ["F"])).toBe(false);

    // R2 keeps the pair on R; U then moves both outside R together.
    const scramble = ["R2", "U", "R2", "U'"] as const;
    expect(isBandagedPathLegal(bandage, scramble)).toBe(true);
    const cube = CubeState.solved().applySequence([...scramble]);

    const result = solveBandaged(cube, bandage);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isBandagedPathLegal(bandage, result.moves)).toBe(true);
    expect(verifyBandagedSolution(cube, bandage, result.moves)).toBe(true);
  });

  it("returns already-solved for identity", () => {
    const result = solveBandaged(CubeState.solved(), emptyBandageState());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.moves).toEqual([]);
  });
});
