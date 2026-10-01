import { describe, expect, it } from "vitest";
import { parseAlgorithm } from "./cubeInput";
import { FaceletParseError } from "../core/cube/FaceletIO";

describe("parseAlgorithm", () => {
  it("parses a space-separated move list", () => {
    expect(parseAlgorithm("R U R' U'")).toEqual(["R", "U", "R'", "U'"]);
  });

  it("accepts double and prime suffixes and mixed separators", () => {
    expect(parseAlgorithm("R2, U'\nF  B2")).toEqual(["R2", "U'", "F", "B2"]);
  });

  it("ignores comment lines starting with #", () => {
    const text = "# warm-up\nR U\n# done";
    expect(parseAlgorithm(text)).toEqual(["R", "U"]);
  });

  it("throws on an invalid move token", () => {
    expect(() => parseAlgorithm("R U X")).toThrow(FaceletParseError);
    expect(() => parseAlgorithm("R U X")).toThrow(/X/);
  });

  it("throws when there are no moves", () => {
    expect(() => parseAlgorithm("   \n# only a comment")).toThrow(
      FaceletParseError,
    );
  });
});
