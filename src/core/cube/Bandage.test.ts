import { describe, expect, it } from "vitest";
import {
  areCubiesAdjacent,
  applyCenterColorsToLockedBlocks,
  applyJoinPaintColors,
  autoFillFaceLs,
  emptyBandageState,
  faceBlockStickers,
  formatCubeFileWithBandage,
  isFaceBlockLockedToCenter,
  sameBandageComponent,
  splitCubeFile,
  stickerJoins,
  stickerToCubie,
  toggleBandage,
} from "./Bandage";

describe("Bandage", () => {
  it("maps corner / edge / center stickers to cubies", () => {
    expect(stickerToCubie(8)).toBe("C0"); // URF on U
    expect(stickerToCubie(9)).toBe("C0"); // URF on R
    expect(stickerToCubie(5)).toBe("E0"); // UR on U
    expect(stickerToCubie(4)).toBe("U"); // U center
    expect(stickerToCubie(22)).toBe("F"); // F center
  });

  it("detects orthogonal cubie adjacency only", () => {
    expect(areCubiesAdjacent("C0", "E0")).toBe(true); // URF–UR
    expect(areCubiesAdjacent("C0", "E1")).toBe(true); // URF–UF
    expect(areCubiesAdjacent("C0", "E8")).toBe(true); // URF–FR
    expect(areCubiesAdjacent("E1", "F")).toBe(true); // UF–F center
    expect(areCubiesAdjacent("C0", "C1")).toBe(false); // diagonal corners
    expect(areCubiesAdjacent("C0", "E2")).toBe(false); // not neighbors
  });

  it("toggles bandage only for adjacent cubies", () => {
    const empty = emptyBandageState();
    expect(toggleBandage(empty, "C0", "C1")).toBeNull();

    const linked = toggleBandage(empty, "C0", "E0");
    expect(linked).not.toBeNull();
    expect(sameBandageComponent(linked!, "C0", "E0")).toBe(true);

    const unlinked = toggleBandage(linked!, "C0", "E0");
    expect(sameBandageComponent(unlinked!, "C0", "E0")).toBe(false);
  });

  it("hides face seams between bandaged adjacent stickers", () => {
    let state = emptyBandageState();
    state = toggleBandage(state, "C0", "E0")!; // URF + UR
    // U face: URF=8 and UR=5 share a vertical edge (8 below 5? 5 is mid-right, 8 is bottom-right → 5 is north of 8)
    const joins8 = stickerJoins(8, state);
    expect(joins8.n).toBe(true);
    expect(joins8.w).toBe(false);

    const joins5 = stickerJoins(5, state);
    expect(joins5.s).toBe(true);
  });

  it("lists face-block stickers for painting", () => {
    let state = emptyBandageState();
    state = toggleBandage(state, "C0", "E0")!;
    state = toggleBandage(state, "E0", "C3")!;
    // U right column: 2, 5, 8
    const block = faceBlockStickers(5, state).sort((a, b) => a - b);
    expect(block).toEqual([2, 5, 8]);
  });

  it("auto-joins the face center when an L wraps it", () => {
    // L face: BL(39)=E10, DBL(42)=C6, DL(43)=E6 → L tromino around center
    let state = emptyBandageState();
    state = toggleBandage(state, "E10", "C6")!;
    state = toggleBandage(state, "C6", "E6")!;
    expect(sameBandageComponent(state, "E10", "L")).toBe(false);

    state = autoFillFaceLs(state);
    expect(sameBandageComponent(state, "E10", "L")).toBe(true);
    expect(sameBandageComponent(state, "E6", "L")).toBe(true);
    // Face block should become the 2×2: 39,40,42,43
    const block = faceBlockStickers(39, state).sort((a, b) => a - b);
    expect(block).toEqual([39, 40, 42, 43]);
  });

  it("fills any face L (not only around center)", () => {
    // U face top-left L without center: ULB(0)=C2, UB(1)=E3, UL(3)=E2
    // Completing 2×2 needs U center(4)=U — wait pattern [0,1,3] missing 4 is center.
    // Corner L of edges only isn't possible without center in 2x2...
    // Use pattern missing a corner: {1,3,4} missing 0 = ULB
    let state = emptyBandageState();
    state = toggleBandage(state, "E3", "U")!; // UB–U
    state = toggleBandage(state, "U", "E2")!; // U–UL
    // L is {1,3,4} on U; fill corner C2 by joining to E3 and E2
    expect(sameBandageComponent(state, "E3", "C2")).toBe(false);
    state = autoFillFaceLs(state);
    expect(sameBandageComponent(state, "E3", "C2")).toBe(true);
    expect(sameBandageComponent(state, "E2", "C2")).toBe(true);
    const block = faceBlockStickers(0, state).sort((a, b) => a - b);
    expect(block).toEqual([0, 1, 3, 4]);
  });

  it("locks face-blocks that include the center", () => {
    let state = emptyBandageState();
    state = toggleBandage(state, "E1", "F")!; // UF–F on front
    expect(isFaceBlockLockedToCenter(19, state)).toBe(true); // F1 = UF
    expect(isFaceBlockLockedToCenter(22, state)).toBe(true); // F center
    expect(isFaceBlockLockedToCenter(18, state)).toBe(false); // F0 alone

    const facelets = [
      ..."WWWWWWWWW",
      ..."RRRRRRRRR",
      ..."GGGGGGGGG",
      ..."YYYYYYYYY",
      ..."OOOOOOOOO",
      ..."BBBBBBBBB",
    ];
    facelets[19] = "Y";
    state = emptyBandageState();
    state = toggleBandage(state, "E1", "F")!;
    const synced = applyCenterColorsToLockedBlocks(facelets, state);
    expect(synced[19]).toBe("G");
    expect(synced[22]).toBe("G");
  });

  it("paints non-center face-blocks with the first-click color", () => {
    let state = emptyBandageState();
    state = toggleBandage(state, "C0", "E0")!; // URF–UR on U: stickers 8 and 5
    const facelets = [
      ..."WWWWWWWWW",
      ..."RRRRRRRRR",
      ..."GGGGGGGGG",
      ..."YYYYYYYYY",
      ..."OOOOOOOOO",
      ..."BBBBBBBBB",
    ];
    // First cubie E0 (UR): U sticker blue, R sticker stays red
    facelets[5] = "B";
    const synced = applyJoinPaintColors(facelets, state, "C0", "E0");
    expect(synced[5]).toBe("B");
    expect(synced[8]).toBe("B");
    // Same edge on R must keep first cubie's R color, not leak U's blue
    expect(synced[10]).toBe("R"); // E0 R sticker = R+1 = 10
    expect(synced[9]).toBe("R"); // C0 R sticker if in R face-block with E0
    expect(synced[4]).toBe("W");
  });

  it("round-trips bandage section in cube TXT", () => {
    let state = emptyBandageState();
    state = toggleBandage(state, "C0", "E0")!;
    state = toggleBandage(state, "E1", "F")!;
    const net = "    WWW\n    WWW\n    WWW\n\nOOO GGG RRR BBB\nOOO GGG RRR BBB\nOOO GGG RRR BBB\n\n    YYY\n    YYY\n    YYY\n";
    const file = formatCubeFileWithBandage(net, state);
    expect(file).toContain("BANDAGE");
    expect(file).toContain("C0|E0");
    expect(file).toContain("E1|F");

    const { colorText, bandage } = splitCubeFile(file);
    expect(colorText).not.toContain("BANDAGE");
    expect(bandage.has("C0|E0")).toBe(true);
    expect(bandage.has("E1|F")).toBe(true);

    const emptyFile = formatCubeFileWithBandage(net, emptyBandageState());
    expect(emptyFile).not.toContain("BANDAGE");
    expect(splitCubeFile(emptyFile).bandage.size).toBe(0);
  });
});
