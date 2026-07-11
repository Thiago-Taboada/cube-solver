import type { Color } from "../core/cube/FaceletIO";
import { useT } from "../i18n";
import { CENTER_INDICES, hexFor } from "./colors";

type IsoRole = "top" | "bottom" | "front" | "right";

interface FaceSpec {
  /** Facelet start index in URFDLB order */
  start: number;
  role: IsoRole;
  /** How to map local 0–8 grid onto the facelets for correct orientation */
  mapIndex: (local: number) => number;
}

interface Cube3DViewsProps {
  facelets: readonly Color[];
  selectedSticker: number | null;
  highlightedStickers?: ReadonlySet<number>;
  onStickerClick: (index: number) => void;
}

/** Identity map: row-major 0–8 as stored. */
function id(i: number): number {
  return i;
}

/**
 * Rotate a 3×3 face 180° in the plane.
 * Needed on D in the opposite-corner view: the bottom panel’s near edge faces
 * +Z (where we draw B), so D’s B-edge (indices 6–8) must sit on that edge.
 */
function rot180(i: number): number {
  return 8 - i;
}

/**
 * U·F·R corner. After CSS face transforms, each panel’s local grid already
 * matches facelet storage (U/F/R row-major with F-edge / U-edge as in the net):
 * UFR stickers meet at U8 · F2 · R0.
 */
const VIEW_UFR: FaceSpec[] = [
  { start: 0, role: "top", mapIndex: id },
  { start: 18, role: "front", mapIndex: id },
  { start: 9, role: "right", mapIndex: id },
];

/**
 * D·B·L corner (camera from below). B/L use identity so their shared edge
 * lines up; D is rotated 180° so DBL (D6·B8·L6) meets at the near corner.
 */
const VIEW_DBL: FaceSpec[] = [
  { start: 45, role: "front", mapIndex: id },
  { start: 36, role: "right", mapIndex: id },
  { start: 27, role: "bottom", mapIndex: rot180 },
];

export function Cube3DViews({
  facelets,
  selectedSticker,
  highlightedStickers,
  onStickerClick,
}: Cube3DViewsProps) {
  return (
    <div className="cube3d-views">
      <IsoCube
        title="U · F · R"
        faces={VIEW_UFR}
        facelets={facelets}
        selectedSticker={selectedSticker}
        highlightedStickers={highlightedStickers}
        onStickerClick={onStickerClick}
      />
      <IsoCube
        title="D · B · L"
        faces={VIEW_DBL}
        facelets={facelets}
        selectedSticker={selectedSticker}
        highlightedStickers={highlightedStickers}
        onStickerClick={onStickerClick}
        variant="bottom"
      />
    </div>
  );
}

function IsoCube({
  title,
  faces,
  facelets,
  selectedSticker,
  highlightedStickers,
  onStickerClick,
  variant = "top",
}: {
  title: string;
  faces: FaceSpec[];
  facelets: readonly Color[];
  selectedSticker: number | null;
  highlightedStickers?: ReadonlySet<number>;
  onStickerClick: (index: number) => void;
  variant?: "top" | "bottom";
}) {
  const t = useT();

  return (
    <div className="iso-block">
      <h3 className="iso-block__title">{title}</h3>
      <div className={`iso-stage iso-stage--${variant}`}>
        <div className="iso-cube" aria-label={title}>
          {faces.map((face) => (
            <div
              key={face.role}
              className={`iso-face iso-face--${face.role}`}
            >
              {Array.from({ length: 9 }, (_, local) => {
                const faceletIndex = face.start + face.mapIndex(local);
                const color = facelets[faceletIndex]!;
                const isCenter = CENTER_INDICES.has(faceletIndex);
                const selected = selectedSticker === faceletIndex;
                const highlighted =
                  highlightedStickers?.has(faceletIndex) ?? false;
                const light = color === "W" || color === "Y";
                const name = t(`color.${color}`);

                return (
                  <button
                    key={faceletIndex}
                    type="button"
                    disabled={isCenter}
                    className={[
                      "iso-sticker",
                      isCenter ? "iso-sticker--center" : "",
                      selected ? "iso-sticker--selected" : "",
                      highlighted ? "iso-sticker--error" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      backgroundColor: hexFor(color),
                      borderColor: highlighted
                        ? undefined
                        : light
                          ? "rgba(0,0,0,0.14)"
                          : "rgba(0,0,0,0.1)",
                    }}
                    aria-label={`${name}${isCenter ? t("cube.centerFixed") : ""}${highlighted ? t("cube.errorAria") : ""}`}
                    title={`${name}${isCenter ? t("cube.centerTitle") : ""}${highlighted ? t("cube.errorTitle") : ""}`}
                    onClick={() => onStickerClick(faceletIndex)}
                  >
                    {isCenter ? (
                      <span className="iso-sticker__lock">×</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
