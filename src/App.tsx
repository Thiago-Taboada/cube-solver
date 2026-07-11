import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatFaceletNet, serializeCube, type Color } from "./core/cube/FaceletIO";
import { CubeState } from "./core/cube/CubeState";
import { randomScramble } from "./core/cube/Scramble";
import { Header, Footer } from "./ui/Chrome";
import { CubeNet } from "./ui/CubeNet";
import { Cube3DViews } from "./ui/Cube3D";
import { ToolsPanel, type ViewMode } from "./ui/ToolsPanel";
import { SolutionPanel, type TimerStatus } from "./ui/SolutionPanel";
import {
  CENTER_INDICES,
  STICKER_COLORS,
  solvedFaceletColors,
} from "./ui/colors";
import {
  parseCubeInput,
  tryValidateFacelets,
  type FaceletDiagnostic,
  type SolveResult,
  type ValidationStatus,
} from "./ui/cubeInput";
import { solveFacelets } from "./core/solver/Kociemba";
import { useT } from "./i18n";
import "./styles.css";

export function App() {
  const t = useT();
  const [facelets, setFacelets] = useState<Color[]>(() => solvedFaceletColors());
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSticker, setSelectedSticker] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
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

    // Ignore the click/key that started the timer.
    let armed = false;
    const armId = window.setTimeout(() => {
      armed = true;
    }, 0);

    const onStop = (event: Event) => {
      if (!armed) return;
      const target = event.target;
      // Let the timer button handle start/stop itself (avoids stop+restart on click).
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

  const paintSticker = useCallback(
    (index: number) => {
      if (centers.has(index)) return;
      const color = STICKER_COLORS[selectedColor]!.label;
      setFacelets((prev) => {
        const next = [...prev];
        next[index] = color;
        return next;
      });
      setSelectedSticker(index);
      setScrambleMoves(null);
      clearValidation();
    },
    [centers, selectedColor, clearValidation],
  );

  const reset = useCallback(() => {
    setFacelets(solvedFaceletColors());
    setSelectedSticker(null);
    setScrambleMoves(null);
    clearValidation();
  }, [clearValidation]);

  const scramble = useCallback(() => {
    const { moves, facelets: next } = randomScramble();
    setFacelets([...next]);
    setSelectedSticker(null);
    setScrambleMoves(moves);
    clearValidation();
  }, [clearValidation]);

  const importText = useCallback(
    (text: string) => {
      const { facelets: next } = parseCubeInput(text);
      setFacelets(next);
      setSelectedSticker(null);
      setScrambleMoves(null);
      clearValidation();
    },
    [clearValidation],
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
    const content = formatFaceletNet(facelets);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cubo.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [facelets]);

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

      const outcome = solveFacelets(facelets);
      if (!outcome.ok) {
        setValidationStatus("invalid");
        setValidationDiagnostics([]);
        setValidationErrors([outcome.error]);
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
  }, [facelets, t]);

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

  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        <div className="layout">
          <aside className="layout__aside">
            <ToolsPanel
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onImportText={(text) => {
                importText(text);
              }}
              onReset={reset}
              onScramble={scramble}
              onSolve={solve}
              onCopySolution={copySolution}
              hasSolution={solveResult !== null}
              isSolving={isSolving}
              onDownloadExample={downloadExample}
              onExport={exportCube}
              onToggleTimer={toggleTimer}
              timerStatus={timerStatus}
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
                      onStickerClick={paintSticker}
                    />
                  </div>
                  <p className="panel__hint panel__hint--center">
                    {t("cube.flatHint")}
                  </p>
                </>
              ) : (
                <>
                  <Cube3DViews
                    facelets={facelets}
                    selectedSticker={selectedSticker}
                    highlightedStickers={highlightedStickers}
                    onStickerClick={paintSticker}
                  />
                  <p className="panel__hint panel__hint--center">
                    {t("cube.3dHint")}
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
    </div>
  );
}
