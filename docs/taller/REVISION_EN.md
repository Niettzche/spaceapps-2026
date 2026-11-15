# Revisión de textos en inglés (pantallas nuevas)

> 15 nov 2026 · Leo (con Claude Code) · para los frentes juego y expediente (no edité código).
> **Commit revisado:** `1af43f9` de `feat/juego` (merge «el modelo dentro del juego»: «¿Por qué aquí?», «Qué entrena», Descubrir).
> **Método:** (a) saqué todos los textos en inglés del código (segundo argumento de `tr('es', 'en')` y campos `*_en` / `en`)
> de los archivos de las tres pantallas; (b) jugué el juego con `?lang=en` en Edge sin interfaz a 960×540 (Marte y Luna, con
> almacenamiento limpio para ver los tutoriales) y medí cada texto en pantalla (recorte con «…», fuera de pantalla, alto de
> mayúscula < 14 px, palabras en español). En Descubrir revisé los 32 sitios de Marte y los 31 de la Luna, con su tarjeta
> «¿Por qué aquí?». Las afirmaciones las comparé con `docs/taller/FUENTES_NIVELES.md`.
> **Lo bueno:** ningún texto quedó por debajo de 14 px, ninguno se sale de la pantalla y todos los símbolos (★ ☆ ● ○ ✓ ↗ ⚠ − ≥)
> existen en la fuente pixel.

**Prioridad:** **Alta** = incorrecto o engañoso, español en una pantalla en inglés, o texto cortado · **Media** = suena poco
natural o confunde · **Baja** = estilo.

## 0. Transversal (afecta a las tres pantallas)

| Dónde (archivo:línea) | Texto actual (EN) | Problema | Propuesta (EN) | Prioridad |
|---|---|---|---|---|
| `scenes/expediente/datos_en.js:12` (`SITIOS_EN`) y `data/sites/*.json` (`nombre`) | «Cono de toba Jabal Bayda (Harrat Khaybar, Arabia Saudita)», «Cráter de impacto Tenoumer (Mauritania)», «… Talemzane (Argelia)», «… Roter Kamm (Namibia)», «… Pingualuit (Nunavik, Quebec, Canadá)» | **Español en pantalla en inglés.** `SITIOS_EN` solo traduce 4 sitios; 3 de los 5 niveles destacados salen en español en la lista, en Descubrir, en «¿Por qué aquí?», en el Taller («Test: Cono de toba…») y en el HUD de la prueba | «Jabal Bayda tuff ring (Harrat Khaybar, Saudi Arabia)» · «Tenoumer impact crater (Mauritania)» · «Talemzane impact crater (Algeria)» · «Roter Kamm impact crater (Namibia)» · «Pingualuit impact crater (Nunavik, Quebec, Canada)» | Alta |
| `datos_en.js:122` (solo cambia «EE. UU.» en las depresiones) | «Meteor Crater (Arizona, EE. UU.)» | Español en Descubrir (Luna) | «Meteor Crater (Arizona, USA)» | Alta |
| `data/sites/mx0261.json` (sin `nombre_en`) | «Hoya Rincón de Parangueo» | «Hoya» es un sustantivo común en español (= maar) | «Rincón de Parangueo maar» | Baja |
| `datos_en.js:122` | «Crater-like depression G00003 (Atacama (Chile))» | Paréntesis dentro de paréntesis | «Crater-like depression G00003 (Atacama, Chile)» | Baja |
| Nombres de sitios de México | «Cananea (Son.)», «Peñasquito (Zac.)», «Hércules (Coah.)» | Las abreviaturas de estado no se entienden en inglés | «Cananea (Sonora)», «Peñasquito (Zacatecas)», «Hércules (Coahuila)» | Baja |
| Varios | «place» / «site»; «playable» / «with a level»; «robot» / «rover»; «payload» / «supply» / «cargo»; «Soil» / «Ground» | El mismo concepto con dos o tres nombres en pantallas seguidas | Uno por concepto: **site**, **playable**, **robot**, **payload**, **ground** | Media |

