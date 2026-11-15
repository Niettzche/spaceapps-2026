# Auditoría de los números que se ven en pantalla

> Frente taller (Leo) · 15 nov 2026 · sobre el código de `main` **9649ca8**, en español y en inglés (`tr()` y `nombre_en`), más la web (`web/src`).
> **La demo publicada en v1.marsception.us todavía no es esta versión:** su bundle (`index-CqYAA-wn.js`) no tiene "New game",
> ni el selector "Español / English", ni los textos del taller de #57. Hay que repetir el recorrido en pantalla cuando Mario vuelva a publicar.
> Como pidió juego, **no corregí textos del juego**: aquí quedan anotados. En mi Excel y mis documentos no encontré errores (ver al final).

✓ correcto · ✗ error, hay que corregir · ⚠ correcto pero engañoso o incompleto

| Pantalla | Texto | Valor | Fuente | ✓/✗ | Corrección propuesta |
|---|---|---|---|---|---|
| Resultados, Marte (`feedback/analogia.js:56`) | "Destination soil: loose dust and sand (drift), internal friction angle … (**measured value**)" / "(dato medido)" | 15.6–20.4° | Oravec et al. 2020, NASA NTRS 20200003046, tabla 1 | ✗ | La tabla de NASA dice que son "*engineering estimates and not the result of direct measurement*". Cambiar a "(engineering estimate from Viking data)" / "(estimación de ingeniería con datos Viking)" |
| Resultados, Luna (misma línea) | "loose regolith, internal friction angle 30–50° (measured value)" | 30–50° | Connolly & Carrier 2023, NASA NTRS 20220014634 | ✗ | La fuente dice "*Apollo experiments estimated*". Cambiar a "(Apollo estimate)" / "(estimación de Apolo)" |
| Resultados (`analogia.js:41`) | "Less weight on the wheels means less grip: the test could not show that." | — | Fricción de Coulomb; libro de datos EQ-014 | ⚠ | Con menos peso baja la **fuerza** de tracción, no el coeficiente de agarre. Sugerencia: "Less weight on the wheels means less traction force" / "menos fuerza de tracción" |
| Resultados (`analogia.js:31`) | "Gravity: Earth 9.81 → destination 3.71 m/s² (0.38 ×). Earth cannot reproduce it." | 9.81 → 3.71; 0.38 × | NASA JPL SSD (S71); NASA Earth Fact Sheet (S03) | ✓ | — |
| Llegada a la misión (`recorrido.js:95`) | "gravity 3.71 m/s² (38 % of Earth's)" · Luna "1.62 m/s² (17 %)" | 3.71 / 1.62 | NASA JPL SSD (S71); NASA Moon Fact Sheet (S02) | ✓ | — (3.71 es la gravedad ecuatorial de JPL; 3.73 es la media de la Fact Sheet, ver `docs/DECISIONES.md`) |
| Prueba terrestre | Gravedad de la Tierra 9.81 m/s² | 9.81 | S03 (estándar 9.80665; media 9.82) | ✓ | — (convención redondeada) |
| HUD y nota de datos, Marte (`suelos.js:22-23`) | "crusty/cloddy soil φ 29.8–39.2°", "rock or outcrop (upper bound) φ 40–60°" | 29.8–39.2°; 40–60° | NTRS 20200003046, tabla 1 (Viking Lander II; rocas) | ✓ | — (si se aplica la corrección de arriba, decir también "estimación") |
| HUD, Tierra (`suelos.js`, `notaSuelo`) | "Soil: sand: provisional grip (P)" | 1 (P) | `USAR_SUELO_TIERRA = false`; BM-004 28–34° en el libro de datos | ✓ | — |
| Nota de datos (tecla I), dunas (`perfil.js:262`) | "recreated dune faces (~32°, angle of repose of sand; the 30 m model does not resolve them)" | 32° | Pelletier et al. 2015, JGR (reposo medio 32°, crítico 34°) | ✓ | — |
| Nota de datos (tecla I), Samalayuca | "Copernicus DEM GLO-30 (ESA), 30 m sampling; 3000 m transect … real 250 m window" | 30 m; 250 m | `docs/METODOLOGIA.md` | ✓ | — |
| Taller (`Taller.js`) | "In the test: grip² × soil grip (P)" | — | `fisica/robot.js` (`friccionDeAgarre = agarre²`) | ✓ | — |
| Taller | "Battery ≈ 99 s at full power, loaded (P)" | 99 s | `fisica/energia.js` con 10 kg de carga | ✓ | — |
| Expediente, fuentes (`expediente/numeros.js:17` y `:74`) | "Terrain, slope and crater shape: Copernicus DEM GLO-30 (ESA) **and SRTM**, at 200 m" | — | Ningún sitio jugable cita SRTM (samalayuca, pinacate, mx0207 y g00281 citan Copernicus) | ✗ | Quitar "y SRTM" / "and SRTM" |
| Expediente, modelo (`numeros.js:34` y `:91`) | "**75–77 %** out-of-fold balanced accuracy" | 75–77 % | `model/VALIDATION.md`: 77.6 % (3 variables), 75.8 % (solo d/D); `docs/METODOLOGIA.md` y `AGENTS.md` §6.1: ~78 % | ✗ | "about 78 % (76 % with depth/diameter alone)" / "~78 % (76 % solo con profundidad/diámetro)" |
| Expediente (`numeros.js:51`) | "Gravity (Mars 3.71, Moon 1.62): only simulated in the mission" | 3.71 / 1.62 | S71, S02 | ✓ | — |
| Expediente, variables de los 4 sitios jugables y 2 destinos | Oscilación térmica, precipitación, NDVI, pendiente, forma, diámetro, profundidad, borde | (en `data/sites`, `data/targets`) | Todas con unidad y fuente | ⚠ | A la pendiente y a las medidas de forma les falta `fecha` (el contrato §7 la pide). Sugerencia para modelo: la versión del DEM (Copernicus 2024_1) |
| Expediente, Jezero (`datos_en.js:42`) | Oscilación térmica 55 K (nota: 52 K Ls 25°, 53 K Ls 90°, 61 K Ls 180°) | 55 K | MEDA (S21) | ✓ | — Mi Excel (WX-016) da −83 a −22 °C = 61 K en los soles 43–44 (S22): son dos medidas distintas (dos días frente a un promedio por estación); no se contradicen |
| Expediente, polo sur lunar (`datos_en.js:58`) | Oscilación térmica 176 K | 176 K | Diviner, Williams et al. 2019 (script de modelo) | ✓ | — (no lo recalculé) |
| Web, inicio (`web/src/i18n.js:45`) | "it found 668 crater-like hollows and measured each one against craters at the lunar south pole" | 668 | `docs/METODOLOGIA.md` | ⚠ | El 668 es correcto, pero la forma se compara con la Luna **y** Marte, y el 71 % resultó ser dolinas y cañadas. Sugerencia: "…against craters at the lunar south pole and on Mars" |
| Web, proyecto (`Project.jsx:9`) | "3 of 10 prioritized arid regions, not the entire planet" | 3 de 10 | `docs/METODOLOGIA.md` | ✓ | — |
| Web, proyecto (`Project.jsx:11`) | "one detector … shared resolution of 200 m per pixel" | 200 m | `docs/METODOLOGIA.md` | ✓ | — |
| Web, mapa (`i18n.js:21`) | "Shape within the Moon+Mars range (95%; does not confirm a crater)" | 95 % | `model/VALIDATION.md` | ✓ | — |

