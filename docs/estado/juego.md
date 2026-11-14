# Estado — Juego: física, prueba y misión

> Lo actualiza SOLO este frente. Rama: `feat/juego`.

**Responsable:** Edmundo  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov, 16:45

## Hecho
- Especificación (`docs/juego/ESPECIFICACION.md`) y guía de arte (`docs/juego/ASSETS_ARTE.md`, con medidas, paleta y cómo entra el arte).
- Lógica completa con figuras provisionales en `game/src/fisica/` y `game/src/feedback/`: terreno real (tramo de 250 m) o ilustrativo declarado,
  robot de 4 ruedas (2 visibles), carga suelta, agarre por pieza × agarre real del suelo (Apolo, Viking), patinaje, energía, daño por sacudidas,
  volcado, telemetría `Result`, controles teclado/táctil, HUD, cámara.
- Recreaciones declaradas: caras de duna (~32°) en arena y bloques de roca en roca, solo en la Tierra.
- Efectos (polvo, arena al patinar, golpes, explosión, celebración) y ganchos de sprites con respaldo a figuras.
- Escenas Prueba, Mision y Resultados (puntuación máx. 1,000, estrellas, feedback por reglas, transiciones irA).
- Diseño unificado con taller (una sola fuente de reglas).
- Verificado sin interfaz con niveles reales de data/: Samalayuca estándar falla / ancha llega (59 s); Pinacate ancha se atasca en roca,
  tacos pasa; Luna ancha entrega, estándar no; Marte entrega con ambas (Jezero casi plano). Soporte amortiguado: carga 94 % vs 82 %.
- Pruebas: `node game/src/fisica/fisica.test.mjs` (20 casos).

## En curso
- Prueba del camino completo con todas las escenas (Menú → Expediente → Taller → Prueba → Resultados → Misión).

## Siguiente
- [ ] Integrar sprites y efectos de arte cuando lleguen a `assets/`.
- [ ] Ajustes que salgan de la prueba del camino completo.

## Bloqueos / necesito de otro frente
- Taller (Leo): ranuras `chasis, rueda_del, rueda_tras, motor, bateria, carga, modulo`; ruedas cobran × 2
- Expediente (Diego): guardar `partida.destino` en el menú (`jezero` / `polo_sur_lunar`)
- Modelo (Mario): perfiles de elevación y superficies por tramo; perfiles de Luna y Marte
- Arte (Mauricio): sprites a 8 px/m sobre base 320 × 180

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- `nivel.superficies = [{desde, hasta, tipo}]` en site.schema.json
- `irA(escena, destino)` con fundido en `ui.js`
- `runner: { isFixed: true }` en la config de Matter (`main.js`)
- `reiniciarPartida()` en `main.js`
- Agregar `game/src/fisica/` al frente juego en §9
- Confirmar puntuación (máx. 1,000) y estrellas (750 / 900)
(Detalle en `docs/juego/ESPECIFICACION.md` §14)
