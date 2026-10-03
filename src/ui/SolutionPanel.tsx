import { formatDiagnostic, useT } from "../i18n";
import { CollapsibleSection } from "./CollapsibleSection";
import type { FaceletDiagnostic, SolveResult, ValidationStatus } from "./cubeInput";

export type TimerStatus = "idle" | "running" | "stopped";

interface SolutionPanelProps {
  solveResult: SolveResult | null;
  scrambleMoves: string[] | null;
  validationStatus: ValidationStatus;
  validationErrors: string[];
  validationDiagnostics: FaceletDiagnostic[];
  isSolving: boolean;
  timerStatus: TimerStatus;
  timerMs: number;
  playbackActive: boolean;
  playbackStep: number;
  playbackPlaying: boolean;
  onPlaybackStart: () => void;
  onPlaybackReset: () => void;
  onPlaybackPrev: () => void;
  onPlaybackNext: () => void;
  onPlaybackTogglePlay: () => void;
  onPlaybackJumpTo: (step: number) => void;
}

export function SolutionPanel({
  solveResult,
  scrambleMoves,
  validationStatus,
  validationErrors,
  validationDiagnostics,
  isSolving,
  timerStatus,
  timerMs,
  playbackActive,
  playbackStep,
  playbackPlaying,
  onPlaybackStart,
  onPlaybackReset,
  onPlaybackPrev,
  onPlaybackNext,
  onPlaybackTogglePlay,
  onPlaybackJumpTo,
}: SolutionPanelProps) {
  const t = useT();
  const showValidation = validationStatus !== "idle";
  const showSolution = solveResult !== null;
  const showScramble =
    !showSolution && scrambleMoves !== null && scrambleMoves.length > 0;
  const showTimerStats = timerStatus !== "idle";
  const showEmpty =
    !showSolution &&
    !showScramble &&
    !isSolving &&
    !showValidation &&
    !showTimerStats;

  const errorMessages =
    validationDiagnostics.length > 0
      ? validationDiagnostics.map((d) => formatDiagnostic(d, t))
      : validationErrors;

  return (
    <div className="panel solution-panel">
      {showValidation && (
        <>
          <CollapsibleSection title={t("solution.validation")}>
            <StatusBadge status={validationStatus} />
            {errorMessages.length > 0 && (
              <ul className="error-list">
                {errorMessages.map((message) => (
                  <li key={message} className="banner banner--error">
                    {message}
                  </li>
                ))}
              </ul>
            )}
            {validationStatus === "invalid" && errorMessages.length > 0 && (
              <p className="panel__hint" style={{ marginTop: "0.75rem" }}>
                {t("solution.errorHint")}
              </p>
            )}
          </CollapsibleSection>
          {(showSolution || isSolving || showTimerStats) && (
            <hr className="panel__rule" />
          )}
        </>
      )}

      {showTimerStats && (
        <>
          <CollapsibleSection title={t("solution.stats")}>
            <div className="stats stats--single">
              <div className="stats__card">
                <p className="stats__value">
                  {formatTimer(timerMs)}
                  <span className="stats__unit">s</span>
                </p>
                <p className="stats__label">
                  {timerStatus === "running"
                    ? t("solution.timer")
                    : t("solution.time")}
                </p>
              </div>
            </div>
          </CollapsibleSection>
          {(showSolution || showScramble) && <hr className="panel__rule" />}
        </>
      )}

      {showSolution && (
        <CollapsibleSection title={t("solution.algorithm")}>
          {solveResult.moves.length === 0 ? (
            <div className="algo">
              <p className="algo__text">{t("solution.alreadySolved")}</p>
            </div>
          ) : (
            <>
              <div className="algo">
                <p className="algo__text algo__text--moves">
                  {solveResult.moves.map((move, i) => {
                    // During playback, `playbackStep` moves have been applied.
                    // Highlight the move about to run (index === step) and dim
                    // the ones already executed (index < step).
                    const done = playbackActive && i < playbackStep;
                    const current = playbackActive && i === playbackStep;
                    return (
                      <button
                        key={`${move}-${i}`}
                        type="button"
                        className={`algo__move${done ? " algo__move--done" : ""}${
                          current ? " algo__move--current" : ""
                        }`}
                        // Jumping lands on the state *after* this move.
                        onClick={() => onPlaybackJumpTo(i + 1)}
                        title={t("playback.hint")}
                      >
                        {move}
                      </button>
                    );
                  })}
                </p>
              </div>

              <div className="playback">
                {!playbackActive ? (
                  <button
                    type="button"
                    className="btn btn--secondary playback__start"
                    onClick={onPlaybackStart}
                  >
                    <i className="ri-play-circle-line" aria-hidden />
                    {t("playback.start")}
                  </button>
                ) : (
                  <>
                    <div
                      className="playback__controls"
                      role="group"
                      aria-label={t("playback.start")}
                    >
                      <button
                        type="button"
                        className="playback__btn"
                        onClick={onPlaybackPrev}
                        disabled={playbackStep <= 0}
                        aria-label={t("playback.prev")}
                        title={t("playback.prev")}
                      >
                        <i className="ri-skip-back-mini-line" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="playback__btn playback__btn--primary"
                        onClick={onPlaybackTogglePlay}
                        aria-label={
                          playbackPlaying
                            ? t("playback.pause")
                            : t("playback.play")
                        }
                        title={
                          playbackPlaying
                            ? t("playback.pause")
                            : t("playback.play")
                        }
                      >
                        <i
                          className={
                            playbackPlaying ? "ri-pause-fill" : "ri-play-fill"
                          }
                          aria-hidden
                        />
                      </button>
                      <button
                        type="button"
                        className="playback__btn"
                        onClick={onPlaybackNext}
                        disabled={playbackStep >= solveResult.moves.length}
                        aria-label={t("playback.next")}
                        title={t("playback.next")}
                      >
                        <i className="ri-skip-forward-mini-line" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="playback__btn playback__btn--exit"
                        onClick={onPlaybackReset}
                        disabled={playbackStep <= 0}
                        aria-label={t("playback.reset")}
                        title={t("playback.reset")}
                      >
                        <i className="ri-restart-line" aria-hidden />
                      </button>
                    </div>
                    <p className="playback__progress">
                      {t("playback.progress", {
                        current: playbackStep,
                        total: solveResult.moves.length,
                      })}
                    </p>
                  </>
                )}
                <p className="panel__hint">{t("playback.hint")}</p>
              </div>
            </>
          )}
          {solveResult.message && (
            <p className="panel__hint" style={{ marginTop: "0.75rem" }}>
              {solveResult.message}
            </p>
          )}
        </CollapsibleSection>
      )}

      {showScramble && (
        <CollapsibleSection title={t("solution.algorithm")}>
          <div className="algo">
            <p className="algo__text">{formatMoves(scrambleMoves)}</p>
          </div>
          <p className="panel__hint" style={{ marginTop: "0.75rem" }}>
            {renderWithAction(
              t("solution.scrambleHint", { count: scrambleMoves.length }),
              t("tools.solve"),
            )}
          </p>
        </CollapsibleSection>
      )}

      {showEmpty && (
        <div className="solution-empty">
          <div className="solution-empty__icon">
            <i className="ri-stack-line" aria-hidden />
          </div>
          <p>{renderWithAction(t("solution.empty"), t("tools.solve"))}</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ValidationStatus }) {
  const t = useT();
  if (status === "valid") {
    return (
      <span className="badge badge--ok">
        <i className="ri-check-line" aria-hidden />
        {t("solution.valid")}
      </span>
    );
  }
  if (status === "invalid") {
    return (
      <span className="badge badge--bad">
        <i className="ri-close-line" aria-hidden />
        {t("solution.invalid")}
      </span>
    );
  }
  return (
    <span className="badge badge--idle">
      <i className="ri-subtract-line" aria-hidden />
      {t("solution.idle")}
    </span>
  );
}

function formatMoves(moves: string[]): string {
  // Join with spaces and let the container wrap by width (.algo__text uses
  // pre-wrap), instead of forcing a hard line break every 10 moves.
  return moves.join(" ");
}

function renderWithAction(template: string, action: string) {
  const parts = template.split("{action}");
  if (parts.length === 1) return template;
  return (
    <>
      {parts[0]}
      <strong>{action}</strong>
      {parts.slice(1).join("{action}")}
    </>
  );
}

export function formatTimer(ms: number): string {
  return (ms / 1000).toFixed(3);
}
