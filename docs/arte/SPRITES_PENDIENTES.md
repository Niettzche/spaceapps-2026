# Sprites pendientes de MARSCEPTION, separados en grupos para Mauricio (frente Arte)

## Contexto
Leo pidió revisar el repo y el estilo de arte, y separar en grupos los sprites que faltan para que **Mauricio (frente Arte, dueño de `/assets`)** los haga.
**No se toca nada del repo**: el entregable es esta lista. Mauricio la toma y trabaja en su rama `feat/arte`.

Fuentes revisadas (solo lectura): `docs/juego/ASSETS_ARTE.md` (lista oficial, medidas y nombres), `origin/feat/arte` (lo ya hecho:
`assets/README.md`, `docs/estado/arte.md`, `assets/fuente/*.mjs`), `game/src/fisica/aspecto.js` y `efectos.js` (cómo los carga el juego),
`Space_Apps_Game_Data.xlsx` (hojas Parts, Biomes, Robot Types) y la biblioteca pixelfx (`tools/list.mjs`).
Ojo: las referencias remotas no se actualizaron (`git fetch` no se corrió). Mauricio debe revisar su rama por si ya avanzó algo.

## Estilo que ya está fijado (de `assets/README.md` en feat/arte)
- 320 × 180 × 3, 1 px de arte = 3 px de pantalla, **8 px = 1 m**.
- **Contorno de 1 px `#0e0c16`** (automático con `contorno()` de `fuente/comun.mjs`), luz desde arriba a la izquierda.
- Luz de borde turquesa `#4ce8d8` en el chasis, acento naranja `#f2701f` en piezas y traje.
- Degradados con **tramado Bayer 4 × 4** (`tramado()`), nunca suaves. Paletas por mundo en `assets/paletas.json`.
- Todo sale de código: sprites con `filas()` (mapas de texto con la paleta `BASE`) y `tira()`; los efectos son efectos de pixelfx (`fuente/fx/*.js`).
- Referencia visual: Dead Cells (solo inspiración). Tierra cálida y arenosa, Marte óxido, Luna gris con cielo negro y luz rasante.
- Nombres únicos en todo `assets/`: los sprites del robot van en `entidades/` (los íconos `iconos/<id>.png` repiten nombres).

## Ya hecho (prioridad A completa)
chasis_ligero, rueda_estandar, rueda_ancha, soporte_basico, carga, astronauta, meta, zona_entrega, tierra_arena (+borde),
fondos dunas, marte y luna (3 capas), fx_polvo_arena y fx_patinaje (+ `_marte`, `_luna`), UI de barra, botones e íconos de las 12 piezas.

---

## Grupo 1: Robot, piezas B (afecta al Taller y a la prueba)
Se ven en cuanto el jugador elige estas piezas en el Taller. Hoy salen como figuras provisionales.

| Archivo (`entidades/`) | Medida y cuadros | Diseño (Excel, hoja Parts) |
|---|---|---|
| `chasis_reforzado.png` | 24 × 7, 2 cuadros (normal y dañado) → tira de 48 × 7 | PT-005 "Box frame with plates": el mismo lenguaje que chasis_ligero, más alto, con placas remachadas |
| `rueda_tacos.png` | 7 × 7, 4 cuadros horarios → 28 × 7 | PT-003 "rigid cylinder with grousers", radio 0.45 m: tacos visibles en el borde que avanzan con el giro |
| `soporte_amortiguado.png` | 10 × 4, 1 cuadro | PT-011 "tray with walls 0.45 m and springs": paredes más altas y resortes visibles |
| (C) calcomanías de motor, batería y panel | ~4 × 3 c/u | PT-006 a PT-009, PT-012. **No hay nombre ni código que las cargue**: antes de hacerlas, hay que acordar con Juego (Edmundo) el nombre y dónde van |

Base: copiar el patrón de `entidades.mjs` (chasis_ligero, rueda_estandar, soporte_basico).

## Grupo 2: Terreno, los tiles que faltan
Cada uno es un relleno `<mundo>_<superficie>.png` de 16 × 16 repetible más un borde `<mundo>_<superficie>_borde.png` de 16 × 4. Son 7 pares, 14 archivos.
Va **primero Marte**, porque la misión del camino dorado corre en Marte y hoy no tiene tiles.

| Archivo | Prioridad | Diseño (Excel, hoja Biomes) |
|---|---|---|
| `marte_arena` | **1** (misión) | BM-013 Martian drift: polvo y arena sueltos, rampa óxido de `paletas.json > marte` |
| `marte_roca` | 1 | BM-016 rock/outcrop: basalto expuesto |
| `marte_compacto` | 1 | BM-015 crusty/cloddy soil y BM-017 Jezero crater floor |
| `luna_arena` (regolito) | 2 (camino lunar) | BM-008 lunar regolith: grises fríos, alto contraste |
| `luna_roca` | 2 | BM-009 y BM-010 (polo sur): roca con sombras duras y luz rasante |
| `tierra_roca` | 3 | BM-003 basaltic lava field (Pinacate) |
| `tierra_compacto` | 3 | BM-001 hyperarid stony desert (desert pavement) |

