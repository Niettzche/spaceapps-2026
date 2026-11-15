# Nivel 2 de la auditoría del frente modelo

14 nov 2026. Tres tareas: (A) buscar en la literatura los candidatos "novedosos" naturales, (B) comprobar si Marte sale plano
por el instrumento y (C) explicar por qué la dimensión térmica es casi constante. Este archivo no cambia `PROYECTO.md` ni
`model/VALIDATION.md`, porque los PR #33 y #36 los están editando. Los textos de reemplazo van propuestos al final de cada sección.
La sección D se agregó después: es la respuesta preparada para "¿qué tiene que ver el borde levantado con los análogos?".

## A · Candidatos "novedosos" en la literatura

**Método.** Búsqueda web el 14 nov 2026, con varios términos por candidato. Para identificar cada cráter comparamos nuestra
coordenada con una fuente (OpenStreetMap, Wikipedia, IUGS, USGS) y calculamos la distancia. "No encontrado" significa no
encontrado en la literatura revisada, no que nadie lo haya usado.

| Candidato | Qué es | Distancia a la fuente | ¿Análogo lunar o marciano? |
|---|---|---|---|
| G00263 | Anillo de toba o maar **Al Hutaymah**, Harrat Hutaymah (~95 km al SE de Hail) | ~0.10 km | **Marte: sí.** Harrat Hutaymah está en la base global de Ryan et al. (2024). Luna: no encontrado |
| G00266 | Cono (o anillo) de toba **Jabal Bayda**, Harrat Khaybar | ~0.04 km | No encontrado en la literatura revisada; tampoco está en Ryan et al. (2024) |
| G00281 | Maar **Al Wahbah**, Harrat Kishb (confirmado) | ~0.23 km | Luna/Marte: no encontrado; no está en Ryan et al. (2024). **Sí publicado como análogo de Encélado** (2024) |
| G00176 | **Colton Crater ("Crater 160")**, campo volcánico de San Francisco | ~0.05 km | **Sí: entrenamiento del Apolo 15, 15–17 jul 1970.** Agregado a `known_analogs.json` |

