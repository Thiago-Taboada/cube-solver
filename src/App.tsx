import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { serializeCube, type Color } from "./core/cube/FaceletIO";
import { CubeState } from "./core/cube/CubeState";
import { randomScramble } from "./core/cube/Scramble";
import {
  applyCenterColorsToLockedBlocks,
  applyJoinPaintColors,
  autoFillFaceLs,
  componentStickers,
  emptyBandageState,
  faceBlockStickers,
  isFaceBlockLockedToCenter,
  stickerToCubie,
  toggleBandage,
  type BandageState,
  type CubieId,
} from "./core/cube/Bandage";
import { Footer } from "./ui/Chrome";
import { CubeNet } from "./ui/CubeNet";
import { Cube3DViews } from "./ui/Cube3D";
import { SettingsFab } from "./ui/SettingsFab";
import { ToolsPanel, type EditMode, type ViewMode } from "./ui/ToolsPanel";
import { SolutionPanel, type TimerStatus } from "./ui/SolutionPanel";
import {
  CENTER_INDICES,
  STICKER_COLORS,
  solvedFaceletColors,
} from "./ui/colors";
import {
  parseCubeInput,
  exportCubeText,
  tryValidateFacelets,
  type FaceletDiagnostic,
  type SolveResult,
  type ValidationStatus,
} from "./ui/cubeInput";
import { solveBandaged } from "./core/solver/BandagedSolver";
import { useT } from "./i18n";
import "./styles.css";

interface EditorSnapshot {
  facelets: Color[];
  bandageEdges: string[];
}

