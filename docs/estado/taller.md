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

- [x] **Modelo de precios (acordado taller + juego):** el MVP se queda con el **precio por pieza** de `parts.json` (mínimo 730,
      presupuesto 1,000), que es con el que se calibró el camino dorado. El precio por kilo de material del libro de datos queda
      como mejora posterior (se puede mencionar en el pitch). Registrado en el libro de datos (Index A34, Materials A2,
      RV-137/138); falta que integración lo anote en `docs/DECISIONES.md`.
- [x] **Agarre del suelo de la Tierra (propuesta del taller, integrada por juego en `feat/juego`, commit a19c380)**: `suelos.js`
      con la arena de duna (BM-004, con fuente), `AGARRE_PROVISIONAL = 1` (P) explícito donde no hay φ, y el HUD lo declara en
      pantalla. Queda **apagado** (`USAR_SUELO_TIERRA = false`): juego confirmó que con la arena real la ancha no sube la cara
      de ~33°, y que con las dunas en su orientación real (subir por barlovento ~10°, bajar por sotavento ~33°) también llega
      la estándar (68 s contra 54 s de la ancha), así que el camino dorado deja de distinguir las ruedas. Ramas y worktree
      temporales (`feat/taller-agarre`, `mc-juego-agarre`, `feat/taller` local) borrados.
- [x] Las dos observaciones de juego sobre #16 ya están resueltas en #23: la regla del "peor eje" ahora es el promedio de
      ejes con aviso, y la autonomía ya incluye los 10 kg de carga (99 s, igual que la física).

- [x] **Gravedad de Marte: 3.71** (ecuatorial, NASA JPL SSD), ya registrada por integración; juego está de acuerdo. El libro de
      datos ya la marca como la que usa el juego (MR-056); 3.73 queda como media de referencia (MR-001). Nada que cambiar.

## En curso
- #23 ya entró. #28 (aclaración del agarre en pantalla) espera merge.
- **Íconos 16 × 16 de arte (#26), revisados en el Taller con main + #28 + #26 combinados localmente:**
  - Los 12 cargan bien y se ven nítidos.
  - El texto de la ranura de carga se salía de la caja; lo arreglé en #31.
  - Le pedí a Mauricio en #26 que la rueda ancha se distinga de la estándar a 16 px (hoy solo cambian 44 de 256 píxeles) y un poco más de contraste sobre el fondo de las ranuras.

## Siguiente
- Corridas de verificación (las corre juego en `game/e2e/`; resultados esperados según el reporte de juego):

  | # | Corrida | Esperado |
  |---|---|---|
  | 1 | Samalayuca, rueda estándar | Falla (patina en las caras de duna) |
  | 2 | Samalayuca, rueda ancha | Llega (~59 s) |
  | 3 | Samalayuca, ancha + soporte básico | Integridad de la carga ~82 % |
  | 4 | Samalayuca, ancha + soporte amortiguado | Integridad de la carga ~94 % |
  | 5 | Pinacate, rueda ancha | Se atora en los bloques de roca recreados |
  | 6 | Pinacate, rueda con tacos | Pasa |
  | 7 | Misión Luna, batería chica | Entrega |
  | 8 | Misión Jezero, batería chica | Entrega (repetir si la gravedad cambia a 3.73) |

  Si juego activa `USAR_SUELO_TIERRA`, hay que repetir 1–6 (y voltear las dunas a su orientación real cambia el resultado de 1).
- [ ] Balance fino con telemetría real (agarre, consumo) junto con el frente juego

## Bloqueos / necesito de otro frente
- Integración (Alan): anotar en `docs/DECISIONES.md` el modelo de precios por pieza para el MVP (acordado taller + juego), y en
  `docs/METODOLOGIA.md` el límite acordado con juego: **sin Bekker para el polvo de Marte** (no hay valores reales publicados;
  NASA/TM-20250006958 dice lo mismo del regolito lunar), así que el juego no simula hundimiento. Fila BM-013 del libro de datos.
- Arte (Mauricio): íconos de las 12 piezas, 16 × 16, PNG transparente, en **`assets/iconos/<id_de_pieza>.png`**.
  Ids: `rueda_estandar`, `rueda_ancha`, `rueda_tacos`, `chasis_ligero`, `chasis_reforzado`, `bateria_chica`,
  `bateria_grande`, `motor_eficiente`, `motor_potente`, `soporte_basico`, `soporte_amortiguado`, `panel_solar`.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- `docs/juego/ASSETS_ARTE.md` (dueño: juego): anotar la ruta `assets/iconos/<id>.png` en la fila "Íconos de las 12 piezas".
