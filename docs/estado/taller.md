# Estado — Taller y piezas

> Lo actualiza SOLO este frente. Rama: `feat/taller` (ronda 3: `feat/taller-datos`).

**Responsable:** Leo  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov 2026 (ronda 3, tras el merge de #16 y #21)

## Hecho
- [x] Investigación de ruedas, chasis, energía y materiales reales con fuentes NASA/JPL/Smithsonian → `docs/taller/PIEZAS.md`
- [x] `parts.json`: mismos `id` y números (cuadran 730 / 890); notas con inspiración real; `radio_m` en ruedas (valor de juego);
      `panel_solar` marcado "sin efecto en el MVP"
- [x] Reglas del diseño sin Phaser: `game/src/scenes/Taller/diseno.js` (`RANURAS`, `DISENO_POR_DEFECTO`, `resumen()`, `validar()`)
      + prueba `node game/src/scenes/Taller/diseno.test.mjs` (14 casos)
- [x] Escena Taller: 7 ranuras del contrato del frente juego, ruedas = eje × 2 (costo y masa), presupuesto visible,
      validación (estructura, movilidad, energía, carga, presupuesto), quitar/restablecer, teclado completo
- [x] Guarda `partida.diseno = [{ ranura, pieza }]` al continuar (bloqueado si el diseño no es válido)
- [x] Ronda 2 (pedido de integración): `irA()`, validación sin encimarse con los botones, íconos 16 × 16 con respaldo de texto.
- [x] Ronda 3 (pedido de integración):
  - **Libro de datos** lleno y subido a `docs/taller/Space_Apps_Game_Data.xlsx` (mismo archivo que el original del equipo):
    hoja Parts (PT-001…PT-012 = `parts.json`), φ de arena de duna (BM-004, 28–34°) y de escoria de lava (BM-003, 25–32°)
    con fuente, constantes de Bekker (arena seca; lunar aproximado), fuentes S59–S70 y Review Log RV-094…RV-130.
    Resumen en `docs/taller/PIEZAS.md` §4.
  - **Autonomía con carga**: suma los 10 kg (`MASA_CARGA_KG` de `fisica/diseno.js`) y usa `gastoPorSegundo()` de
    `fisica/energia.js` (misma regla que la física). `resumen().masa` sigue siendo solo el robot.
  - **Regla de ejes**: agarre = promedio de los dos ejes (como en la física, cada rueda aporta); si los ejes son distintos,
    aviso "con las dos anchas es más seguro".
  - Correcciones en `PIEZAS.md` tras revisar las fuentes: Opportunity se hundió "más de 10 cm" (no "hasta los rines");
    "cada rueda con su propio motor" ahora cita la página de componentes de Perseverance.
  - Gravedad de Marte cerrada en el libro de datos según la decisión del equipo: el juego usa 3.71 (ecuatorial, NASA JPL,
    Mars!MR-056, S71); el 3.73 de MR-001 queda como media global de referencia. Flag del Index actualizado.
- [x] Uso de IA en el frente taller (para `docs/USO_IA.md`, dueño: integración): la investigación de piezas, el libro de datos
      (búsqueda y verificación de fuentes) y el código del taller se hicieron con Claude Code; cada dato se revisó contra su fuente.

## En curso
- Modelo de precios: **sin decidir** (Excel por kg de material, mínimo 665, contra `parts.json` por pieza, mínimo 730).
  La hoja Parts refleja `parts.json` (lo que usa el juego). No se unifica hasta que el equipo elija.

## Siguiente
- [ ] Probar el camino dorado completo en la física (estándar patina en dunas → ancha pasa) con los φ nuevos, si juego los usa
- [ ] Balance fino con telemetría real (agarre, consumo) junto con el frente juego

## Bloqueos / necesito de otro frente
- Juego (Edmundo): `fisica/suelos.js` tiene `tierra: { arena: null, roca: null }` "Gap en el libro de datos". Ya hay dato:
  arena de duna BM-004 φ 28–34° (tan = 0.53–0.67) y escoria de lava BM-003 φ 25–32° (0.47–0.62). Son genéricos, no
  medidos en Samalayuca ni Pinacate. Decide él si los usa.
- Arte (Mauricio): íconos de las 12 piezas, 16 × 16, PNG transparente, en **`assets/iconos/<id_de_pieza>.png`**.
  Ids: `rueda_estandar`, `rueda_ancha`, `rueda_tacos`, `chasis_ligero`, `chasis_reforzado`, `bateria_chica`,
  `bateria_grande`, `motor_eficiente`, `motor_potente`, `soporte_basico`, `soporte_amortiguado`, `panel_solar`.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- `docs/juego/ASSETS_ARTE.md` (dueño: juego): anotar la ruta `assets/iconos/<id>.png` en la fila "Íconos de las 12 piezas".