**Resumen:** 4 errores (✗) y 3 textos engañosos o incompletos (⚠).
- **Errores, los 4 en textos del juego:**
  - "dato medido" para los ángulos de fricción de Marte y de la Luna, que son estimaciones.
  - "SRTM" como fuente, aunque ningún sitio jugable lo usa.
  - "75–77 %" de exactitud, que hoy es ~78 %.
- **Engañosos o incompletos:** "menos agarre" en vez de "menos fuerza de tracción"; falta la fecha en algunas variables; la web dice que los 668 se midieron "contra la Luna", sin Marte.

**Mi Excel y mis documentos:** revisé las hojas Judges, Ambiente y Biomes, y `PIEZAS.md`, `AMBIENTE.md`, `PITCH_QA_EN.md` y `METHODOLOGY_EN.md`. Ninguno llama "medidos" a los ángulos de Apolo y Viking (la hoja Judges cita la advertencia de NASA de que son estimaciones), y las gravedades y velocidades coinciden con las fuentes. No encontré errores que corregir.

**Falta (después de que Mario publique):** recorrer la demo en v1.marsception.us con `?lang=es` y `?lang=en` para confirmar que se ve lo mismo que el código auditado.

## 2. Clima y obstáculos (15 nov, `main` 1698854)

> Juego local (`npm run dev`) con `?lang=es` y `?lang=en`. Capturé en pantalla el panel de instrucciones de la prueba en Samalayuca
> y de la misión a Jezero, y el panel de datos (tecla I) de la misión lunar. La barra del motor la vi en las tres. Las líneas de
> Resultados las revisé en el código (`feedback/analogia.js`), sin terminar una partida.
> Comparo con la hoja **Ambiente** del libro de datos y con `docs/taller/AMBIENTE.md`. Las reglas (P) de `fisica/ambiente.js`
> y `fisica/obstaculos.js` son valores de juego: reviso que estén marcadas, no su valor.

