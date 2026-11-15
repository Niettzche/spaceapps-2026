# Piezas del taller: de dónde salen (v1)

> Dueño: frente taller (Leo) · Rama: `feat/taller` · 14 nov 2026.
> **Los números de `game/src/content/parts.json` son valores de juego (P), no datos de ingeniería.**
> Este documento solo explica qué hecho real inspira cada pieza y su compromiso (trade-off). Cada hecho tiene su fuente;
> lo que no se pudo verificar no aparece. Las inspiraciones son para el pitch y las tarjetas del taller, no para el modelo.
> Idioma: cada pieza trae `nombre` (español) y `nombre_en` (inglés); el taller muestra el que toca con `trDato(pieza, 'nombre')`
> (`game/src/i18n.js`). Las ranuras tienen `nombre_en` en `game/src/scenes/Taller/diseno.js`, y `validar(…, { en: true })` da
> los errores en inglés (sin la opción quedan en español, como esperan las pruebas).

## 1. Hechos verificados (fuentes NASA / JPL / Smithsonian)

| # | Hecho | Fuente |
|---|---|---|
| H1 | Las ruedas de **Perseverance** miden 52.6 cm de diámetro, son de aluminio con rayos curvos de titanio y tienen **48 garras (tacos) curvas**; las de **Curiosity** miden 50.8 cm y tienen **24 garras en chevrón**. Las de Perseverance son algo más angostas que las de Curiosity. **Cada una de sus 6 ruedas tiene su propio motor**. | [NASA: Perseverance gets its wheels](https://www.nasa.gov/solar-system/nasas-perseverance-mars-rover-gets-its-wheels-and-air-brakes/) · [NASA: Perseverance rover components](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/) |
| H2 | El equipo de **Curiosity** da seguimiento al daño que el terreno causa en sus ruedas de aluminio y usa algoritmos de "control de tracción" que reducen las fuerzas sobre las ruedas al subir rocas. | [NASA Science blog, soles 2032–2033 (2018)](https://science.nasa.gov/blog/sol-2032-2033-the-rocks-vs-stone-cold-aluminum-wheels) |
| H3 | **Spirit** quedó atrapado en suelo blando en "Troy" (1 may 2009): las ruedas no lograban tracción. En enero de 2010 se convirtió en plataforma fija; la misión terminó el 25 may 2011. | [NASA Science: Spirit](https://science.nasa.gov/mission/mer-spirit/) · [NASA: Spirit embedded in soft soil](https://www.nasa.gov/image-article/spirit-embedded-soft-soil-mars-as-engineers-devise-methods-free-spirit/) |
| H4 | Las ruedas de **Opportunity** se hundieron más de 10 cm en una ondulación de arena blanda ("Purgatory", ~⅓ m de alto y 2.5 m de ancho) el 26 abr 2005; liberarlo tomó más de cinco semanas de planeación, pruebas y manejo cuidadoso. | [JPL PIA07999: Looking back at Purgatory Dune](https://www.jpl.nasa.gov/images/pia07999-looking-back-at-purgatory-dune) |
| H5 | Las ruedas del **Lunar Roving Vehicle** (Apolo) eran una malla tejida de hilos de acero galvanizado sobre un cubo de aluminio, 81.8 cm de diámetro y 23 cm de ancho, con chevrones de titanio en el 50 % del área de contacto. | [NASA NSSDC: Apollo LRV](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html) · [Smithsonian NASM: Wheel, Lunar Rover](https://airandspace.si.edu/collection-objects/wheel-lunar-rover/nasm_A19750830000) |
| H6 | El **MMRTG** de Perseverance genera ~110 W eléctricos al inicio de la misión con el calor del plutonio-238 y carga **dos baterías de ion litio**, que cubren los picos de demanda (hasta ~900 W en actividades científicas). | [JPL press kit Mars 2020: power](https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/spacecraft/power/) |
| H7 | **Opportunity** (solar) perdió contacto el 10 jun 2018: una tormenta global de polvo dejó sus paneles sin luz. NASA cerró la misión el 13 feb 2019. | [NASA: Opportunity mission comes to end](https://www.nasa.gov/news-release/nasas-record-setting-opportunity-rover-mission-on-mars-comes-to-end) |

Principio general (no es una cifra citada): a igual peso, una rueda con **más área de contacto** ejerce menos presión sobre el
suelo y se hunde menos en arena suelta. Así se justifica en el juego la rueda ancha; el número exacto del agarre es de juego.

## 2. Pieza → inspiración → qué representa en el juego

| Pieza (`id`) | Inspiración real | Qué representa el número de juego |
|---|---|---|
| `rueda_estandar` | Rueda rígida de aluminio tipo Curiosity (H1) | Equilibrada; agarre medio, bajo en arena (camino dorado: patina en dunas, H3–H4) |
| `rueda_ancha` | Lección de Spirit y Opportunity en arena (H3, H4); rueda ancha del LRV (H5) + principio de área de contacto | Mucho agarre en arena, menos en roca; más masa y costo |
| `rueda_tacos` | Garras de Curiosity/Perseverance y chevrones del LRV (H1, H5) | Mejor en roca; pesada y cara |
| `chasis_ligero` / `chasis_reforzado` | Compromiso masa ↔ robustez; el daño en las ruedas de Curiosity (H2) muestra el costo de ahorrar material | `resistencia` = vida del chasis ante impactos |
| `bateria_chica` / `bateria_grande` | Baterías de ion litio que respaldan los picos de demanda (H6) | `capacidad` = energía de juego; más capacidad = más masa |
| `motor_eficiente` / `motor_potente` | Cada rueda de Perseverance tiene su propio motor (H1) | `fuerza` (subir pendientes) contra `consumo` (gasto de batería) |
| `soporte_basico` / `soporte_amortiguado` | Sin referencia específica verificada: es mecánica de juego (proteger el suministro) | `proteccion` = fracción del daño que no llega a la carga |
| `panel_solar` | Spirit y Opportunity fueron solares; el polvo acabó con Opportunity (H7) | **Sin efecto en el MVP**: no hay regla de iluminación explicable todavía (espec. de juego §6) |

`radio_m` (ruedas) es un valor de juego a la escala del robot del juego (3 m de largo, 8 px de arte = 1 m), no el radio de una rueda real.

## 3. Reglas del armado (contrato con el frente juego)

- 7 ranuras: `chasis`, `rueda_del`, `rueda_tras`, `motor`, `bateria`, `carga` (obligatorias) y `modulo` (opcional).
- Cada ranura de rueda es un **eje con 2 ruedas**: cobra 2 × costo y 2 × masa.
- `partida.diseno = [{ ranura, pieza }]`, en el orden de las ranuras y sin ranuras vacías.
- Agarre del robot por superficie = **promedio de los dos ejes**: en la física cada rueda usa su propio agarre, así que los dos
  ejes aportan. Si los ejes llevan ruedas distintas, el taller avisa: **"con las dos anchas es más seguro"** (o "con las dos
  ruedas iguales", si no hay ancha). Antes era "el peor eje"; se cambió a pedido de integración tras verificarlo en la física.
- La autonomía del taller usa la misma regla de energía que la física (`fisica/energia.js`) con la masa del robot **más los
  10 kg de la carga** (`MASA_CARGA_KG` de `fisica/diseno.js`). `resumen().masa` sigue siendo solo el robot (contrato con la física).
- Robot mínimo (ruedas estándar) = 730 créditos; con ruedas anchas = 890; presupuesto = 1,000.
- Código: `game/src/scenes/Taller/diseno.js` (`RANURAS`, `DISENO_POR_DEFECTO`, `resumen()`, `validar()`), probado con
  `node game/src/scenes/Taller/diseno.test.mjs`.

## 4. Libro de datos (`docs/taller/Space_Apps_Game_Data.xlsx`, en inglés)

- **Parts**: PT-001…PT-012 = las 12 piezas de `parts.json`, con referencia real y S-IDs (S14, S52, S64–S70). Masa y costo son (P).
- **Biomes**: ángulo de fricción de **arena de duna** (BM-004) 28–34° y de **escoria/cinder de campo de lava** (BM-003) 25–32°.
  Son valores **genéricos** (no medidos en Samalayuca ni en Pinacate):
  - 28° y cohesión 1.04 kPa: arena seca de Wong (2001), tabla 1 de [NASA/TM-20250006958](https://ntrs.nasa.gov/citations/20250006958).
  - 32° (reposo) y 34° (crítico): ángulos medios de caras de avalancha de barjanes ([Pelletier et al. 2015, JGR](https://doi.org/10.1002/2015JF003636)); en arena seca sin cohesión se aproximan al ángulo de fricción.
  - 25–32°: ángulo de reposo de ceniza y escoria ([NPS, Cinder Cones](https://www.nps.gov/articles/000/cinder-cones.htm)). La lava sólida se comporta como roca.
- **Constantes de Bekker** (columnas nuevas AD–AI de Biomes):
  - Arena seca: n 1.1, k_c 0.99 kN/m^(n+1), k_φ 1528.43 kN/m^(n+2) (NASA/TM-20250006958, de Wong 2001).
  - Regolito lunar: n 1, k_c 1.4, k_φ 820 (Draft): la misma NASA TM advierte que **no existen parámetros de Bekker reales del
    regolito lunar**; los de la era Apolo son estimaciones a partir de Surveyor.
  - Polvo marciano (drift) y lava: siguen en Gap. Lo más cercano es el simulante M90 (S63), que no es polvo real.
- **Gravedad de Marte (decisión del equipo, 14 nov):** el juego usa **3.71 m/s²**, gravedad ecuatorial de NASA JPL
  ([SSD, Planetary Physical Parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html)), fila nueva Mars!MR-056. El 3.73 de
  MR-001 es la media global de la Mars Fact Sheet: son convenciones distintas, no un error (`docs/DECISIONES.md`).
- **Hoja `Judges` (respuestas para los jueces, en inglés):** 4 respuestas con dato real, valor de juego (P) al lado, fuente y
  dónde se rompe la analogía. Cada una tiene una fórmula de verificación que se recalcula con las otras hojas.
  - QA-001 velocidad: VIPER ~0.1 m/s (diseño; 0.05–0.2 según el modo) y Perseverance 0.042 m/s (152 m/h), contra 6 m/s del juego (×60).
  - QA-002 por qué se atascó Spirit en "Troy" (NASA/JPL).
  - QA-003 y QA-004 agarre del regolito lunar (φ 30–50°, tan 0.58–1.19) y del polvo de Marte (φ 15.6–20.4°, tan 0.28–0.37).
- **Corrección (14 nov):** BM-013 decía "Spirit se hundió 50–90 % de la altura de la rueda en Troy" y citaba S20, pero esa fuente
  no tiene cifras de hundimiento ni menciona Troy. Se quitó y se reemplazó por lo que dice NASA (S65, S72). S19 y S20 ahora
  nombran el documento exacto de NTRS; la tabla de Marte avisa que son estimaciones de ingeniería, no mediciones directas.
- Cada cambio quedó en la hoja **Review Log** (RV-094…RV-149) y las fuentes nuevas en **Sources** (S59–S73).

## 5. Piezas nuevas: fuentes (15 nov, Leo)

Cada valor tiene fuente o es (P). Los de Excel están en la hoja **Parts** (PT-013…PT-018), marcados como referencia: **no están en `parts.json`**, así que el juego no los usa todavía.

| Pieza | Dato con fuente | Fuente | Estado | Uso en el juego |
|---|---|---|---|---|
| Rueda de malla tipo LRV (Apolo) | Tejido de hilos de acero galvanizado sobre cubo de aluminio; 81.8 cm de diámetro, 23 cm de ancho; chevrones de titanio en el 50 % del área de contacto | [NASA NSSDC, Apollo LRV](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html) (S64) | Verified | Referencia; no es una pieza del juego |
| Rueda rígida de aluminio con grousers (Curiosity/Perseverance) | Curiosity: 50.8 cm, 24 chevrones. Perseverance: 52.6 cm, 48 garras curvas, 6 ruedas con motor propio | [NASA, Perseverance (S14)](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/); [JPL, Apr 2020 (S70)](https://www.nasa.gov/solar-system/nasas-perseverance-mars-rover-gets-its-wheels-and-air-brakes/) | Verified | Referencia de `rueda_tacos` / `rueda_estandar` |
| Calentador o aislamiento de la batería | **No confirmado.** Lo que sí dice NASA: el calor de desecho del MMRTG se bombea por un lazo de fluido que mantiene la electrónica en el rango −40 a +50 °C; los calentadores de radioisótopos calentaban la caja de la electrónica de Sojourner, Spirit y Opportunity | [NASA/JPL, MSL launch press kit, p. 38](https://www.jpl.nasa.gov/news/press_kits/MSLLaunch.pdf) (S76); [NTRS 20150008894](https://ntrs.nasa.gov/citations/20150008894) (S78) | Gap | El frío sí resta batería (regla (P) de `fisica/ambiente.js`); el calentador no se modela |
| Radiador / disipación del motor | Los radiadores externos disipan el calor de desecho de la electrónica hacia el ambiente marciano; el MMRTG produce 110 W eléctricos y unos 2000 W de calor de desecho | [NTRS 20150008894](https://ntrs.nasa.gov/citations/20150008894) (S78); [MSL press kit, p. 38](https://www.jpl.nasa.gov/news/press_kits/MSLLaunch.pdf) (S76) | Verified para la electrónica; **Gap para el motor** | La regla de enfriamiento del motor (aire y radiación, (P)) de `fisica/ambiente.js` |
| Batería mediana (par MSL) | Dos baterías de ion litio de unos 42 Ah cada una, 28 V, que cubren los picos de demanda por encima de la salida del generador | [NASA/JPL, MSL launch press kit, p. 43](https://www.jpl.nasa.gov/news/press_kits/MSLLaunch.pdf) (S76) | Verified | Referencia para `bateria_grande`; Ah no es comparable con las unidades de capacidad del juego (P) |
| Panel solar grande (MER) | 1.3 m² de celdas triunión de tres capas; 140 W en la superficie de Marte; unos 900 Wh por sol, que bajan a unos 600 Wh por sol al final de la misión por el polvo | [NASA/JPL, MER launch press kit, pp. 8 y 44](https://www.jpl.nasa.gov/news/press_kits/merlaunch.pdf) (S77) | Verified | Referencia; `panel_solar` sigue sin efecto en el MVP |

**Corrección:** la hoja Sources (S40) citaba un artículo de aerogeles para decir que las baterías de un rover se mantienen entre
−40 y +40 °C frente a noches de −96 °C. Lo revisé y **esa página no lo dice**, así que bajé S40 a Draft. Por la misma razón
quité ese dato de la pregunta 9 de `docs/PITCH_QA_EN.md`.
