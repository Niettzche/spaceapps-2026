# Textos cortos · keywords ES/EN para el rediseño (15 nov 2026)

> Autor: Leo (con Claude Code) · leído sobre `main` en el commit `6d85e3b` · propósito: **para usar directo en el código del rediseño**.
> Base: `docs/juego/DISENO.md` §2.3 («Keywords, no frases») y `AGENTS.md` §3 (nunca inventar datos; valores de juego con «(P)»).
> La frase completa **no se borra**: sigue en el detalle (tecla I, clic o «ver más»). Esta tabla solo da la versión visible.

## Regla de palabras

- **Máximo 6 palabras** por keyword, en español y en inglés.
- Cuenta como **1 palabra**: un número con su unidad (`0.38 g`, `15 s`, `60 %`, `1,000 créditos`), una variable con su unidad
  (`{g} m/s²`) y un atajo (`→/D`). **No cuentan**: `→ · ≥ > ✕ ⚠ ↗ ↘ ∠ × ☀` (íconos) y la puntuación. **«(P)» sí cuenta** como palabra.
- Cada cifra es la del código o de `data/` en `6d85e3b`, con su unidad. **(P)** = valor de juego (precios, piezas, tickets,
  créditos, umbrales, reglas del ambiente). Datos medidos (gravedad 3.71 / 1.62 / 9.81 m/s², NASA POWER, MEDA, Diviner, φ del
  suelo) **no** llevan (P).
- Plantillas: las variables van entre llaves con el nombre que tienen en el código (p. ej. `{n}`, `{minimo}`); la columna
  «Nota» dice de dónde sale cada una. Si una fila trae el valor ya calculado, es el que da el código hoy para ese sitio.
- «ya corto en código: …» = el rediseño ya lo resolvió; la keyword se da igual para tener ES/EN en un solo lugar.

## 1. Expediente

### 1.1 Proceso → uso de cada sitio (línea de keywords bajo el nombre)

Solo 4 sitios llegan al Expediente: `data.js` filtra `SITIOS` a los documentados y a los candidatos con perfil de elevación
(Samalayuca, Pinacate, mx0207, g00281). El resto del catálogo no se ve aquí; si un día entra, `palabrasClave()` arma
«proceso → uso» cortando cada frase en el primer `(`, `:` o `;` (mismo patrón; conviene curarlo como estos).

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `data/sites/samalayuca.json:10-11` · `datos_en.js:13` · `resumen.js:12` | Proceso: «Dunas formadas por viento (procesos eólicos)» · Uso: «Movilidad de rovers en arena suelta y dunas activas (agarre, hundimiento, subir y bajar crestas)» | Dunas eólicas → movilidad en arena suelta | Aeolian dunes → loose-sand mobility | ya corto en código: `resumen.js` (`CLAVES_SITIO`) |
| `data/sites/pinacate.json:10-11` · `datos_en.js:18` · `resumen.js:13` | Proceso: «Vulcanismo basáltico y cráteres» · Uso: «Geología de campo y movilidad en terreno volcánico y dentro de un cráter (maar El Elegante)» | Vulcanismo y cráteres → geología, movilidad | Volcanism and craters → field geology, mobility | ya corto en código: `resumen.js` |
| `data/sites/mx0207.json:10-11` · `datos_en.js:23` · `resumen.js:14` | Proceso: «Probable tajo minero a cielo abierto (cantera de OpenStreetMap a ≤ 2 km; por verificar)» · Uso: «Análogo operativo, no geológico: probar navegación y movilidad de rovers en paredes empinadas, excavación (ISRU) y operación con sombra en el fondo del tajo…» | Tajo minero → paredes empinadas, excavación, sombra | Open-pit mine → steep walls, excavation, shadow | ya corto en código: `resumen.js` |
| `data/sites/mx0207.json:10` (segunda frase de `uso_exploracion`, solo en español) | «La analogía se rompe por exceso de profundidad, sobre todo en el fondo: su d/D (0.289) supera al 100 % de los 3,418 cráteres lunares de diámetro parecido (mitad a doble) medidos a 200 m.» | d/D 0.289 > 3,418 cráteres lunares | d/D 0.289 > 3,418 lunar craters | Chip de riesgo opcional. La versión EN de `datos_en.js:26` no trae esta frase (el detalle en inglés hoy la omite) |
| `data/sites/g00281.json:10-11` · `datos_en.js:29` · `resumen.js:15` | Proceso: «Depresión cerrada tipo cráter de origen sin confirmar (sin borde: dolina, cuenca o maar erosionado)» · Uso: «Candidato a verificar en campo: navegación y movilidad dentro de una depresión tipo cráter» | Depresión tipo cráter por confirmar → movilidad | Crater-like depression, unconfirmed → mobility | Hoy en código ES = «Depresión sin borde, origen por confirmar → movilidad» (**7 palabras**). Se evita «sin borde» porque el mismo JSON mide `borde_levantado` 6.1 m (ver Límites) |
| `data/sites/g00281.json:10` (inicio de `uso_exploracion`) | «Candidato a verificar en campo» | Por verificar en campo | To verify in the field | Chip junto al estado CANDIDATO DEL MODELO |
| `Expediente.js:174` (sin keywords) | «Proceso: sin dato» | Proceso: sin dato | Process: no data | ya corto en código |

