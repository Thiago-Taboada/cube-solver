# Cube Solver

Herramienta web para resolver el cubo de Rubik 3×3 usando el algoritmo de **Kociemba**. Permite introducir el estado del cubo manualmente o importarlo desde un archivo TXT y muestra la secuencia de movimientos para resolverlo.

Construida con **TypeScript**, **React**, **Vite** y **Three.js / React Three Fiber** para la vista 3D. El núcleo (`src/core`) es independiente de la UI y está cubierto con tests (Vitest).

> Documento de diseño completo: [`doc.md`](./doc.md)

## Requisitos

- **Node.js** 18 o superior
- **npm** (incluido con Node.js)

## Instalación

Clona el repositorio e instala las dependencias:

```bash
git clone https://github.com/thiago-taboada/cube-solver.git
cd cube-solver
npm install
```

## Ejecución

### Modo desarrollo

Levanta el servidor de desarrollo de Vite con recarga en caliente:

```bash
npm run dev
```

Luego abre en el navegador la URL que muestra la terminal (por defecto `http://localhost:5173/cube-solver/`).

### Compilar para producción

Verifica los tipos, genera el bundle en `dist/` y prepara el fallback `404.html`:

```bash
npm run build
```

### Previsualizar el build

Sirve localmente la versión ya compilada:

```bash
npm run preview
```

## Tests

Ejecuta la suite una sola vez:

```bash
npm test
```

En modo watch (se re-ejecuta al guardar cambios):

```bash
npm run test:watch
```

## Despliegue

El proyecto se publica en GitHub Pages. El script `deploy` compila y sube la carpeta `dist/`:

```bash
npm run deploy
```

Sitio publicado: https://thiago-taboada.github.io/cube-solver

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
| `npm run deploy` | Publica en GitHub Pages |
