import type { EnMessages } from "./en";

export const es: EnMessages = {
  "brand.title": "Cube Solver",
  "brand.sub": "Cubo de Rubik 3×3",
  "theme.toLight": "Cambiar a tema claro",
  "theme.toDark": "Cambiar a tema oscuro",
  "theme.light": "Tema claro",
  "theme.dark": "Tema oscuro",
  "lang.label": "Idioma",
  "footer.rights": "Todos los derechos reservados.",

  "palette.title": "Paleta de colores",
  "palette.hint": "Selecciona un color y haz clic en un sticker para pintarlo.",
  "palette.select": "Seleccionar color {name}",
  "edit.title": "Modo de edición",
  "edit.paint": "Pintar",
  "edit.bandage": "Bandaged",
  "edit.bandageHint":
    "Haz clic en una pieza y luego en una adyacente para unirlas o separarlas. Solo vecinos ortogonales.",
  "edit.bandageBad": "Esas piezas no son adyacentes.",
  "view.title": "Visualización",
  "view.type": "Tipo de vista",
  "view.flat": "Vista plana",
  "view.3d": "Vista 3D",
  "tools.title": "Herramientas",
  "tools.import": "Importar TXT",
  "tools.export": "Exportar TXT",
  "tools.example": "Descargar archivo de ejemplo",
  "tools.reset": "Restablecer",
  "tools.undo": "Deshacer",
  "tools.scramble": "Mezclar",
  "tools.timer": "Cronometrar",
  "tools.timerStop": "Detener",
  "tools.timerRestart": "Reiniciar",
  "tools.solve": "Resolver",
  "tools.solving": "Resolviendo…",
  "tools.copy": "Copiar solución",
  "import.ok": "Archivo importado correctamente.",
  "import.txtOnly": "Solo se permiten archivos .txt",
  "import.readError": "Error al leer el archivo.",
  "copy.ok": "¡Solución copiada al portapapeles!",

  "cube.flatTitle": "Cubo desplegado",
  "cube.3dTitle": "Cubo 3D",
  "cube.flatHint":
    "Los centros × son fijos.",
  "cube.3dHint":
    "Dos ángulos del cubo: U·F·R (blanco arriba) y D·B·L (amarillo abajo). Los centros × son fijos.",
  "cube.centerFixed": " (centro fijo)",
  "cube.centerTitle": " — Centro (fijo)",
  "cube.errorTitle": " — Revisar",
  "cube.errorAria": " (error)",

  "color.W": "Blanco",
  "color.R": "Rojo",
  "color.G": "Verde",
  "color.Y": "Amarillo",
  "color.O": "Naranja",
  "color.B": "Azul",
  "color.W.adj": "blanco",
  "color.R.adj": "rojo",
  "color.G.adj": "verde",
  "color.Y.adj": "amarillo",
  "color.O.adj": "naranja",
  "color.B.adj": "azul",
  "color.W.plural": "blancos",
  "color.R.plural": "rojos",
  "color.G.plural": "verdes",
  "color.Y.plural": "amarillos",
  "color.O.plural": "naranjas",
  "color.B.plural": "azules",

  "diag.need54": "Se necesitan 54 stickers; hay {count}.",
  "diag.countExcess":
    "Hay {count} stickers {colorPlural}; solo puede haber 9.",
  "diag.countMissing":
    "Faltan stickers {colorPlural}: hay {count} y deben ser 9.",
  "diag.centerWrong":
    "El centro de la cara {face} debe ser {expected}, no {actual}.",
  "diag.cornerRepeat":
    "La esquina {piece} tiene colores repetidos ({colors}). Cada esquina debe tener 3 colores distintos.",
  "diag.cornerOpposite":
    "Pieza imposible en la esquina {piece}: {colors}. Incluye colores opuestos ({a} y {b}) que nunca comparten una esquina.",
  "diag.cornerNoUD":
    "La esquina {piece} ({colors}) no tiene blanco ni amarillo. Toda esquina debe tocar U o D.",
  "diag.cornerImpossible":
    "Pieza imposible en la esquina {piece}: {colors}. Esa combinación no existe en un cubo 3×3.",
  "diag.cornerDuplicate":
    "Hay esquinas duplicadas: la misma pieza aparece en más de un sitio.",
  "diag.edgeSame":
    "La arista {piece} tiene el mismo color dos veces ({color}).",
  "diag.edgeOpposite":
    "Pieza imposible en la arista {piece}: {colors}. Son colores opuestos y no forman una arista.",
  "diag.edgeImpossible":
    "Pieza imposible en la arista {piece}: {colors}. Esa combinación no existe en un cubo 3×3.",
  "diag.edgeDuplicate":
    "Hay aristas duplicadas: la misma pieza aparece en más de un sitio.",
  "diag.piecesIncomplete":
    "Hay piezas duplicadas o incompletas; revisa los stickers marcados.",
  "diag.invalidState":
    "El estado no corresponde a un cubo de Rubik válido.",

  "solution.validation": "Validación",
  "solution.stats": "Estadísticas",
  "solution.algorithm": "Algoritmo",
  "solution.timer": "Cronómetro",
  "solution.time": "Tiempo",
  "solution.valid": "Válido",
  "solution.invalid": "Inválido",
  "solution.idle": "Sin validar",
  "solution.alreadySolved": "(ya resuelto)",
  "solution.scrambleHint":
    "Mezcla aleatoria ({count} movimientos). Pulsa {action} para obtener la solución.",
  "solution.errorHint":
    "Los stickers marcados en rojo en el cubo están relacionados con el error.",
  "solution.empty":
    "Introduce el estado del cubo y pulsa {action} para ver la solución aquí.",
  "solution.cubeSolved": "El cubo ya está resuelto.",

  "error.emptyFile":
    "El archivo está vacío. Debe contener el net de caras o 54 letras (W, R, G, Y, O, B).",
  "error.readCube": "No se pudo leer el cubo",
  "error.bandagedUnsolvable":
    "No se encontró solución con las uniones actuales (movimientos bloqueados).",
};