### 1.2 «Lo que la Tierra no puede probar»

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `Expediente.js:220` | «LA TIERRA NO PUEDE PROBAR» | LA TIERRA NO PUEDE PROBAR | EARTH CANNOT TEST | ya corto en código |
| `resumen.js:56` (`chipsLimites`, Marte) | «GRAVEDAD 0.38 g» | ✕ GRAVEDAD 0.38 g | ✕ GRAVITY 0.38 g | ya corto en código. 3.71 / 9.81 m/s² (`config/world.js`, dato real) |
| `resumen.js:56` (Luna) | «GRAVEDAD 0.17 g» | ✕ GRAVEDAD 0.17 g | ✕ GRAVITY 0.17 g | ya corto en código. 1.62 / 9.81 m/s² |
| `resumen.js:35-41` (`LIMITE_CORTO`) | «PRESIÓN» · «RADIACIÓN» · «VACÍO» · «LUZ RASANTE» | ✕ PRESIÓN · ✕ RADIACIÓN · ✕ VACÍO · ✕ LUZ RASANTE | ✕ PRESSURE · ✕ RADIATION · ✕ VACUUM · ✕ GRAZING LIGHT | ya corto en código; un chip por límite (Jezero: gravedad, presión, radiación; polo sur: gravedad, vacío, radiación, luz rasante) |
| `Expediente.js:373-374` (detalle) | «Gravedad ({mundo} {g} vs Tierra 9.81 m/s²; solo en la misión)» | {mundo} {g} · Tierra 9.81 m/s² · solo misión | {mundo} {g} · Earth 9.81 m/s² · mission only | `{g}` = `d.gravedad_ms2` (3.71 Marte · 1.62 Luna) |
| `Expediente.js:366` + `data/sites/samalayuca.json` `limites` | «Límite del cálculo: oscilacion_termica: destino por encima del máximo terrestre (55.0 > 40.0); se compara contra el extremo» | Oscilación {destino} > 40.0 K (P): recortada | Temp. range {destino} > 40.0 K (P): clipped | `{destino}` = 55.0 (Jezero) o 176.0 (polo sur: Pinacate, mx0207, g00281). 40 K = tope terrestre del modelo (`rango_tierra`, marcado (P) en `catalogo.js:74`) |
| `Expediente.js:366` + `data/sites/mx0207.json` `limites` | «Límite del cálculo: forma: fuera de la nube Luna+Marte (distancia 91.5 > 26.4): más hondo que casi cualquier cráter planetario de su tamaño» | Más hondo que casi cualquier cráter | Deeper than almost any crater | La distancia 91.5 > 26.4 se queda en el detalle |
| `Expediente.js:223` | «sin dato» (sin límites declarados) | sin dato | no data | ya corto en código |

### 1.3 Recorrido (prueba en la Tierra y misión) y su punto crítico

En los 6 tramos de hoy el punto crítico es la misma subida que la pendiente máxima, por eso cada fila de sitio junta ↗ y ⚠.

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `Expediente.js:246-249` + `resumen.js:71-90` (plantilla) | «↗ {subida}» · «∠ {pendiente} máx» · «{suelo}» · «⚠ {critico}» | ↗ {subida} · ∠ {pendiente} máx · {suelo} | ↗ {subida} · ∠ {pendiente} max · {suelo} | ya corto en código (íconos con número). `{subida}` = `Math.round(e.subida_m)` m; `{pendiente}` = `e.pendMaxSubida`° |
| `resumen.js:79` (crítico, plantilla) | «subida {p}° · {suelo}» | ⚠ Subida {p}° · {suelo} {P?} | ⚠ Climb {p}° · {suelo} {P?} | `{P?}` = « (P)» si el suelo no tiene φ con fuente (`datosSuelo` null: hoy toda la Tierra). Hoy la vista principal **omite** ese (P) que sí pone el detalle (`estadisticas.js:95`) |
| `resumen.js:81` · `estadisticas.js:99` | «casi plano: agarre y energía» · detalle: «Crítico: casi plano; cuentan el agarre y la energía» | ⚠ Casi plano: agarre y energía | ⚠ Almost flat: grip and energy | ya corto en código (`resumen.js`) |
| Samalayuca · prueba | «Sube 38 m, baja 21 m · pendiente máx. 38° (media 10°) · Suelo: arena 100 % · Crítico: subida de 38° · arena (P)» | ↗ 38 m · ⚠ 38° arena (P) | ↗ 38 m · ⚠ 38° sand (P) | Calculado hoy por `estadisticasNivel`; tramo real de 250 m de un transecto de 3.0 km |
| Pinacate · prueba | «Sube 65 m, baja 1 m · pendiente máx. 32° (media 12°) · Suelo: roca 100 % · Crítico: subida de 32° · roca (P)» | ↗ 65 m · ⚠ 32° roca (P) | ↗ 65 m · ⚠ 32° rock (P) | 250 m de un transecto de 4.0 km |
| mx0207 · prueba | «Sube 87 m, baja 0 m · pendiente máx. 34° (media 20°) · Suelo: roca 100 % · Crítico: subida de 34° · roca (P)» | ↗ 87 m · ⚠ 34° roca (P) | ↗ 87 m · ⚠ 34° rock (P) | 180 m de un transecto de 3.0 km |
| g00281 · prueba | «Sube 89 m, baja 0 m · pendiente máx. 27° (media 16°) · Suelo: arena 100 % · Crítico: subida de 27° · arena (P)» | ↗ 89 m · ⚠ 27° arena (P) | ↗ 89 m · ⚠ 27° sand (P) | 250 m de un transecto de 4.0 km |
| Jezero · misión | «Sube 13 m, baja 0 m · pendiente máx. 4° (media 2°) · Suelo: arena 100 % · Crítico: subida de 4° · arena φ 15.6–20.4°» | ↗ 13 m · ⚠ 4° arena | ↗ 13 m · ⚠ 4° sand | Sin (P): φ 15.6–20.4° con fuente (BM-013). 250 m de un transecto de 10.0 km |
| Polo sur lunar · misión | «Sube 65 m, baja 0 m · pendiente máx. 21° (media 12°) · Suelo: arena 100 % · Crítico: subida de 21° · arena φ 30–50°» | ↗ 65 m · ⚠ 21° arena | ↗ 65 m · ⚠ 21° sand | Sin (P): φ 30–50° (BM-008). 250 m de un transecto de 4.0 km |
| `estadisticas.js:102-103` (detalle, plantilla) | «Sube {subida} m, baja {bajada} m · pendiente máx. {max}° (media {media}°)» | ↗ {subida} m · ↘ {bajada} m · ∠ {max}° | ↗ {subida} m · ↘ {bajada} m · ∠ {max}° | La media puede quedarse solo en el detalle |
| `estadisticas.js:90-91` (detalle, plantilla) | «tramo real de {tramo} m de un transecto de {km} km» | Tramo real: {tramo} m de {km} km | Real stretch: {tramo} m of {km} km | `{tramo}` = `hasta_m − desde_m`; `{km}` = `transecto_m / 1000` (1 decimal) |
| `estadisticas.js:88` | «terreno ilustrativo (sin perfil medido)» | Terreno ilustrativo, sin medición | Illustrative terrain, not measured | |
| `Expediente.js:241` | «PRUEBA · TIERRA · ilustrativo» / «MISIÓN · {MUNDO}» | PRUEBA · TIERRA / MISIÓN · {MUNDO} | TEST · EARTH / MISSION · {MUNDO} | ya corto en código |

