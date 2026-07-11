import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CubeState } from "./CubeState";
import { MOVES, type Move } from "./Move";
import {
  FaceletParseError,
  cubeToFacelets,
  faceletsToCube,
  formatFaceletNet,
  parseCubeFile,
  parseFaceletNet,
  serializeCube,
  solvedFacelets,
} from "./FaceletIO";

const SOLVED_NET = `    WWW
    WWW
    WWW

OOO GGG RRR BBB
OOO GGG RRR BBB
OOO GGG RRR BBB

    YYY
    YYY
    YYY
`;

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures");

describe("FaceletIO", () => {
  it("parses the solved net into 54 facelets", () => {
    const facelets = parseFaceletNet(SOLVED_NET);
    expect(facelets).toHaveLength(54);
    expect(facelets).toEqual(solvedFacelets());
  });

  it("parseCubeFile(solved) equals CubeState.solved()", () => {
    expect(parseCubeFile(SOLVED_NET).isSolved()).toBe(true);
  });

  it("roundtrips solved through serialize", () => {
    const cube = parseCubeFile(SOLVED_NET);
    const again = parseCubeFile(serializeCube(cube));
    expect(again.isSolved()).toBe(true);
    expect(normalizeNet(serializeCube(cube))).toBe(normalizeNet(SOLVED_NET));
  });

  it.each(MOVES)("roundtrips cubies ↔ facelets after %s", (move) => {
    const moved = CubeState.solved().apply(move);
    const restored = faceletsToCube(cubeToFacelets(moved));
    expect(restored.equals(moved)).toBe(true);
  });

  it("roundtrips a scramble through TXT", () => {
    const scramble: Move[] = [
      "R",
      "U",
      "R'",
      "F2",
      "L",
      "D'",
      "B",
      "U2",
      "R",
      "F'",
    ];
    const cube = CubeState.solved().applySequence(scramble);
    const text = serializeCube(cube);
    const parsed = parseCubeFile(text);
    expect(parsed.equals(cube)).toBe(true);
  });

  it("formatFaceletNet ↔ parseFaceletNet", () => {
    const facelets = cubeToFacelets(
      CubeState.solved().applySequence(["F", "R", "U'", "B2"]),
    );
    expect(parseFaceletNet(formatFaceletNet(facelets))).toEqual(facelets);
  });

  it("rejects wrong line count", () => {
    expect(() => parseFaceletNet("WWW\nWWW")).toThrow(FaceletParseError);
  });

  it("rejects wrong center colors", () => {
    const facelets = [...solvedFacelets()];
    facelets[22] = "R"; // F center
    facelets[13] = "G"; // swap with R center to keep counts
    expect(() => parseFaceletNet(formatFaceletNet(facelets))).toThrow(/Centro/);
  });

  it("rejects invalid characters", () => {
    expect(() =>
      parseFaceletNet(SOLVED_NET.replace("WWW", "XXX")),
    ).toThrow(FaceletParseError);
  });

  it("parses fixtures/scrambled2.txt (esquina UBR con winding correcto)", () => {
    const text = readFileSync(join(fixturesDir, "scrambled2.txt"), "utf8");
    const cube = parseCubeFile(text);
    expect(cube.isSolved()).toBe(false);
    expect(parseCubeFile(serializeCube(cube)).equals(cube)).toBe(true);
  });
});

function normalizeNet(text: string): string {
  return text.replace(/\r\n/g, "\n").trimEnd();
}
