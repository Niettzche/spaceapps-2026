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
- **Tipografía:** las fuentes `mini` (3 × 5) y `big` (5 × 7) de pixelfx (MIT). **No** usar "Patch Pixel" (su licencia no es MIT).

## Carpetas

| Carpeta | Contenido |
|---|---|
| `entidades/` | robot (`chasis_ligero`, `rueda_estandar`, `rueda_ancha`, `soporte_basico`), `carga`, `astronauta`, `meta`, `zona_entrega` |
| `terreno/` | `tierra_arena` (16 × 16) y `tierra_arena_borde` (16 × 4) |
| `fondos/` | `fondo_<dunas|marte|luna>_<1|2|3>` (320 × 180, repetibles a lo ancho) |
| `fx/` | hojas de pixelfx con su JSON: `fx_polvo_arena`, `fx_patinaje` y variantes `_marte` / `_luna` |
| `ui/` | `ui_icono_energia|carga|chasis` (8 × 8), `ui_marco_barra` (9-slice 6 × 6), `ui_boton[_presionado]` (9-slice 12 × 12), `ui_boton_izq|der[_presionado]` (24 × 24) |
| `iconos/` | íconos 16 × 16 de las 12 piezas del taller: `iconos/<id>.png` |
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
