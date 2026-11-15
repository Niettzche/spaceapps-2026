# Estado — Expediente, explorador y menú

> Lo actualiza SOLO este frente. Todo el trabajo del frente ya está en main: entrega (#12), ajustes, accesibilidad (#48)
> y Boot ligero (#50).

**Responsable:** Diego  ·  **Agente:** Claude Code  ·  **Rama:** feat/expediente-estado
**Última actualización:** 14 nov 2026

## Hecho

### Entrega principal (`feat/expediente`, ya en main, PR #12)
- [x] **Boot:** pantalla de carga con progreso real (eventos del cargador de Phaser sobre el arte de `/assets`; si no hay
  arte, 100 %). En main, el frente juego le agregó la portada de arte.
- [x] **Menú:** nueva partida → elección de destino (Marte primero, Luna), continuar, explorador, "¿De dónde salen los números?".
- [x] **Expediente:** lista de sitios del destino (8 por página) y comparación 1 a 1: Tierra a la izquierda, destino a la
  derecha, misma variable y unidad, fuente y fecha de cada lado; "sin dato" si falta; aviso si las unidades no coinciden;
  banda roja en sitios `ilustrativo` o `demo: true`.
- [x] **Lo que la Tierra no puede probar:** une `no_reproducible_en_tierra` del destino y `limites` del sitio; la gravedad
  lleva su valor y la nota de que solo se simula en la misión; las notas largas de `limites` salen como "Límite del cálculo".
- [x] **Tickets:** 3 por partida (`TICKETS_POR_PARTIDA`), se gastan al elegir un sitio nuevo, no se entra sin tickets, volver a
  probar un sitio ya pagado no cuesta; "Nueva partida" los restaura sin duplicar. "Probar" fija `partida.sitio` → Taller.
- [x] **Guardado** en localStorage (`mision_cero.partida.v1`): al elegir destino y sitio, y al ocultar o cerrar la pestaña.
  "Continuar" lo restaura en el mismo objeto `partida` y va al Taller si ya hay sitio, o al Expediente si no.
- [x] **Ficha completa ↗:** abre web/ con `?sitio=<id>` (y `&ficha=MX0007` para detecciones del detector). La URL sale de
  `VITE_WEB_URL`; sin ella el botón aparece deshabilitado ("sin enlace").
- [x] **"¿De dónde salen los números?"** en español e inglés (3 páginas). El contenido sale de AGENTS.md; si cambian cifras
  o fuentes, actualizar `game/src/scenes/expediente/numeros.js`.
- [x] **Explorador:** coordenada → `POST /score` con contador de espera → similitud total, confianza y tabla por dimensión;
  aviso claro si la API no responde (el juego sigue). "Proponer sitio" (`POST /submit`) solo si la API lo permite y la
  similitud total ≥ 0.6 (`UMBRAL_PROPUESTA`, P). Probado de punta a punta con la API local (~60 s por punto; espera máxima 90 s).

### Ajustes (`feat/expediente-ajustes`, ya en main por la integración `a84dd62`)
- [x] La lista se ordena por similitud total de mayor a menor; los sitios `ilustrativo`, `demo: true` o sin similitud
  siempre van al final.
- [x] Boot, Menú, Expediente y Explorador usan `irA()` de `ui.js` (fundido) en vez de `scene.start`. No se modificó `ui.js`.

### Accesibilidad (`feat/expediente-accesibilidad`, ya en main, PR #48)
En la integración de la ronda 3 (`e68d856`) el Menú y el Expediente quedaron además bilingües.
- [x] **Atajos numéricos como en Resultados:** botones con "1 · …" y teclas 1–9 (Menú 1–4; destino 1 Marte, 2 Luna,
  3 Volver; lista del Expediente 1–8). La opción sugerida va con ⏎ en verde; Enter ejecuta la enfocada o la sugerida.
  Flechas, Tab y Esc siguen igual. Se corrigió Shift+Tab (con Shift presionado Phaser reemitía el mismo evento 3 veces).
- [x] **Enter confirma el ticket:** al elegir un sitio (número, Enter o toque) el foco pasa a "Gastar 1 ticket y probar ⏎"
  y el siguiente Enter lo confirma. Sin tickets no se gasta nada.
- [x] **Foco dentro del Explorador:** Tab y Shift+Tab dan la vuelta dentro del diálogo; Esc vuelve al Menú.
- [x] **Explorador móvil:** grados sin signo + listas N/S y E/O (el teclado decimal de iOS no tiene "−"); se convierte a
  grados con signo antes de `POST /score`. Letra de 16 px en campos y listas (sin zoom automático de iOS),
  `box-sizing: border-box` y 44 px de alto en campos y botones.
- [x] **Zonas táctiles más grandes:** mínimo 64×44 px del juego sin cambiar el dibujo; en la lista del Expediente toda la
  fila es tocable. Medido en un teléfono emulado: en horizontal pasan de 12 a 32 px de alto; en vertical, de 7 a 18 px.
- [x] **mx0207 (mina de Real de Ángeles) como análogo operativo:** sobre lo que el integrador ya había dejado en main
  (`esMina`, "Forma del tajo minero", estado "ANÁLOGO OPERATIVO (MINA)"), la columna del destino dice
  "vs. cráteres Luna+Marte" y la nota aclara que es una excavación, no un cráter natural.
- [x] Pruebas de lógica: 14 en `logica.test.js`, incluidas 3 de hemisferios y 1 de mx0207 con los datos reales de
  `mx0207` y `g00281`.
- [x] **Probado en un teléfono real** (Diego): sin problemas.

### Boot ligero (`feat/expediente-boot-ligero`, ya en main, PR #50)
- [x] El Boot no precarga GIF, MP4, WebM ni archivos mayores a 300 KB (`LIMITE_PRECARGA_BYTES` y
  `EXTENSIONES_SIN_PRECARGA` en `config.js`). El tamaño se mide sin descargar (URL `data:` o `HEAD`); lo que se salta se
  registra en la consola (`[Boot] no se precarga …`) y en el resumen del Boot con su tamaño; la barra llega al 100 %.
- [x] Regla en `game/src/scenes/expediente/precarga.js` con 3 pruebas en `pruebas/precarga.test.js`.
- [x] Medido en el build de producción con el arte de entonces (93 PNG, el mayor de 22.4 KB): no se saltó nada; lo
  descargado hasta el Menú pasó de 542.0 KB a 543.0 KB.

### Explorador sin API (14 nov, sobre `feat/juego`)
Playtest: "el explorador libre no funciona" (la API no está publicada; antes solo salía un aviso y "Volver").
- [x] **Catálogo precalculado:** la coordenada se busca entre los sitios de `data/sites/` (`TODOS_LOS_SITIOS`, 58 con
  coordenadas) por distancia de gran círculo. A ≤ 25 km (`RADIO_CATALOGO_KM`, P) se ve su ficha: nombre, estado,
  distancia, similitud total y por dimensión, confianza, gemelo, lo que la Tierra no puede probar y notas del cálculo.
  Si es jugable, "Abrir su Expediente" (`visitarSitio` en `guardado.js`: el destino pasa a su gemelo, no gasta tickets;
  si el sitio en juego era de otro destino se suelta). Si no hay sitio cerca: "Fuera del catálogo precalculado" + los 3
  más cercanos con su distancia (botones). Todo con la etiqueta "Resultado precalculado del catálogo (sin consulta en vivo)".
- [x] **Clima en vivo de NASA POWER desde el navegador** (verificado: responde con `Access-Control-Allow-Origin: *`, sin
  llave, ~0.1 s; espera máx. 8 s). Solo fuera del catálogo: `T2M_RANGE` y `PRECTOTCORR` (misma consulta que
  `model/features.py`) → similitud PARCIAL por dimensión con la fórmula y escalas de `model/score.py` (20 K, 1 mm/día;
  recorte al máximo terrestre de 40 K). Sin forma no hay total. Si POWER falla, se omite con una nota neutra.
- [x] **Proponer sitio** sin API: botón deshabilitado con la razón ("necesita la API del servidor"). Con API, igual que antes.
  Si la API se cae a media consulta, se responde con el catálogo y las siguientes consultas ya no la esperan.
- [x] Letra del Explorador ≥ 15 px. Pruebas nuevas: `pruebas/catalogo.test.js` (9) y 1 en `tickets.test.js`.

Pruebas del frente: **49/49** (con `planeta.test.js`) (`cd game && node --test src/scenes/expediente/pruebas/`).

### Efectos del Menú (`feat/expediente-menu-efectos`, 14 nov)
Pedido: "agrega los efectos de menú dentro de Nueva partida y ¿De dónde salen los números?".
- [x] **Nueva partida:** cada tarjeta tiene un planeta en pixel art que gira (Marte con casquetes, Luna con cráteres; luz
  arriba a la izquierda y borde morado como `assets/fuente/titulo.mjs`), 48 cuadros de 48 px ×3 a 8 fps. Clic o toque en
  el planeta = "Elegir …"; con el ratón encima gira más rápido; al elegir, giro rápido y acercamiento antes del fundido.
  Si existe `assets/menu/planeta_marte.png` / `planeta_luna.png` (tira horizontal de cuadros cuadrados, ancho del cuadro =
  alto de la imagen), se usa ese spritesheet; si no, se genera en código (`expediente/planeta_pixeles.js`, una vez por juego).
- [x] **Selector "Español / English"** del menú principal también en destino, números y cómo jugar.
- [x] **Números:** botones 1 ◀ · 2 ▶ · 3 Volver con ⏎ en la sugerida (▶; en la última página, Volver); panel detrás del
  texto; al cambiar de página ya no se pierde el fondo; la línea del 78 % ya no se sale de la pantalla.
- [x] **Estrellas que titilan** en todas las vistas del Menú, lejos de cualquier texto y fuera del Marte del fondo.
- [x] **Botones (`boton()` de interfaz.js, Menú y Expediente):** crecen a ×1.05 al pasar el ratón (solo los de marco) y
  suenan con `sonarBoton()` al pulsar (también con teclado). Con `prefers-reduced-motion` no hay animación.
- [x] Revisado a 960×540 en es/en (principal, destino, números 1–3, cómo jugar): ningún texto se toca ni sale de pantalla.

### Diseño de menús (`feat/juego-menus`, 15 nov; DISENO.md §2–§3)
- [x] **Paleta AA:** `COLOR.muyTenue` #6c7393 → #a3abcc, `COLOR.alerta` #ef476f → #ff7a93 (y ILUSTRATIVO en textos.js);
  Taller `C.apagado` → #a3abcc, `C.error` #ff6b6b → #ff7a7a. Nuevo token `COLOR.decoracion` (#6c7393, solo marcos).
  Peor contraste de texto: 4.87:1 (antes 2.6:1). Textos secundarios sobre el arte del fondo llevan franja oscura (`conFondo`).
- [x] **`boton()` con caja:** relleno + borde del estado (amarillo acción, verde foco, blanco ratón, gris deshabilitado),
  colores del arte `ui_boton`. Misma firma; `obj` sigue siendo el Text (la caja es un Graphics que lo sigue, también dentro
  de contenedores). Sin `[ ]`. Opciones nuevas: `anchoCaja`, `alEnfocar`. `ayudaFija()` = tooltip de 1 línea en lugar fijo.
- [x] **Menú:** sin frase bajo cada botón (tooltip al enfocar/pasar el ratón; el resumen de la partida guardada es el de
  Continuar), sin «Datos cargados», pie de 1 línea, L en la etiqueta del idioma.
- [x] **Nueva partida:** fondo de Mauricio `pantallas/menu_fondo` (sin FondoMenu en esa vista), nombre 28 px, 2 datos grandes
  (0.38 g / 0.17 g y nº de sitios), nota de gravedad como tooltip del botón Elegir; «3 tickets · 1,000 créditos» por defecto.
- [x] **Números:** tarjetas keyword + fuente, 3 cifras grandes (9/11 · ~78 % · 296, verificadas en METODOLOGIA/VALIDATION),
  chips de lo que la Tierra no puede probar. **Cómo jugar:** viñetas `tutorial_1..4` ×3 y 2–3 keywords por pantalla.
- [x] Capturas es/en 960×540 con script: 0 textos < 14 px, 0 fuera de pantalla, 0 encimados en principal, destino,
  números 1–3 y cómo jugar 1–4.

### Expediente para novatos (`feat/expediente-novatos`, 15 nov)
- [x] **Tutorial rápido (coach marks)** la primera vez que se abre el Expediente (`marsception.tutorial_expediente.visto`,
  con try/catch; botón «?» y tecla ? lo repiten): 6 pasos (similitud y confianza · tabla · lo que la Tierra no puede
  probar · recorrido · I Datos · gastar ticket). Oscurece todo menos la zona, la encuadra con `ui_resalte`, la señala con
  `ui_senalador` (quieta con reduced-motion) y explica en una burbuja con la guía `tutorial/guia`. ◀ / Saltar / Siguiente
  con ratón y toque; Enter, ← → y Esc. La e2e lo marca como visto (como «Cómo jugar»).
- [x] **Tabla en llano con íconos** (`glosario.js`, `iconos_expediente.js`): cada fila con ícono ×2 (`ico_forma`,
  `ico_oscilacion`, `ico_precipitacion`, `ico_vegetacion`, `ico_pendiente`…) y nombre llano («Lluvia», «Plantas»,
  «Cambio día-noche»); al pasar el ratón, la franja de abajo muestra la pregunta («¿Cuánto llueve?») y el nombre técnico
  con unidad. Columna «PARECIDO» y leyenda «100 % = igual a Marte». El detalle I abre cada fila con pregunta, nombre
  técnico, qué significa el % y luego fuentes; la sección del sitio explica similitud total y confianza (cobertura, no
  probabilidad; METODOLOGIA). Íconos también en similitud, confianza y recorrido (prueba, misión, subida, pendiente, suelo).
- [x] Pruebas `pruebas/tutorial.test.js` (6) y revisión es/en (Marte y Luna, 6 pasos, detalle, condiciones): 0 textos
  < 14 px, 0 fuera, 0 encimados.

## Prueba del camino completo en Luna y Marte
Recorrido con clics y teclas reales (`npm run dev`, Chrome sin ventana): Menú → Nueva partida → destino → Expediente →
ticket → Taller → Prueba → Resultados → Misión → Resultados → Menú → recarga → Continuar.

**14 nov, sobre main en `0f8f8b3` (Luna y Marte):**

| Verificación | Luna | Marte |
|---|---|---|
| Boot → Menú sin pantalla negra | ✅ | ✅ |
| Número de sitios en la tarjeta del destino | ✅ 1 (mx0207) | ✅ 3 |
| mx0207 presentado como mina, no como cráter | ❌ entonces; ✅ corregido en accesibilidad | n/a |
| Fuente, unidad y fecha en cada fila; "sin dato" donde falta | ✅ | ✅ |
| Gravedad del destino en "Lo que la Tierra no puede probar" | ✅ 1.62 vs 9.81 | ✅ 3.71 vs 9.81 |
| Orden por similitud; `sitio_3` marcado como ilustrativo | ✅ | ✅ |
| Ticket 3 → 2, guardado; el mismo sitio no gasta otra vez | ✅ | ✅ |
| Volver al Expediente tras elegir sitio | ❌ ver Siguiente | ❌ |
| Continuar restaura la partida al recargar | ✅ | ✅ |
| Explorador ida y vuelta | ✅ | ✅ |
| Taller → Prueba → Misión → Resultados | ✅ navega | ✅ navega |

**Repetida en `feat/expediente-accesibilidad` (sobre main `95aab5a`):** Marte, recorrido completo hasta Continuar sin
errores en consola; hoy hay 2 sitios jugables por destino (Marte: Samalayuca y Pinacate; Luna: mx0207 y g00281) y `sitio_3`
ya no existe. En la Luna se revisó hasta el Taller y la presentación de mx0207 como mina.
El script mantiene la flecha derecha y no cambia piezas: la prueba en Samalayuca terminó "atascado" y la misión "sin
energía". El camino dorado completo (ruedas anchas → pasa → entrega) no se probó con este script.

## Fondo del Menú

> Revisión de Leo (15 nov, sobre `main` 6d85e3b), **sin tocar código**: el dibujo de `expediente/fondo_menu.js` contra la
> especificación de `expediente/ambiente_plan.js` (#76). Todo el fondo es **ilustración** (sin valor científico).
> Método: Edge sin interfaz a 960 × 540 con `?semilla=7` y `?semilla=11`. Se detuvo el reloj real y se avanzó el
> `FondoMenu` real con `paso(40)` durante **3,600 s simulados**. Se midieron 2,000 posiciones del agujero negro contra las
> cajas reales de los botones de la vista principal. Sin errores de consola.

| Regla de la especificación | Medido en pantalla | ¿Cumple? |
|---|---|---|
| Asteroides cada 4–10 s, máx. 3 | 355 en 60 min; máximo 3 a la vez; separación 4–30 s (pasa de 10 s solo cuando ya hay 3 en pantalla y se salta uno) | Sí |
| Cometa cada 15–40 s, máx. 1 | 133 en 60 min; separación 15.2–39.8 s; nunca 2 a la vez | Sí |
| Planeta o Sol detrás de Marte cada 90–240 s, dura 15–25 s | 22 en 60 min; separación 97.9–230.2 s; duración 15.1–24.1 s; el planeta solo se ve en ~51 % de su recorrido (el resto va tapado por Marte y, a la altura de los botones, por sus cajas) | Sí |
| **Marte nunca es evento** | Eventos: mercurio 7, venus 4, neptuno 3, tierra 2, urano 2, júpiter 2, saturno 1, sol 1. **Ningún Marte**; `fondo_menu.js` tampoco tiene color para Marte | **Sí** |
| El Sol es el más raro (peso 0.4) | 1 de 22 (4.5 %; lo esperado es 5.4 %) | Sí |
| Galaxias cada 120–240 s, dura 70–100 s, sin repetir la anterior, solo las 3 activas | 20 en 60 min; separación 124.3–238.8 s; 0 repeticiones seguidas; solo Can Mayor, Sagitario y Gran Nube | Sí |
| **Destellos en plata casi siempre** (70 %) | 602 de 852 = **70.7 %** plata; lavanda 85, ámbar 86, turquesa 79 | **Sí** |
| **Agujero negro solo al volver de un nivel** | Con los mismos resultados que al salir: no sale. Con un resultado más: sí sale. Al volver de Resultados, el Menú abre la vista principal, donde está el fondo vivo. Cambiar de idioma no lo repite | **Sí** |
| **Agujero negro lejos de los botones** | **En 694 de 2,000 posiciones (35 %) la huella del agujero (92 × 44 px) se encima con una caja de botón.** Captura: `docs/taller/capturas/fondo_menu_agujero_sobre_botones.png` (entre «3 · Explorador libre» y «4 · ¿De dónde salen los números?») | **No** |
| `prefers-reduced-motion` | Sin reloj y sin asteroides: solo una galaxia quieta | Sí |

### Diferencias (para el frente expediente / juego; yo no toco el código)
1. **El agujero negro cae sobre los botones (35 %).** `ZONA_BOTONES` (`ambiente_plan.js`) sigue en `{ x0: 360, y0: 150,
   x1: 600, y1: 520 }`, la columna de antes del rediseño. Hoy las cajas miden x 270–690 y y 150–394, y el lema ocupa y 96–120.
   El agujero se dibuja detrás de los botones y no bloquea clics, pero se ve como un hueco encima de ellos.
   **Propuesta (1 línea):** `ZONA_BOTONES = { x0: 264, y0: 90, x1: 696, y1: 400 }`. Con el mismo `posicionAgujero()`
   (margen de 40 px) el encime baja de **35.4 % a 0.8 %** (20,000 posiciones simuladas contra las cajas medidas).
   La prueba de `pruebas/ambiente.test.js` que revisa la zona hay que actualizarla con el mismo valor.
2. **Las primeras apariciones son más rápidas que la cadencia** (`fondo_menu.js`, línea 57). Es a propósito, para que el
   Menú no se vea vacío, pero no está en la especificación: la galaxia sale al instante, el primer cometa en 5–13 s (cadencia ÷ 3)
   y el primer planeta en 15–40 s (cadencia ÷ 6). Como el fondo se vuelve a crear en **cada cambio de vista** (Menú ↔ Números ↔
   Cómo jugar), al navegar aparece una galaxia nueva cada vez. Sugerencia: aceptarlo y anotarlo en `ambiente_plan.js`, o
   arrancar la galaxia con un retraso de 20–40 s.
3. **El fondo vivo también corre en «¿De dónde salen los números?» y «Cómo jugar».** Los asteroides y la galaxia se ven
   tenues detrás de los paneles semitransparentes. No tapa texto, pero `ZONA_BOTONES` solo describe la vista principal.
   Si molesta, crear `FondoMenu` solo en `principal` (`Menu.js`, línea 94).
4. **Las 3 galaxias se dibujan igual** (la misma nube lavanda de 70 puntos). El nombre (`nombre` en `GALAXIAS`) no se usa en
   pantalla, así que Can Mayor, Sagitario y la Gran Nube no se distinguen. Es aceptable como ilustración; si se quiere
   distinguirlas: la Gran Nube más ancha e irregular, y las enanas más pequeñas y tenues.
5. **Detalle menor:** al nacer, la galaxia se dibuja un cuadro con opacidad 0.6 (`|| 0.6` en `dibujar()`, porque la vida
   es 0 en t = 0) y en el siguiente cuadro baja a ~0, así que parpadea una vez. Con `prefers-reduced-motion` ese `|| 0.6` sí
   hace falta (la galaxia quieta se ve).
6. **Planeta detrás de Marte:** se ve ~2–3 s al entrar y ~2–3 s al salir (captura
   `docs/taller/capturas/fondo_menu_planeta_detras_de_marte.png`, Neptuno a la izquierda). Cumple la regla.

## En curso
- (nada)

## Siguiente
- [ ] **Gravedad de Marte 3.73 si el equipo la cambia** (hoy 3.71): actualizar los 2 textos de
  `game/src/scenes/expediente/numeros.js` (español e inglés) y el destino de prueba en `pruebas/logica.test.js`.
- [ ] **Volver al Expediente tras elegir sitio** (Expediente / Juego): "Continuar" (`Menu.js`, `continuar()`) va al Taller si
  hay sitio y Resultados no ofrece ir al Expediente; los tickets restantes solo se usan con "Nueva partida".

## Cómo probar
- `cd game && npm run dev` → Menú → `1` (Nueva partida) → `1` (Marte) → `1` (Samalayuca) → Enter → Taller.
- Pruebas de lógica: `cd game && node --test src/scenes/expediente/pruebas/`
- Explorador con API: desde la raíz `ALLOWED_ORIGINS=http://localhost:5173 uvicorn api.main:app --port 8000`.
  Opcional: `game/.env.local` con `VITE_API_URL=...` y `VITE_WEB_URL=...`.

## Bloqueos / necesito de otro frente
- **Zonas táctiles de `ui.js`** (Alan): `boton()` usa solo el área del texto; afecta a Resultados y a las escenas que lo usan.
- **Esc y flechas en Resultados y Taller** (Edmundo, Leo): Resultados solo usa números y Enter; en el Taller Esc no volvía.
- **Juego (Edmundo), visto el 14 nov sobre `0f8f8b3`, no reverificado:** texto de la fuente del perfil cortado en Prueba y
  Misión; en Marte, manteniendo → el robot cruzó la zona de entrega y salió por el borde derecho del terreno.
- **Modelo/API (Mario):** `/score` para (31.84, -113.39) devolvió total 0.60 con confianza 0.25 y `puede_proponer: true`.
  ¿Exigir una confianza mínima para proponer? Lo decide el frente modelo.
- **API (CORS):** el servidor debe incluir el origen del juego en `ALLOWED_ORIGINS`.
- **Arte (Mauricio):** desde #50 el Boot ya no precarga GIF, MP4 ni WebM, pero si se ponen en `/assets` Vite los copia al
  build (para poder listarlos y reportarlos). Conviene que los GIF y videos vivan en `docs/media/`.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- **web/ (Alan):** leer `?ficha=<ID>` y `?sitio=<id>` al cargar para abrir la ficha o el sitio directamente.
- **Despliegue:** definir `VITE_WEB_URL` (URL pública de web/) y `VITE_API_URL` (API del VPS) al construir el juego.
