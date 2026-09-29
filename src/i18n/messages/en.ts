export const en = {
  "brand.title": "Cube Solver",
  "brand.sub": "3×3 Rubik's Cube",
  "theme.toLight": "Switch to light theme",
  "theme.toDark": "Switch to dark theme",
  "theme.light": "Light theme",
  "theme.dark": "Dark theme",
  "lang.label": "Language",
  "footer.rights": "All rights reserved.",

  "palette.title": "Color palette",
  "palette.hint": "Select a color and click a sticker to paint it.",
  "palette.select": "Select color {name}",
  "edit.title": "Edit mode",
  "edit.paint": "Paint",
  "edit.bandage": "Bandaged",
  "edit.bandageHint":
    "Click a piece, then an adjacent one to join or split them. Only orthogonal neighbors.",
  "edit.bandageBad": "Those pieces are not adjacent.",
  "view.title": "Visualization",
  "view.type": "View type",
  "view.flat": "Flat view",
  "view.3d": "3D view",
  "tools.title": "Tools",
  "tools.import": "Import TXT",
  "tools.export": "Export TXT",
  "tools.example": "Download sample file",
  "tools.reset": "Reset",
  "tools.undo": "Undo",
  "tools.scramble": "Scramble",
  "tools.timer": "Timer",
  "tools.timerStop": "Stop",
  "tools.timerRestart": "Restart",
  "tools.solve": "Solve",
  "tools.solving": "Solving…",
  "tools.copy": "Copy solution",
  "import.ok": "File imported successfully.",
  "import.txtOnly": "Only .txt files are allowed",
  "import.readError": "Could not read the file.",
  "copy.ok": "Solution copied to clipboard!",

  "cube.flatTitle": "Unfolded cube",
  "cube.3dTitle": "3D cube",
  "cube.flatHint":
    "Centers marked × are fixed.",
  "cube.3dHint":
    "Two cube angles: U·F·R (white on top) and D·B·L (yellow on bottom). Centers marked × are fixed.",
  "cube.centerFixed": " (fixed center)",
  "cube.centerTitle": " — Center (fixed)",
  "cube.errorTitle": " — Check",
  "cube.errorAria": " (error)",

  "color.W": "White",
  "color.R": "Red",
  "color.G": "Green",
  "color.Y": "Yellow",
  "color.O": "Orange",
  "color.B": "Blue",
  "color.W.adj": "white",
  "color.R.adj": "red",
  "color.G.adj": "green",
  "color.Y.adj": "yellow",
  "color.O.adj": "orange",
  "color.B.adj": "blue",
  "color.W.plural": "white",
  "color.R.plural": "red",
  "color.G.plural": "green",
  "color.Y.plural": "yellow",
  "color.O.plural": "orange",
  "color.B.plural": "blue",

  "diag.need54": "54 stickers are required; there are {count}.",
  "diag.countExcess":
    "There are {count} {colorPlural} stickers; there can only be 9.",
  "diag.countMissing":
    "Missing {colorPlural} stickers: there are {count} and there should be 9.",
  "diag.centerWrong":
    "The center of face {face} must be {expected}, not {actual}.",
  "diag.cornerRepeat":
    "Corner {piece} has repeated colors ({colors}). Each corner must have 3 distinct colors.",
  "diag.cornerOpposite":
    "Impossible piece at corner {piece}: {colors}. It includes opposite colors ({a} and {b}) that never share a corner.",
  "diag.cornerNoUD":
    "Corner {piece} ({colors}) has neither white nor yellow. Every corner must touch U or D.",
  "diag.cornerImpossible":
    "Impossible piece at corner {piece}: {colors}. That combination does not exist on a 3×3 cube.",
  "diag.cornerDuplicate":
    "Duplicate corners: the same piece appears in more than one place.",
  "diag.edgeSame": "Edge {piece} has the same color twice ({color}).",
  "diag.edgeOpposite":
    "Impossible piece at edge {piece}: {colors}. They are opposite colors and do not form an edge.",
  "diag.edgeImpossible":
    "Impossible piece at edge {piece}: {colors}. That combination does not exist on a 3×3 cube.",
  "diag.edgeDuplicate":
    "Duplicate edges: the same piece appears in more than one place.",
  "diag.piecesIncomplete":
    "There are duplicate or incomplete pieces; check the marked stickers.",
  "diag.invalidState": "The state does not correspond to a valid Rubik's Cube.",

  "solution.validation": "Validation",
  "solution.stats": "Statistics",
  "solution.algorithm": "Algorithm",
  "solution.timer": "Stopwatch",
  "solution.time": "Time",
  "solution.valid": "Valid",
  "solution.invalid": "Invalid",
  "solution.idle": "Not validated",
  "solution.alreadySolved": "(already solved)",
  "solution.scrambleHint":
    "Random scramble ({count} moves). Press {action} to get the solution.",
  "solution.errorHint":
    "Red-marked stickers on the cube are related to the error.",
  "solution.empty":
    "Enter the cube state and press {action} to see the solution here.",
  "solution.cubeSolved": "The cube is already solved.",

  "error.emptyFile":
    "The file is empty. It must contain the face net or 54 letters (W, R, G, Y, O, B).",
  "error.readCube": "Could not read the cube",
  "error.bandagedUnsolvable":
    "No solution found with the current bandages (some moves are blocked).",
} as const;

export type MessageKey = keyof typeof en;
export type EnMessages = Record<MessageKey, string>;