### 1.4 Condiciones del lugar (chips del recorrido y vista C)

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `resumen.js:94-107` (`chipsAmbiente`) · Tierra | Samalayuca «0 a 36 °C · aire 86 % · luz 100 %» · Pinacate «7 a 40 °C · aire 94 %» · mx0207 «5 a 30 °C · aire 78 %» · g00281 «10 a 42 °C · aire 86 %» | {tmin} a {tmax} °C · aire {pct} % · ☀ {luz} % | {tmin} to {tmax} °C · air {pct} % · ☀ {luz} % | ya corto en código (hoy dice «luz {luz} %»; ☀ = ícono de luz). NASA POWER (celda, no estación), sin (P) |
| `resumen.js:94-107` · Jezero | «−83 a −22 °C · aire 1 % · luz 43 %» | −83 a −22 °C · aire 1 % · ☀ 43 % | −83 to −22 °C · air 1 % · ☀ 43 % | ya corto en código. MEDA (dos soles) y WX-007 |
| `resumen.js:94-107` · polo sur | «−53 °C · sin aire · luz 20 %» | −53 °C · sin aire · ☀ 20 % (P) | −53 °C · no air · ☀ 20 % (P) | El 20 % sale de la regla de luz rasante (`REGLAS.luz.rasante`, P); hoy el chip no lleva (P) |
| `ambiente.js:262` (vista C) | «Temperatura: {tmin} a {tmax} °C ({etiqueta}) (extremos {a} / {b} °C)» | Temp. {tmin} a {tmax} °C | Temp. {tmin} to {tmax} °C | Extremos y etiqueta («dos soles, MEDA», «borde iluminado») al detalle |
| `ambiente.js:264-270` (vista C) | «Presión: {kPa} kPa · aire {rho} kg/m³ ({pct} % del de la Tierra a nivel del mar)» | {kPa} kPa · aire {pct} % | {kPa} kPa · air {pct} % | `{pct}` = `max(1, round(porcentajeAire))`. Ej.: Jezero 0.718 kPa · aire 1 % |
| `ambiente.js:267` | «sin aire: el motor solo se enfría por radiación» | Sin aire: solo enfría radiando | No air: radiative cooling only | |
| `ambiente.js:271-273` | «Luz: rasante (Sol casi en el horizonte) · panel solar al 20 %» | Luz rasante · panel 20 % (P) | Grazing light · panel 20 % (P) | Directa: «Luz directa · panel {luz} %» (Jezero 43 %, Tierra 100 %), sin (P) |
| `ambiente.js:274` + `efectosAmbiente` | «En el juego (P): batería fría: arranca al 98 % · motor: límite 100 °C …» | Ver §5 (reglas del ambiente) | See §5 (environment rules) | Mismas keywords que las instrucciones |
| `Expediente.js:505` | «CONDICIONES: aire, luz y qué hacen en el juego» | CONDICIONES · aire, luz, efecto | CONDITIONS · air, light, effect | |
| `Expediente.js:383` (detalle) | «Condiciones completas (temperatura, aire, luz y su efecto en el juego): tecla C.» | C · temperatura, aire, luz | C · temperature, air, light | |

