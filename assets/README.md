# Assets (frente arte)

Pixel art 2D, vista lateral. Todo propio: sin arte, nombres ni personajes de otros juegos; sin logo de NASA.
La lista completa, las medidas y cómo entra cada archivo al juego están en `docs/juego/ASSETS_ARTE.md` (dueño: frente juego).

## Estilo, resolución y tipografía

- **Resolución base 320 × 180**, escalada × 3 en el juego. Todo se dibuja a 1 px de arte. **8 px de arte = 1 m.**
- **Contorno oscuro de 1 px** (`#0e0c16`) en robot, carga, astronauta, piezas e íconos.
- Luz desde arriba a la izquierda en sprites; **luz de borde turquesa** (`#4ce8d8`) en el chasis; acento **naranja** (`#f2701f`) en piezas y traje.
- Cada mundo se reconoce por el color: Tierra cálida y arenosa, Marte óxido, Luna gris de alto contraste con cielo negro y luz rasante.
- Degradados con **tramado ordenado (Bayer 4 × 4)**, nunca degradados suaves.
- **Paletas:** `assets/paletas.json` (generado desde `fuente/paletas.mjs`). Sirven también como opción `palette` de los efectos de pixelfx.
- **Paleta de la Luna (gris de alto contraste, polo sur):** cielo `#000000` `#05040a`; roca `#07070a` `#16161c` `#2c2c36` `#4a4a56` `#7c7c8a` `#b4b4c0` `#e8e8f0`;
  regolito (tiles) `#121218` `#24242c` `#3c3c48` `#5c5c6a` `#8a8a98` `#c4c4d0`. Grises fríos (ligeramente azulados), negro casi puro en las sombras
  y luz rasante desde la izquierda: las caras que miran al Sol casi blancas, el resto negro.
- **Pantalla de título:** morados del espacio `#0d051c` `#180630` `#240d43` `#2e0d6b`, Marte óxido `#a8593e` `#bc6240`, logotipo blanco → lavanda.
- **Tipografía:** las fuentes `mini` (3 × 5) y `big` (5 × 7) de pixelfx (MIT). **No** usar "Patch Pixel" (su licencia no es MIT).

Los diseños siguen `docs/taller/Space_Apps_Game_Data.xlsx`: hoja **Parts** para las piezas (PT-001 a PT-012) y hoja **Biomes** para terreno y fondos
(BM-001 desierto hiperárido pedregoso → `desierto` y `tierra_compacto`; BM-003 basalto → `lava` y `tierra_roca`; BM-008 a BM-010 Luna; BM-013 a BM-017 Marte).

## Carpetas

