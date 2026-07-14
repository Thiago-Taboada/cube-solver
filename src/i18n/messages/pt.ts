import type { EnMessages } from "./en";

export const pt: EnMessages = {
  "brand.title": "Cube Solver",
  "brand.sub": "Cubo mágico 3×3",
  "theme.toLight": "Mudar para tema claro",
  "theme.toDark": "Mudar para tema escuro",
  "theme.light": "Tema claro",
  "theme.dark": "Tema escuro",
  "lang.label": "Idioma",
  "footer.rights": "Todos os direitos reservados.",

  "palette.title": "Paleta de cores",
  "palette.hint": "Selecione uma cor e clique em um sticker para pintá-lo.",
  "palette.select": "Selecionar cor {name}",
  "edit.title": "Modo de edição",
  "edit.paint": "Pintar",
  "edit.bandage": "Bandaged",
  "edit.bandageHint":
    "Clique em uma peça e depois em uma adjacente para uni-las ou separá-las. Apenas vizinhos ortogonais.",
  "edit.bandageBad": "Essas peças não são adjacentes.",
  "view.title": "Visualização",
  "view.type": "Tipo de vista",
  "view.flat": "Vista plana",
  "view.3d": "Vista 3D",
  "tools.title": "Ferramentas",
  "tools.import": "Importar TXT",
  "tools.export": "Exportar TXT",
  "tools.example": "Baixar arquivo de exemplo",
  "tools.reset": "Restaurar",
  "tools.undo": "Desfazer",
  "tools.scramble": "Embaralhar",
  "tools.timer": "Cronometrar",
  "tools.timerStop": "Parar",
  "tools.timerRestart": "Reiniciar",
  "tools.solve": "Resolver",
  "tools.solving": "Resolvendo…",
  "tools.copy": "Copiar solução",
  "import.ok": "Arquivo importado com sucesso.",
  "import.txtOnly": "Apenas arquivos .txt são permitidos",
  "import.readError": "Erro ao ler o arquivo.",
  "copy.ok": "Solução copiada para a área de transferência!",

  "cube.flatTitle": "Cubo desdobrado",
  "cube.3dTitle": "Cubo 3D",
  "cube.flatHint":
    "Os centros × são fixos.",
  "cube.3dHint":
    "Dois ângulos do cubo: U·F·R (branco em cima) e D·B·L (amarelo embaixo). Os centros × são fixos.",
  "cube.centerFixed": " (centro fixo)",
  "cube.centerTitle": " — Centro (fixo)",
  "cube.errorTitle": " — Revisar",
  "cube.errorAria": " (erro)",

  "color.W": "Branco",
  "color.R": "Vermelho",
  "color.G": "Verde",
  "color.Y": "Amarelo",
  "color.O": "Laranja",
  "color.B": "Azul",
  "color.W.adj": "branco",
  "color.R.adj": "vermelho",
  "color.G.adj": "verde",
  "color.Y.adj": "amarelo",
  "color.O.adj": "laranja",
  "color.B.adj": "azul",
  "color.W.plural": "brancos",
  "color.R.plural": "vermelhos",
  "color.G.plural": "verdes",
  "color.Y.plural": "amarelos",
  "color.O.plural": "laranjas",
  "color.B.plural": "azuis",

  "diag.need54": "São necessários 54 stickers; há {count}.",
  "diag.countExcess":
    "Há {count} stickers {colorPlural}; só pode haver 9.",
  "diag.countMissing":
    "Faltam stickers {colorPlural}: há {count} e devem ser 9.",
  "diag.centerWrong":
    "O centro da face {face} deve ser {expected}, não {actual}.",
  "diag.cornerRepeat":
    "A quina {piece} tem cores repetidas ({colors}). Cada quina deve ter 3 cores distintas.",
  "diag.cornerOpposite":
    "Peça impossível na quina {piece}: {colors}. Inclui cores opostas ({a} e {b}) que nunca compartilham uma quina.",
  "diag.cornerNoUD":
    "A quina {piece} ({colors}) não tem branco nem amarelo. Toda quina deve tocar U ou D.",
  "diag.cornerImpossible":
    "Peça impossível na quina {piece}: {colors}. Essa combinação não existe em um cubo 3×3.",
  "diag.cornerDuplicate":
    "Há quinas duplicadas: a mesma peça aparece em mais de um lugar.",
  "diag.edgeSame":
    "A aresta {piece} tem a mesma cor duas vezes ({color}).",
  "diag.edgeOpposite":
    "Peça impossível na aresta {piece}: {colors}. São cores opostas e não formam uma aresta.",
  "diag.edgeImpossible":
    "Peça impossível na aresta {piece}: {colors}. Essa combinação não existe em um cubo 3×3.",
  "diag.edgeDuplicate":
    "Há arestas duplicadas: a mesma peça aparece em mais de um lugar.",
  "diag.piecesIncomplete":
    "Há peças duplicadas ou incompletas; revise os stickers marcados.",
  "diag.invalidState":
    "O estado não corresponde a um cubo mágico válido.",

  "solution.validation": "Validação",
  "solution.stats": "Estatísticas",
  "solution.algorithm": "Algoritmo",
  "solution.timer": "Cronômetro",
  "solution.time": "Tempo",
  "solution.valid": "Válido",
  "solution.invalid": "Inválido",
  "solution.idle": "Sem validar",
  "solution.alreadySolved": "(já resolvido)",
  "solution.scrambleHint":
    "Embaralhamento aleatório ({count} movimentos). Pressione {action} para obter a solução.",
  "solution.errorHint":
    "Os stickers marcados em vermelho no cubo estão relacionados ao erro.",
  "solution.empty":
    "Informe o estado do cubo e pressione {action} para ver a solução aqui.",
  "solution.cubeSolved": "O cubo já está resolvido.",

  "error.emptyFile":
    "O arquivo está vazio. Deve conter o net das faces ou 54 letras (W, R, G, Y, O, B).",
  "error.readCube": "Não foi possível ler o cubo",
};
