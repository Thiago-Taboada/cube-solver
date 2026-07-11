import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CubeState } from "../cube/CubeState";
import { cubeToFacelets, parseCubeFile } from "../cube/FaceletIO";
import {
  parseSolution,
  solveCube,
  solveFacelets,
  verifySolution,
} from "./Kociemba";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures",
);

describe("Kociemba solver", () => {
  it("parseSolution accepts standard move strings", () => {
    expect(parseSolution("R U R' U'")).toEqual(["R", "U", "R'", "U'"]);
    expect(parseSolution("R  U' R' ")).toEqual(["R", "U'", "R'"]);
    expect(parseSolution("")).toEqual([]);
  });

  it("returns empty solution for solved cube", () => {
    const result = solveCube(CubeState.solved());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.moves).toEqual([]);
    }
  });

  it("solves fixtures/scrambled2.txt and verifies inverse", () => {
    const text = readFileSync(join(fixturesDir, "scrambled2.txt"), "utf8");
    const facelets = cubeToFacelets(parseCubeFile(text));
    const result = solveFacelets(facelets);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.moves.length).toBeGreaterThan(0);
    expect(verifySolution(facelets, result.moves)).toBe(true);
  }, 30_000);

  it("solves fixtures/scrambled.txt", () => {
    const text = readFileSync(join(fixturesDir, "scrambled.txt"), "utf8");
    const facelets = cubeToFacelets(parseCubeFile(text));
    const result = solveFacelets(facelets);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(verifySolution(facelets, result.moves)).toBe(true);
  }, 30_000);
});
