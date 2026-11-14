# Memoria del proyecto

Notas vivas del equipo: qué pide el reto, qué tenemos, qué falta y qué decidimos. Actualizar conforme avancemos.

## El reto

**Identify Earth locations that analog the permanent Moon base locations and Mars**. NASA Space Apps Challenge 2026.
Página: https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/
Autor: Sid Ahmed Boukabara (NASA Earth Science Division).

En una frase: usar datos de la NASA para encontrar lugares en la Tierra que sirvan de análogo a la Luna (sobre todo a la base permanente de Artemis en el polo sur) o a Marte, justificarlo con criterios científicos y decir hasta dónde funciona la analogía y dónde deja de funcionar.

### Lo que enfatiza el autor (video)

1. **Que no solo "se parezca".** Pide criterios científicos:
   - geología y minerales
   - temperaturas extremas e iluminación inusual
   - hielo y permafrost
   - polvo y tormentas de polvo
   - terreno volcánico, cuevas y tubos de lava
   - terreno útil para probar operaciones: aterrizaje, navegación, movilidad, robótica, construcción, uso de recursos (ISRU) y operación humana
2. **Dónde se rompe la analogía.** Ningún análogo es perfecto: la Tierra no reproduce la gravedad lunar, el vacío, la atmósfera marciana ni la radiación. Hay que decir qué tan bien funciona cada sitio y dónde falla.
3. **"Sorpréndannos".** No quieren repetir los análogos conocidos (Atacama, Antártida, Islandia, Hawái, Mojave, Death Valley, cráter Haughton). Valoran explícitamente:
   - un mapa
   - una métrica de similitud
   - una app interactiva
   - ML o búsqueda sistemática de análogos no reconocidos
4. **Datos sugeridos:**
   - NASA Earthdata y Worldview (Tierra)
   - PDS (Luna y Marte)
   - LRO (topografía, temperatura y propiedades de superficie lunar)
   - datos de otras agencias espaciales

## Nuestro enfoque

Barrido sistemático de México que detecta formas tipo cráter y las mide con **el mismo código y a la misma resolución (200 m)** que los cráteres del polo sur lunar (LOLA) y de Marte (HRSC+MOLA). Después dice qué tan buen análogo es cada sitio y dónde se rompe la analogía.

- `analisis/`: celdas de Colab `00` a `10`, con Earth Engine.
- `web/`: Vite + React + MapLibre, con el juego "¿Tierra, Luna o Marte?", un mapa, fichas y la explicación del método.
- Los datos están en el README.

Qué cubre ya del reto: métrica de similitud, búsqueda sistemática, sitios nuevos (no los análogos clásicos) y app interactiva.

## Cómo encontramos los análogos (resumen para el equipo y el pitch)

Cifras del 14 de noviembre de 2026. Cada paso dice de dónde sale el número.