### 1.5 Tickets y pie

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `Expediente.js:357` (ayuda, con tickets) | «Tickets: al probar, el sitio queda pagado y puedes volver a probarlo sin gastar otro ticket. Enter confirma.» | 1 ticket por sitio (P) · repetir gratis | 1 ticket per site (P) · free retests | Tooltip al enfocar «Probar»; «Enter confirma» va aparte |
| `Expediente.js:356` (ayuda, sitio pagado) | «Tickets: ya pagaste este sitio; probarlo de nuevo no gasta ticket. Enter confirma.» | Sitio pagado: repetir es gratis | Site paid: retests are free | |
| `Expediente.js:359` (ayuda, sin tickets) | «Sin tickets: elige un sitio ya pagado o empieza una Nueva partida desde el menú.» | Sin tickets: sitio pagado · Nueva partida | No tickets: paid site · New game | |
| `Expediente.js:356-358` (cola) | «Enter confirma.» | Enter confirma | Enter confirms | |
| `Expediente.js:282` (botón) | «Gastar 1 ticket y probar» | Probar · 1 ticket (P) | Test · 1 ticket (P) | DISENO.md §3 pide «Probar (1 ticket)» |
| `Expediente.js:283-284` (botón) | «Probar de nuevo (gratis)» · «Sin tickets» | Probar de nuevo (gratis) · Sin tickets | Test again (free) · No tickets | ya corto en código |
| `Expediente.js:275-278` | «TICKETS ●●● {n}/{total}» | TICKETS {n}/3 (P) | TICKETS {n}/3 (P) | `TICKETS_POR_PARTIDA` = 3 (P), `config/world.js` |

### 1.6 Otros avisos del Expediente

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `Expediente.js:83-84` | «El modelo aún no tiene sitios para este destino. Elige otro destino desde el menú.» | Sin sitios · elige otro destino | No sites · pick another destination | |
| `Expediente.js:368` (detalle) | «ILUSTRATIVO · datos de demostración: no son mediciones del sitio.» | ILUSTRATIVO · demostración, no medición | ILLUSTRATIVE · demo, not measured | El chip `Expediente.js:166` ya dice «ILUSTRATIVO · DEMO» |
| `Expediente.js:369` (detalle) | «Solo medido en la Tierra: {lista}» | Solo en la Tierra: {lista} | Earth only: {lista} | `{lista}` = etiqueta + valor de cada variable sin par en el destino |

## 2. Menú principal

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `Menu.js:99` (subtítulo del título) | «Entrena en la Tierra. Aterriza en la Luna o Marte.» | Tierra → Luna o Marte | Earth → Moon or Mars | |
| `Menu.js:106` · Nueva partida | «Elige destino: la Luna o Marte» | Destino: Luna o Marte | Destination: Moon or Mars | ya corto en código (tooltip de 1 línea) |
| `Menu.js:108` + `Menu.js:148-150` · Continuar | «Guardada: {mundo} · {sitio} · {tickets} ticket(s)» | {mundo} · {sitio} · {tickets} tickets | {mundo} · {sitio} · {tickets} tickets | Plantilla de `resumenGuardado`; «Guardada:» puede quitarse (el botón ya dice Continuar) |
| `Menu.js:148` (sin sitio) | «sin sitio elegido» | sin sitio | no site | |
| `Menu.js:108` · Continuar deshabilitado | «No hay partida guardada en este navegador» | Sin partida guardada | No saved game | |
| `Menu.js:109` · Explorador libre | «Consulta cualquier coordenada de la Tierra» | Cualquier punto de la Tierra | Any point on Earth | |
| `Menu.js:111` · ¿De dónde salen los números? | «Datos NASA · modelo · validación» | Datos NASA · modelo · validación | NASA data · model · validation | ya corto en código |
| `Menu.js:112` · Cómo jugar | «4 pasos, menos de 1 minuto» | 4 pasos · menos de 1 minuto | 4 steps · under a minute | ya corto en código |
| `Menu.js:125` (pie) | «↑↓ Tab: mover · 1–5 / Enter: elegir · L: idioma» | ↑↓ mover · 1–5 elegir · L idioma | ↑↓ move · 1–5 choose · L language | |

## 3. Nueva partida (elegir destino) y Cómo jugar

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `Menu.js:159` (título) | «¿A dónde va tu robot?» | ¿A dónde va tu robot? | Where is your robot going? | ya corto en código |
| `Menu.js:184` + `data/targets/jezero.json` `nombre` | «Cráter Jezero (Marte)» | Cráter Jezero | Jezero Crater | El planeta ya va en el título de la tarjeta |
| `Menu.js:184` + `data/targets/polo_sur_lunar.json` `nombre` | «Región candidata de Artemis, polo sur lunar» | Polo sur · región Artemis | South pole · Artemis region | |
| `Menu.js:187-188` · Marte (dato grande) | «0.38 g» · «gravedad · 3.71 m/s²» | 0.38 g · gravedad 3.71 m/s² | 0.38 g · gravity 3.71 m/s² | ya corto en código. Dato real |
| `Menu.js:187-188` · Luna (dato grande) | «0.17 g» · «gravedad · 1.62 m/s²» | 0.17 g · gravedad 1.62 m/s² | 0.17 g · gravity 1.62 m/s² | ya corto en código |
| `Menu.js:190-192` (sitios) | Marte «1 · sitio análogo» · Luna «3 · sitios análogos» | {n} sitio(s) análogo(s) | {n} analog site(s) | ya corto en código; `{n}` = `sitiosParaDestino(SITIOS, id).length` |
| `Menu.js:193-194` (tooltip al enfocar) | «{mundo}: {g} m/s² solo en la misión, nunca en la prueba terrestre (Tierra 9.81)» | {g} m/s² · solo en misión | {g} m/s² · mission only | `{g}` = 3.71 o 1.62 |
| `Menu.js:169-170` (tooltip por defecto) | «3 tickets · 1,000 créditos» | 3 tickets (P) · 1,000 créditos (P) | 3 tickets (P) · 1,000 credits (P) | Hoy sin (P). `TICKETS_POR_PARTIDA`, `PRESUPUESTO_INICIAL` |
| `Menu.js:195` (botón) | «Elegir {mundo}» | Elegir {mundo} | Choose {mundo} | ya corto en código |
| `como_jugar.js:45` (pantalla 1) | «Cada sitio nuevo: 1 ticket» | Sitio nuevo: 1 ticket (P) | New site: 1 ticket (P) | ya corto en código, falta el (P) |
| `como_jugar.js:49` (pantalla 2) | «{presupuesto} créditos» (hoy 1,000) | 1,000 créditos (P) | 1,000 credits (P) | ya corto en código, falta el (P) |
| `como_jugar.js:56` (pantalla 3) | «¿Falla? El resultado dice qué cambiar» | ¿Falla? El resultado dice qué cambiar | Failed? Results show what to change | ya corto en código (el EN de hoy tiene 7 palabras); las demás claves de `como_jugar.js` ya cumplen |

