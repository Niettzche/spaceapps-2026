# Estado — Juego: física, prueba y misión

> Lo actualiza SOLO este frente. Rama: `feat/juego`.

**Responsable:** Edmundo  ·  **Agente:** Claude Code / Codex
**Última actualización:** 15 nov, 11:00

## Hecho
- **Física y niveles** (`game/src/fisica/`): tramo real de 250 m de los perfiles de `data/`, agarre por pieza × agarre real del suelo
  (Apolo, Viking; Tierra provisional P), recreaciones declaradas (caras de duna, bloques de roca), daño a la carga por sacudidas,
  patinaje, energía, volcado, fin por atasco, telemetría `Result`.
- **Pantalla:** portada de MARSCEPTION, menú con fondo de arte, HUD con íconos y marcos de arte, barra de progreso, nota de datos en una
  línea (panel completo con I), botones táctiles de arte, pausa con Esc, instrucciones al empezar y llegada a la misión con la gravedad.
- **Pantalla de inicio y menú (15 nov):** el inicio reproduce el GIF de título de Mauricio como video (`game/public/video/inicio.webm`,
  0.97 MB, respaldo `.mp4` 1.35 MB, cuadro fijo `.webp` con reduced-motion o si el video falla), franja «Presiona Enter o toca para
  jugar» en español e idioma `ES · EN  L`. Enter/clic → salto (warp) a Marte con estelas y destello; la estación de `menu_nave` llega
  desde lejos (el cielo sin la estación se genera del arte). Menú de opciones: logo, estación con luces que flota y consola
  `ui_tarjeta` con 2 × 3 botones `ui_boton` en la fuente pixel (tecla visible, ayuda de una línea, flechas en rejilla). Al elegir:
  zoom a la escotilla (brillo, anillos, el iris se abre). Código: `expediente/inicio.js`, `expediente/menu_nave.js`, `Menu.js`.
- **Sonido sintetizado** (motor, arena, golpes, entrega, falla; M silencia).
- **Bilingüe español/inglés** en todo el juego (`game/src/i18n.js`; `?lang=en|es`, selector en el menú, tecla L).
- **Resultados:** puntuación con estrellas de arte, "dónde se rompe la analogía" con la telemetría de prueba y misión, recomendaciones,
  **"Aplicar y al taller"** (pone la pieza recomendada), mejor marca por destino, atajos 1–3 y Enter.
- **Expediente:** recorrido de la prueba y de la misión (tramo, desnivel, pendientes, suelo y condición crítica), calculado con el mismo perfil.
- Calcomanías de piezas sobre el robot, efectos con pixelfx, ganchos de arte con respaldo a figuras.
- **Pruebas:** `node game/src/fisica/fisica.test.mjs` (24 casos) y la prueba de punta a punta `game/e2e/camino_dorado.mjs`
  (Marte y Luna con clics y teclado reales; 22/23 en la última corrida, la falla fue una recarga de página ajena al juego).

## Niveles destacados (15 nov)
- 5 sitios de mayor similitud, uno por tipo (toba g00266, impacto en desierto tenoumer, mina mx0023, lava pinacate, impacto helado
  pingualuit): clima real de NASA POWER (consultado el 15 nov), viento con arrastre ½ρv²CdA (en Marte casi no empuja), bloques y
  parches recreados, eventos de fondo (remolinos, Fobos, la Tierra, micrometeoritos, desprendimientos) y «Entrena» en las
  instrucciones. Detalle y tabla de balance (física 2): `docs/juego/NIVELES_DESTACADOS.md`. Pruebas: `fisica/niveles_destacados.test.mjs`.

## Física 2 (15 nov, experimental, `?fisica=2`)
- Terramecánica Bekker–Wong en `game/src/fisica/suelo_v2.js` (pruebas `suelo_v2.test.mjs`), rama `v2` de robot.js, bandera en
  `version.js` (por defecto 1). Ecuaciones, fuentes, (P), calibración y tabla de niveles: `docs/juego/FISICA_V2.md`.