1. **El relieve de los tres mundos, a la misma escala.** Tierra: Copernicus DEM GLO-30 (ESA, 30 m). Luna: LOLA `ldem_80s_80m` (sonda LRO de NASA, 80 m, polo sur). Marte: mosaico HRSC + MOLA (ESA/NASA vía USGS, 200 m), en 8 sitios de aterrizaje. Los tres se llevan a **200 m por píxel** y pasan por **el mismo código** (`analisis/00`–`03`), para que las diferencias sean del terreno y no de los datos.
2. **Buscar hoyos "como si lloviera".** El detector (`analisis/07_buscador_crateres.py`) recorre el relieve en ventanas de 12 km, rellena cada ventana hasta el punto por donde se derramaría el agua y mide lo que quedó bajo el agua. Se queda con lo que tiene forma de cráter: 0.6 a 10 km de diámetro, al menos 20 m de profundidad y redondez ≥ 0.6. Detalle en la sección siguiente. Resultado: **5,208 depresiones en México, 668 tipo cráter**; 1,056 cráteres en el polo sur lunar; 596 en Marte.
3. **Quitar lo que no sirve.** Con la vegetación de MODIS (NASA, NDVI p90 < 0.35) se dejan solo zonas áridas. El 71 % de las 668 estaba en sierras húmedas del sur: son dolinas y cañadas reales, no cráteres (`informe/validacion_detector.pdf`). Quedan **47 candidatos áridos en México** (46 si se recalcula desde `hoyas_mexico.csv`: ahí el NDVI se muestreó a 250 m en vez de 500 m, celda 14 frente a celda 09, y tres cráteres cruzan el umbral de 0.35 en uno u otro sentido: MX0015, MX0090 y MX0206). Con OpenStreetMap se marca cuáles están a ≤ 2 km de una cantera o mina (no confirma que lo sean).
4. **Repetir en otros desiertos.** El mismo detector en Atacama, Arizona (incluye el norte de Sonora) y Arabia occidental: **283 cráteres más, 263 áridos** (`analisis/16_busqueda_global.py`). Es una búsqueda global **mínima**: 3 de las 10 regiones priorizadas, no "todo el planeta".
5. **Comprobar que el detector funciona.** Encuentra **9 de 11** cráteres mexicanos conocidos y el **40 %** de un catálogo de 70 volcánicos con fuente (`ciencia_datos/03`); los que no encuentra tienen lago o son muy chicos o someros. Encuentra **9 de 10** cráteres de impacto del mundo (8 válidos), con Meteor Crater a ~0.1 km de su posición (116 m en `ciencia_datos/datos/impactos_tierra.csv`, columna `a_km_del_centro`).
6. **Medir qué tan lunar o marciano es cada candidato.** La variable que más separa los mundos es **profundidad/diámetro** (Luna 0.060, México árido 0.034, Marte 0.027). Un modelo explicable entrenado solo con cráteres de la Luna y de Marte los distingue con **78 %** de exactitud balanceada (`ciencia_datos/02`–`03`). Además, para cada candidato se busca su **gemelo lunar por perfil a 80 m** (el de corte radial más parecido entre los 1,056 del polo sur) y se compara **zona por zona**: fondo, pared, borde y alrededor (`analisis/18`–`19`, datos en `ciencia_datos/datos/perfiles_radiales.json`).
7. **Elegir los mejores.** Un buen análogo se parece en **varias zonas y variables a la vez**, está en zona árida y es accesible. De ahí salen dos hallazgos:
   - **Minas a cielo abierto** (México, Arizona, Atacama): más hondas que el 99.75 % de los cráteres lunares de su tamaño (de 1,975 cráteres lunares de 0.7–1.2 km entre 80 y 90° S —polo sur y anillo—, solo 0.25 % pasa de d/D 0.2) y que Meteor Crater (0.126). Por perfiles a 80 m (`perfiles_radiales.json`) se parecen en pared y borde y **no en el fondo**: la analogía se rompe por exceso. De los 21 cráteres áridos globales con d/D ≥ 0.15, 14 están junto a una cantera. Nombres de minas por verificar.
   - **Cráteres volcánicos como El Elegante, Sykes y MacDougal (Pinacate)**: por perfiles a 80 m (`perfiles_radiales.json`) coinciden con un cráter lunar en todas sus zonas.

   Cuidado al presentarlo: como el gemelo se elige entre 1,056 cráteres, casi siempre hay uno parecido. Lo más informativo es **dónde no se parece**.

### El paso 2 en detalle: cómo el detector encuentra un hoyo