## 4. «¿De dónde salen los números?»

Una keyword por fuente (página 1) y las cifras del modelo (página 2). Las cifras están en `docs/METODOLOGIA.md` y
`model/VALIDATION.md`.

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `numeros.js:21` · NASA POWER | «Clima · NASA POWER» | NASA POWER → clima de la Tierra | NASA POWER → Earth climate | T2M_RANGE y PRECTOTCORR en `data/sites`; también temperaturas y presión de `ambiente.js` |
| `numeros.js:21` · MODIS NDVI | «Vegetación · MODIS NDVI» | MODIS → vegetación (NDVI) | MODIS → vegetation (NDVI) | MOD13Q1 |
| `numeros.js:21` · Copernicus DEM | «Relieve 200 m · Copernicus DEM» | Copernicus DEM → relieve, recorrido terrestre | Copernicus DEM → terrain, Earth route | Modelo a 200 m; perfil del recorrido muestreado a 30 m (nota de cada `perfil`) |
| `numeros.js:22` · LRO LOLA | «Relieve · LRO LOLA» | LOLA → relieve del polo sur | LOLA → south-pole terrain | Modelo a 200 m; recorrido de la misión a 80 m |
| `numeros.js:22` · LRO Diviner | «Temperatura · LRO Diviner» | Diviner → oscilación lunar 176 K | Diviner → lunar range 176 K | 176 K = `polo_sur_lunar.json` `oscilacion_termica` (temperatura de superficie). Dato real |
| `numeros.js:23` · HRSC + MOLA | «Relieve · HRSC + MOLA» | HRSC + MOLA → relieve de Jezero | HRSC + MOLA → Jezero terrain | Mosaico de 200 m |
| `numeros.js:23` · MEDA / REMS | «Clima · MEDA / REMS» | MEDA → clima de Jezero, 55 K | MEDA → Jezero climate, 55 K | 55 K = `jezero.json` `oscilacion_termica`. **REMS no aparece** en `data/targets` ni en `ambiente.js`: solo MEDA. Sugerimos quitar «REMS» |
| `numeros.js:25` (detalle pág. 1) | «Cada valor: fuente, fecha y unidad · sin dato = no se rellena · ILUSTRATIVO = demostración» | Cada valor: fuente, fecha, unidad | Every value: source, date, unit | El resto al detalle |
| `numeros.js:31` | «9/11 · cráteres conocidos · detectados en México» | 9/11 cráteres conocidos de México | 9/11 known Mexican craters | ya corto en código |
| `numeros.js:32` | «~78 % · exactitud · Luna contra Marte» | ~78 % exactitud, Luna contra Marte | ~78 % accuracy, Moon vs. Mars | ya corto en código. Exactitud balanceada, grupos espaciales |
| `numeros.js:33` | «296 · candidatos áridos · México, Atacama, Arizona, Arabia» | 296 candidatos áridos | 296 arid candidates | ya corto en código |
| `numeros.js:35` (chips del método) | «Árbol + regresión logística» · «No es red neuronal» · «Clave: profundidad / diámetro» · «Controles negativos 3/3» | (igual) | (igual) | ya corto en código |
| `numeros.js:36` (detalle pág. 2) | «Forma a 200 m (mismo código en Tierra, Luna y Marte) · resto: exp(−\|Tierra − destino\| / escala)» | Forma 200 m · mismo código, 3 mundos | Shape 200 m · same code, 3 worlds | La fórmula al detalle |
| `numeros.js:42` (pág. 3) | «Gravedad solo en la misión: Marte 3.71 · Luna 1.62 m/s²» | Solo misión: Marte 3.71 · Luna 1.62 m/s² | Mission only: Mars 3.71 · Moon 1.62 m/s² | El chip GRAVEDAD ya está arriba |
| `numeros.js:47` (detalle pág. 3) | «Detalle y fuentes: docs/METODOLOGIA.md y model/VALIDATION.md» | Fuentes: METODOLOGIA.md · VALIDATION.md | Sources: METODOLOGIA.md · VALIDATION.md | |