**G00263 · Al Hutaymah** (26.9888 N, 42.2465 E)
- Coordenada: nodo `natural=volcano` "الهتيمة" de OpenStreetMap en 26.98823 N, 42.24727 E
  (https://nominatim.openstreetmap.org/search?q=Hutaymah&format=json).
- Geología: Pallister (1985), USGS OFR 85-125 (https://pubs.usgs.gov/of/1985/0125/report.pdf). El anillo de toba está cerca del
  límite norte del cuadrángulo 26°30′–27°00′ N, con "a central pit crater about 1 km in diameter". Németh (2026, IntechOpen) lo
  llama "Hutaymah maar volcano" (https://www.intechopen.com/chapters/1237406).
- Términos: "Harrat Hutaymah Mars analog", "Harrat Hutaymah lunar analog", "Hutaymah maar crater", "Saudi Arabia harrat Mars
  analogue site". No encontrado en la literatura revisada (USGS OFR 85-125, Németh 2026).
- **Ryan et al. (2024), ya revisado el 15 nov 2026.** Ryan, C.H., Schmidt, M.E., Osinski, G.R. y Massey, E.A., "A global
  database of Mars-relevant hydrovolcanic environments on Earth with potential biosignature preservation", *Geosphere*
  20(2):547–576, doi:10.1130/GES02712.1. Leímos el material suplementario completo (tablas, KMZ y README:
  https://gsapubs.figshare.com/articles/journal_contribution/Supplemental_Material_A_global_database_of_Mars-relevant_hydrovolcanic_environments_on_Earth_with_potential_biosignature_preservation/24808560)
  y, del artículo, solo el resumen (el sitio de la revista no dejó abrir el texto).
  - **Harrat Hutaymah sí está.** Fila de la tabla de campos: "Saudi Arabia | Hutaymah | Harrat Hutaymah Volcanic Field | Tuff
    cones | 16 | Basalt | 1.80 Ma". Es el único campo de Arabia Saudita en esa tabla. En el KMZ, el punto "Harrat Hutaymah 2"
    (26.98835 N, 42.24767 E) queda a ~0.13 km de nuestra coordenada. Entra como campo, por su relevancia para Marte como
    ambiente hidrovolcánico, no por la forma del cráter; la base no trata la Luna.
  - **Harrat Khaybar (Jabal Bayda) y Harrat Kishb (Al Wahbah) no están** en las tablas ni en el KMZ.
  - **Qué significa que no estén: poco.** La base reúne campos "primarily basaltic in composition", con erupciones en los
    últimos 5 Ma y estructuras hidrovolcánicas, compilados de la literatura. No es exhaustiva.
  - **No revisado:** el cuerpo del artículo y los archivos de congresos (LPSC, EPSC, AGU, EGU), que solo se consultaron con un
    buscador web.
  - **Consecuencia.** G00263 no puede presentarse como análogo nuevo para Marte. G00266 y G00281 siguen como "no encontrado en
    la literatura revisada", que no es lo mismo que nuevo. `novedoso` queda en `null` en los tres, y la nota de g00263 y g00266
    ya dice lo que se encontró (`python -m model.scan --solo-literatura`). Falta que el equipo decida si Harrat Hutaymah entra a
    `data/known_analogs.json`: con eso g00263 pasaría a `novedoso: false` y los análogos conocidos serían 22, no 21.

**G00266 · Jabal Bayda** (25.6608 N, 39.9348 E)
- Coordenada: nodo de OpenStreetMap "جبل البيضاء" en 25.66048 N, 39.93487 E.
- NASA Earth Observatory (2024): "Jabal Bayda is a tuff cone… summit crater measuring 1,400 meters in diameter"
  (https://science.nasa.gov/earth/earth-observatory/white-and-black-volcanoes-of-saudi-arabia-152839). Németh (2026) lo llama
  anillo de toba riolítico. Nuestro diámetro (~1.0 km) es menor que el de la NASA.
- Términos: "Harrat Khaybar lunar analog", "Harrat Khaybar Mars analog", "Jabal Bayda tuff cone Mars", "Harrat Khaybar lava tube
  Mars analog". Solo encontramos comparaciones visuales en divulgación (Slate, 2010:
  https://www.slate.com/blogs/bad_astronomy/2010/12/02/guess_the_planet.html), no un uso como análogo. La página de la NASA sobre
  Khaybar (https://science.nasa.gov/earth/earth-observatory/harrat-khaybar-volcanic-field-8650) no menciona la Luna ni Marte.
  No encontrado en la literatura revisada.

**G00281 · maar Al Wahbah** (22.9018 N, 41.1412 E)
- Coordenada: IUGS Geoheritage, 22°54′02″ N, 041°08′22″ E, "~2.3 kilometer wide, ~250 meter deep"
  (https://iugs-geoheritage.org/?p=10739). Wikipedia da 22.900 N, 41.139 E (https://en.wikipedia.org/wiki/Al_Wahbah_crater).
  Distancia: 0.23–0.31 km.
- Luna o Marte: no encontrado en la literatura revisada. Términos: "Al Wahbah analog Mars", "Al Wahbah lunar analog",
  "Al Wahbah astronaut training", "Harrat Kishb Mars analog". Fuentes: IUGS, Wikipedia, Németh (2026).
- **Encélado:** Dos Santos, Schultz et al. (2024), *Astrobiology* 24(8):824–838, doi:10.1089/ast.2024.0017, "Investigating
  Polyextremophilic Bacteria in Al Wahbah Crater, Saudi Arabia: A Terrestrial Model for Life on Saturn's Moon Enceladus". Nota de
  prensa de KAUST: https://megb.kaust.edu.sa/news/detail/2024/10/17/al-wahbah-crater-as-a-functional-model-of-extraterrestrial-life-in-enceladus.
- No lo agregamos a `known_analogs.json`, porque la regla del archivo es Luna o Marte. **Recomendación para el pitch: no
  presentar Al Wahbah como "un análogo que nadie había visto".** Es un análogo planetario publicado, aunque de otro cuerpo.
  Lo correcto es decir "propuesto aquí como análogo lunar/marciano". El equipo decide si se agrega igual a `known_analogs.json`
  (coordenada lista: 22.9006 N, 41.1394 E, IUGS).

**G00176 · Colton Crater ("Crater 160")** (35.5447 N, −111.6365)
- Coordenada: tabla de conos de https://en.wikipedia.org/wiki/San_Francisco_volcanic_field, fila "Colton Crater (Crater 160)",
  35°32′42″ N 111°38′10″ W (35.54500, −111.63611). OpenStreetMap: 35.54387, −111.63717. Distancia: ~0.05 km.
- Tipo y tamaño: cono de escoria que pasó a maar. AZGS (https://azgs.arizona.edu/colton-crater-san-francisco-volcanic-field) da
  unos 1.1 km de borde a borde; nuestro ~0.75 km parece ser el cráter interior.
- **Uso:** Schaber (2005), USGS OFR 2005-1190 (https://pubs.usgs.gov/of/2005/1190/of2005-1190.pdf). Comprobamos la cita en
  el PDF: *"On 15-17 July, 1970, G.A. Swann, L.T. Silver, and G.E. Ulrich… conducted the Lunar Module crew members—D.R. Scott,
  J.B. Irwin, R.F. Gordon, and H.H. Schmitt—on a one and one-half day exercise in surface (volcanic) geology in the Crater 160,
  S.P. Crater, and Merriam Crater areas, near Flagstaff, Arizona."* Son las tripulaciones principal y de respaldo del módulo lunar
  del Apolo 15.
- También aparece en una salida de campo a análogos de Marte de becarios de NASA Goddard en 2012
  (https://lpsaarizona.blogspot.com/2012). Es un blog, no una fuente arbitrada.
- No encontramos pruebas de Desert RATS en Colton.
- **Agregado a `data/known_analogs.json`** con la coordenada de Wikipedia y la cita de Schaber. `model.validate_data` pasa.

**Efecto en `novedoso`** (sin regenerar `data/sites`). Al volver a correr `python -m model.scan --solo-ia`, pasarían a
`novedoso: false` por quedar a menos de 50 km de Colton:
- `g00176`, a 0 km: es el mismo cráter.
- `g00174`, a 45 km.

Los demás no cambian. G00263 y G00266 no están hoy en `data/sites`.

**Texto propuesto.** Cuando se fusionen #32 y #36, en `PROYECTO.md` o en el guion, cualquier frase que presente a G00176 como
novedoso debe cambiar a: *"Colton Crater (Arizona), usado en el entrenamiento geológico del Apolo 15 en 1970 (USGS OFR
2005-1190): el detector lo encontró por su cuenta"*. Así funciona como control positivo, no como descubrimiento. Para Al Wahbah:
*"maar Al Wahbah (Arabia Saudita), estudiado como análogo de Encélado (Astrobiology, 2024); no encontramos que se haya usado como
análogo lunar o marciano"*.

## B · ¿Marte sale plano por el instrumento?

**Pregunta.** El d/D mediano de los cráteres es 0.060 en la Luna (LOLA `ldem_80s_80m`, 80 m, llevado a 200 m) y 0.027 en Marte
(mosaico HRSC+MOLA de 200 m). La resolución efectiva de MOLA es de unos 463 m (1/128° de su rejilla), peor que el píxel de 200 m.
Si la Luna vista con un relieve igual de borroso también sale plana, la diferencia es del instrumento y no de la geología.

**Método** (código en `analisis/24_experimento_instrumento_marte.py`, corrido en Colab como celdas 24a–24d al final del cuaderno):
1. Partimos del DEM de LOLA a 80 m (celda 03).
2. Lo suavizamos a 80 m con tres filtros: **caja de 480 m** (promedio móvil de 6 × 6 píxeles); **gaussiano con FWHM de 463 m**
   (sigma = 2.46 píxeles), que es el que tomamos como "tipo MOLA"; y un **caso extremo**, gaussiano con sigma = 463 m
   (FWHM ≈ 1.1 km), más borroso que MOLA, que sirve solo como cota.
3. Lo llevamos a 200 m con el mismo promedio de la celda 03.
4. Corrimos el mismo detector (celda 07) y el mismo filtro de cráter (0.6–10 km, ≥ 20 m, circularidad ≥ 0.6), al sur de 80.5° S.

**Resultados.** d/D mediano (número de cráteres entre paréntesis). La fila de Marte son los 3 sitios de la celda 07 (Jezero, Gale,
Oxia Planum); el modelo del 78 % usa 6 sitios y no lo reentrenamos.

| Polo sur lunar (85–90° S) | D ≥ 0.6 km | D ≥ 1 km | D ≥ 2 km | D ≥ 3 km |
|---|---|---|---|---|
| LOLA sin suavizar | 0.058 (1,056) | 0.064 (503) | 0.059 (184) | 0.055 (107) |
| Caja de 480 m | 0.046 (909) | 0.054 (510) | 0.050 (192) | 0.047 (114) |
| **Gaussiano FWHM 463 m (tipo MOLA)** | **0.043 (737)** | **0.049 (486)** | **0.051 (188)** | **0.047 (112)** |
| Gaussiano sigma 463 m (extremo) | 0.030 (325) | 0.030 (312) | 0.036 (181) | 0.037 (116) |
| Marte, HRSC+MOLA (3 sitios) | 0.027 (284) | 0.021 (177) | 0.019 (53) | 0.033 (20) |

Todo el casquete de 80.5–90° S: 0.060 (4,288) sin suavizar y 0.045 (3,084) con el gaussiano tipo MOLA. Para D ≥ 2 km, 0.067 (788)
y 0.058 (823).

Mismos cráteres, emparejados por posición. Razón del d/D suavizado (FWHM 463 m) entre el original, por diámetro:
0.6–1 km **0.58** · 1–2 km **0.75** · 2–3 km **0.89** · 3–5 km **0.93** · 5–10 km **0.96**.

**Conclusión.**
- **Una parte de la brecha sí es instrumental, sobre todo en cráteres chicos.** Con un suavizado tipo MOLA, el d/D lunar del polo
  sur baja de 0.058 a 0.043 con todos los tamaños: cubre cerca de la mitad de la distancia hasta Marte (0.027). Los cráteres de
  menos de 1 km pierden el 42 % de su d/D, y el 30 % de ellos dejan de pasar el filtro (1,056 → 737).
- **Para D ≥ 2 km la diferencia no es instrumental.** El d/D lunar casi no se mueve (0.059 → 0.051) y Marte sigue en 0.019.
  En ese tamaño, la Luna "borrosa" sigue teniendo más del doble de d/D que Marte.
- Solo el caso extremo, más borroso que MOLA, lleva la Luna a ~0.03, y lo hace borrando dos tercios de los cráteres.
- **Lectura honesta del 78 %:** queda respaldado frente a esta objeción en cráteres de 2 km o más. En los de menos de 1–2 km,
  una parte de la separación Luna–Marte puede venir del instrumento. No reentrenamos el modelo con la Luna suavizada, así que no
  sabemos cuánto bajaría la exactitud; es el siguiente paso.
- Cota: el mosaico HRSC+MOLA usa HRSC (50–100 m) donde hay cobertura, así que en esos sitios Marte puede verse más nítido que
  463 m. Entonces este experimento sobreestima el efecto del instrumento, no lo subestima.

**Texto propuesto** (cuando se fusione #36, que agrega una "Advertencia del instrumento" en el punto 6 de `PROYECTO.md`).
Reemplazar *"No está probado (ver pendientes)."* por:

> Lo probamos (`model/NIVEL2.md` §B, `analisis/24`): al suavizar LOLA a una resolución tipo MOLA (gaussiano con FWHM de 463 m),
> el d/D lunar del polo sur baja de 0.058 a 0.043, pero en cráteres de 2 km o más solo baja de 0.059 a 0.051, y Marte queda en
> 0.019. En cráteres chicos, una parte de la diferencia es del instrumento; en los grandes, no.

Y en `model/VALIDATION.md`, después del párrafo del modelo Luna contra Marte (78 %), agregar:

> Objeción del instrumento (MOLA ≈ 463 m de resolución efectiva): con LOLA suavizado a esa resolución, el d/D lunar baja de 0.058
> a 0.043 con todos los tamaños y de 0.059 a 0.051 con D ≥ 2 km (Marte: 0.027 y 0.019). La separación en cráteres de 2 km o más
> no es instrumental; en los de menos de 1 km, parcialmente sí. Detalle en `model/NIVEL2.md` §B.

## C · La dimensión térmica es casi constante

**Qué pasa.** En `model/score.py`, `oscilacion_termica` usa escala 20 K, peso 0.20 y rango terrestre (0, 40) K. Los dos destinos
están por encima del máximo terrestre: polo sur lunar 176 K (Diviner, Williams et al. 2019) y Jezero 55 K (MEDA, Munguira et al.
2023). Los dos se recortan a 40 K. Como la oscilación de los sitios (NASA POWER `T2M_RANGE`) va de 7.6 a 17.7 K, la similitud
es exp(−(40 − T)/20) y queda casi igual en todos.

**Valores reales** (leídos de `similitud.por_dimension.oscilacion_termica` en los 57 archivos de `data/sites/*.json` de `main`, 14 nov):

| Destino | Sitios | Mínimo | Máximo | Mediana |
|---|---|---|---|---|
| Polo sur lunar | 28 | 0.207 | 0.328 | 0.291 |
| Jezero | 28 (1 más sin valor) | 0.198 | 0.307 | 0.281 |
| Todos | 56 | 0.198 | 0.328 | 0.284 |

Oscilación de los sitios: 7.6 a 17.7 K, mediana 14.8 K. Con peso 0.20 en una media geométrica, la dimensión multiplica el total
por s^0.2, entre 0.72 y 0.80: baja casi igual a todos los sitios y casi no cambia el orden.

**Decisión del equipo.** No cambiamos pesos antes de la entrega: cambiaría todos los totales y el "9 de 21" del guion. La
declaramos como **una dimensión que la Tierra no alcanza**: ningún sitio terrestre llega a la oscilación de la Luna (176 K) ni a
la de Jezero (55 K). Esa dimensión dice "aquí no se puede probar el ciclo térmico", no ordena sitios.

**Propuesta para después del hackathon** (no aplicada): sacar `oscilacion_termica` del total y mostrarla solo en `limites`, o
bajar su peso, y volver a correr `model/validate.py` para documentar el cambio en `VALIDATION.md`.

**Texto propuesto** para `model/VALIDATION.md` (bajo la línea de pesos, cuando se fusione #33):

> Ojo: `oscilacion_termica` vale entre 0.20 y 0.33 en todos los sitios (mediana 0.28), porque los dos destinos (Luna 176 K,
> Jezero 55 K) superan el máximo terrestre de 40 K y se recortan ahí. Es una dimensión que la Tierra no alcanza: rebaja todos los
> totales casi por igual (× 0.72 a 0.80) y no ordena sitios. No se cambia el peso antes de la entrega.

## D · ¿Qué tiene que ver el borde levantado con los análogos? (respuesta para jueces)

Agregada el 14 nov 2026 por la noche, después del apartado "Borde levantado" de `model/VALIDATION.md` (la medida está en
`model/borde.py`). Las cifras salen de ese apartado; si se regenera, hay que volver a copiarlas aquí.

**Respuesta corta.** "El polo sur lunar y Jezero son terreno de cráteres. Nuestro detector encuentra depresiones, pero muchas
son valles, presas o minas. El borde levantado es evidencia de que el hoyo se formó por una explosión o un impacto, como los
cráteres de la Luna y de Marte. Con eso, nuestra lista de análogos de cráter se apoya en evidencia de que son cráteres, no solo hoyos."

**Las tres razones**
1. **Limpia la lista.** Sin esta medida, un valle redondo en el desierto pasa como "análogo lunar". Tienen borde levantado 10 de
   11 cráteres con fuente externa, 3 de 26 presas, valles o dunas (etiqueta de IA ≥ 0.7) y 4 de 38 tajos con cantera de
   OpenStreetMap. En `data/sites`, ninguno de los 22 tajos lo tiene.
2. **Es un análogo por proceso, no por apariencia.** El reto pide ir más allá del parecido visual y hablar de procesos
   (AGENTS.md §13). Un cráter con borde comparte con los de la Luna y Marte cómo se formó: material excavado y lanzado hacia
   afuera. A un valle lo hizo el agua.
3. **Coincide con los sitios de entrenamiento del Apolo que tenemos documentados.** El Elegante, en El Pinacate (Apolo 14;
   Phinney 2015, NASA SP-2015-626), tiene borde medido: 15.6 m. Colton (Apolo 15; USGS OFR 2005-1190) también es un cráter con
   borde según su fuente (~1.1 km de borde a borde, sección A), pero nuestra medida no lo ve (−6.4 m): el detector mide ~0.75 km,
   probablemente el cráter interior.

**Qué no decir**
- "El borde hace que se parezca a la Luna." Con la misma medida solo tienen borde 55 de 248 gemelos lunares (22 %) y 9 de 59
  marcianos (15 %). El borde responde "¿es un cráter?"; qué tan lunar o marciano es sale de profundidad/diámetro.
- Que aplica a todos los análogos. Samalayuca es análogo por sus dunas (procesos eólicos); ahí el borde no aplica.
- Que es una prueba. Son 11 casos con fuente y uno solo es de impacto: es evidencia.
- "Dos evidencias independientes." La etiqueta de IA se hizo viendo imagen de satélite **y relieve**, así que no es del todo
  independiente del borde medido. Lo independiente es la comparación entre cráteres con fuente externa y canteras de
  OpenStreetMap. Frase correcta: "el detector propone, y lo confirman la etiqueta sobre la imagen de satélite y el borde medido
  en el relieve".

**Por verificar antes de usarlo** (no está en nuestras fuentes): que varias regiones candidatas de Artemis III están sobre
bordes de cráteres (nombres como "Nobile Rim" y "de Gerlache Rim"). Hay que confirmarlo en la página de la NASA y citarla. Si se
confirma, sería una cuarta razón: el borde es terreno que una misión tiene que cruzar.

**Texto propuesto** para la sección "Preguntas" de `docs/GUION_PITCH.md` (lo aplica integración):

> - **Borde y análogos:** el polo sur lunar y Jezero son terreno de cráteres. El borde levantado es evidencia de que una depresión
>   se formó por explosión o impacto: lo tienen 10 de 11 cráteres con fuente externa y 4 de 38 tajos mineros. Dice "esto es un
>   cráter", no "esto se parece a la Luna".

**Texto propuesto** para el bloque "Evidencia y límites" del mismo guion (lo que distingue al proyecto; cifras de
`model/VALIDATION.md`, apartado "Borde levantado"):

> Ordenados solo por forma, entre los 25 primeros hay 14 minas y 3 cráteres. Ordenados por el borde levantado, 11 cráteres y 1 mina.

Y para el mismo bloque, la prueba fuera de muestra (cifra de `model/VALIDATION.md`, "Prueba fuera de muestra"):

> Fijamos la regla y después la probamos en ocho cráteres de impacto de otros países que nunca había visto: siete la pasan.

Cuidados: son 8 casos y no son una muestra al azar (son cráteres conocidos, elegidos como control positivo del detector); con la
zona estrecha pasan 5 y con umbral 0.002 pasan 6; Meteor Crater no cuenta entre los 8 porque ya era un candidato.

Cuidados al decir lo de las minas: la cuenta es sobre 296 candidatos y por el puntaje de forma (el mejor entre Luna y Marte), así que no es
"los 25 lugares más parecidos a la Luna"; qué es mina y qué es cráter lo dice la etiqueta de IA (contrastada en 33 casos); y
entre los 25 hay también otras formas (8 por forma, 13 por borde). Figura para acompañarlo: corte de El Elegante y de un tajo
de Arizona, `informe/exposicion_modelo/figura_crater_o_mina_es.png` (y `_en.png`); cómo se eligieron los dos ejemplos está en
`informe/exposicion_modelo/01_borde_levantado.ipynb`, sección 6.
