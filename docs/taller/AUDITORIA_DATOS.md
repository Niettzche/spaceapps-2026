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