- **Rellenar.** En cada ventana de 60 × 60 píxeles (12 km) se calcula el relieve "lleno de agua" con una reconstrucción morfológica por erosión (`skimage.morphology.reconstruction`): el agua sube en cada hoyo hasta el punto más bajo de su orilla, por donde se derramaría. La **profundidad** en cada píxel es "relleno − terreno".
- **Separar hoyos.** Los píxeles con más de 5 m de agua forman manchas; cada mancha conectada es una depresión candidata.
- **Medir cada una.** Área → diámetro equivalente (`2·√(área/π)`); profundidad máxima; **redondez** = qué tanto llena su caja × qué tan cuadrada es la caja; **borde** = altura media de un anillo justo afuera menos la de un anillo más lejano.
- **Filtrar.** Se queda si mide 0.6–10 km, tiene ≥ 20 m de profundidad y redondez ≥ 0.6.
- **No contar dos veces.** Las ventanas se traslapan cada 6 km; si dos detecciones se enciman se conserva la más completa.
- **Límites:** a 200 m no ve nada menor de ~0.6 km; un cráter con lago se mide hasta el agua, no hasta el fondo; la profundidad se mide hasta el punto de derrame del borde (el más bajo), no hasta la cresta, así que en bordes disparejos sale menor; y en sierras quebradas encuentra dolinas y cañadas cerradas que cumplen la forma sin ser cráteres (por eso el filtro árido).

## Entrega (hackathon 14–15 de noviembre de 2026)

