import { describe, expect, it } from "vitest";
import {
  MOVES,
  faceOf,
  invertMove,
  isMove,
  movePower,
} from "./Move";

describe("Move", () => {
  it("lists 18 face moves", () => {
    expect(MOVES).toHaveLength(18);
  });

  it("isMove accepts only valid tokens", () => {
    expect(isMove("R")).toBe(true);
    expect(isMove("R'")).toBe(true);
    expect(isMove("R2")).toBe(true);
    expect(isMove("r")).toBe(false);
    expect(isMove("Rw")).toBe(false);
  });

  it("invertMove is involutive", () => {
    for (const move of MOVES) {
      expect(invertMove(invertMove(move))).toBe(move);
    }
  });

  it("faceOf and movePower parse modifiers", () => {
    expect(faceOf("R")).toBe("R");
    expect(movePower("R")).toBe(1);
    expect(movePower("R2")).toBe(2);
    expect(movePower("R'")).toBe(3);
  });
});
