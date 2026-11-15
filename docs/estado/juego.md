# Estado — Juego: física, prueba y misión

> Lo actualiza SOLO este frente. Rama: `feat/juego`.

**Responsable:** Edmundo  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov, 19:40

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

- **Tutorial guiado (15 nov, PLAN_REMAKE §1):** módulo común `game/src/scenes/comun/tutorial.js` (marcas «ya visto», pasos,
  burbuja; pruebas `node --test game/src/scenes/comun/`) y `comun/tutorial_vista.js` (`abrirTutorial` coach marks y `abrirResumen`).
  Resumen de 4 viñetas al elegir Luna/Marte (? lo repite), primera prueba (controles + META) y primera misión («pesas menos: frena
  antes» + ZONA DE ENTREGA resaltada en el terreno); el Expediente usa la misma vista. Arreglos de la auditoría de Leo §4 fuera del
  Taller: META/ZONA a 16 px con caja oscura, «⚑» y «M · sonido» con caja oscura, nota del HUD y filas del Expediente con zona de 44 px,
  Boot a 14 px.

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