| Carpeta | Contenido |
|---|---|
| `entidades/` | robot (`chasis_ligero`, `chasis_reforzado`, `rueda_estandar`, `rueda_ancha`, `rueda_tacos`, `soporte_basico`, `soporte_amortiguado`), `carga`, `astronauta`, `meta`, `zona_entrega`, `base`, `baliza` |
| `terreno/` | relleno 16 × 16 + `_borde` 16 × 4: `tierra_arena`, `tierra_roca`, `tierra_compacto`, `marte_arena`, `marte_roca`, `marte_compacto`, `luna_arena` |
| `fondos/` | `fondo_<dunas|desierto|lava|mina|maar|marte|luna>_<1|2|3>` (320 × 180, repetibles a lo ancho). `mina`: tajo de bancos escalonados de Real de Ángeles (Zacatecas) en el semidesierto; `maar`: Al Wahbah (Arabia Saudita), borde de basalto, paredes de toba y fondo de sal blanca |
| `tutorial/` | viñetas de "Cómo jugar" (96 × 64, con marco y sin texto): `tutorial_1` elige un análogo (ficha de la Tierra junto a la Luna/Marte), `tutorial_2` arma tu robot (taller con piezas), `tutorial_3` pruébalo en la Tierra (dunas, arena saltando), `tutorial_4` misión (entrega al astronauta junto a la base). Se componen con el arte ya generado (`fuente/escenas.mjs`) |
| `obstaculos/` | rocas sueltas `obstaculo_roca_<1|2|3>` (Tierra), `obstaculo_roca_marte_<n>`, `obstaculo_roca_luna_<n>` (3, 4 y 5 px de alto con contorno; la fila de abajo toca el suelo) y `obstaculo_arena_blanda[_marte|_luna]` (tile de 16 × 4, se repite a lo ancho). Son recreación de juego |
| `fx/` | hojas de pixelfx con su JSON. Polvo por superficie y mundo: `fx_polvo_tierra_arena`, `fx_polvo_roca`, `fx_polvo_compacto`, `fx_polvo_marte_<arena|roca|compacto>`, `fx_polvo_luna_<arena|roca>` y `fx_polvo_marte` / `fx_polvo_luna` de respaldo (el juego busca primero `fx_<evento>_<mundo>_<superficie>`, luego `_<superficie>`, luego `_<mundo>`). `fx_patinaje` (+ `_marte`, `_luna`), `fx_carga_perdida`, `fx_golpe_chasis`, `fx_golpe_carga`, `fx_chasis_destruido`, `fx_energia_agotada` (+ `_luna`, humo claro), `fx_entrega`, `fx_meta`, `fx_sobrecalentamiento` (bucle: reverbero y vapor saliendo del motor). Los que el juego dibuja centrados tienen el origen en el centro del cuadro |
| `ui/` | `ui_icono_energia|carga|chasis|temperatura` (8 × 8), `ui_marco_barra` (9-slice 6 × 6), `ui_boton[_presionado]` (9-slice 12 × 12), `ui_boton_izq|der[_presionado]` (24 × 24); resultados: `ui_estrella_llena|vacia` (16 × 16), `ui_panel` (9-slice 16 × 16, borde de 3 px), `ui_aviso_ilustrativo` |
| `iconos/` | íconos 16 × 16 de las 12 piezas del taller: `iconos/<id>.png` |
| `titulo/` | `titulo.png` (con logotipo y lema) y `titulo_fondo.png` (sin texto), 320 × 180 |
| `fuente/` | el código que genera todo lo anterior (no lo carga el juego) |

**Ojo con los nombres:** el juego indexa `assets/**` por nombre de archivo sin carpeta. Los íconos del taller se llaman igual que algunos sprites
(`rueda_ancha`, `chasis_ligero`...). Por eso los sprites van en `entidades/`, que en orden alfabético queda antes que `iconos/` y es el que usa el juego.
El juego avisa en la consola de los nombres repetidos; el arreglo de fondo (que `aspecto.js` ignore `iconos/`) está propuesto al frente juego.

## Cómo regenerar

El arte se dibuja con código sobre el painter de [pixelfx](https://github.com/patch-gg/pixelfx) (MIT): `p.sprite`, `p.shade`, rampas de color
y tramado. Se necesita un clon de pixelfx (por defecto en `../tools/pixelfx` junto al repo, o la ruta en la variable `PIXELFX`).

```bash
node assets/fuente/generar.mjs                      # todo
node assets/fuente/generar.mjs entidades fondos     # solo esos grupos
node assets/fuente/generar.mjs ui --vista /tmp/v    # además, hojas ampliadas para revisar
```

Los efectos son efectos de pixelfx (`fuente/fx/*.js`). Para cambiarlos: copiarlos a `src/fx/marsception/` del clon de pixelfx, y ahí
`node tools/render.mjs marsception/patinaje` (hoja de contacto), `node tools/check.mjs "marsception/*"` y
`node tools/render.mjs marsception/patinaje --sheet` (hoja + JSON). Las variantes por mundo salen con `--opts '{"palette": [...]}'`
usando las rampas `polvo` de `paletas.json`.
