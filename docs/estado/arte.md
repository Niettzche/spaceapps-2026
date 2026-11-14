# Estado — Arte

> Lo actualiza SOLO este frente. Rama: `feat/arte`.

**Responsable:** Mauricio  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov 2026, 16:40

## Hecho
- **Estilo, resolución y tipografía** documentados en `assets/README.md`: 320 × 180 × 3, 8 px = 1 m, contorno de 1 px, tramado Bayer,
  fuentes `mini`/`big` de pixelfx (MIT). Paletas por mundo en `assets/paletas.json`.
- **Sprites de prioridad A** (`docs/juego/ASSETS_ARTE.md` §3), con los nombres y cuadros de la tabla de §5:
  - Robot: `chasis_ligero` (24 × 6, normal + dañado), `rueda_estandar` (7 × 7 × 4), `rueda_ancha` (8 × 8 × 4, llanta gruesa con surcos), `soporte_basico` (10 × 2).
    Las ruedas tienen una marca naranja que avanza 90° por cuadro en sentido horario.
  - `carga` (7 × 5 × 3: entera, dañada, crítica), `astronauta` (14 cuadros de 10 × 17: reposo, saluda, celebra; mira a la izquierda),
    `meta` (8 × 16 × 4, ondea), `zona_entrega` (16 × 4, repetible).
  - Terreno: `tierra_arena` (16 × 16) y `tierra_arena_borde` (16 × 4), repetibles.
  - Fondos de 3 capas, 320 × 180, repetibles a lo ancho: `dunas` (Samalayuca al atardecer), `marte` (Jezero, mesetas del borde del cráter), `luna`
    (polo sur: cielo negro, la Tierra baja, luz rasante desde la izquierda).
  - Efectos hechos con pixelfx (pasan `check.mjs`): `fx_polvo_arena` y `fx_patinaje`, más variantes `_marte` y `_luna` con la paleta de cada mundo.
  - UI: íconos de barra 8 × 8 (energía, carga, chasis), marco de barra 9-slice, botón genérico 9-slice (normal y presionado),
    botones táctiles ◀ ▶ 24 × 24 (normal y presionado).
- **Íconos 16 × 16 de las 12 piezas** del taller en `assets/iconos/<id>.png` (ids de `parts.json`).
- Todo se genera con código: `node assets/fuente/generar.mjs` (ver `assets/README.md`). `npm run build` del juego compila con el arte.
- PR #14 cerrado (GIF de 36 MB). Los GIF de MARSCEPTION ligeros viven en `docs/media/` de la rama `feat/arte-marsception-ligero`.

## En curso
- Revisar el arte dentro del juego corriendo (`npm run dev`), sobre todo la altura del polvo respecto al suelo y el tamaño del astronauta.

## Siguiente
- [ ] Prioridad B: `chasis_reforzado`, `rueda_tacos`, `soporte_amortiguado`, `base`, `baliza`, tiles de Marte y Luna, fondos `lava` y `desierto`,
      efectos de golpe, carga perdida, destrucción y entrega, estrellas y panel de resultados.
- [ ] Ajustar la UI a la paleta base del título que propone el PR #25 (lavanda para la UI, morados del espacio) si el equipo la confirma.
- [ ] Tarjetas del expediente.

## Bloqueos / necesito de otro frente
- **Frente juego:** `game/src/fisica/aspecto.js` indexa `assets/**` por nombre sin carpeta, y los íconos del taller (`iconos/rueda_ancha.png`...)
  repiten nombres de sprites. Hoy funciona porque los sprites están en `entidades/` (va antes que `iconos/`), pero sale un aviso de "nombre repetido"
  por cada pieza. Propuesta: que el índice de `aspecto.js` ignore `assets/iconos/` (el Taller ya los carga con su propio glob).
- Los nombres de la UI (`ui_*`) aún no los usa ningún código: el frente que dibuje el HUD y los botones puede tomarlos de `assets/ui/`.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- Ninguno.
