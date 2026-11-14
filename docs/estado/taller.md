# Estado — Taller y piezas

> Lo actualiza SOLO este frente. Rama: `feat/taller`.

**Responsable:** Leo  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov 2026

## Hecho
- [x] Investigación de ruedas, chasis, energía y materiales reales con fuentes NASA/JPL/Smithsonian → `docs/taller/PIEZAS.md`
- [x] `parts.json`: mismos `id` y números (cuadran 730 / 890); notas con inspiración real; `radio_m` en ruedas (valor de juego);
      `panel_solar` marcado "sin efecto en el MVP"
- [x] Reglas del diseño sin Phaser: `game/src/scenes/Taller/diseno.js` (`RANURAS`, `DISENO_POR_DEFECTO`, `resumen()`, `validar()`)
      + prueba `node game/src/scenes/Taller/diseno.test.mjs` (13 casos)
- [x] Escena Taller: 7 ranuras del contrato del frente juego, ruedas = eje × 2 (costo y masa), presupuesto visible,
      validación (estructura, movilidad, energía, carga, presupuesto), quitar/restablecer, teclado completo
- [x] Guarda `partida.diseno = [{ ranura, pieza }]` al continuar (bloqueado si el diseño no es válido)

## En curso
-

## Siguiente
- [ ] Probar el camino dorado completo cuando el frente juego tenga `fisica/robot.js` (estándar patina en dunas → ancha pasa)
- [ ] Balance fino con telemetría real (agarre, consumo) junto con el frente juego
- [ ] Integrar sprites del frente arte en el esquema del robot

## Bloqueos / necesito de otro frente
- Juego (Edmundo): `fisica/robot.js` puede importar `RANURAS`, `DISENO_POR_DEFECTO` y `resumen()` de
  `game/src/scenes/Taller/diseno.js` para no duplicar reglas (ruedas × 2, agarre = peor eje). `radio_m` está en las ruedas.
- Integración (Alan): `irA()` en `ui.js`. El Taller ya la usa si existe (si no, `scene.start`); el build avisa que aún no está exportada.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- `data/schema/part.schema.json`: agregar `radio_m` (`number`, > 0) como propiedad opcional de las ruedas (valor de juego).
- AGENTS.md §9, frente taller: agregar `/game/src/scenes/Taller/` (lógica del diseño) y `/docs/taller/` (investigación de piezas).
