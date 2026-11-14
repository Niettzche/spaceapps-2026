# Piezas del taller: de dónde salen (v1)

> Dueño: frente taller (Leo) · Rama: `feat/taller` · 14 nov 2026.
> **Los números de `game/src/content/parts.json` son valores de juego (P), no datos de ingeniería.**
> Este documento solo explica qué hecho real inspira cada pieza y su compromiso (trade-off). Cada hecho tiene su fuente;
> lo que no se pudo verificar no aparece. Las inspiraciones son para el pitch y las tarjetas del taller, no para el modelo.

## 1. Hechos verificados (fuentes NASA / JPL / Smithsonian)

| # | Hecho | Fuente |
|---|---|---|
| H1 | Las ruedas de **Perseverance** miden 52.6 cm de diámetro, son de aluminio con rayos curvos de titanio y tienen **48 garras (tacos) curvas**; las de **Curiosity** miden 50.8 cm y tienen **24 garras en chevrón**. Las de Perseverance son algo más angostas y de piel más gruesa. En el Mars Yard de JPL agarraron igual o mejor en arena y resistieron mejor las rocas filosas. | [NASA: Perseverance gets its wheels](https://www.nasa.gov/solar-system/nasas-perseverance-mars-rover-gets-its-wheels-and-air-brakes/) |
| H2 | Las ruedas de **Curiosity** muestran perforaciones y grietas por rocas filosas desde 2013; JPL respondió con rutas más suaves y un algoritmo de "control de tracción" que reduce las fuerzas sobre las ruedas. | [NASA Science blog, soles 2032–2033](https://science.nasa.gov/blog/sol-2032-2033-the-rocks-vs-stone-cold-aluminum-wheels) · [Caltech (2017)](https://authors.library.caltech.edu/records/btxrk-e7662) |
| H3 | **Spirit** quedó atrapado en suelo blando en "Troy" (1 may 2009): las ruedas no lograban tracción. En enero de 2010 se convirtió en plataforma fija; la misión terminó el 25 may 2011. | [NASA Science: Spirit](https://science.nasa.gov/mission/mer-spirit/) · [NASA: Spirit embedded in soft soil](https://www.nasa.gov/image-article/spirit-embedded-soft-soil-mars-as-engineers-devise-methods-free-spirit/) |
| H4 | **Opportunity** se hundió hasta los rines en una ondulación de arena ("Purgatory", ~⅓ m de alto) el 26 abr 2005; salió más de cinco semanas después girando las ruedas poco a poco. | [JPL PIA07999: Looking back at Purgatory Dune](https://www.jpl.nasa.gov/images/pia07999-looking-back-at-purgatory-dune) |
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
- El agarre del robot por superficie es el **menor de los dos ejes** (la posición importa: poner ancha solo adelante no basta en arena).
- Robot mínimo (ruedas estándar) = 730 créditos; con ruedas anchas = 890; presupuesto = 1,000.
- Código: `game/src/scenes/Taller/diseno.js` (`RANURAS`, `DISENO_POR_DEFECTO`, `resumen()`, `validar()`), probado con
  `node game/src/scenes/Taller/diseno.test.mjs`.
