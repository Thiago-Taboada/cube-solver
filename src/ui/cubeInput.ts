import type { CubeState } from "../core/cube/CubeState";
import {
  FaceletParseError,
  cubeToFacelets,
  faceletsToCube,
  parseCubeFile,
  type Color,
} from "../core/cube/FaceletIO";
import {
  diagnoseFacelets,
  type FaceletDiagnostic,
} from "../core/cube/diagnose";

export type ValidationStatus = "idle" | "valid" | "invalid";

export interface SolveResult {
  moves: string[];
  moveCount: number;
  timeMs: number;
  pending?: boolean;
  message?: string;
}

export type { FaceletDiagnostic };

/** Accepts our net TXT or a flat 54-character color string. */
export function parseCubeInput(text: string): {
  facelets: Color[];
  cube: CubeState;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new FaceletParseError(
      "El archivo está vacío. Debe contener el net de caras o 54 letras (W, R, G, Y, O, B).",
    );
  }

  try {
    const cube = parseCubeFile(trimmed);
    return { facelets: [...cubeToFacelets(cube)], cube };
  } catch (netError) {
    const flat = trimmed.replace(/[\s\n\r\t]/g, "").toUpperCase();
    if (flat.length === 54 && /^[WRGYOB]+$/.test(flat)) {
      const facelets = [...flat] as Color[];
      const cube = faceletsToCube(facelets);
      return { facelets, cube };
    }
    if (netError instanceof FaceletParseError) throw netError;
    throw new FaceletParseError(
      netError instanceof Error ? netError.message : "No se pudo leer el cubo",
    );
  }
}

export function tryValidateFacelets(facelets: readonly Color[]): {
  status: ValidationStatus;
  errors: string[];
  diagnostics: FaceletDiagnostic[];
  highlighted: number[];
  cube: CubeState | null;
} {
  const result = diagnoseFacelets(facelets);
  if (result.ok && result.cube) {
    return {
      status: "valid",
      errors: [],
      diagnostics: [],
      highlighted: [],
      cube: result.cube,
    };
  }
  return {
    status: "invalid",
    errors: [],
    diagnostics: result.diagnostics,
    highlighted: result.highlighted,
    cube: null,
  };
}