## 5. Instrucciones de la prueba y la misión (HUD)

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `recorrido.js:106` (título, prueba) | «Prueba en la Tierra: llega a la META con la carga» | Llega a la META con carga | Reach the FINISH with payload | Objetivo |
| `Prueba.js:40` (subtítulo) | «Gravedad de la Tierra (9.81 m/s²) · intento {intentos}» | Tierra 9.81 m/s² · intento {intentos} | Earth 9.81 m/s² · attempt {intentos} | |
| `Mision.js:38-39` (subtítulo) | «Gravedad {g} m/s² · entrega con carga ≥ 60 % · intento {intentos}» | {g} m/s² · carga ≥ {minimo} % (P) · intento {intentos} | {g} m/s² · payload ≥ {minimo} % (P) · attempt {intentos} | `{minimo}` = `round(UMBRAL_INTEGRIDAD × 100)` = 60 (P) |
| `recorrido.js:113-114` (título, misión) | «Llegada a {mundo} · gravedad {g} m/s² ({pct} % de la Tierra)» | {mundo}: {g} m/s² ({pct} % Tierra) | {mundo}: {g} m/s² ({pct} % of Earth) | Marte 3.71 m/s² → 38 % · Luna 1.62 m/s² → 17 % |
| `recorrido.js:115` | «Pesas menos: las ruedas empujan con menos fuerza y el robot rebota más» | Menos peso: menos empuje, más rebote | Less weight: less push, more bounce | |
| `recorrido.js:116` | «Frena y detente 2 s dentro de la ZONA DE ENTREGA con la carga ≥ 60 %» | ZONA: quieto 2 s · carga ≥ {minimo} % (P) | ZONE: stop 2 s · payload ≥ {minimo} % (P) | 2 s = `SEG_QUIETO_ENTREGA` (condición de victoria, P) |
| `recorrido.js:145` (etiqueta en el terreno) | «ZONA DE ENTREGA · frena y espera 2 s» | ENTREGA · espera 2 s (P) | DELIVERY · wait 2 s (P) | |
| `ambiente.js:222` (`resumenAmbiente`, Tierra) | «Tierra: {tmin} a {tmax} °C · aire {rho} kg/m³: enfría bien el motor» | Aire {pct} % · enfría el motor | Air {pct} % · cools the motor | Los 4 sitios: 78–94 % (≥ 10 %). La temperatura va en su propio chip: «{tmin} a {tmax} °C» |
| `ambiente.js:219` (Marte) | «Marte: −83 a −22 °C (dos soles, MEDA) · aire 0.017 kg/m³ (1 % de la Tierra): el motor se enfría poco» | Aire 1 % · motor se enfría poco | Air 1 % · motor barely cools | + chip «−83 a −22 °C» |
| `ambiente.js:216` (Luna) | «Luna: −53 °C (borde iluminado) · sin aire (vacío): el motor solo se enfría por radiación» | Sin aire: solo enfría radiando | No air: radiative cooling only | + chip «−53 °C» |
| `ambiente.js:237` + `recorrido.js:105` | «(P) batería fría: arranca al {f} %» | Batería fría: {f} % (P) | Cold battery: {f} % (P) | Jezero y polo sur: 98 % (−83 y −53 °C; 0.03 %/°C, piso 97 %, P) |
| `ambiente.js:238` | «(P) batería sin pérdida por frío» | Batería sin pérdida por frío (P) | No cold battery loss (P) | Los 4 sitios de la Tierra (mín. ≥ 0 °C) |
| `ambiente.js:239` | «motor: límite 100 °C» | Motor: límite 100 °C (P) | Motor: limit 100 °C (P) | `REGLAS.motor.limite_C` |
| `ambiente.js:240` | «luz rasante: el panel solar recarga 20 %» | Luz rasante: panel 20 % (P) | Grazing light: panel 20 % (P) | Solo polo sur |
| `recorrido.js:103` (controles) | «→ / D acelerar   ← / A frenar   (táctil: ▶ ◀)   Esc pausa» | →/D acelerar · ←/A frenar · Esc pausa | →/D accelerate · ←/A brake · Esc pause | En táctil: «▶ acelerar · ◀ frenar» |
| `hud.js:28-32` + `suelos.js:91-94` (nota amarilla, Tierra) | «Suelo: arena: agarre provisional (P). Perfil medido (Copernicus DEM GLO-30 …) · … · [I] datos» | Suelo: {suelo}, agarre (P) · I datos | Ground: {suelo}, grip (P) · I data | DISENO.md §3: «Suelo: arena · I datos»; el (P) debe seguir visible (comentario de `recorrido.js:91-92`) |
| `hud.js:28-32` + `suelos.js:92` (nota, destino) | «Suelo: arena φ 15.6–20.4° (BM-013). Perfil medido …» / «Suelo: arena φ 30–50° (BM-008) …» | Suelo: {suelo} φ {phi} · I datos | Ground: {suelo} φ {phi} · I data | `{phi}` = 15.6–20.4° (Jezero) · 30–50° (polo sur). Dato con fuente, sin (P) |
| `recorrido.js:95` (dentro de la nota) | «Aves, polvo distante y roca espacial: decoración recreada, sin efecto físico.» | Decoración recreada, sin efecto físico | Recreated decoration, no physical effect | Va al panel I |

## 6. Resultados (consejos)

