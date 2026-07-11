import type { FaceletDiagnostic } from "../core/cube/diagnose";
import type { MessageKey } from "./messages/en";

type Vars = Record<string, string | number>;
type TranslateFn = (key: MessageKey, vars?: Vars) => string;

const COLOR_PARAM_KEYS = new Set(["color", "expected", "actual", "a", "b"]);

/** Turns a structured diagnostic into a localized message. */
export function formatDiagnostic(
  diagnostic: FaceletDiagnostic,
  t: TranslateFn,
): string {
  const resolved: Vars = {};
  const params = diagnostic.params ?? {};

  for (const [key, value] of Object.entries(params)) {
    if (key === "colors" && typeof value === "string") {
      resolved.colors = value
        .split(",")
        .map((c) => t(`color.${c.trim()}.adj` as MessageKey))
        .join(" + ");
      continue;
    }
    if (COLOR_PARAM_KEYS.has(key) && typeof value === "string") {
      resolved[key] = t(`color.${value}.adj` as MessageKey);
      if (key === "color") {
        resolved.colorPlural = t(`color.${value}.plural` as MessageKey);
      }
      continue;
    }
    resolved[key] = value;
  }

  return t(`diag.${diagnostic.code}` as MessageKey, resolved);
}