| Pantalla | Texto | Valor | Fuente | ✓/✗ | Corrección propuesta |
|---|---|---|---|---|---|
| Datos de los sitios (`ambiente.js`, `CLIMA_SITIOS`) | Mínima/máxima típica, extremos, media, presión y densidad de samalayuca, pinacate, mx0207 y g00281 | 28 valores | AMBIENTE.md AM-001…AM-028 (NASA POWER, S74/S75) | ✓ | — (coinciden uno por uno) |
| Datos de los destinos (`ambiente.js`) | Jezero −83 / −22 / −55 °C, 0.718 kPa, 0.017 kg/m³; Luna −53 °C (borde), −248 °C (sombra), 3×10⁻¹⁰ Pa, 0 | — | AMBIENTE.md (S22, S21, S07, S02) | ✓ | — |
| Instrucciones, prueba Samalayuca (EN) | "Earth: 0 to 36 °C · air 1.04 kg/m³: cools the motor well" | 0.3 / 36.2 °C; 1.045 kg/m³ | AM samalayuca | ⚠ | `toFixed(2)` muestra 1.045 como **1.04** (redondeo binario). Sugerencia: 3 decimales ("1.045") |
| Instrucciones, misión Jezero (EN) | "Mars: −83 to −22 °C · air 0.017 kg/m³ (1 % of Earth's): the motor barely cools" | −83 / −22 °C; 0.017; 1 % | S22; 0.017 / 1.217 = 1.4 % | ⚠ | Las temperaturas son de **dos soles** de MEDA, no un rango típico. Sugerencia: "−83 to −22 °C (2 sols, MEDA)" / "(2 soles, MEDA)" |
| Instrucciones, misiones | "cold battery: starts at 85 % · motor: limit 100 °C" | 85 %; 100 °C | Reglas de `ambiente.js` (P) | ⚠ | Aquí no dice que son valores de juego (en el panel I sí: "Reglas (P)"). Sugerencia: anteponer "(P)" |
| Instrucciones, misión Jezero | "Arrival on Mars · gravity 3.71 m/s² (38 % of Earth's)" | 3.71; 38 % | S71 | ✓ | — |
| Panel de datos (I), Luna (ES) | "Luna: −53 °C · sin aire (vacío): el motor solo se enfría por radiación" | −53 °C | Diviner (S07): ~220 K en bordes iluminados | ⚠ | No dice que es el **borde iluminado** (esa nota solo sale en el Expediente). Sugerencia: "−53 °C (borde iluminado)" / "(sunlit rim)" |
| Panel de datos (I), Luna | "Reglas (P): batería fría: arranca al 89 % · motor: límite 100 °C · luz rasante: el panel solar recarga 20 %" | 89 %; 100 °C; 20 % | `factorFrio(−53)` = 0.894; reglas (P) | ✓ | — |
| Panel de datos (I), Luna | "Fuente: docs/taller/AMBIENTE.md: LRO Diviner, UCLA (S07); NASA Moon Fact Sheet (S02)" | — | AMBIENTE.md | ✓ | — |
| Panel de datos (I), obstáculos | "3 rocas de 0.3–0.4 m medio enterradas (asoman ≤ 0.09 m); el modelo de elevación no los resuelve" | 0.3–0.6 m | Recreación (P); los DEM son de 30–200 m por píxel (`docs/METODOLOGIA.md`) | ✓ | — |
| Panel de datos (I), arena blanda | "soft-sand patches (grip −25 %)" | −25 % | Recreación (P) | ✓ | — |
| Barra del motor (HUD) | Temperatura al arrancar: 18 °C (Samalayuca), −55 °C (Jezero), −53 °C (Luna) | media del lugar | AM: 17.9 / −55 / −53 | ✓ | — |
| Expediente (`lineasAmbiente`) | "Pressure: 0.718 kPa · air 0.017 kg/m³ (1 % of Earth's at sea level)"; "solar panel at 43 %" | 0.718; 43 % | S22; WX-007: 586.2 / 1361 W/m² = 0.431 | ✓ | — |
| Resultados (`analogia.js:67`) | "El motor se calentó N veces… el aire de la Tierra (1.045 kg/m³) lo enfría; en el destino el aire es el 1 % del de la Tierra" | 1.045; 1 % | AM samalayuca; S22 | ✓ | Opcional: "…del de la Tierra a nivel del mar", porque el 1 % se calcula contra 1.217 y no contra el 1.045 del sitio |
| Resultados (`analogia.js:72`) | "Frío: en el destino hace −83 °C y la batería arrancó al 85 %" | −83 °C | S22 (mínima de dos soles) | ⚠ | "hace −83 °C" suena a temperatura habitual. Sugerencia: "la mínima medida fue −83 °C (MEDA, dos soles)" / "the measured low was −83 °C (MEDA, two sols)" |
| Resultados (`analogia.js:78`, `:44`) | "estimación de Apolo / estimación de ingeniería con datos Viking"; "menos fuerza de tracción" | — | Auditoría 1 | ✓ | — (corregido) |
| Regla del motor (P), coherencia | Equilibrio a fondo con el motor eficiente: Tierra +27 °C, Marte +444 °C (se sobrecalienta), Luna +600 °C | — | `REGLAS.motor` y densidades de AMBIENTE.md | ✓ | — (coincide con el comentario del código: "~25–30 °C" y "pasa de 500 °C") |
| Comentario de código (`ambiente.js:210`) | El ejemplo dice "aire 0.016 kg/m³" | 0.016 | El valor que se usa es 0.017 | ⚠ | Solo es un comentario (no sale en pantalla): cambiar a 0.017 |