### 6.1 `feedback/reglas.js` (tarjetas «Consejo basado en este intento»)

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `Resultados.js:114` (título de tarjeta) | «Consejo basado en este intento» | Consejo de este intento | Advice from this run | |
| `reglas.js:28` · `rueda_ancha` | «Cambia a ruedas anchas para arena.» | Ruedas anchas para arena | Wide wheels for sand | ya corto en código |
| `reglas.js:29` (evidencia) | «Tus ruedas patinaron {veces} en arena.» | Patinó {n}× en arena | Slipped {n}× on sand | `{n}` = eventos `patinaje` en arena |
| `reglas.js:37` · `rueda_tacos` | «Prueba ruedas con tacos para roca.» | Ruedas con tacos para roca | Lugged wheels for rock | ya corto en código |
| `reglas.js:38` (evidencia) | «Tus ruedas patinaron {veces} en roca.» | Patinó {n}× en roca | Slipped {n}× on rock | |
| `reglas.js:46` · `motor_potente` | «Usa el motor potente para subir pendientes.» | Motor potente para pendientes | Powerful motor for slopes | |
| `reglas.js:47` (evidencia) | «El robot se detuvo {veces} acelerando sin patinar: le faltó fuerza.» | Sin fuerza {n}× (sin patinar) | Stalled {n}× without slipping | `{n}` = eventos `sin_fuerza` |
| `reglas.js:58` · `soporte_amortiguado` | «Usa el soporte de carga amortiguado.» | Soporte de carga amortiguado | Cushioned payload mount | ya corto en código |
| `reglas.js:60` (evidencia) | «La carga se cayó del soporte.» | Carga caída del soporte | Payload fell off mount | |
| `reglas.js:62-63` (evidencia) | «La carga recibió {golpes} golpes (integridad final {i} %).» | {golpes} golpes · carga al {i} % | {golpes} hits · payload at {i} % | `{i}` = `round(integridad_carga × 100)` |
| `reglas.js:64` (evidencia) | «La carga llegó por debajo de la integridad requerida.» | Carga bajo {minimo} % (P) | Payload below {minimo} % (P) | `{minimo}` = 60 (P), `UMBRAL_INTEGRIDAD` |
| `reglas.js:74` · `calentador_bateria` | «Pon el calentador de batería en el módulo.» | Calentador de batería al módulo | Battery heater in module bay | |
| `reglas.js:75` (evidencia) | «El frío dejó la batería al {detalle} al arrancar y la energía se acabó.» | Frío: batería al {detalle} → agotada | Cold: battery at {detalle} → empty | `{detalle}` = «98 %» hoy (`robot.js:131`) |
| `reglas.js:81` · `bateria_grande` | «Lleva la batería grande.» · «Se acabó la energía antes de terminar.» | Batería grande · energía agotada antes | Large battery · ran out early | Si se separan: «Batería grande» / «Energía agotada antes de la meta» |
| `reglas.js:83` · `motor_eficiente` | «Cambia al motor eficiente: gasta la mitad.» | Motor eficiente: mitad de consumo (P) | Efficient motor: half the energy (P) | consumo 0.6 vs 1.2 del potente (`parts.json`, P) |
| `reglas.js:83` (evidencia) | «Se acabó la energía aun con la batería grande.» | Agotada aun con batería grande | Ran out even with large battery | |
| `reglas.js:89-90` (evidencia, calor) | «El motor pasó del límite de temperatura {veces} y perdió potencia.» | Motor > 100 °C (P) {n}× · menos potencia | Motor > 100 °C (P) {n}× · less power | 100 °C = `REGLAS.motor.limite_C` (P) |
| `reglas.js:92` · `motor_eficiente_calor` | «Usa el motor eficiente: se calienta la mitad.» | Motor eficiente: mitad de calor (P) | Efficient motor: half the heat (P) | Calor ∝ consumo (0.6 vs 1.2, P) |
| `reglas.js:95` · `radiador` | «Pon el radiador del motor en el módulo.» | Radiador del motor al módulo | Motor radiator in module bay | |
| `reglas.js:97` · `motor_eficiente_calor` (desde equilibrado) | «Usa el motor eficiente: se calienta menos.» | Motor eficiente: menos calor | Efficient motor: less heat | |
| `reglas.js:99` · `pausas_motor` | «Maneja con pausas: suelta el acelerador para que el motor se enfríe.» | Suelta el acelerador: motor se enfría | Release throttle to cool motor | |
| `reglas.js:103` · `chasis_reforzado` | «Usa el chasis reforzado.» · «El chasis se destruyó por los golpes.» | Chasis reforzado · destruido por golpes | Reinforced chassis · destroyed by impacts | |
| `reglas.js:106` · `manejo` | «Baja la velocidad antes de las bajadas y los saltos.» · «El robot volcó.» | Más lento en bajadas y saltos | Slow down for drops, jumps | La evidencia «El robot volcó.» ya es corta |
| `Resultados.js:181` | «aplica: {nombre}{ejes}» | aplica: {nombre}{ejes} | applies: {nombre}{ejes} | ya corto en código |

### 6.2 `feedback/diagnostico.js` (primera tarjeta: «Por qué terminó · qué puedes hacer»)

