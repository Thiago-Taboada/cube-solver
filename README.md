# Cube Solver

Herramienta web para resolver el cubo de Rubik 3×3 usando el algoritmo de **Kociemba**. Permite introducir el estado del cubo manualmente o importarlo desde un archivo TXT y muestra la secuencia de movimientos para resolverlo.

Construida con **TypeScript**, **React**, **Vite** y **Three.js / React Three Fiber** para la vista 3D. El núcleo (`src/core`) es independiente de la UI y está cubierto con tests (Vitest).

> Documento de diseño completo: [`doc.md`](./doc.md)

## Instalación

Requiere **Node.js** 18 o superior.

```bash
git clone https://github.com/thiago-taboada/cube-solver.git
cd cube-solver
npm install
```

## Ejecución

```bash
npm run dev      # servidor de desarrollo (http://localhost:5173/cube-solver/)
npm run build    # build de producción en dist/
npm run preview  # sirve el build ya compilado
```

## Tests

```bash
npm test            # ejecuta la suite una vez
npm run test:watch  # modo watch
```

## Despliegue

El despliegue es automático vía GitHub Actions ([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)): cada push a `main` ejecuta tests, build y publica en GitHub Pages.

Sitio publicado: https://thiago-taboada.github.io/cube-solver/

## Formato de entrada (facelet)

El cubo se puede importar desde un TXT con el net de caras (W/O/G/R/B/Y). Ejemplos en la carpeta [`fixtures/`](./fixtures).

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

Alineación importante del net:

- **W (U)** y **Y (D)** van centrados sobre / bajo **G (F)**, no sobre el rojo.
- Fila ecuatorial: **O = L**, **G = F**, **R = R**, **B = B**.

## Estructura del proyecto

```
cube-solver/
├── index.html
├── vite.config.ts
├── package.json
├── fixtures/            # Archivos TXT de ejemplo (solved, scrambled)
└── src/
    ├── main.tsx         # Punto de entrada
    ├── App.tsx          # Shell de la app
    ├── core/            # Núcleo sin dependencias de UI
    │   ├── cube/        # CubeState, Move, FaceletIO, Scramble
    │   └── solver/      # Algoritmo de Kociemba
    ├── ui/              # Componentes React (vista 3D, net 2D, paneles)
    └── i18n/            # Internacionalización (en / es / pt)
```

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con Vite |
| `npm run build` | Chequeo de tipos + build de producción + copia de `404.html` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm test` | Ejecuta los tests una vez (Vitest) |
| `npm run test:watch` | Tests en modo watch |
