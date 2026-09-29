import type { CubeState } from "../core/cube/CubeState";
import {
  FaceletParseError,
  cubeToFacelets,
  faceletsToCube,
  formatFaceletNet,
  parseCubeFile,
  parseFaceletNet,
  type Color,
} from "../core/cube/FaceletIO";
import {
  emptyBandageState,
  formatCubeFileWithBandage,
  splitCubeFile,
  type BandageState,
} from "../core/cube/Bandage";
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

export interface ParsedCubeInput {
  facelets: Color[];
  cube: CubeState;
  bandage: BandageState;
}

/** Accepts our net TXT (optional BANDAGE section) or a flat 54-character color string. */
export function parseCubeInput(text: string): ParsedCubeInput {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new FaceletParseError(
      "El archivo está vacío. Debe contener el net de caras o 54 letras (W, R, G, Y, O, B).",
    );
  }

  let bandage: BandageState = emptyBandageState();
  let colorText = trimmed;

  try {
    const split = splitCubeFile(trimmed);
    colorText = split.colorText.trim();
    bandage = split.bandage;
  } catch (error) {
    throw new FaceletParseError(
      error instanceof Error ? error.message : "Bandage inválido",
    );
  }

  try {
    const cube = parseCubeFile(colorText);
    return { facelets: [...cubeToFacelets(cube)], cube, bandage };
  } catch (netError) {
    const flat = colorText.replace(/[\s\n\r\t]/g, "").toUpperCase();
    if (flat.length === 54 && /^[WRGYOB]+$/.test(flat)) {
      const facelets = [...flat] as Color[];
      const cube = faceletsToCube(facelets);
      return { facelets, cube, bandage };
    }
    // Retry full trimmed string in case BANDAGE marker was a false positive in flat files
    try {
      const facelets = [...parseFaceletNet(trimmed)];
      return {
        facelets,
        cube: faceletsToCube(facelets),
        bandage: emptyBandageState(),
      };
    } catch {
      /* fall through */
    }
    if (netError instanceof FaceletParseError) throw netError;
    throw new FaceletParseError(
      netError instanceof Error ? netError.message : "No se pudo leer el cubo",
    );
  }
}

/** Color net + optional BANDAGE pairs. */
export function exportCubeText(
  facelets: readonly Color[],
  bandage: BandageState = emptyBandageState(),
): string {
  return formatCubeFileWithBandage(formatFaceletNet(facelets), bandage);
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
