import { useRef, useState } from "react";
import { useT } from "../i18n";
import { STICKER_COLORS } from "./colors";

export type ViewMode = "flat" | "3d";
export type EditMode = "paint" | "bandage";

interface ToolsPanelProps {
  selectedColor: number;
  onSelectColor: (index: number) => void;
  editMode: EditMode;
  onEditModeChange: (mode: EditMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onImportText: (text: string) => void;
  onReset: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onScramble: () => void;
  onSolve: () => void;
  onCopySolution: () => void;
  hasSolution: boolean;
  isSolving: boolean;
  onDownloadExample: () => void;
  onExport: () => void;
  onToggleTimer: () => void;
  timerStatus: "idle" | "running" | "stopped";
  bandageFeedback: string | null;
}

export function ToolsPanel({
  selectedColor,
  onSelectColor,
  editMode,
  onEditModeChange,
  viewMode,
  onViewModeChange,
  onImportText,
  onReset,
  onUndo,
  canUndo,
  onScramble,
  onSolve,
  onCopySolution,
  hasSolution,
  isSolving,
  onDownloadExample,
  onExport,
  onToggleTimer,
  timerStatus,
  bandageFeedback,
}: ToolsPanelProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState(false);

  async function handleFile(fileList: FileList | null) {
    setImportError(null);
    setImportOk(false);
    const file = fileList?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setImportError(t("import.txtOnly"));
      return;
    }
    try {
      const text = await file.text();
      onImportText(text);
      setImportOk(true);
      window.setTimeout(() => setImportOk(false), 2500);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : t("import.readError"),
      );
    }
  }

  const timerLabel =
    timerStatus === "running"
      ? t("tools.timerStop")
      : timerStatus === "stopped"
        ? t("tools.timerRestart")
        : t("tools.timer");

  return (
    <div className="panel tools-panel">
      <section>
        <h4 className="panel__eyebrow">{t("palette.title")}</h4>
        <div className="palette">
          {STICKER_COLORS.map((color) => {
            const name = t(`color.${color.label}`);
            return (
              <button
                key={color.index}
                type="button"
                className={`palette__swatch${selectedColor === color.index ? " palette__swatch--active" : ""}`}
                style={{ backgroundColor: color.hex }}
                title={name}
                aria-label={t("palette.select", { name })}
                onClick={() => onSelectColor(color.index)}
              />
            );
          })}
        </div>
        <p className="panel__hint">{t("palette.hint")}</p>
      </section>

      <hr className="panel__rule" />

      <section>
        <h4 className="panel__eyebrow">{t("edit.title")}</h4>
        <div className="view-toggle" role="group" aria-label={t("edit.title")}>
          <button
            type="button"
            className={`view-toggle__btn${editMode === "paint" ? " view-toggle__btn--active" : ""}`}
            onClick={() => onEditModeChange("paint")}
          >
            <i className="ri-paint-brush-line" aria-hidden />
            <span className="view-toggle__label">{t("edit.paint")}</span>
          </button>
          <button
            type="button"
            className={`view-toggle__btn${editMode === "bandage" ? " view-toggle__btn--active" : ""}`}
            onClick={() => onEditModeChange("bandage")}
          >
            <i className="ri-links-line" aria-hidden />
            <span className="view-toggle__label">{t("edit.bandage")}</span>
          </button>
        </div>
        {editMode === "bandage" && (
          <p className="panel__hint">{t("edit.bandageHint")}</p>
        )}
        {bandageFeedback && (
          <p className="banner banner--error">{bandageFeedback}</p>
        )}
      </section>

      <hr className="panel__rule" />

      <section>
        <h4 className="panel__eyebrow">{t("view.title")}</h4>
        <div className="view-toggle" role="group" aria-label={t("view.type")}>
          <button
            type="button"
            className={`view-toggle__btn${viewMode === "flat" ? " view-toggle__btn--active" : ""}`}
            onClick={() => onViewModeChange("flat")}
          >
            <i className="ri-layout-grid-line" aria-hidden />
            <span className="view-toggle__label">{t("view.flat")}</span>
          </button>
          <button
            type="button"
            className={`view-toggle__btn${viewMode === "3d" ? " view-toggle__btn--active" : ""}`}
            onClick={() => onViewModeChange("3d")}
          >
            <i className="ri-box-3-line" aria-hidden />
            <span className="view-toggle__label">{t("view.3d")}</span>
          </button>
        </div>
      </section>

      <hr className="panel__rule" />

      <section>
        <h4 className="panel__eyebrow">{t("tools.title")}</h4>
        <div className="tools">
          <input
            ref={inputRef}
            id="cube-file-input"
            type="file"
            accept=".txt,text/plain"
            className="sr-only"
            onChange={(e) => {
              void handleFile(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => inputRef.current?.click()}
          >
            <i className="ri-file-upload-line" aria-hidden />
            {t("tools.import")}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onExport}>
            <i className="ri-file-download-line" aria-hidden />
            {t("tools.export")}
          </button>

          {importError && <p className="banner banner--error">{importError}</p>}
          {importOk && <p className="banner banner--ok">{t("import.ok")}</p>}

          <button
            type="button"
            className="link-btn"
            onClick={onDownloadExample}
          >
            {t("tools.example")}
          </button>

          <hr className="panel__rule panel__rule--tight" />

          <button type="button" className="btn btn--ghost" onClick={onReset}>
            <i className="ri-refresh-line" aria-hidden />
            {t("tools.reset")}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <i className="ri-arrow-go-back-line" aria-hidden />
            {t("tools.undo")}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onScramble}>
            <i className="ri-shuffle-line" aria-hidden />
            {t("tools.scramble")}
          </button>
          <button
            type="button"
            className={`btn btn--ghost${timerStatus === "running" ? " btn--timer-active" : ""}`}
            data-timer-toggle
            onClick={onToggleTimer}
          >
            <i
              className={
                timerStatus === "running"
                  ? "ri-stop-circle-line"
                  : "ri-timer-line"
              }
              aria-hidden
            />
            {timerLabel}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onSolve}
            disabled={isSolving}
          >
            <i className="ri-play-fill" aria-hidden />
            {isSolving ? t("tools.solving") : t("tools.solve")}
          </button>
          {hasSolution && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onCopySolution}
            >
              <i className="ri-file-copy-line" aria-hidden />
              {t("tools.copy")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
