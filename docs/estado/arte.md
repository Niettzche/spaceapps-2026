# Estado — Arte

> Lo actualiza SOLO este frente. Rama: `feat/arte` (PR #26) y `feat/arte-b` (prioridad B, PR aparte).

**Responsable:** Mauricio  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov 2026, 18:15

## Hecho
- **PR #26 (prioridad A):** estilo, paletas y tipografía (`assets/README.md`), robot ligero, ruedas estándar y ancha, soporte básico, carga,
  astronauta, meta, zona de entrega, `tierra_arena`, fondos `dunas`/`marte`/`luna`, efectos de polvo y patinaje, UI e íconos de las 12 piezas.
- **Prioridad B (rama `feat/arte-b`), en el orden de impacto que pidió el frente juego:**
  1. Tiles 16 × 16 + borde 16 × 4: `marte_arena`, `luna_arena`, `tierra_roca`, `tierra_compacto`, y también `marte_roca`, `marte_compacto` y `luna_roca`.
  2. Fondos de 3 capas: `desierto` (BM-001: tarde dorada, sierras, piedras y salar; lo usan todos los sitios sin fondo propio) y `lava` (Pinacate: conos de ceniza y coladas de basalto).
  3. Piezas: `chasis_reforzado` (24 × 7, normal + dañado), `rueda_tacos` (7 × 7 × 4, tacos que giran) y `soporte_amortiguado` (10 × 4, con resortes).
  4. Escenario: `base` (hábitat 40 × 24) y `baliza` (4 × 8 × 4, parpadea).
  5. Efectos con pixelfx: `fx_golpe_chasis`, `fx_golpe_carga`, `fx_chasis_destruido`, `fx_energia_agotada` (+ `_luna` con humo claro para que se vea
     sobre el cielo negro), `fx_entrega` y `fx_meta`. El juego dibuja estos efectos centrados, así que cada lienzo tiene el origen en su centro.
- **Lista de Leo (`Sprites_pendientes_arte.md`) revisada contra el Excel** (`docs/taller/Space_Apps_Game_Data.xlsx`, hojas Parts y Biomes):
  - **Corregido un error del #26:** el juego busca `fx_polvo_<mundo>_<superficie>` → `fx_polvo_<superficie>` → `fx_polvo_<mundo>`, así que en Marte y la Luna
    sobre arena salía `fx_polvo_arena` (colores de la Tierra). Ahora hay polvo por mundo y superficie: `fx_polvo_roca`, `fx_polvo_compacto`,
    `fx_polvo_marte_<arena|roca|compacto>`, `fx_polvo_luna_<arena|roca>` (roca: menos nube y más esquirlas).
  - `fx_carga_perdida` (la caja se revienta en astillas y polvo).
  - UI de resultados: `ui_estrella_llena`, `ui_estrella_vacia`, `ui_panel` (9-slice) y `ui_aviso_ilustrativo`.
  - Ajustes por el Excel: el fondo `desierto` ya no tiene matorrales (BM-001 es hiperárido): piedras y un salar; `tierra_compacto` es pavimento del desierto (grava apretada).
- **Pantalla de título 320 × 180:** `assets/titulo/titulo.png` (Marte, logotipo y lema) y `titulo_fondo.png` (sin texto, para poner botones o texto con código).
- **Paleta gris de la Luna** definida y documentada en `assets/README.md` y `assets/paletas.json`.
- Comprobado con la misma lógica de `aspecto.js`: las 13 entradas de su tabla existen y se cortan en los cuadros correctos; están todos los tiles y fondos
  de la guía salvo `luna_compacto` (no existe en la guía). `npm run build` compila.

## En curso
- Esperando la revisión del #26 por el frente juego para corregir lo que el juego no reconozca.

## Siguiente
- [ ] Correcciones de la revisión del #26.
- [ ] Verlo en el juego corriendo: altura del polvo, tamaño del astronauta, posición de los efectos.
- [ ] Prioridad C: calcomanías de motor, batería y panel sobre el chasis. **Antes hay que acordar con el frente juego el nombre y dónde se dibujan** (hoy ningún código las carga).
- [ ] Tarjetas del expediente.

## Bloqueos / necesito de otro frente
- **Frente juego:** `aspecto.js` indexa `assets/**` por nombre sin carpeta y los íconos del taller repiten nombres de sprites. Funciona (los sprites
  están en `entidades/`, que va antes que `iconos/`), pero sale un aviso de "nombre repetido" por pieza. Propuesta: que el índice ignore `assets/iconos/`.
- **Frente expediente (Menú):** la pantalla de título está en `assets/titulo/`; el Menú todavía no la usa.
- **Frente juego, docs:** en `docs/juego/ASSETS_ARTE.md` §1 la paleta de la Luna dice "por definir con Mauricio": ya está definida en `assets/README.md`.
- Los `ui_*` aún no los usa ningún código: el frente que dibuje Resultados puede tomar las estrellas, el panel y el aviso de `assets/ui/`.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- Ninguno.
