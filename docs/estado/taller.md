# Estado — Taller y piezas

> Lo actualiza SOLO este frente. Rama: `feat/taller`.

**Responsable:** Leo  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov 2026 (ronda 2, tras el merge de #7 y #12)

## Hecho
- [x] Investigación de ruedas, chasis, energía y materiales reales con fuentes NASA/JPL/Smithsonian → `docs/taller/PIEZAS.md`
- [x] `parts.json`: mismos `id` y números (cuadran 730 / 890); notas con inspiración real; `radio_m` en ruedas (valor de juego);
      `panel_solar` marcado "sin efecto en el MVP"
- [x] Reglas del diseño sin Phaser: `game/src/scenes/Taller/diseno.js` (`RANURAS`, `DISENO_POR_DEFECTO`, `resumen()`, `validar()`)
      + prueba `node game/src/scenes/Taller/diseno.test.mjs` (13 casos)
- [x] Escena Taller: 7 ranuras del contrato del frente juego, ruedas = eje × 2 (costo y masa), presupuesto visible,
      validación (estructura, movilidad, energía, carga, presupuesto), quitar/restablecer, teclado completo
- [x] Guarda `partida.diseno = [{ ranura, pieza }]` al continuar (bloqueado si el diseño no es válido)
- [x] Ronda 2 (pedido de integración):
  - Usa `irA(this, 'Prueba')` de `ui.js` (fundido común); el build ya no avisa.
  - El texto de validación ya no se encima con los botones: zona fija y = 352–462, errores resumidos con "(+N más)"
    si no caben en 2 líneas y el resumen se recorta desde el final. "Quitar" pasó a la línea del título del catálogo.
  - Íconos 16 × 16 de las piezas: se muestran en el catálogo (× 2), en las ranuras (× 1) y dentro de las ruedas (× 2)
    en cuanto existan; sin ícono, la pieza se ve solo con texto. Probado con íconos de prueba locales (no subidos).

## En curso
-

## Siguiente
- [ ] Regla del peor eje: **en espera** de la verificación de integración ("rueda ancha solo adelante" en la física). No se cambia antes.
- [ ] Probar el camino dorado completo con `fisica/robot.js` del frente juego (estándar patina en dunas → ancha pasa)
- [ ] Balance fino con telemetría real (agarre, consumo) junto con el frente juego

## Bloqueos / necesito de otro frente
- Arte (Mauricio): íconos de las 12 piezas, 16 × 16, PNG transparente, en **`assets/iconos/<id_de_pieza>.png`**
  (ej. `assets/iconos/rueda_ancha.png`). Carpeta propia para no chocar con el sprite de rueda `assets/rueda_ancha.png`
  (tira de 4 cuadros). Ids: `rueda_estandar`, `rueda_ancha`, `rueda_tacos`, `chasis_ligero`, `chasis_reforzado`,
  `bateria_chica`, `bateria_grande`, `motor_eficiente`, `motor_potente`, `soporte_basico`, `soporte_amortiguado`, `panel_solar`.
  El Boot los precarga solo (clave `iconos/<id>`); si hay `assets/manifest.json`, el Taller carga los que falten.
- Juego (Edmundo): `fisica/robot.js` puede importar `RANURAS`, `DISENO_POR_DEFECTO` y `resumen()` de
  `game/src/scenes/Taller/diseno.js` para no duplicar reglas.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- ~~`radio_m` en `part.schema.json`~~ y ~~carpetas del taller en §9~~: aplicados por integración.
- `docs/juego/ASSETS_ARTE.md` (dueño: juego): anotar la ruta `assets/iconos/<id>.png` en la fila "Íconos de las 12 piezas".
