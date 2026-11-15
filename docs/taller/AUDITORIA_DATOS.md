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
