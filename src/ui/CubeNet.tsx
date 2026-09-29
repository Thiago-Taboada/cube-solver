import type { BandageState } from "../core/cube/Bandage";
import { joinClassNames, stickerJoins } from "../core/cube/Bandage";
import type { Color } from "../core/cube/FaceletIO";
import { useT } from "../i18n";
import { CENTER_INDICES, FACE_LAYOUT, hexFor } from "./colors";

interface CubeNetProps {
  facelets: readonly Color[];
  selectedSticker: number | null;
  highlightedStickers?: ReadonlySet<number>;
  /** Paint-mode: stickers in the selected face block (solid outline). */
  selectedBlockStickers?: ReadonlySet<number> | null;
  /** Bandage-mode: stickers of the pending pick (dotted outline). */
  pickStickers?: ReadonlySet<number> | null;
  bandageState: BandageState;
  allowCenterClick?: boolean;
  onStickerClick: (index: number) => void;
}

export function CubeNet({
  facelets,
  selectedSticker,
  highlightedStickers,
  selectedBlockStickers,
  pickStickers,
  bandageState,
  allowCenterClick = false,
  onStickerClick,
}: CubeNetProps) {
  return (
    <div className="cube-net">
      {[0, 1, 2].map((row) => (
        <div key={row} className="cube-net__row">
          {[0, 1, 2, 3].map((col) => {
            const face = FACE_LAYOUT.find((f) => f.row === row && f.col === col);
            if (!face) {
              return (
                <div key={`empty-${row}-${col}`} className="cube-net__spacer" />
              );
            }
            return (
              <FaceGrid
                key={face.name}
                label={face.label}
                startIndex={face.startIndex}
                facelets={facelets}
                selectedSticker={selectedSticker}
                highlightedStickers={highlightedStickers}
                selectedBlockStickers={selectedBlockStickers}
                pickStickers={pickStickers}
                bandageState={bandageState}
                allowCenterClick={allowCenterClick}
                onStickerClick={onStickerClick}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FaceGrid({
  label,
  startIndex,
  facelets,
  selectedSticker,
  highlightedStickers,
  selectedBlockStickers,
  pickStickers,
  bandageState,
  allowCenterClick,
  onStickerClick,
}: {
  label: string;
  startIndex: number;
  facelets: readonly Color[];
  selectedSticker: number | null;
  highlightedStickers?: ReadonlySet<number>;
  selectedBlockStickers?: ReadonlySet<number> | null;
  pickStickers?: ReadonlySet<number> | null;
  bandageState: BandageState;
  allowCenterClick: boolean;
  onStickerClick: (index: number) => void;
}) {
  const t = useT();

  return (
    <div className="face-grid">
      <div className="face-grid__label">{label}</div>
      <div className="face-grid__stickers">
        {Array.from({ length: 9 }, (_, i) => {
          const index = startIndex + i;
          const color = facelets[index]!;
          const isCenter = CENTER_INDICES.has(index);
          const inBlock = selectedBlockStickers?.has(index) ?? false;
          const inPick = pickStickers?.has(index) ?? false;
          const selected = selectedSticker === index && !inBlock && !inPick;
          const highlighted = highlightedStickers?.has(index) ?? false;
          const light = color === "W" || color === "Y";
          const name = t(`color.${color}`);
          const joins = stickerJoins(index, bandageState);
          const joinClasses = joinClassNames(joins, "sticker");

          return (
            <button
              key={index}
              type="button"
              disabled={isCenter && !allowCenterClick}
              className={[
                "sticker",
                isCenter ? "sticker--center" : "",
                selected ? "sticker--selected" : "",
                inBlock ? "sticker--block-selected" : "",
                inPick ? "sticker--block-pick" : "",
                highlighted ? "sticker--error" : "",
                joinClasses,
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                backgroundColor: hexFor(color),
                borderColor: highlighted
                  ? undefined
                  : light
                    ? "rgba(0,0,0,0.12)"
                    : "rgba(0,0,0,0.08)",
              }}
              aria-label={`Sticker ${label}${i + 1} - ${name}${isCenter ? t("cube.centerFixed") : ""}${highlighted ? t("cube.errorAria") : ""}`}
              title={`${name}${isCenter ? t("cube.centerTitle") : ""}${highlighted ? t("cube.errorTitle") : ""}`}
              onClick={() => onStickerClick(index)}
            >
              {isCenter ? <span className="sticker__lock">×</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
