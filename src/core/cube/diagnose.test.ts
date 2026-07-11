import { describe, expect, it } from "vitest";
import { diagnoseFacelets } from "./diagnose";
import { solvedFacelets, type Color } from "./FaceletIO";

describe("diagnoseFacelets", () => {
  it("accepts a solved cube", () => {
    const result = diagnoseFacelets(solvedFacelets());
    expect(result.ok).toBe(true);
    expect(result.highlighted).toEqual([]);
  });

  it("reports excess color counts and highlights those stickers", () => {
    const facelets = [...solvedFacelets()] as Color[];
    // Turn two green stickers into white → 11 W, 7 G
    facelets[18] = "W"; // F0
    facelets[19] = "W"; // F1
    const result = diagnoseFacelets(facelets);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.kind === "count")).toBe(true);
    expect(
      result.diagnostics.some(
        (d) => d.code === "countExcess" && d.params?.color === "W",
      ),
    ).toBe(true);
    expect(result.highlighted.length).toBeGreaterThan(0);
    expect(result.highlighted).toContain(18);
  });

  it("reports impossible corner with opposite colors", () => {
    const facelets = [...solvedFacelets()] as Color[];
    // URF normally W,R,G at [8,9,20]. Put Y on R0 → W,Y,G (opposites W-Y)
    // Actually need to keep counts: swap carefully
    // Put yellow on R facelet of URF and white on a D sticker that had Y
    facelets[9] = "Y"; // R0 was R
    facelets[29] = "R"; // D2 was Y — swap to keep counts
    const result = diagnoseFacelets(facelets);
    expect(result.ok).toBe(false);
    expect(
      result.diagnostics.some(
        (d) => d.kind === "corner" && d.code === "cornerOpposite",
      ),
    ).toBe(true);
    expect(result.highlighted).toEqual(expect.arrayContaining([8, 9, 20]));
  });
});