export function App() {
  const t = useT();
  const [facelets, setFacelets] = useState<Color[]>(() => solvedFaceletColors());
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSticker, setSelectedSticker] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [editMode, setEditMode] = useState<EditMode>("paint");
  // The user's own fusion configuration, defined on the solved cube. This is
  // the authoritative bandage: it never shifts on its own, so every scramble
  // starts from the same user intent.
  const [bandageState, setBandageState] = useState<BandageState>(() =>
    emptyBandageState(),
  );
  // When a scramble is applied, the fused pieces move, so the joins must be
  // drawn on their new positions. This holds that scramble-advanced bandage
  // for rendering only; null means "show the base bandage as-is". It never
  // feeds back into a subsequent scramble (which always restarts from base).
  const [displayBandage, setDisplayBandage] = useState<BandageState | null>(
    null,
  );
  const [bandagePick, setBandagePick] = useState<CubieId | null>(null);
  const [bandagePreview, setBandagePreview] = useState<ReadonlySet<number> | null>(
    null,
  );
  // The bandage to render and solve with: the scramble-advanced one while a
  // scramble is showing, otherwise the user's base configuration.
  const effectiveBandage = displayBandage ?? bandageState;
  const [bandageFeedback, setBandageFeedback] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const historyRef = useRef<EditorSnapshot[]>([]);
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>("idle");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationDiagnostics, setValidationDiagnostics] = useState<
    FaceletDiagnostic[]
  >([]);
  const [highlightedStickers, setHighlightedStickers] = useState<Set<number>>(
    () => new Set(),
  );
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrambleMoves, setScrambleMoves] = useState<string[] | null>(null);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [timerMs, setTimerMs] = useState(0);
  const timerStartedAt = useRef<number | null>(null);

  const centers = useMemo(() => CENTER_INDICES, []);

  useEffect(() => {
    if (timerStatus !== "running" || timerStartedAt.current === null) return;

    let frame = 0;
    const tick = () => {
      setTimerMs(performance.now() - timerStartedAt.current!);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [timerStatus]);

  const stopTimer = useCallback(() => {
    if (timerStartedAt.current === null) return;
    const elapsed = performance.now() - timerStartedAt.current;
    timerStartedAt.current = null;
    setTimerMs(elapsed);
    setTimerStatus("stopped");
  }, []);

  useEffect(() => {
    if (timerStatus !== "running") return;

    let armed = false;
    const armId = window.setTimeout(() => {
      armed = true;
    }, 0);

    const onStop = (event: Event) => {
      if (!armed) return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-timer-toggle]")
      ) {
        return;
      }
      stopTimer();
    };

    window.addEventListener("pointerdown", onStop, true);
    window.addEventListener("keydown", onStop, true);
    return () => {
      window.clearTimeout(armId);
      window.removeEventListener("pointerdown", onStop, true);
      window.removeEventListener("keydown", onStop, true);
    };
  }, [timerStatus, stopTimer]);

  const clearValidation = useCallback(() => {
    setValidationStatus("idle");
    setValidationErrors([]);
    setValidationDiagnostics([]);
    setHighlightedStickers(new Set());
    setSolveResult(null);
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setCanUndo(false);
  }, []);

  const pushHistory = useCallback(() => {
    // Snapshot the visible bandage (base, or scramble-advanced if showing).
    // Undo restores it as the base and clears the scramble display bandage.
    historyRef.current.push({
      facelets: [...facelets],
      bandageEdges: [...effectiveBandage],
    });
    setCanUndo(true);
  }, [facelets, effectiveBandage]);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) {
      setCanUndo(false);
      return;
    }
    setFacelets(prev.facelets);
    setBandageState(new Set(prev.bandageEdges));
    setDisplayBandage(null);
    setBandagePick(null);
    setBandagePreview(null);
    setBandageFeedback(null);
    setSelectedSticker(null);
    setScrambleMoves(null);
    clearValidation();
    setCanUndo(historyRef.current.length > 0);
  }, [clearValidation]);

  const changeEditMode = useCallback((mode: EditMode) => {
    setEditMode(mode);
    setBandagePick(null);
    setBandagePreview(null);
    setBandageFeedback(null);
    setSelectedSticker(null);
  }, []);

  const paintSticker = useCallback(
    (index: number) => {
      if (centers.has(index)) return;
      // Groups fused with a face center keep the center color until separated.
      if (isFaceBlockLockedToCenter(index, effectiveBandage)) return;
      const color = STICKER_COLORS[selectedColor]!.label;
      const block = faceBlockStickers(index, effectiveBandage);
      // Skip no-op paints (same color already).
      const wouldChange = block.some(
        (i) =>
          !centers.has(i) &&
          !isFaceBlockLockedToCenter(i, effectiveBandage) &&
          facelets[i] !== color,
      );
      if (!wouldChange) return;

      pushHistory();
      setFacelets((prev) => {
        const next = [...prev];
        for (const i of block) {
          if (!centers.has(i) && !isFaceBlockLockedToCenter(i, effectiveBandage)) {
            next[i] = color;
          }
        }
        return next;
      });
      setSelectedSticker(index);
      setScrambleMoves(null);
      clearValidation();
    },
    [centers, selectedColor, effectiveBandage, facelets, pushHistory, clearValidation],
  );

  const handleBandageClick = useCallback(
    (index: number) => {
      const cubie = stickerToCubie(index);
      setSelectedSticker(index);
      setBandageFeedback(null);

      if (bandagePick === null) {
        setBandagePreview(null);
        setBandagePick(cubie);
        return;
      }

      if (bandagePick === cubie) {
        setBandagePick(null);
        setBandagePreview(null);
        return;
      }

      const next = toggleBandage(effectiveBandage, bandagePick, cubie);
      if (!next) {
        setBandageFeedback(t("edit.bandageBad"));
        setBandagePreview(null);
        setBandagePick(cubie);
        return;
      }

      pushHistory();
      const firstCubie = bandagePick;
      const filled = autoFillFaceLs(next);
      // Editing joins consolidates the currently visible bandage as the new
      // base, so clear the scramble-only display bandage.
      setBandageState(filled);
      setDisplayBandage(null);
      setFacelets((prev) =>
        applyJoinPaintColors(prev, filled, cubie, firstCubie),
      );
      // Solid preview of the new piece; pick cleared so next join starts fresh.
      setBandagePick(null);
      setBandagePreview(new Set(componentStickers(cubie, filled)));
    },
    [bandagePick, effectiveBandage, pushHistory, t],
  );

  const onStickerClick = useCallback(
    (index: number) => {
      if (editMode === "bandage") handleBandageClick(index);
      else paintSticker(index);
    },
    [editMode, handleBandageClick, paintSticker],
  );

  const reset = useCallback(() => {
    setFacelets(solvedFaceletColors());
    setSelectedSticker(null);
    setScrambleMoves(null);
    setBandageState(emptyBandageState());
    setDisplayBandage(null);
    setBandagePick(null);
    setBandagePreview(null);
    setBandageFeedback(null);
    clearHistory();
    clearValidation();
  }, [clearValidation, clearHistory]);

  const scramble = useCallback(() => {
    pushHistory();
    // Always scramble from the solved cube + the user's base bandage, so
    // pressing scramble repeatedly keeps trying fresh sequences from the same
    // starting point instead of compounding the previous scramble.
    const {
      moves,
      facelets: next,
      bandage: nextBandage,
    } = randomScramble(undefined, bandageState);
    // nextBandage = the base fusions advanced to the pieces' scrambled
    // positions; use it only for rendering/solving this scramble.
    setDisplayBandage(nextBandage);
    setFacelets(applyCenterColorsToLockedBlocks([...next], nextBandage));
    setSelectedSticker(null);
    setScrambleMoves(moves);
    clearValidation();
  }, [clearValidation, bandageState, pushHistory]);

  const importText = useCallback(
    (text: string) => {
      pushHistory();
      const { facelets: next, bandage } = parseCubeInput(text);
      setFacelets(next);
      setBandageState(bandage);
      setDisplayBandage(null);
      setBandagePick(null);
      setBandagePreview(null);
      setBandageFeedback(null);
      setSelectedSticker(null);
      setScrambleMoves(null);
      clearValidation();
    },
    [clearValidation, pushHistory],
  );

  const downloadExample = useCallback(() => {
    const content = serializeCube(CubeState.solved());
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cubo_resuelto_ejemplo.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportCube = useCallback(() => {
    // Export the visible state: colors plus the joins on their current
    // (possibly scramble-advanced) positions, so the file round-trips.
    const content = exportCubeText(facelets, effectiveBandage);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cubo.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [facelets, effectiveBandage]);

  const toggleTimer = useCallback(() => {
    if (timerStatus === "running") {
      stopTimer();
      return;
    }

    timerStartedAt.current = performance.now();
    setTimerMs(0);
    setTimerStatus("running");
  }, [timerStatus, stopTimer]);

  const solve = useCallback(() => {
    const result = tryValidateFacelets(facelets);
    if (result.status === "invalid" || !result.cube) {
      setValidationStatus("invalid");
      setValidationDiagnostics(result.diagnostics);
      setValidationErrors([]);
      setHighlightedStickers(new Set(result.highlighted));
      setSolveResult(null);
      return;
    }

    setValidationStatus("valid");
    setValidationErrors([]);
    setValidationDiagnostics([]);
    setHighlightedStickers(new Set());
    setIsSolving(true);

    window.setTimeout(() => {
      const cube = result.cube!;

      if (cube.isSolved()) {
        setSolveResult({
          moves: [],
          moveCount: 0,
          timeMs: 1,
          message: t("solution.cubeSolved"),
        });
        setIsSolving(false);
        return;
      }

      const outcome = solveBandaged(cube, effectiveBandage);
      if (!outcome.ok) {
        const message =
          outcome.error === "BANDAGED_UNSOLVABLE"
            ? t("error.bandagedUnsolvable")
            : outcome.error;
        setValidationStatus("invalid");
        setValidationDiagnostics([]);
        setValidationErrors([message]);
        setHighlightedStickers(new Set());
        setSolveResult(null);
        setIsSolving(false);
        return;
      }

      setSolveResult({
        moves: outcome.moves,
        moveCount: outcome.moves.length,
        timeMs: outcome.timeMs,
      });
      setIsSolving(false);
    }, 30);
  }, [facelets, effectiveBandage, t]);

  const copySolution = useCallback(() => {
    if (!solveResult) return;
    const text =
      solveResult.moves.length > 0
        ? solveResult.moves.join(" ")
        : solveResult.message ?? "";
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [solveResult]);

  const allowCenterClick = editMode === "bandage";

  const paintSelectedStickers = useMemo(() => {
    if (editMode === "paint" && selectedSticker !== null) {
      return new Set(faceBlockStickers(selectedSticker, effectiveBandage));
    }
    if (editMode === "bandage" && bandagePreview) {
      return bandagePreview;
    }
    return null;
  }, [editMode, selectedSticker, effectiveBandage, bandagePreview]);

  const bandageSelectedStickers = useMemo(() => {
    if (editMode !== "bandage" || bandagePick === null) return null;
    return new Set(componentStickers(bandagePick, effectiveBandage));
  }, [editMode, bandagePick, effectiveBandage]);

  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="layout">
          <aside className="layout__aside">
            <ToolsPanel
              selectedColor={selectedColor}
              onSelectColor={(index) => {
                setSelectedColor(index);
                changeEditMode("paint");
              }}
              editMode={editMode}
              onEditModeChange={changeEditMode}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onImportText={(text) => {
                importText(text);
              }}
              onReset={reset}
              onUndo={undo}
              canUndo={canUndo}
              onScramble={scramble}
              onSolve={solve}
              onCopySolution={copySolution}
              hasSolution={solveResult !== null}
              isSolving={isSolving}
              onDownloadExample={downloadExample}
              onExport={exportCube}
              onToggleTimer={toggleTimer}
              timerStatus={timerStatus}
              bandageFeedback={bandageFeedback}
            />
          </aside>

          <section className="layout__center">
            <div className="panel net-panel">
              <h2 className="panel__eyebrow panel__eyebrow--center">
                {viewMode === "flat" ? t("cube.flatTitle") : t("cube.3dTitle")}
              </h2>
              {viewMode === "flat" ? (
                <>
                  <div className="net-panel__scroll">
                    <CubeNet
                      facelets={facelets}
                      selectedSticker={selectedSticker}
                      highlightedStickers={highlightedStickers}
                      selectedBlockStickers={paintSelectedStickers}
                      pickStickers={bandageSelectedStickers}
                      bandageState={effectiveBandage}
                      allowCenterClick={allowCenterClick}
                      onStickerClick={onStickerClick}
                    />                  </div>
                  <p className="panel__hint panel__hint--center">
                    {editMode === "bandage"
                      ? t("edit.bandageHint")
                      : t("cube.flatHint")}
                  </p>
                </>
              ) : (
                <>
                  <Cube3DViews
                    facelets={facelets}
                    selectedSticker={selectedSticker}
                    highlightedStickers={highlightedStickers}
                    selectedBlockStickers={paintSelectedStickers}
                    pickStickers={bandageSelectedStickers}
                    bandageState={effectiveBandage}
                    allowCenterClick={allowCenterClick}
                    onStickerClick={onStickerClick}
                  />
                  <p className="panel__hint panel__hint--center">
                    {editMode === "bandage"
                      ? t("edit.bandageHint")
                      : t("cube.3dHint")}
                  </p>
                </>
              )}
            </div>
          </section>

          <aside className="layout__aside layout__aside--right">
            <SolutionPanel
              solveResult={solveResult}
              scrambleMoves={scrambleMoves}
              validationStatus={validationStatus}
              validationErrors={validationErrors}
              validationDiagnostics={validationDiagnostics}
              isSolving={isSolving}
              timerStatus={timerStatus}
              timerMs={timerMs}
            />
            {copied && (
              <p className="banner banner--ok copy-toast">{t("copy.ok")}</p>
            )}
          </aside>
        </div>
      </main>

      <Footer />
      <SettingsFab />
    </div>
  );
}