| Dónde (archivo:línea o clave) | Texto actual | Keyword ES | Keyword EN | Nota |
|---|---|---|---|---|
| `diagnostico.js:10` · `energia_agotada` (detalle) | «La batería se agotó antes de completar el recorrido.» | Batería agotada antes de la meta | Battery empty before the finish | |
| `diagnostico.js:11` (consejo) | «Revisa la batería y el consumo del motor en el taller. Evita acelerar sin avanzar.» | Taller: batería y consumo del motor | Workshop: battery and motor consumption | «Evita acelerar sin avanzar» al detalle |
| `diagnostico.js:15` · `atascado` con patinaje | «Sin avance durante 15 s; se registraron {patinaje} eventos de patinaje.» | Atascado 15 s (P) · {patinaje} patinajes | Stuck 15 s (P) · {patinaje} slips | 15 s = `SEG_ATASCO` (`recorrido.js:22`, P) |
| `diagnostico.js:17` · `atascado` sin fuerza | «Sin avance durante 15 s; se registraron {fuerza} eventos de falta de fuerza.» | Atascado 15 s (P) · {fuerza} sin fuerza | Stuck 15 s (P) · {fuerza} stalls | |
| `diagnostico.js:18` · `atascado` sin eventos | «Sin avance durante 15 s. No hay eventos suficientes para atribuirlo a la tracción.» | Atascado 15 s (P) · causa sin evidencia | Stuck 15 s (P) · no clear cause | |
| `diagnostico.js:20` (consejo, patinaje) | «Ajusta las ruedas al suelo indicado en los consejos y vuelve a probar.» | Ruedas según el suelo · reintenta | Match wheels to ground · retry | |
| `diagnostico.js:22` (consejo, fuerza) | «Revisa la fuerza del motor y la masa del robot antes de repetir la subida.» | Más fuerza o menos masa | More force or less mass | |
| `diagnostico.js:23` (consejo, sin eventos) | «Prueba retroceder para tomar impulso y revisa la pendiente y el diseño en el taller.» | Retrocede, toma impulso · revisa diseño | Back up for momentum · check design | |
| `diagnostico.js:26` · `caida` (detalle) | «El robot se salió del terreno.» | Robot fuera del terreno | Rover fell off terrain | |
| `diagnostico.js:27` (consejo) | «Vuelve a probar; si se repite, avísanos: es un error del nivel, no de tu diseño.» | Error del nivel, no tuyo · reintenta | Level bug, not your design · retry | |
| `diagnostico.js:30` · `volcado` (detalle) | «El robot quedó volcado.» | Robot volcado | Rover flipped | |
| `diagnostico.js:31` (consejo) | «Suelta el acelerador antes de los saltos y las bajadas. Prueba un diseño más estable.» | Sin acelerar en saltos · más estable | Ease off before jumps · more stable | |
| `diagnostico.js:36` · `carga_perdida` (detalle) | «La carga se desprendió del robot.» | Carga desprendida | Payload detached | |
| `diagnostico.js:37` · `carga_danada` (detalle) | «La carga llegó con menos integridad de la requerida.» | Carga bajo {minimo} % (P) | Payload below {minimo} % (P) | `{minimo}` = 60 (P) |
| `diagnostico.js:38` (consejo, carga) | «Reduce la velocidad sobre rocas y aterrizajes; revisa la protección del soporte de carga.» | Lento en rocas · protege la carga | Slow on rocks · protect the payload | |
| `diagnostico.js:41` · `chasis_destruido` (detalle) | «El chasis perdió su integridad.» | Chasis roto | Chassis broken | |
| `diagnostico.js:42` (consejo) | «Frena antes de los impactos y revisa la resistencia del chasis en el taller.» | Frena antes de golpes · chasis resistente | Brake before impacts · tougher chassis | |
| `diagnostico.js:45` · `abandono` (detalle) | «Saliste del recorrido; no se diagnosticó una avería.» | Abandonaste · sin avería | You quit · no failure | |
| `diagnostico.js:46` (consejo) | «Reintenta cuando estés listo o ajusta el robot en el taller.» | Reintenta o ajusta en el taller | Retry or tune in the workshop | |
| `diagnostico.js:49` · éxito (detalle) | «Completaste el objetivo de este recorrido.» | Objetivo cumplido | Objective complete | |
| `diagnostico.js:50` (consejo) | «Revisa los eventos y la batería restante antes del siguiente intento.» | Revisa eventos y batería restante | Check events and battery left | |
| `diagnostico.js:52` · sin diagnóstico (detalle) | «No hay un diagnóstico registrado para este final.» | Sin diagnóstico registrado | No diagnosis recorded | |
| `diagnostico.js:53` (consejo) | «Revisa los datos del intento y vuelve a probar; no se atribuye una causa sin evidencia.» | Revisa los datos y reintenta | Check run data, then retry | La regla «sin evidencia no hay causa» al detalle |

## Límites

- **Fotografía de `6d85e3b`.** Los números de recorrido (↗, ∠, crítico) y de ambiente los calcula el código
  (`estadisticasNivel`, `chipsAmbiente`, `efectosAmbiente`): si cambia un perfil o una regla, cambian. En el código usar las
  **plantillas**, no las cifras fijas de las filas por sitio.
- **Dos (P) que hoy faltan en pantalla:** el crítico de la vista principal (`resumen.js:79`) no lleva el (P) del agarre
  provisional de la Tierra, y los tooltips/pantallas de «3 tickets · 1,000 créditos» (`Menu.js:169`, `como_jugar.js:45,49`) no
  marcan (P). Las keywords de arriba ya los incluyen; queda al frente juego decidir si el (P) va en la etiqueta o en el detalle.
- **g00281, dato en conflicto:** `proceso` dice «sin borde» y el mismo JSON mide `borde_levantado` 6.1 m (y la nota lo llama
  «cráter natural verificado»). La keyword evita «sin borde»; el texto de `data/` lo corrige el frente de datos, no este doc.
- **Samalayuca:** la pendiente máx. del juego (38°) sale de las caras de duna recreadas; la nota del perfil dice «~32°» para
  esas caras y 16° para el tramo medido. No se cambió nada: se cita lo que calcula el código.
- **REMS** está en la tarjeta de Números pero no en `data/targets` ni en `ambiente.js` (solo MEDA).
- **No cubierto:** Taller, Explorador libre, mensajes de fin del HUD («¡Prueba superada!», ya cortos) y la tarjeta de analogía
  de Resultados (`feedback/analogia.js`).
- Las keywords son propuesta: falta la prueba de 3 segundos con jugadores (DISENO.md §5) y revisar que la e2e no busque un texto
  que cambie.