**Cierre del envío: domingo 15 de noviembre, 23:59 hora local** (según resultados de búsqueda; confirmar en la guía oficial: https://www.spaceappschallenge.org/resources/project-submission-guide/). No se aceptan cambios después. Meta interna: enviar el domingo a las 18:00.

Lo que pide el envío (según la guía 2025; confirmar si cambió en 2026):
- [ ] Título y resumen del proyecto.
- [ ] Demo: video de 30 s como máximo **o** hasta 7 diapositivas (con portada), en un enlace **público** (YouTube, Drive, GitHub). No se sube al sitio de Space Apps.
- [ ] Enlace final al proyecto, **público**. El repo hoy es privado: hacerlo público o publicar una copia y desplegar la página web.
- [ ] Descripción: qué hace, cómo funciona, beneficios, qué datos de la NASA y de otras agencias usa (LOLA, HRSC+MOLA, Copernicus GLO-30 de la ESA, MODIS, OpenStreetMap, GVP), referencias.
- [ ] Declarar el uso de IA (Claude en análisis, código y redacción).
- Criterios de evaluación: impacto, creatividad, validez, relevancia y presentación.

## Pendientes y mejoras propuestas

- [ ] **Más de un eje de similitud.** Hoy el puntaje es sobre todo de forma y relieve (`06_puntaje_forma.py`). Candidatos:
  - [ ] Térmico: MODIS LST (Tierra) contra Diviner/LRO (Luna) o THEMIS (Marte)
  - [ ] Composición: ASTER o EMIT (Tierra) contra M3 (Luna) o CRISM (Marte)
  - [ ] Operaciones: pendiente y rugosidad (aterrizaje y movilidad en el polo sur)
- [ ] **Ficha con puntaje por eje**, no uno solo. Ejemplo: relieve 0.85, térmico 0.30, composición 0.50; gravedad, vacío y radiación no aplican. Así respondemos directamente "dónde se rompe".
- [ ] **Validación con análogos conocidos.** Comprobar que el método da puntaje alto a cráteres o análogos ya reconocidos, para dar credibilidad a los sitios nuevos.
- [ ] **Incertidumbre y sensibilidad.** ¿Cambia el ranking si cambiamos la resolución o los umbrales?
- [ ] **Conexión con Artemis.** Por sitio, decir qué se podría probar ahí: rovers, navegación, construcción, recursos.
- [ ] Revisar en la página del reto los entregables concretos (video, demo, repositorio) y la fecha límite.
- [ ] **Filtrar las detecciones que no son cráteres.** 472 de 668 detecciones de México están en zonas de mucha vegetación (NDVI > 0.7). Se probó FABDEM (Copernicus sin árboles ni edificios) en 6 bloques: en zonas húmedas bajan solo 15 % (181 → 153) y en zonas áridas se conservan los cráteres reales. No son copas de árboles: son **depresiones reales del terreno, no cráteres** (dolinas de sierras kársticas, cañadas cerradas de terreno disectado). El filtro tiene que ser por contexto (NDVI, geología kárstica) o por etiquetas a mano; FABDEM no hace falta.
- [ ] ~~Etiquetar a mano las 47 detecciones áridas~~ (descartado: a 200 m no se distinguen a ojo). En su lugar: **etiquetas desde fuentes externas.** Minas por OpenStreetMap (`km_mina` ≤ 2 km). Cráteres volcánicos por un catálogo citable (`ciencia_datos/datos/crateres_conocidos_mx.csv`: GVP y artículos, en construcción) cotejado a menos de 2.5 km. La clase Tierra se arma desde los cráteres conocidos, no desde las detecciones. Requiere `hoyas_mexico.csv` completo (pedido a la sesión del Colab). Página de revisión manual, por si se quiere usar para casos sueltos: https://claude.ai/artifact/HPUMVzssLXS6UxxvNkrbFb
- [ ] **Modelos explicables** (`ciencia_datos/01_modelos_explicables.ipynb`). Hecha la primera versión; volver a correr cuando haya etiquetas limpias. Exporta `ciencia_datos/salidas/arbol.json` para la capa "método" de la web (falta conectarlo).
- [ ] **Variables del perfil del cráter** (en `analisis/`): pendiente de la pared, forma del fondo (taza o plano), continuidad del borde. A 200 m la forma en planta es casi ruido de cuadrícula (la mitad de los cráteres tiene menos de 20 píxeles).
- [ ] **¿Marte sale plano por el instrumento?** Revisar si HRSC+MOLA suaviza los cráteres frente a LOLA y Copernicus; bajaría el d/D marciano sin que sea geología.
- [ ] **Puntaje de análogo sin etiquetas terrestres** (`ciencia_datos/02`): modelo Luna contra Marte (75–77 %) más distancia a la nube Luna+Marte. Decidir si reemplaza o complementa al de `06_puntaje_forma.py` en la web.
- [ ] *(Opcional, si sobra tiempo)* **DeepMoon** (Silburt et al., 2019): red de detección de cráteres entrenada con LOLA. Pasarla sobre México para preguntar qué ve como cráter una red que solo conoce la Luna. Apuesta para el "sorpréndannos".

## Decisiones

| Fecha | Decisión | Por qué |
|---|---|---|
| — | Comparar los tres cuerpos a 200 m con el mismo detector | Una comparación justa y reproducible |
| 2026-11-14 | Usar modelos explicables (árbol de decisión poco profundo, regresión logística), no redes neuronales, para separar Luna, Marte y Tierra | Hay pocos cráteres terrestres confiables (decenas) y el reto pide justificar la analogía y decir dónde se rompe |
| 2026-11-14 | Para modelar, Tierra = solo detecciones áridas (NDVI p90 < 0.35) hasta tener etiquetas a mano; no cambiar a FABDEM | Con las 668 el modelo aprende a reconocer dolinas y cañadas de sierras húmedas, no cráteres. FABDEM solo quita 15 % de esas detecciones: la causa es el terreno, no los árboles |
| 2026-11-14 | Validar con grupos espaciales (`StratifiedGroupKFold`, bloques de ~50 km) y exactitud balanceada; puntajes de análogo siempre fuera de pliegue | Evita resultados inflados por cráteres vecinos y por el desbalance (4,288 lunares contra 47 terrestres) |
| 2026-11-14 | Sin `elev_m` como variable | Cada cuerpo tiene su propio nivel de referencia; sería fuga de información |
| 2026-11-14 | Etiquetas de la Tierra desde fuentes externas (OSM para minas, catálogo de cráteres volcánicos con fuente), no a ojo; puntaje principal = Luna contra Marte + distancia a la nube planetaria | La revisión visual a 200 m no es confiable y las etiquetas con fuente se pueden defender ante los jueces |
| 2026-11-14 | **Cambio de enfoque:** el modelo de clasificación deja de ser el producto y pasa a ser evidencia (árbol = explicación de las reglas; Luna contra Marte = métrica de similitud), y se congela. El producto son 5–8 sitios con gemelo, puntaje, uso para Artemis y dónde se rompe. Hallazgo principal propuesto: tajos mineros áridos como análogo operativo del polo sur; segundo: maars no propuestos antes como análogos (por verificar en la literatura). Perfiles, más resolución, DeepMoon y dolinas quedan para después del hackathon | Cierra el 15 de noviembre; el jurado evalúa sitios, justificación y presentación, no la exactitud del clasificador |

## Bitácora

- **2026-11-14:** se revisó la transcripción del video del autor. Se definió el reto principal y las mejoras propuestas (arriba).
- **2026-11-14:** primer notebook de modelos explicables (`ciencia_datos/01_modelos_explicables.ipynb`, datos copiados en `ciencia_datos/datos/` porque `respaldo/` no está en git). Con Tierra = 47 detecciones áridas: regresión logística 55 % y árbol de profundidad 3 51 % de exactitud balanceada fuera de pliegue (al azar: 32 %). La regla principal es profundidad / diámetro (Luna 0.060, México árido 0.034, Marte 0.027); la segunda, la altura del borde. Las formas se traslapan mucho: en forma, los cráteres áridos de México son análogos creíbles. Las minas (Real de Ángeles, Peñasquito) y MacDougal salen "lunares". Entrenado con las 668, el modelo llama Tierra al 60 % de las detecciones en zonas húmedas y solo al 28 % de las áridas: aprende esas depresiones, no los cráteres.
- **2026-11-14:** la sesión del Colab probó FABDEM en 6 bloques de 160 km: no elimina las detecciones de zonas húmedas (−15 %). Son dolinas y cañadas reales, no un artefacto de las copas de árboles. Se corrigió el informe (commit 0b01b72) y el texto del notebook.
- **2026-11-14:** diagnóstico de los modelos (`ciencia_datos/02_diagnostico_y_mejoras.ipynb`, 10 repeticiones de CV por grupos). El desbalance ya estaba atendido (sin pesos el modelo solo dice "Luna"; el submuestreo no agrega). El cuello de botella son las etiquetas de la Tierra: con los 15 verificados (10 minas, 5 naturales) sube de 56 % a 70 %. El aspecto no aporta; el relleno solo reconoce hoyas terrestres irregulares. Quitar el anillo lunar no cambia nada. Luna contra Marte separa 75–77 %; con ese modelo, 85 % de los cráteres áridos de México cae dentro de la nube Luna+Marte. Quedan fuera 7 de 47: cinco por exceso de profundidad (Real de Ángeles, Hércules ×2, Peñasquito y el cráter natural Sykes; solo el 0.25 % de los cráteres lunares de 0.7–1.2 km pasa de d/D 0.2) y dos por defecto (MX0206, una presa, y MX0121: cuencas de 5–6 km casi planas).
- **2026-11-14:** notebook 03 con etiquetas por fuentes. Catálogo de 70 cráteres volcánicos con fuente (`ciencia_datos/datos/crateres_conocidos_mx.csv`): el detector encuentra el 40 % de los 62 que están en su rango y el 32 % pasa el filtro; 15 no se ven porque tienen lago. Marte con 8 sitios (596 cráteres; Elysium y Utopia excluidos): Luna contra Marte 78 %, y entre 70 y 92 % en un sitio marciano nunca visto. Los 8 cráteres de impacto terrestres detectados caen dentro de la nube Luna+Marte (Meteor Crater lunar, P_Luna 0.96). Las 4 minas más hondas (d/D 0.19–0.29) superan a Meteor Crater (0.126). Ojo: el borde lunar medido a 200 m es negativo (mediana −23 m), así que no sirve como criterio de parecido con la Luna.
