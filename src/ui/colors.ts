import type { Color } from "../core/cube/FaceletIO";

export interface StickerColor {
  index: number;
  name: string;
  hex: string;
  label: Color;
}

export const STICKER_COLORS: readonly StickerColor[] = [
  { index: 0, name: "White", hex: "#FFFFFF", label: "W" },
  { index: 1, name: "Red", hex: "#B71234", label: "R" },
  { index: 2, name: "Green", hex: "#009B48", label: "G" },
  { index: 3, name: "Yellow", hex: "#FFD500", label: "Y" },
  { index: 4, name: "Orange", hex: "#FF5800", label: "O" },
  { index: 5, name: "Blue", hex: "#0046AD", label: "B" },
] as const;

export const COLOR_BY_LABEL: Record<Color, StickerColor> = Object.fromEntries(
  STICKER_COLORS.map((c) => [c.label, c]),
) as Record<Color, StickerColor>;

export const CENTER_INDICES = new Set([4, 13, 22, 31, 40, 49]);

export const FACE_LAYOUT = [
  { name: "U", label: "U", startIndex: 0, row: 0, col: 1 },
  { name: "L", label: "L", startIndex: 36, row: 1, col: 0 },
  { name: "F", label: "F", startIndex: 18, row: 1, col: 1 },
  { name: "R", label: "R", startIndex: 9, row: 1, col: 2 },
  { name: "B", label: "B", startIndex: 45, row: 1, col: 3 },
  { name: "D", label: "D", startIndex: 27, row: 2, col: 1 },
] as const;

export function solvedFaceletColors(): Color[] {
  return [
    ..."WWWWWWWWW",
    ..."RRRRRRRRR",
    ..."GGGGGGGGG",
    ..."YYYYYYYYY",
    ..."OOOOOOOOO",
    ..."BBBBBBBBB",
  ] as Color[];
}

export function hexFor(color: Color): string {
  return COLOR_BY_LABEL[color].hex;
}