**Resumen de la sección 2:** sin errores (✗). Los números de clima vienen bien de AMBIENTE.md y las reglas están marcadas (P) en el
panel de datos y en el Expediente. Hay 6 avisos (⚠):
1. "1.04" en vez de 1.045.
2. Los −83/−22 °C de Jezero sin decir que son dos soles.
3. Falta "(P)" en las reglas del panel de instrucciones.
4. Los −53 °C lunares sin decir "borde iluminado".
5. "hace −83 °C" en Resultados.
6. Un comentario de código desactualizado.

## 3. Demo publicada (v1.marsception.us, 15 nov)

Revisé el bundle publicado (`/assets/index-B7-1DKRo.js`, el que carga `https://v1.marsception.us/game/?lang=en`) buscando los textos de cada cambio:

| Qué | ¿Está en la demo publicada? |
|---|---|
| Menú en inglés ("New game") y selector "Español / English" | ✓ |
| Taller en inglés (#57: "durability") | ✓ |
| Ambiente y obstáculos ("cold battery", "grazing light", "soft-sand") | ✓ |
| Correcciones de la auditoría 1 ("traction force", "Apollo estimate", "Viking data", "about 78") | ✗ ninguna |
| Errores ya corregidos en `main` ("measured value", "and SRTM", "75–77") | ✗ siguen ahí |

**Conclusión:** la demo es más nueva que la de la auditoría 1, pero se publicó **antes** de que entraran sus correcciones. Hay que
**volver a publicar con `main` actual** (1698854 o posterior) para que los jueces no vean "measured value", "SRTM" ni "75–77 %".
Después basta con buscar de nuevo esos textos en el bundle publicado.

## 4. Accesibilidad (15 nov, `main` 6d85e3b)

> Recorrido en inglés con Edge sin ventana a 960×540, **solo con teclado**, auditando 33 pantallas (menú, Números, Explorador,
> Cómo jugar, destino, Expediente, Taller, Prueba, pausa, Resultados y Misión, en Marte y en la Luna). Por pantalla guardé cada
> texto (tamaño en px del juego, color) y cada control tocable (ancho × alto). Contraste: oculté los textos, tomé el lienzo y
> comparé el color de cada texto con los píxeles de fondo de su caja (uno de cada 2 px): **p10** = percentil 10 (el peor fondo),
> **mediana** = fondo típico. La caja incluye el relleno, así que el p10 sale pesimista junto a un borde o un marco de foco.
> Criterios de `docs/juego/DISENO.md` §2 y §5: letra ≥ 14 px; contraste ≥ 4.5:1; teclado completo; zona táctil ≥ 64×44 (`ZONA_MIN`,
> `expediente/interfaz.js:25`). La auditoría tomaba también objetos de escenas que corren debajo, así que cuento **objetos únicos**
> (escena + texto), no repeticiones. Aparte, el camino dorado en español con ratón (`game/e2e/camino_dorado.mjs ambos`): 25/25 OK.
> En un teléfono horizontal el lienzo se reduce ×0.72 (390/540): 14 px del juego ≈ 10 px CSS y 44 ≈ 32 px CSS.
>
> **`main` ya avanzó a 542a621:** después de medir entró el rediseño en pixel art de **Taller, HUD de Prueba/Misión y Resultados**
> (78b0f3e; cambian `Taller.js`, `hud.js`, `recorrido.js`, `sonido.js`, `Resultados.js` y el kit nuevo `comun/pixel.js`). Menú,
> Números, Explorador, Cómo jugar, destino y Expediente no cambiaron (el arte nuevo de #84–#86, como postales, fuente pixel y nave,
> todavía no lo usa el código; solo `ui_barra_relleno_*`). Para esas tres pantallas revisé el código de 542a621 (tamaños y zonas);
> **su contraste no está medido** después del rediseño.

✓ cumple · ✗ no cumple, hay que corregir · ⚠ cumple a medias o falta confirmarlo

| Criterio | Resultado | Números |
|---|---|---|
| Letra ≥ 14 px | ⚠ | 6d85e3b: 7 objetos de 11–12 px (17 textos únicos en 14 pantallas), todos en el HUD de Prueba/Misión y en Resultados; 0 en menús, Explorador y Expediente. En 542a621 los 7 ya van a 14–18 px; quedan 3 textos visibles de 12 px que la corrida no capturó (META, ZONA DE ENTREGA, carga del Boot) y 2 que solo salen a veces |
| Contraste ≥ 4.5:1 | ⚠ | 370 textos únicos: 8 con p10 < 4.5 y 4 con mediana < 4.5. Falla de verdad y sigue en 542a621: «Continuar» de la pausa (p10 3.62, mediana 3.99). Explorador (HTML): mínimo 6.26 |
| Juego completo con teclado | ✓ | Partida completa sin ratón en los dos destinos, con entrega: Marte 819/1000, Luna 821/1000. 35/37 pasos OK; los 2 «FALLA entrega» son del script (4.4) |
| Zona táctil ≥ 64×44 | ✗ | 90 controles únicos; 29 bajo 64×44 en 6d85e3b. El rediseño arregló 13 (botones de Resultados y «Quit» del HUD, ahora con `K.boton`, que garantiza 64×44 en `pixel.js:200-201`); siguen 16, más las flechas ▲▼ del catálogo del Taller |

### 4.1 Letra mínima (14 px del juego)

| Pantalla | Texto u objeto | Medido | ✓/✗ en 542a621 | Corrección propuesta | Frente |
|---|---|---|---|---|---|
| HUD de Prueba y Misión | Nota «Soil: … · [I] data», «⚑», «♪», «[ Quit ]» | 12 px | ✓ 14 px (nota y ⚑, `hud.js`), ♪ 18 px (`sonido.js:199`), «Quit» botón de arte de 14 px (`recorrido.js:177`) | — | Juego (Edmundo) |
| HUD de Prueba y Misión | «Motor» y su temperatura («18 °C», «-55 °C») | 11 px | ✓ 14 px (`hud.js`, `ESTILO`) | — | Juego (Edmundo) |
| Resultados de misión | «First record for this destination · 81 to ★★★» (es: «Primera marca en este destino · faltan 86 para ★★★») | 12 px y **encimado bajo las estrellas** (capturas `42_…resultados_mision`, `85_…`, `e2e-es/marte_57_…`) | ✓ 14 px, centrado bajo las estrellas (`Resultados.js:105`: estrellas en y 172–220, texto desde y 224) | Confirmar con captura | Juego (Edmundo) |
| Misión (en el terreno) | «DELIVERY ZONE · stop and wait 2 s» / «ZONA DE ENTREGA · frena y espera 2 s» | 12 px (`recorrido.js:161`); se ve en `40_mision_x252m.png` | ✗ | 14–16 px, con el mismo borde oscuro | Juego (Edmundo) |
| Prueba (en el terreno) | «FINISH» / «META» sobre la bandera | 12 px (`recorrido.js:171`) | ✗ | 14–16 px | Juego (Edmundo) |
| Pantalla de carga | «Data: N sites · M destinations · K art files» | 12 px (`Boot.js:46`) | ✗ | 14 px | Expediente (Diego, dueño del Boot según DISENO §4) |
| Pantalla de carga | Avisos «Not preloaded / Could not load / Missing data» | 12 px (`Boot.js:93, 97, 101`), solo si falla algo | ⚠ | 14 px | Expediente (Diego) |
| Prueba y Misión | Nombre del robot sobre el chasis | 13 px (`aspecto.js:206`), solo si el jugador le pone nombre | ⚠ | 14 px | Juego (Edmundo) |

### 4.2 Contraste (AA, 4.5:1)

| Pantalla | Texto u objeto | Medido (p10 · mediana) | Criterio | ✓/✗ | Corrección propuesta | Frente |
|---|---|---|---|---|---|---|
| Pausa (Prueba y Misión) | «[ Resume · Esc / Enter ]» `#4cc38a`, 21 px, sobre el terreno oscurecido al 70 % | 3.62 · 3.99 | 4.5 | ✗ código igual en 542a621 (`hud.js:107-116`) | Poner los botones de la pausa sobre `K.panel` o como `K.boton` (fondo opaco) y volver a medir | Juego (Edmundo) |
| HUD | «⚑» blanco al final de la barra de progreso | 1.78 · 1.78 (Prueba) | 4.5 | ⚠ en 542a621 pasó a 14 px en x ≈ 922; falta medir | Volver a medir; si sigue bajo, ponerlo sobre la franja oscura del HUD | Juego (Edmundo) |
| HUD | «♪» `#9aa4c7` | 4.29 · 4.76 | 4.5 | ⚠ en 542a621 es `#a3abcc` de 18 px; falta medir | Volver a medir | Juego (Edmundo) |
| Taller | «[ Undo ]» / «[ Redo ]» `#a3abcc` (desactivados) | 3.63 · 3.63 | 4.5 (WCAG no lo exige en controles inactivos) | ⚠ ahora son botones de arte; falta medir | Volver a medir el estado desactivado | Taller (Leo) |
| Menú | «2 · Continue» `#a3abcc` (desactivado, sin partida guardada) | 3.38 · 5.16 | 4.5 | ⚠ | — (inactivo; la mediana pasa) | Juego |
| Menú | «1 · New game ⏎» `#4cc38a` | 4.27 · 5.69 | 4.5 | ⚠ | — (el p10 baja por el marco amarillo de foco dentro de la caja) | Juego |

### 4.3 Zona táctil (≥ 64×44 px del juego)

| Pantalla | Control | Medido | ✓/✗ en 542a621 | Corrección propuesta | Frente |
|---|---|---|---|---|---|
| Expediente (lista, sitio, detalle, condiciones) | 5 filas de variables («Crater shape», «Daily temperature range», «Precipitation», «Vegetation (NDVI)», «Mean slope») | 653×39 | ✗ sin cambios (`ALTO_FILA = 42`, caja de 39: `Expediente.js:33, 186`) | Zona táctil de ≥ 44 de alto sin cambiar el dibujo (como `zonaExtra` de `pixel.js`) o `ALTO_FILA` 47 | Expediente (Diego) |
| Pausa | «[ Resume · Esc / Enter ]», «[ Quit · X ]» (solo texto) | 278×21, 139×21 | ✗ sin cambios (`hud.js:112-115`) | `K.boton` (zona ≥ 64×44) | Juego (Edmundo) |
| HUD | Nota de suelo (abre el panel de datos) | 515×13 | ✗ ahora 14 px, pero la zona sigue siendo el texto (`hud.js:38`) | Zona de ≥ 44 de alto; la tecla I ya es alternativa | Juego (Edmundo) |
| HUD | «♪» (silenciar) | 7×13 | ✗ 18 px con relleno 10×8 (`sonido.js:200`), aún < 64 de ancho | `K.boton` o zona 64×44; la tecla M ya es alternativa | Juego (Edmundo) |
| Taller | 6 muestras de pintura | 30×30 (una de 35×35) | ✗ igual (`Taller.js:693`) | Separarlas a 44 px o abrir un selector; la tecla P ya es alternativa | Taller (Leo) |
| Taller | «[ Name ]» (ahora «Name») | 87×28 | ✗ zona de 28 de alto (`Taller.js:701`) | `K.boton` como Regresar y Deshacer; la tecla N ya es alternativa | Taller (Leo) |
| Taller | «[ Remove ]» (ahora «Remove») | 135×34 | ✗ igual (`Taller.js:218`) | Zona de ≥ 44 de alto; Supr y Retroceso ya son alternativa | Taller (Leo) |
| Taller | Flechas ▲ ▼ del catálogo (solo con más piezas que filas) | 34×32 por código; no salieron en la corrida | ✗ (`Taller.js:209`) | Zona 64×44; ↑ ↓ ya son alternativa | Taller (Leo) |
| Resultados y HUD | 6 opciones «[ n · … ]», «← Previous / Next advice →», «A · analogy limits», «[ Quit ]» | 120–243 × 16, 232×38, 190×16, 53×13 | ✓ ahora `K.boton` (zona ≥ 64×44, `pixel.js:200-201`) | Confirmar con captura | Juego (Edmundo) |
| Menú, Números, Cómo jugar, destino, Explorador | Todos los botones | ≥ 64×44 (Explorador, HTML: alto 44) | ✓ | — | — |

### 4.4 Teclado

**Ruta completa sin ratón (Marte y luego Luna, 35/37 pasos OK):** Boot (tecla) → Menú → **3** Explorador → Tab + Enter «← Menu»
→ Menú → **1** Nueva partida → Cómo jugar (Enter ×4) → destino (foco + Enter) → Expediente (foco en el sitio + Enter; **I**
detalle, Esc; **C** condiciones, Esc; foco en «Probar» + Enter) → Taller (**C**) → Prueba (Esc pausa y reanuda; flechas reales;
falla con ruedas estándar) → Resultados (**Enter** = «Aplicar y al taller») → Taller (ruedas anchas ya puestas; **C**) → Prueba
(pasa) → Resultados (**Enter** = «Lanzar misión») → Misión (flechas reales; entrega con 8 % y 10 % de energía) → Resultados
(**3** = Menú). En 542a621 siguen esas teclas (`Taller.js:249-264`, `Resultados.js:209-216`), pero no repetí la corrida.

- Los 2 «FALLA entrega {}» son un error del script: leía `rm.entrega` y el registro trae `tipo` y `exito` (`recorrido.js:287-289`).
  Las capturas `42_audit_marte_resultados_mision.png` y `85_audit_luna_resultados_mision.png` muestran «Mission accomplished»
  (819 y 821 / 1000).
- **Flecha al empezar la misión: funciona.** Medido en 6d85e3b, en español: sin presionar Enter, → mueve el robot de inmediato
  (x 6.01 → 8.36 m, 3.3 m/s a los 1.1 s de juego). El panel de instrucciones no bloquea nada: `Controles.acelerador()` lee las
  teclas en cada cuadro (`controles.js:37-41`) y el panel se quita al acelerar o solo a los 6 s (`recorrido.js:195`, `hud.js:152`).
- Nota para quien mantenga `game/e2e/camino_dorado.mjs` (no es error del juego): en las dos misiones la e2e usó su respaldo
  `controles.forzado` porque revisa el movimiento 1.5 s de reloj después de presionar (`:184`), a ~16 fps sin ventana; en la
  misión presiona en cuanto existe el robot (`:307-312`), mientras que en la prueba antes toma una captura (`:329`).

### 4.5 Lo que no se midió

- **Contraste y tamaños reales del rediseño (Taller, HUD, Resultados) en 542a621:** solo los revisé en el código. Hay que repetir la
  auditoría en pantalla.
- **Pantallas en español:** el contraste y los tamaños se midieron en inglés; en español solo corrió la e2e con ratón. El español
  es más largo (DISENO §2.8) y `encoger` del HUD recorta con «…».
- **Teléfono real** (×0.72, dedos de verdad) y **lector de pantalla**: no se probaron.
- **`prefers-reduced-motion`:** el código lo consulta en los menús (`expediente/efectos.js`) y en la decoración del recorrido
  (`fisica/decoracion.js:11`); no corrí el juego con la preferencia activa. `fisica/efectos.js` (polvo) y el fundido de la misión
  no la consultan.
- **«Nada solo por color»** (DISENO §2.5) y el foco visible en cada control: no se revisaron uno por uno.
