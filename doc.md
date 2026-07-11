# Cube Solver

## Documento de Diseño

### Objetivo

Desarrollar un programa en **TypeScript** capaz de:

* Resolver un cubo de Rubik 3×3 utilizando el algoritmo de **Kociemba**.
* Mostrar la secuencia de movimientos para resolver el cubo.
* En una segunda etapa, permitir definir **Bandaged Cubes** (cubos con piezas unidas) y resolver únicamente mediante movimientos válidos.
* Usar una **interfaz web mínima** al inicio (importar un archivo de colores) y ampliarla después.

El proyecto estará dividido en módulos independientes para facilitar su mantenimiento y ampliación.

---

# Decisiones fijadas

| Tema | Decisión |
|---|---|
| Lenguaje | TypeScript (strict), pensado para TS — no arrastrar hábitos de C++ |
| `Move` | Union type de strings (`"R" \| "R'" \| …`) |
| UI inicial | React + Vite, solo un input para importar el TXT de colores |
| UI completa | Fase posterior (vista 3D, editores, animación) |
| Tests | Colocalizados junto al código (`*.test.ts`) con Vitest |
| Paquetes | npm |

---

# Objetivos por fases

## Fase 1 – Motor del cubo

Implementar un modelo interno completo del cubo.

Debe permitir:

* Crear un cubo resuelto.
* Aplicar cualquier movimiento.
* Deshacer movimientos.
* Verificar si el cubo está resuelto.
* Comparar dos estados.

En esta etapa aún no existirá ningún algoritmo de resolución.

---

## Fase 2 – Entrada / salida + shell web mínima

Leer y escribir estados del cubo desde texto con el formato facelet:

```
    WWW
    WWW
    WWW

OOO GGG RRR BBB
OOO GGG RRR BBB
OOO GGG RRR BBB

    YYY
    YYY
    YYY
```

Alineación del net (importante):

* **W (U)** y **Y (D)** van centrados sobre / bajo **G (F)**, no sobre el rojo.
* Fila equatorial: **O = L**, **G = F**, **R = R**, **B = B**.

Shell web (React):

* Un `<input type="file">` para importar el TXT.
* Mostrar si el parseo fue correcto o el error.
* (Opcional) volcar el estado parseado en texto / JSON para depurar.

Sin editor de colores, sin 3D, sin animación.

---

## Fase 3 – Parser de movimientos

Interpretar secuencias como:

```
R U R' U'
```

o

```
F2 L D' R2
```

El parser devolverá `Move[]` tipado.

---

## Fase 4 – Solver Kociemba

Implementar el algoritmo completo.

Componentes:

* Tablas de movimientos.
* Tablas de poda.
* Búsqueda IDA*.
* Generación de solución.

La shell web podrá mostrar la secuencia resultante como texto.

---

## Fase 5 – Bandaged Cubes

Agregar restricciones de movimiento.

El solver seguirá siendo el mismo.

Antes de ejecutar un movimiento se verificará:

```
¿Este giro rompe alguna pieza unida?
```

Si la respuesta es sí → movimiento inválido.  
Si no → aplicar movimiento.

---

## Fase 6 – Interfaz web completa

Ampliar la shell mínima:

* Vista 2D / 3D del cubo.
* Editor de colores.
* Editor de piezas unidas.
* Animación paso a paso.
* Estadísticas del solver.

---

# Arquitectura

```
                +----------------+
                | TXT / file UI  |
                +-------+--------+
                        |
                        v
                 +-------------+
                 |  FaceletIO  |
                 +------+------+
                        |
                        v
                 +-------------+
                 | CubeState   |
                 +------+------+
                        |
         +--------------+--------------+
         |                             |
         v                             v
      Move / Parser               Bandage
         |                             |
         +--------------+--------------+
                        |
                        v
                 +-------------+
                 |  Solver     |
                 +------+------+
                        |
                        v
                 Move[] (solución)
```

`src/core` no importa React ni el DOM. `src/ui` solo consume el núcleo.

---

# Estructura del proyecto

```
CubeSolver/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── doc.md
│
├── fixtures/
│   └── solved.txt
│
└── src/
    ├── main.tsx
    ├── App.tsx                      # Shell: file input + feedback
    │
    ├── core/
    │   ├── cube/
    │   │   ├── CubeState.ts
    │   │   ├── CubeState.test.ts
    │   │   ├── Move.ts
    │   │   ├── Parser.ts
    │   │   ├── Parser.test.ts
    │   │   ├── FaceletIO.ts
    │   │   └── FaceletIO.test.ts
    │   │
    │   ├── solver/
    │   │   ├── Kociemba.ts
    │   │   ├── Tables.ts
    │   │   ├── Search.ts
    │   │   ├── Heuristics.ts
    │   │   └── Kociemba.test.ts
    │   │
    │   └── bandage/
    │       ├── Bandage.ts
    │       ├── canMove.ts
    │       └── Bandage.test.ts
    │
    └── ui/
        └── FileImport.tsx           # Input de archivo (fase 2)
        # Más componentes en fase 6
```

### Responsabilidades

| Ruta | Rol |
|---|---|
| `src/core/cube` | Estado, `Move`, parser, I/O facelets |
| `src/core/solver` | Kociemba |
| `src/core/bandage` | Restricciones |
| `src/ui` | React (mínimo ahora; completo después) |
| `fixtures` | TXT de ejemplo |
| `*.test.ts` | Tests junto al módulo que prueban |

---

# Representación interna

El solver **no trabaja con colores**. Usa piezas:

* 8 esquinas → permutación + orientación
* 12 aristas → permutación + orientación

```ts
type CornerPermutation = readonly number[]; // length 8
type CornerOrientation = readonly number[]; // length 8
type EdgePermutation = readonly number[];   // length 12
type EdgeOrientation = readonly number[];   // length 12
```

Los colores solo existen en FaceletIO y en la UI.

---

# Formato de entrada

Un archivo TXT con el net de caras (W/O/G/R/B/Y). Más adelante:

* `scramble.txt`
* `cube.txt`
* `bandage.json`

---

# Bandaged Cubes

No modifican el solver; solo filtran movimientos:

```
CubeState → Bandage.canMove(state, move) → Solver
```

---

# Tecnologías

* **TypeScript** (strict)
* **Node.js** + **npm**
* **Vite**
* **React** (shell mínima → UI completa en fase 6)
* **Vitest** (tests colocalizados)
* **Three.js / R3F** solo en fase 6

---

# Filosofía

1. `core` independiente de la UI.
2. Solver sin colores: solo piezas y orientaciones.
3. Todo el núcleo testeable con Vitest.
4. Un módulo = una responsabilidad.
5. Bandage y UI son capas encima del solver, no cambios en su núcleo.
6. Solo el parser convierte texto de movimientos en `Move`.

---

# Movimientos tipados

En TypeScript lo más claro y ergonómico es un **union type** (se imprime bien, encaja con JSON y con el parser):

```ts
export const MOVES = [
  "U", "U2", "U'",
  "D", "D2", "D'",
  "L", "L2", "L'",
  "R", "R2", "R'",
  "F", "F2", "F'",
  "B", "B2", "B'",
] as const;

export type Move = (typeof MOVES)[number];
```

El parser es el único que convierte `"R U R' U'"` → `Move[]`. El resto del código usa solo `Move`.