## 1. Descubrir («Discover»)

| Dónde (archivo:línea) | Texto actual (EN) | Problema | Propuesta (EN) | Prioridad |
|---|---|---|---|---|
| `scenes/Expediente.js:295` | «32 places · 6 with a level · 2 novel · 6 countries · arid regions, not the whole planet» | **Cortado** en pantalla («…arid region…»), en Marte y en Luna. Son 14 palabras; caben ~63 caracteres | «32 sites · 6 playable · 2 novel · 6 countries · arid only» | Alta |
| `Expediente.js:294` | «DISCOVER (D) · what the model found for Moon» | Falta el artículo: `MUNDOS` da «Moon», no «the Moon» | «DISCOVER (D) · what the model found for the Moon» (usar «the Moon» / «Mars») | Alta |
| `Expediente.js:190` + `expediente/descubrir.js:42` | «○ Unverified depres…» | **Cortado** en la lista (recorte a 18 caracteres); es el tipo más común (26 de 32 en Marte) | «Unverified hollow» (17 caracteres; vale también para el filtro y la tarjeta) | Alta |
| `descubrir.js:71` (ficha, `Expediente.js:341`) | «Impact crater · Known crater the detector finds (positive co…» | **Cortado** en la ficha de Tenoumer, Talemzane, Roter Kamm, Pingualuit y Meteor Crater | «Known crater (positive control)» | Alta |
| `descubrir.js:76` (ficha) | «Unverified depression · Arid-region search · Mexico (validated…» | **Cortado** en la ficha de todos los candidatos de México | «Arid-zone search · Mexico (validated)» (con «Unverified hollow» cabe completo) | Alta |
| `Expediente.js:295`, `:306`, `:322` | «6 with a level» · «J · ○ Playable» · leyenda «playable» | La misma idea con dos nombres en la misma pantalla | «playable» en los tres | Media |
| `Expediente.js:348` | «○ This place has no level yet: the API can generate one.» | Promete algo que esta demo no hace (el Explorador dice que la API no está publicada) | «○ No level yet (the model API could make one).» | Media |
| `Expediente.js:587` | «Make a level · Explorer» | Mismo problema: el botón abre el Explorador, que no genera el nivel en la demo | «See it in Explorer» | Media |
| `Expediente.js:585`, `:606` | «Web sheet ↗» / «No web sheet» | «Web sheet» no es inglés natural; el Explorador dice «Full fact sheet ↗» | «Fact sheet ↗» / «No fact sheet» | Media |
| `descubrir.js:237` (`nombreCorto`) + `:40` (Luna) | «Depression G00003» con subtítulo «○ Open-pit mine» | El nombre dice hueco natural y el tipo dice mina: se contradicen en la misma fila | «Pit G00003» cuando el tipo es mina | Media |
| `descubrir.js:43` | «T · Type: all» | Mayúscula inconsistente con «Type: Impact crater» | «T · Type: All» | Baja |
| `Expediente.js:168` | «No site passes these filters. Remove one.» | Poco natural | «No sites match. Turn off a filter.» | Baja |

## 2. «¿Por qué aquí?» («Why here?») y «Qué entrena» («What it trains»)

| Dónde (archivo:línea) | Texto actual (EN) | Problema | Propuesta (EN) | Prioridad |
|---|---|---|---|---|
| `Expediente.js:407` con `content/niveles_destacados.js:18, 45, 70, 96, 120` | «Trains: Cross soft tuff and ash with wind an…» (y los otros 4) | **Cortado** en la cabecera del Expediente en los 5 niveles destacados; 13–16 palabras donde `DISENO.md` pide ≤ 6. Caben ~36 caracteres | Un campo corto solo para la cabecera (la frase completa ya se ve en la tarjeta y en las instrucciones): «Lapilli, volcanic bombs, wind» · «Sand, rim climb, ejecta blocks» · «Loose talus on 25° ramps (P)» · «Sharp aa lava: slow or armor» · «Deep snow, ice, Arctic wind» | Alta |
| `niveles_destacados.js:12` | «Jabal Bayda tuff cone» | **Contradice las fuentes:** los especialistas (Camp 1991, Németh 2026) dicen *tuff ring*, de comendita | «Jabal Bayda tuff ring» | Alta |
| `niveles_destacados.js:18` | «Cross soft tuff and ash with wind and volcanic bombs, like loose soil on Mars» | **Contradice las fuentes:** «soft» y «ash» no salen en ninguna; el depósito es rico en lapilli (S108) | «Cross lapilli tuff with wind and volcanic bombs, like loose soil on Mars» | Alta |
| `niveles_destacados.js:22` | «Crater-like depression in a volcanic field (Harrat Khaybar). On Mars wind moves dust and sand, but with 1 % of the air density it pushes far less.» | **Contradice las fuentes:** la densidad del aire de Marte es ~1.4 % de la de la Tierra (S01, S03), no 1 %. Además, «with 1 % of the air density» es mal inglés | «Comendite tuff ring in a volcanic field (Harrat Khaybar). On Mars wind moves dust and sand, but with air ~1.4 % as dense as Earth's it pushes far less.» | Alta |
| `niveles_destacados.js:49` | «Real impact crater (Earth Impact Database) in a desert: raised rim, ejecta and sand, like craters on Mars. …» | Las fuentes piden aclarar que la manta de eyecta está muy erosionada (S125–S127) | «… raised rim, heavily eroded ejecta and sand, like craters on Mars. …» | Media |
| `niveles_destacados.js:70` | «Climb 25° walls with loose talus that sinks and rolling stones, like a lunar mine (ISRU)» | **Contradice las fuentes:** las paredes reales del tajo tienen 40–50°; 25° es una rampa o una simplificación (P) (Call 1985, S138) | «Climb 25° ramps (P) with loose talus and rolling stones, like a future lunar mine (ISRU)» | Alta |
| `niveles_destacados.js:74` | «Operational, not geological, analog: a stepped pit like the ones resource mining would dig on the Moon. There is no wind on the Moon.» | Lo presenta como hecho, pero el encuadre ISRU es nuestro (Draft, S140) | «Operational, not geological, analog: a stepped pit, our stand-in for future lunar mining (ISRU). There is no wind on the Moon.» | Media |
| `niveles_destacados.js:100` | «Basalt and volcanic craters (El Elegante maar). The lunar maria are basalt; Earth does not reproduce the vacuum or the gravity.» | El vínculo con los mares lunares es una inferencia (Draft); las fuentes dan un vínculo verificado | «Basalt field and volcanic craters (El Elegante maar), where NASA trained the Apollo 14 crew (Feb 1970). Earth cannot reproduce the vacuum or the gravity.» | Media |
| `niveles_destacados.js:124` | «Real impact crater in the Arctic, with snow on the ground all 12 months (NASA POWER). Mars has ice and cold, but its 1 %-dense air barely pushes.» | **Contradice las fuentes:** en julio y agosto POWER da 2–3 cm (S134); y el aire de Marte es ~1.4 %, no 1 %. «1 %-dense air» es mal inglés | «Real impact crater in the Arctic, with snow most of the year (NASA POWER). Mars has ice and cold, but its thin air (~1.4 % of Earth's density) barely pushes.» | Alta |
| `niveles_destacados.js:120` | «Cross deep snow and ice in Arctic cold and the strongest wind of the five» | La nieve como análogo de Marte es un hueco en las fuentes (ningún rover se probó en nieve para Marte, S135, S136). El viento sí es el más fuerte de los cinco (POWER) | «Cross deep snow and ice (P) in Arctic cold and the strongest wind of the five» | Media |
| `fisica/viento.js:102` (panel I de los niveles) | «On Mars the wind lifts dust but barely pushes: the air has ~1 % of Earth's density.» | **Contradice las fuentes:** ~1.4 % | «… the air has ~1.4 % of Earth's density.» | Alta |
| `fisica/eventos_fondo.js:54`, `:149` | «dust devils (cut panel light 30 % as they pass, P)» · «panel light −30 %» | **Contradice las fuentes:** lo medido es 0.1–1 % típico y > 15 % en los más fuertes (MR-083) | «dust devils (dim panel light ~1 %, P)» · «panel light −1 %», o declararlo: «(−30 %, exaggerated for play, P)» | Alta |
| `descubrir.js:123` con `data/sites/mx0023.json:11` (`proceso`) | Cananea: «WHAT IT IS: Open-pit mine (probable, to be verified)» | **Contradice las fuentes:** el tajo está verificado (Buenavista del Cobre, S137). El texto sale de `proceso` («Probable tajo…»), del frente modelo | «Open-pit mine» (quitar «Probable … por verificar» de `proceso`) | Alta |
| `descubrir.js:96` (`nombreGemelo`) | «twin 80-85°S ring (Moon)» | «Anillo 80-85°S» es una franja de latitud, no un anillo: «ring» se lee como forma de cráter | «twin: crater at 80–85° S (Moon)» | Media |
| `descubrir.js:179` | Tenoumer, Talemzane, Roter Kamm, Pingualuit, Meteor Crater: «NOVEL? not verified» | Se contradice con la fila de arriba («Known crater … (positive control)»): un control positivo es, por definición, conocido | Para el origen «control»: «no: known crater» | Media |
| `Explorador.js:181` | «… already has a level with its real terrain. Its site file opens; the ticket is spent only if you confirm there.» | Orden poco natural | «… already has a level with its real terrain. Opens its site file; a ticket is spent only if you confirm there.» | Media |
| `descubrir.js:96`, `:134` | «twin Gusev (Spirit) (Mars)», «twin Meridiani (Opportunity) (Mars)» | Dos paréntesis seguidos | «twin: Gusev (Spirit, Mars)» | Baja |
| `descubrir.js:145–146` | «more Mars-like shape: 85 % Mars» | Repite «Mars» | «shape 85 % Mars-like» | Baja |
| `descubrir.js:155` | «yes, +38.2 m above the ground: crater rim» | «the ground» es ambiguo (el borde también es suelo) | «yes, +38.2 m above surroundings: crater rim» | Baja |
| `descubrir.js:123` | « (probable, to be verified)» | Largo para una fila | « (likely, unconfirmed)» | Baja |
| `Explorador.js:344` | «… from the real DEM profile (not yet published in this demo).» | No queda claro qué es lo que no está publicado | «… from the real DEM profile (the API isn't live in this demo).» | Baja |
| `Expediente.js:948` | «Explainable model trained on real Moon and Mars craters · main rule: d/D» | El texto está bien, pero queda pegado al borde inferior del panel cuando «What it trains» ocupa 2 líneas | Subirlo 8 px o recortar la frase de «What it trains» (fila de arriba) | Baja |

## 3. Tutoriales guiados

| Dónde (archivo:línea) | Texto actual (EN) | Problema | Propuesta (EN) | Prioridad |
|---|---|---|---|---|
| `scenes/expediente/tutorial_expediente.js:32` (Luna) | «This place on Earth is like Moon: this number says how much …» | Falta el artículo: `Expediente.js:108` pasa `MUNDOS` («Moon») | «This place on Earth is like the Moon: …» (pasar «the Moon» / «Mars») | Alta |
| `tutorial_expediente.js:50` (Luna) | «Left: the test on Earth. Right: the mission on Moon.» | Mismo problema | «… Right: the mission on the Moon.» | Alta |
| `tutorial_expediente.js:37–38` | «One measured thing per row» · «… Hover a row to see its question.» | Poco natural; «its question» no se entiende | «One measurement per row» · «… Hover over a row to see what it measures.» | Media |
| `tutorial_expediente.js:68` | «Testing a site you already paid for again is free.» | El «again» al final suena raro | «Re-testing a site you've paid for is free.» | Media |
| `Taller/tutorial.js:59` | «With ✓ Ready, test it on Earth. You can come back and adjust. ? repeats this guide.» | La flecha señala el botón «Test the robot» y la etiqueta dice «✓ Ready to test»: «With ✓ Ready» no se entiende | «When you see ✓ Ready to test, press Test the robot. You can come back and adjust. ? repeats this guide.» | Media |
| `comun/tutorial.js:100` | «Your FINISH» | Poco natural | «The FINISH line» | Media |
| `comun/tutorial.js:125` | «… brake and stay still for 2 s to deliver.» | En pantalla se parte en «2» / «s» (captura de la misión en la Luna) | «… brake and stay still for 2 seconds to deliver.» | Media |
| `tutorial_expediente.js:44` | «In red: what no place on Earth can copy, however alike it is. You only feel the real gravity in the mission.» | Largo y algo torpe | «In red: what no place on Earth can reproduce. Only the mission has the real gravity.» | Baja |
| `tutorial_expediente.js:62` | «… M · Why here?: how it was found, its shape and whether it is novel.» | «?:» es doble puntuación | «… M · Why here? How it was found, its shape and whether it's novel.» | Baja |
| `Taller/tutorial.js:48` | «Each part costs credits. Go over and you cannot test.» | «Go over» queda incompleto | «Each part costs credits. Go over budget and you can't test.» | Baja |
| `Taller/tutorial.js:35` | «Here the ground is rock: watch that bar.» | Es el suelo principal, no el único (Cananea es roca y compacto) | «Here it's mostly rock: watch that bar.» | Baja |
| `comun/tutorial.js:95` | «Hold → (or D) to drive and ← (or A) to brake. …» | Las instrucciones de la prueba dicen «accelerate» | «Hold → (or D) to accelerate and ← (or A) to brake. …» | Baja |
| `comun/tutorial.js:85` | «Take it to Mars and deliver the supply» | En el resto del juego es «payload» | «Take it to Mars and deliver the payload» | Baja |
| `comun/tutorial.js:84` | «Test it at that place on Earth» | Torpe | «Test it there, on Earth» | Baja |
| `fisica/hud.js:31` + `recorrido.js:138` | «Soil: sand, rock · I data» | «I data» no se entiende; el resto del juego dice «ground» | «Ground: sand, rock · I: details» | Baja |

## Resumen

| Pantalla | Alta | Media | Baja | Total |
|---|---|---|---|---|
| 0. Transversal | 2 | 1 | 3 | 6 |
| 1. Descubrir | 5 | 5 | 2 | 12 |
| 2. «¿Por qué aquí?» y «Qué entrena» | 9 | 7 | 6 | 22 |
| 3. Tutoriales | 2 | 5 | 8 | 15 |
| **Total** | **18** | **18** | **19** | **55** |

## Lo que no revisé

- El Explorador con la API en vivo (`/score`, propuesta de sitio, «VETOED»): la API no está publicada en la demo. Solo vi el modo
  catálogo (Tenoumer y MX0000), y del resto leí los textos en el código.
- «Cómo jugar» versión larga (`expediente/como_jugar*.js`), el Menú, Resultados, el panel de condiciones (C) y el de datos (I):
  no son pantallas nuevas. Del panel I solo revisé los textos que agregan los niveles destacados (`nota()`, viento y eventos).
- Textos de pantallas anteriores que vi cortados de paso (no son de este merge): «Mars · Jezero Crater (Mar…» y «Moon · Artemis
  candidate…» en el Expediente, «0.801 degre…» en la tabla y «deliver with payload…» en el HUD de la misión.
- Textos que solo salen en casos raros: NDVI que no pasa el filtro, sitios propuestos por jugadores y destino sin datos.
- Los textos `proceso` y `uso_exploracion` de los sitios no destacados: son datos del frente modelo.
- El texto en español, la versión para lector de pantalla y otras resoluciones de pantalla (solo probé a 960×540).
