# Estado — Arte

> Lo actualiza SOLO este frente. Ramas: `feat/arte` (#26) y `feat/arte-b` (#37), ambas mergeadas; `feat/arte-c` (ronda de revisión).

**Responsable:** Mauricio  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov 2026, 19:00

## Hecho
- **Prioridad A y B completas** (#26 y #37, en `main`):
  - Robot: chasis ligero y reforzado; ruedas estándar, ancha y con tacos; soportes; carga.
  - Escenario: astronauta, meta, zona de entrega, base y baliza.
  - Tiles: arena, roca y compacto para la Tierra y Marte; arena y roca para la Luna.
  - Fondos: `dunas`, `desierto` (BM-001), `lava`, `marte` y `luna`.
  - Efectos: polvo, patinaje, golpes, carga perdida, destrucción, energía agotada, entrega y meta.
  - UI: barras, botones, íconos de las 12 piezas, estrellas, panel de resultados y aviso de terreno ilustrativo.
  - Pantalla de título y paletas por mundo, incluida la gris de la Luna.
- **Ronda de revisión del frente juego (`feat/arte-c`):**
  1. **Rueda ancha y estándar se distinguen de un vistazo** (prioridad alta del camino dorado):
     - **Robot:**
       - Estándar: plateada, llanta delgada y rin brillante (7 × 7).
       - Ancha: goma negra gruesa con surcos y cubo amarillo arena (8 × 8).
     - **Ícono del taller:**
       - Estándar: plateada con rayos.
       - Ancha: vista de 3/4, con la banda de rodadura y sus tacos visibles y el mismo cubo amarillo.
       - Los dos íconos ahora difieren en 156 de 256 píxeles (antes 44).
  2. **Video de 30 s:** entrada (`docs/media/video_entrada_1280x720.png`, logotipo) y cierre (`docs/media/video_cierre_1280x720.png`, logotipo + lema) con la pantalla de título, a 1280 × 720 como el video. Los monta Alan.
  3. **El polvo ya no flota:** el suelo de las hojas de polvo y patinaje es ahora la última fila del cuadro.
     - Antes quedaba 1–2 px arriba (3–6 px en pantalla).
     - Lo comprobé midiendo la fila más baja dibujada de cada hoja.
  4. **Sin bandas que se repiten en la arena** (`tierra_arena`, `marte_arena`, `luna_arena`): el tono sale de ruido fino, sin manchas grandes.
  5. **Polvo:** `fx_polvo_roca`, `fx_polvo_compacto` y `fx_carga_perdida` ya estaban en `main` (#37).
     - El polvo de arena de la Tierra se llama `fx_polvo_tierra_arena`, como lo renombró integración.
     - Además hay `fx_polvo_marte_<arena|roca|compacto>` y `fx_polvo_luna_<arena|roca>`.
  6. **Calcomanías de piezas** (`docs/arte/SPRITES_PENDIENTES.md` §5), en `assets/entidades/`, cada una con el acento de color de su ícono:
     `deco_motor_eficiente`, `deco_motor_potente`, `deco_bateria_chica`, `deco_bateria_grande` y `deco_panel_solar`.
  7. **Crédito de pixelfx (MIT)** en el README raíz.
  8. **Revisado en `main` lo que conectó juego** (revisión de código, no visual):
     - Portada: `titulo.png` × 3 a pantalla completa.
     - Fondo del menú: `titulo_fondo.png`.
     - Estrellas: `ui_estrella_*` × 3.
     - Marco 9-slice: `ui_panel` con cortes de 5 px. El borde mide 3 px, así que no se deforma.
- `node assets/fuente/fx/exportar.mjs` regenera con pixelfx las 21 hojas de efectos.

## En curso
- Nada.

## Siguiente
- [ ] Ver el arte con el juego corriendo (todavía no lo he revisado en pantalla): ruedas en el taller y en la prueba, calcomanías, posición de efectos y polvo.

## Bloqueos / necesito de otro frente
- **Integración (Alan):**
  - Cambiar la entrada y el cierre del video por `docs/media/video_entrada_1280x720.png` y `docs/media/video_cierre_1280x720.png`.
  - Agregar el crédito de pixelfx a `docs/ENTREGA_EN.md`. Texto sugerido:
    "Pixel art effects built with pixelfx (MIT License, © 2026 Patch and Hugo Duprez)."

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- Ninguno.
