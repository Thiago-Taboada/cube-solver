import { formatDiagnostic, useT } from "../i18n";
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
          <section>
            <h4 className="panel__eyebrow">{t("solution.validation")}</h4>
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
          </section>
          {(showSolution || isSolving || showTimerStats) && (
            <hr className="panel__rule" />
          )}
        </>
      )}

      {showTimerStats && (
        <>
          <section>
            <h4 className="panel__eyebrow">{t("solution.stats")}</h4>
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
          </section>
          {(showSolution || showScramble) && <hr className="panel__rule" />}
        </>
      )}

      {showSolution && (
        <section>
          <h4 className="panel__eyebrow">{t("solution.algorithm")}</h4>
          <div className="algo">
            <p className="algo__text">
              {solveResult.moves.length === 0
                ? t("solution.alreadySolved")
                : formatMoves(solveResult.moves)}
            </p>
          </div>
          {solveResult.message && (
            <p className="panel__hint" style={{ marginTop: "0.75rem" }}>
              {solveResult.message}
            </p>
          )}
        </section>
      )}

      {showScramble && (
        <section>
          <h4 className="panel__eyebrow">{t("solution.algorithm")}</h4>
          <div className="algo">
            <p className="algo__text">{formatMoves(scrambleMoves)}</p>
          </div>
          <p className="panel__hint" style={{ marginTop: "0.75rem" }}>
            {renderWithAction(
              t("solution.scrambleHint", { count: scrambleMoves.length }),
              t("tools.solve"),
            )}
          </p>
        </section>
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
  const lines: string[] = [];
  for (let i = 0; i < moves.length; i += 10) {
    lines.push(moves.slice(i, i + 10).join(" "));
  }
  return lines.join("\n");
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