Base: `fuente/terreno.mjs` (ya hace tierra_arena con `tileNoise`, que es repetible).

## Grupo 3: Fondos que faltan (3 capas de 320 × 180, repetibles a lo ancho)
| Archivos | Diseño |
|---|---|
| `fondo_lava_1/2/3` | Pinacate (BM-003): campo de lava basáltica, conos volcánicos oscuros en la capa lejana y malpaís en la cercana |
| `fondo_desierto_1/2/3` | El fondo genérico: el juego lo usa con **cualquier sitio terrestre sin fondo propio** (`aspecto.js:333`), así que es el que más se ve en los sitios candidatos (mx…, g…). Desierto pedregoso (BM-001) |

Base: `fuente/fondos.mjs` (dunas). La capa 1 es fija; la 2 y la 3 llevan transparencia.

## Grupo 4: Efectos con pixelfx (`assets/fx/`, hoja con su JSON)
Nombres y eventos según `ASSETS_ARTE.md` §3 "Efectos" (los busca `game/src/fisica/efectos.js`).

| Archivo | Evento | Prior. | Punto de partida en pixelfx |
|---|---|---|---|
| `fx_polvo_roca`, `fx_polvo_compacto` (y `_marte`, `_luna`) | `polvo` | A/B | `fuente/fx/polvo-arena.js` con otra paleta (`--opts '{"palette":[...]}'`) |
| `fx_golpe_chasis` | chispas en roca | B | `impacts/bullet-impact` (chispas en cono y esquirlas) |
| `fx_golpe_carga` | destello | B | `impacts/crit-hit` o `parry`, solo el destello blanco |
| `fx_entrega` | celebración | B | `ui/confetti` o `explosions/firework-burst` |
| `fx_meta` | prueba superada | B | `arcane/star-fall` o `firework-burst` en chico |
| `fx_chasis_destruido` | explosión o desarme | B | `explosions/small-explosion` o `dirt-explosion` |
| `fx_carga_perdida` | carga perdida | B | variante corta de `dirt-explosion` |
| `fx_energia_agotada` | humo al apagarse el motor | C | el humo de `small-explosion` (partículas `SMOKE`) |

**Ojo con la escala:** esos efectos de la biblioteca miden de 150 a 300 px y el robot mide 24 × 6. Hay que reducirlos (opción de tamaño, o una copia en
`src/fx/marsception/`) hasta unos 16 a 48 px. Origen al centro, salvo `polvo` y `patinaje`, que llevan el origen abajo y el polvo saliendo hacia la izquierda.
Cada uno debe pasar `node tools/check.mjs`. Las variantes por mundo usan las rampas `polvo` de `paletas.json`.

## Grupo 5: Escenario de la base (zona de entrega)
| Archivo (`entidades/`) | Medida | Notas |
|---|---|---|
| `base.png` | 40 × 24, 1 cuadro | Hábitat de 5 × 3 m detrás del astronauta. Origen al centro abajo. **Sin arte no aparece** (no hay figura provisional) |
| `baliza.png` | 4 × 8, 4 cuadros (`parpadea`) | Luz que parpadea al inicio de la zona; la luz va en el color `y`/`Y` |

Mejoran el final del camino dorado ("llega a la base"), así que conviene hacerlos antes que la UI.

## Grupo 6: UI de resultados (prioridad B)
| Asset | Medida |
|---|---|
| Estrellas llena y vacía | 16 × 16 |
| Panel de resultados (9-slice) | ~16 × 16 |
| Aviso "terreno ilustrativo" | libre |

Nombres: no hay convención fijada; seguir el patrón `ui_*` de `fuente/ui.mjs` y avisar al frente que dibuje Resultados.

---

## Orden sugerido (camino dorado primero)
1. Grupo 2, tiles de Marte (la misión en Marte hoy no tiene tiles).
2. Grupo 5, base y baliza (cierre de la misión).
3. Grupo 4: fx_entrega, fx_meta, fx_golpe_chasis y el polvo de roca y compacto.
4. Grupo 1, piezas B del robot.
5. Grupo 2, tiles de la Luna y el resto de la Tierra; luego el Grupo 3, fondos.
6. Grupo 6, UI de resultados; efectos C y calcomanías al final.

## Fuera de alcance (están en el Excel, pero no en el MVP)
La hoja Robot Types trae orugas, patas, cable de rapel, rotor y serpiente (RT-002 a RT-006), y Biomes trae los biomas subterráneos (cuevas y tubos de lava).
Son extras (AGENTS.md §15): no hay mecánica que los use, así que no se dibujan ahora.

## Cómo verifica Mauricio
- `node assets/fuente/generar.mjs <grupo> --vista <carpeta>` y revisar las hojas ampliadas.
- Efectos: `node tools/render.mjs marsception/<efecto>` (contact.png), `node tools/check.mjs "marsception/*"` y `--sheet`.
- `cd game && npm run dev` (reiniciar el servidor al agregar archivos nuevos): camino dorado en Marte y Luna, sin avisos de nombres repetidos nuevos.
- `cd game && npm run build`.