- Feedback: «Tus ruedas se hundieron N cm: presión X kPa; con ruedas anchas sería Y kPa»; atasco en reversa recomienda avanzar.
- Bloquea activarla por defecto: g00281 nuevo (main) deja pasar a la estándar también con física 1; 1 de 4 corridas de Jezero
  pierde la carga con física 2.

## Retro de Leo, playtest de las 5 am (15 nov) — hecho
- Fondo vivo del Menú: nada aparece ni desaparece a media pantalla (trayectorias puras y probadas en `ambiente_plan.js`).
- Cambiar de idioma no reinicia nada: inicio (el video sigue), opciones (solo la consola), números y cómo jugar (fondo vivo conservado).
- Expediente con selector `ES · EN (L)`: redibuja con el mismo sitio y la misma vista.
- Taller: soltar una rueda la pone en los 2 ejes; mezclar = Mayús al soltar o «Separar ejes» (A).
- Textos: los 18 hallazgos Alta de `docs/taller/REVISION_EN.md` y las Media rápidas; español más natural.
- `docs/juego/PRESUPUESTO.md`: diseño más barato por nivel y propuesta de presupuesto por nivel (sin aplicar: decide Edmundo).
- Pendiente del modelo: `data/sites/g00266.json` aún dice «Cono de toba» (el juego lo corrige al mostrarlo) y `mx0023.json` `proceso`
  dice «Probable tajo… por verificar» (el tajo está verificado: Buenavista del Cobre, S137).

## Obstáculos v2 (15 nov, mañana) — hecho
- Jezero: 17 rocas con la distribución de Golombek (k = 8 %, P); Luna: 2 cráteres pequeños (d/D 0.060 del detector) + 3 rocas;
  Samalayuca: 3 parches de arena blanda en los valles + rizaduras y matorral (dibujo); Al Hutaymah: 5 bloques de toba bajos.
- Rocas, bloques y parches visibles (mínimo 3 px de arte, contorno, borde de luz); avisos la primera vez de cada tipo (`fisica/avisos.js`).
- Camino dorado 5/5 en el simulador por pasos (FISICA_V2.md §5.3). Detalle: NIVELES_DESTACADOS.md «Obstáculos v2».

## Feedback de batería (15 nov, playtest de Leo B2 y B8) — hecho
- `feedback/reglas.js`: con la energía agotada, las ruedas van primero solo si el patinaje fue la causa dominante
  (`patinajeDomina`: ≥ 5 patinajes en esa superficie, no menos que en la otra y ≥ 40 % del intento patinando, P); si no, primero
  la batería grande (evidencia con la distancia), luego motor eficiente, calentador o panel solar. «Ruedas con tacos para roca»
  solo con evidencia en roca: atascado justo tras patinar en roca, o ≥ 3 patinajes en roca y no menos que en arena (≥ 5 tras una
  prueba superada). Sin patinaje dominante tampoco se sugiere el auto-rescate. Nueva: si una prueba o misión se supera con
  < 15 % de energía (P), primero «Lleva una batería más grande» (la siguiente talla; con la grande, el panel solar).
- El camino dorado no cambia: atasco en arena con rueda estándar → primera «Cambia a ruedas anchas para arena».
- Pruebas: `game/src/feedback/bateria.test.mjs` (9 casos). Docs: PRESUPUESTO.md §1 y §4, NIVELES_DESTACADOS.md (Tenoumer,
  Rincón) con las cifras del playtest de Leo. Limitación: los umbrales son valores de juego (P), probados con eventos sintéticos;
  no se volvió a correr la simulación por pasos ni la e2e en navegador.

## En curso
- Niveles críticos: el tramo más exigente que siga siendo superable, en la dirección correcta (subir la pared del maar, bancos de la mina,
  Jezero con relieve).
- Condiciones del lugar con datos y reglas explicables (P): temperatura → batería, densidad del aire → enfriamiento del motor, luz rasante
  → panel; obstáculos recreados (rocas, arena blanda, cráteres pequeños).

## Siguiente
- [ ] Integrar los dos puntos de "En curso", mostrar las condiciones en el Expediente y correr la prueba completa.
- [ ] Corregir lo que reporten las pruebas de juego (retro de los dos probadores y de Alan).

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
