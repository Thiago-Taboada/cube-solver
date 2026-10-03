import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cubeToFacelets,
  serializeCube,
  type Color,
} from "./core/cube/FaceletIO";
import { CubeState } from "./core/cube/CubeState";
import type { Move } from "./core/cube/Move";
import { randomScramble } from "./core/cube/Scramble";
import {
  applyBandageMove,
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
import { TimeHistoryPanel, type SolveRecord } from "./ui/TimeHistoryPanel";
import {
  CENTER_INDICES,
  STICKER_COLORS,
  solvedFaceletColors,
} from "./ui/colors";
import {
  parseAlgorithm,
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
  const [editMode, setEditMode] = useState<EditMode>("orbit");
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
  // Solution playback. `playbackCube` is the validated cube that was solved;
  // applying the first N solution moves to it yields the state at step N.
  // `playbackStep` is that N (0 = initial scrambled state, moves.length =
  // solved). `playbackPlaying` drives the auto-advance timer. When
  // `playbackCube` is null, playback is inactive and editing is allowed.
  const [playbackCube, setPlaybackCube] = useState<CubeState | null>(null);
  const [playbackStep, setPlaybackStep] = useState(0);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scrambleMoves, setScrambleMoves] = useState<string[] | null>(null);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");
  const [timerMs, setTimerMs] = useState(0);
  const timerStartedAt = useRef<number | null>(null);
  // Last 5 finished solves, most recent first.
  const [history, setHistory] = useState<SolveRecord[]>([]);
  const historyIdRef = useRef(0);
  // Current scramble, mirrored in a ref so stopTimer can log it without
  // being recreated on every scramble change.
  const scrambleRef = useRef<string[] | null>(null);

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

  useEffect(() => {
    scrambleRef.current = scrambleMoves;
  }, [scrambleMoves]);

  const stopTimer = useCallback(() => {
    if (timerStartedAt.current === null) return;
    const elapsed = performance.now() - timerStartedAt.current;
    timerStartedAt.current = null;
    setTimerMs(elapsed);
    setTimerStatus("stopped");
    // Record this solve, keeping only the 5 most recent (newest first).
    const record: SolveRecord = {
      id: historyIdRef.current++,
      timeMs: elapsed,
      scramble: scrambleRef.current ? [...scrambleRef.current] : null,
    };
    setHistory((prev) => [record, ...prev].slice(0, 5));
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

  // Clear the stopwatch back to idle (no running timer, no shown time) so the
  // solution panel's time disappears on reset/scramble.
  const resetTimer = useCallback(() => {
    timerStartedAt.current = null;
    setTimerStatus("idle");
    setTimerMs(0);
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
      // Orbit mode is view-only: clicks don't edit, so dragging just orbits.
      if (editMode === "orbit") return;
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
    resetTimer();
    clearHistory();
    clearValidation();
  }, [clearValidation, clearHistory, resetTimer]);

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
    resetTimer();
    clearValidation();
  }, [clearValidation, bandageState, pushHistory, resetTimer]);

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
      resetTimer();
      clearValidation();
    },
    [clearValidation, pushHistory, resetTimer],
  );

  const importAlgorithm = useCallback(
    (text: string) => {
      // Parse the moves first; invalid input throws before mutating state.
      const moves = parseAlgorithm(text);
      pushHistory();
      // Apply from the solved cube so the algorithm defines the mix, same as
      // a scramble. Advance the user's base bandage alongside, so fused
      // pieces end up (and render) on their new positions.
      const cube = CubeState.solved().applySequence(moves);
      let advanced = bandageState;
      for (const move of moves) advanced = applyBandageMove(advanced, move);

      setFacelets(
        applyCenterColorsToLockedBlocks([...cubeToFacelets(cube)], advanced),
      );
      setDisplayBandage(advanced);
      setScrambleMoves(moves);
      setBandagePick(null);
      setBandagePreview(null);
      setBandageFeedback(null);
      setSelectedSticker(null);
      resetTimer();
      clearValidation();
    },
    [bandageState, clearValidation, pushHistory, resetTimer],
  );

  const downloadExample = useCallback(() => {
    const content = serializeCube(CubeState.solved());
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("example.cubeFileName");
    a.click();
    URL.revokeObjectURL(url);
  }, [t]);

  const downloadAlgorithmExample = useCallback(() => {
    const content = `${t("example.algorithmComments")}\nR U R' U' R U2 R' U R U' R'`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("example.algorithmFileName");
    a.click();
    URL.revokeObjectURL(url);
  }, [t]);

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
      // Remember the solved cube so the solution can be stepped/animated on
      // the 3D view later. Playback itself starts paused and inactive.
      setPlaybackCube(cube);
      setPlaybackStep(0);
      setPlaybackPlaying(false);
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

  // --- Solution playback -------------------------------------------------
  const isPlaybackActive = playbackCube !== null;
  const solutionMoves = solveResult?.moves ?? [];

  // Facelets to display while playback is active: the solved cube with the
  // first `playbackStep` solution moves applied. Centers of locked bandage
  // blocks are reapplied so fused groups keep reading as one piece.
  const playbackFacelets = useMemo(() => {
    if (!playbackCube) return null;
    const sliced = solutionMoves.slice(0, playbackStep) as Move[];
    const cube = playbackCube.applySequence(sliced);
    return applyCenterColorsToLockedBlocks(
      [...cubeToFacelets(cube)],
      effectiveBandage,
    );
  }, [playbackCube, solutionMoves, playbackStep, effectiveBandage]);

  const startPlayback = useCallback(() => {
    if (!solveResult || solveResult.moves.length === 0) return;
    // Entering playback is view-only; drop any edit selection so the cube
    // just shows the stepped state (orbit still works).
    setPlaybackStep(0);
    setPlaybackPlaying(true);
    setSelectedSticker(null);
    setBandagePick(null);
    setBandagePreview(null);
  }, [solveResult]);

  // Rewind to the initial scrambled state (step 0) without leaving playback.
  const playbackReset = useCallback(() => {
    setPlaybackPlaying(false);
    setPlaybackStep(0);
  }, []);

  const playbackPrev = useCallback(() => {
    setPlaybackPlaying(false);
    setPlaybackStep((s) => Math.max(0, s - 1));
  }, []);

  const playbackNext = useCallback(() => {
    setPlaybackPlaying(false);
    setPlaybackStep((s) => Math.min(solutionMoves.length, s + 1));
  }, [solutionMoves.length]);

  const playbackTogglePlay = useCallback(() => {
    if (solutionMoves.length === 0) return;
    setPlaybackPlaying((playing) => {
      if (playing) return false;
      // Restart from the beginning if we're already at the end.
      setPlaybackStep((s) => (s >= solutionMoves.length ? 0 : s));
      return true;
    });
  }, [solutionMoves.length]);

  // Jump straight to the state after move `index` (0-based): step = index + 1.
  const playbackJumpTo = useCallback((step: number) => {
    setPlaybackPlaying(false);
    setPlaybackStep(step);
  }, []);

  // Auto-advance while playing; stop when the solved state is reached.
  useEffect(() => {
    if (!playbackPlaying) return;
    if (playbackStep >= solutionMoves.length) {
      setPlaybackPlaying(false);
      return;
    }
    const id = window.setTimeout(() => {
      setPlaybackStep((s) => Math.min(solutionMoves.length, s + 1));
    }, 650);
    return () => window.clearTimeout(id);
  }, [playbackPlaying, playbackStep, solutionMoves.length]);

  // Any edit/scramble/reset that clears the solution also ends playback.
  useEffect(() => {
    if (solveResult === null && playbackCube !== null) {
      setPlaybackCube(null);
      setPlaybackPlaying(false);
      setPlaybackStep(0);
    }
  }, [solveResult, playbackCube]);

  const allowCenterClick = editMode === "bandage" && !isPlaybackActive;

  // While playback is active the cube shows the derived (stepped) state and
  // clicks must not edit; the real editor facelets stay untouched underneath.
  const displayedFacelets = isPlaybackActive
    ? playbackFacelets ?? facelets
    : facelets;
  const onCubeStickerClick = isPlaybackActive ? () => {} : onStickerClick;

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
              onImportAlgorithm={(text) => {
                importAlgorithm(text);
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
              onDownloadAlgorithmExample={downloadAlgorithmExample}
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
                      facelets={displayedFacelets}
                      selectedSticker={isPlaybackActive ? null : selectedSticker}
                      highlightedStickers={highlightedStickers}
                      selectedBlockStickers={
                        isPlaybackActive ? null : paintSelectedStickers
                      }
                      pickStickers={
                        isPlaybackActive ? null : bandageSelectedStickers
                      }
                      bandageState={effectiveBandage}
                      allowCenterClick={allowCenterClick}
                      onStickerClick={onCubeStickerClick}
                    />                  </div>
                  <p className="panel__hint panel__hint--center">
                    {isPlaybackActive
                      ? t("edit.orbitHint")
                      : editMode === "bandage"
                        ? t("edit.bandageHint")
                        : editMode === "orbit"
                          ? t("edit.orbitHint")
                          : t("cube.flatHint")}
                  </p>
                </>
              ) : (
                <>
                  <Cube3DViews
                    facelets={displayedFacelets}
                    selectedSticker={isPlaybackActive ? null : selectedSticker}
                    highlightedStickers={highlightedStickers}
                    selectedBlockStickers={
                      isPlaybackActive ? null : paintSelectedStickers
                    }
                    pickStickers={
                      isPlaybackActive ? null : bandageSelectedStickers
                    }
                    bandageState={effectiveBandage}
                    allowCenterClick={allowCenterClick}
                    onStickerClick={onCubeStickerClick}
                  />
                  <p className="panel__hint panel__hint--center">
                    {isPlaybackActive
                      ? t("edit.orbitHint")
                      : editMode === "bandage"
                        ? t("edit.bandageHint")
                        : editMode === "orbit"
                          ? t("edit.orbitHint")
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
              playbackActive={isPlaybackActive}
              playbackStep={playbackStep}
              playbackPlaying={playbackPlaying}
              onPlaybackStart={startPlayback}
              onPlaybackReset={playbackReset}
              onPlaybackPrev={playbackPrev}
              onPlaybackNext={playbackNext}
              onPlaybackTogglePlay={playbackTogglePlay}
              onPlaybackJumpTo={playbackJumpTo}
            />
            <TimeHistoryPanel records={history} />
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
