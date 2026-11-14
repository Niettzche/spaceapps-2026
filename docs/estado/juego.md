# Estado — Juego: física, prueba y misión

> Lo actualiza SOLO este frente. Rama: `feat/juego`.

**Responsable:** Edmundo  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov, tarde

## Hecho
- Especificación v1 del frente: `docs/juego/ESPECIFICACION.md`
- Lógica con figuras provisionales (sin arte) en `game/src/fisica/` y `game/src/feedback/`:
  terreno desde perfil real o ilustrativo declarado, robot de 4 ruedas (2 visibles) desde `partida.diseno`, carga suelta,
  agarre por superficie, patinaje, energía, daño, volcado, telemetría `Result`, controles de teclado y táctil, HUD, cámara.
- Escenas `Prueba`, `Mision` y `Resultados` funcionando con puntuación (máx. 1,000), estrellas y feedback por reglas.
- Camino dorado de la prueba verificado sin interfaz: rueda estándar patina en dunas y falla; rueda ancha llega a la meta.
- Pruebas de funciones puras: `node game/src/fisica/fisica.test.mjs` (11 casos).

## En curso
- Balance de la misión (Luna y Marte): con batería chica todavía no se completa.

## Siguiente
- [ ] Robot físico (4 ruedas, 2 visibles) a partir de partida.diseno, con acelerar/frenar en teclado y táctil (`fisica/robot.js`)
- [ ] Terreno desde perfil_elevacion_m + generador procedural declarado "terreno ilustrativo" (`fisica/terreno.js`)
- [ ] Agarre por superficie y detección de patinaje
- [ ] Energía por acelerador, daño por impacto e integridad de la carga (telemetría Result)
- [ ] Prueba: pasa al llegar al final del recorrido
- [ ] Misión en Luna o Marte: zona de entrega, victoria/derrota
- [ ] Puntuación (máx. 1,000) y estrellas en Resultados
- [ ] Feedback por reglas en `game/src/feedback/`
- [ ] Integrar efectos de pixelfx con arte (después de la lógica)

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
