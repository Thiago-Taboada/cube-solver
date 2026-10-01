import { useT } from "../i18n";
import { CollapsibleSection } from "./CollapsibleSection";
import { formatTimer } from "./SolutionPanel";

/** One finished solve: how long it took and the scramble that produced it. */
export interface SolveRecord {
  /** Monotonic id for stable list keys (most recent first). */
  id: number;
  /** Elapsed solve time in milliseconds. */
  timeMs: number;
  /** Scramble moves that generated the mixed state, or null if none. */
  scramble: string[] | null;
}

interface TimeHistoryPanelProps {
  /** Records ordered most-recent-first; the panel shows up to 5. */
  records: readonly SolveRecord[];
}

/**
 * History of the user's latest solve times. Lives below the solution panel
 * and lists each entry with its time and the scramble algorithm needed to
 * recreate that mix, newest first.
 */
export function TimeHistoryPanel({ records }: TimeHistoryPanelProps) {
  const t = useT();

  return (
    <div className="panel history-panel">
      <CollapsibleSection title={t("history.title")}>
        {records.length === 0 ? (
          <p className="panel__hint">{t("history.empty")}</p>
        ) : (
          <ol className="history-list">
            {records.map((record) => (
              <li key={record.id} className="history-item">
                <p className="history-item__time">
                  {formatTimer(record.timeMs)}
                  <span className="stats__unit">s</span>
                </p>
                {record.scramble && record.scramble.length > 0 && (
                  <>
                    <p className="history-item__label">
                      {t("history.scrambleLabel")}
                    </p>
                    <p className="history-item__scramble">
                      {record.scramble.join(" ")}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </CollapsibleSection>
    </div>
  );
}
