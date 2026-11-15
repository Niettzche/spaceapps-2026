# Validación del modelo (frente modelo)

Generado por `model/validate.py` el 2026-11-15. Pesos (P): forma 0.4, oscilacion_termica 0.2, precipitacion 0.15, ndvi 0.1, pendiente 0.15. Umbrales (P): control negativo < 0.1, análogo conocido > 0.4.

Ojo: `oscilacion_termica` vale entre 0.20 y 0.33 en todos los sitios (mediana 0.28), porque los dos destinos (Luna 176 K, Jezero 55 K) superan el máximo terrestre de 40 K y se recortan ahí. Es una dimensión que la Tierra no alcanza: rebaja todos los totales casi por igual y no ordena sitios. No se cambia el peso antes de la entrega (`model/NIVEL2.md` §C).

## A. Prefiltro ambiental (dimensiones complementarias)

Las dimensiones complementarias funcionan como un **prefiltro ambiental**: dicen si un punto es árido, sin vegetación y de relieve comparable. **Descartan pero no ordenan.** En estos puntos no hay un cráter medido, así que la forma no aplica: la similitud usa clima (NASA POWER), vegetación (MODIS) y pendiente (Copernicus DEM a 200 m), y la confianza baja en consecuencia.

### Controles negativos: 3 de 3 pasan

| nombre | oscilacion_termica | precipitacion | ndvi | pendiente | total_polo_sur_lunar | total_jezero | vetado_jezero | pasa |
|---|---|---|---|---|---|---|---|---|
| Selva amazónica, Reserva Florestal Adolpho Ducke (Manaos, Brasil) | 5.05 | 5.36 | 0.791 | 3.31 | 0 | 0 | sí | sí |
| Cuenca del Congo, Parque Nacional Nouabalé-Ndoki (República del Congo) | 7.7 | 4.72 | 0.757 | 2.37 | 0 | 0 | sí | sí |
| Zona agrícola húmeda: llanura de arroz Đồng Tháp Mười (Plain of Reeds), delta del Mekong (Vietnam) | 8.61 | 3.46 | 0.552 | 0.163 | 0 | 0 | sí | sí |

### Análogos conocidos: 9 de 21 pasan

| nombre | oscilacion_termica | precipitacion | ndvi | pendiente | total_polo_sur_lunar | total_jezero | vetado_jezero | pasa |
|---|---|---|---|---|---|---|---|---|
| Desierto de Atacama, núcleo hiperárido de Yungay (Chile) | 14.7 | 0.02 | 0.0803 | 4.98 | 0.498 | 0.556 | no | sí |
| Valles Secos de McMurdo, Wright Valley (Antártida) | 5.61 | 0.22 | — | 15.4 | 0.314 | 0.232 | no | no |
| Cráter Haughton (isla Devon, Canadá) | 4.64 | 0.85 | 0.0026 | 3.32 | 0.343 | 0.442 | no | sí |
| Death Valley, Badwater Basin (EE. UU.) | 14.7 | 0.34 | 0.0628 | 1.07 | 0.385 | 0.496 | no | sí |
| Islandia, campo de lava Holuhraun | 4.1 | 2.36 | 0.0373 | 1.28 | 0.203 | 0.261 | no | no |
| Hawái, cima del Mauna Kea | 5.2 | 4.41 | 0.0598 | 10.8 | 0.156 | 0.121 | no | no |
| Desierto de Mojave (EE. UU.) | 15.5 | 0.35 | 0.102 | 4.82 | 0.449 | 0.51 | no | sí |
| Río Tinto, Peña de Hierro, sondeo BH-10 del proyecto IPBSL (Huelva, España) | 13.4 | 1.28 | 0.434 | 6.12 | 0.254 | 0.253 | no | no |
| Meteor Crater (Arizona, EE. UU.) | 14.5 | 1.14 | 0.181 | 1.08 | 0.276 | 0.355 | no | no |
| Mars Desert Research Station (Utah, EE. UU.) | 13.6 | 0.66 | 0.0911 | 2.65 | 0.366 | 0.472 | no | sí |
| El Pinacate, cráter El Elegante (Sonora, México) | 14.5 | 0.51 | 0.144 | 1.87 | 0.35 | 0.451 | no | sí |
| Laguna de Alchichica (Puebla, México), maar con microbialitos | 12.5 | 3.1 | 0.0129 | 2.24 | 0.208 | 0.269 | no | no |
| Cuatro Ciénegas (Coahuila, México) | 14.7 | 1.04 | 0.155 | 5.66 | 0.366 | 0.383 | no | no |
| Gran Desierto de Altar, dunas (Sonora, México) | 14.6 | 0.29 | 0.108 | 1.79 | 0.384 | 0.495 | no | sí |
| Salinas de Guerrero Negro, tapetes microbianos (Baja California Sur, México) | 13.6 | 0.24 | 0.11 | 0.189 | 0.352 | 0.454 | no | sí |
| Cueva de Villa Luz / Cueva del Azufre (Tabasco, México) | 9.08 | 6.47 | 0.82 | 11.7 | 0 | 0 | sí | no |
| Mina de Naica / Cueva de los Cristales (Chihuahua, México) | 16.2 | 0.9 | 0.182 | 4.09 | 0.35 | 0.427 | no | sí |
| Cráter de Chicxulub (Yucatán, México), sepultado | 2.98 | 1.94 | — | 0 | 0.159 | 0.215 | no | no |
| Cenote El Zacatón (Tamaulipas, México) | 10.4 | 2.53 | 0.635 | 2.17 | 0 | 0 | sí | no |
| Maar Rincón de Parangueo (Valle de Santiago, Guanajuato, México) | 15.3 | 1.98 | 0.187 | 3.09 | 0.249 | 0.32 | no | no |
| Colton Crater (Crater 160), campo volcánico de San Francisco (Arizona, EE. UU.) | 14.2 | 1.02 | 0.225 | 5.4 | 0.334 | 0.358 | no | no |

**Lectura.** El prefiltro ambiental mide clima árido, suelo desnudo y relieve suave. Pasan los análogos elegidos por eso mismo (desiertos hiperáridos, dunas, cráteres en zonas secas). No pasan los que son análogos por otra razón que estas variables no ven: frío polar, lava en clima húmedo, química del agua (Río Tinto), microbialitos y cenotes, cuevas, o estructuras sepultadas. Que no pasen es esperable y marca el alcance del prefiltro: no reemplaza a la forma ni a la composición. No pasan: Valles Secos de McMurdo, Wright Valley (Antártida), Islandia, campo de lava Holuhraun, Hawái, cima del Mauna Kea, Río Tinto, Peña de Hierro, sondeo BH-10 del proyecto IPBSL (Huelva, España), Meteor Crater (Arizona, EE. UU.), Laguna de Alchichica (Puebla, México), maar con microbialitos, Cuatro Ciénegas (Coahuila, México), Cueva de Villa Luz / Cueva del Azufre (Tabasco, México), Cráter de Chicxulub (Yucatán, México), sepultado, Cenote El Zacatón (Tamaulipas, México), Maar Rincón de Parangueo (Valle de Santiago, Guanajuato, México), Colton Crater (Crater 160), campo volcánico de San Francisco (Arizona, EE. UU.).

**Umbral del explorador libre** (POST /score; un punto libre no tiene cráter medido, así que la forma no entra). El total más alto de un análogo conocido es 0.556: con el umbral provisional de 0.6 (AGENTS.md §6.4) nadie puede proponer un sitio. Hiperáridos = Yungay, Death Valley, Mojave, Gran Desierto de Altar y la Mars Desert Research Station.

| umbral | conocidos polo_sur_lunar | hiperáridos polo_sur_lunar | conocidos jezero | hiperáridos jezero | controles negativos |
|---|---|---|---|---|---|
| 0.6 | 0 de 21 | 0 de 5 | 0 de 21 | 0 de 5 | 0 de 3 |
| 0.5 | 0 de 21 | 0 de 5 | 2 de 21 | 2 de 5 | 0 de 3 |
| 0.45 | 1 de 21 | 1 de 5 | 7 de 21 | 5 de 5 | 0 de 3 |
| 0.4 | 2 de 21 | 2 de 5 | 9 de 21 | 5 de 5 | 0 de 3 |

Con 0.4 (el mismo umbral que usa esta validación para decir que un análogo conocido pasa) los cinco hiperáridos pasan frente a Jezero y ningún control negativo pasa. Frente al polo sur lunar los totales son más bajos por la pendiente: el objetivo lunar es 8.63° y el de Jezero 3.56°, y estos desiertos son más llanos. La oscilación térmica no cambia entre destinos, porque los dos se recortan al máximo terrestre de 40 K. `api/main.py` usa 0.4 (P); como el prefiltro no ordena sitios áridos, una propuesta que lo pasa queda `propuesto_usuario`, pendiente de revisión, no validada.

Errores de medición: Valles Secos de McMurdo, Wright Valley (Antártida): MODIS: ORNL: 400 Client Error: Bad Request for url: https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset?latitude=-77.516667&longitude=161.833333&band=250m_16_days_NDVI&startDate=A2023001&endDate=A2023145&kmAboveBelow=0&kmLeftRight=0 · Cráter de Chicxulub (Yucatán, México), sepultado: MODIS: ORNL: sin dato para el píxel

**Tasa del prefiltro en los sitios del detector.** De los 62 sitios de `data/sites` con un cráter medido (todos de zonas áridas, NDVI p90 < 0.35), 0 quedan vetados y el 58% da 0.4 o más sin la forma (mediana 0.41, percentiles 10–90: 0.32–0.52, máximo 0.60). Es decir: casi todo lo árido pasa y queda en una franja estrecha. El prefiltro **descarta** (selvas, cultivos, nieve) pero **no ordena** sitios áridos entre sí; lo que dice qué es cada sitio es la etiqueta verificada (sección B).

## B. Forma (dimensión principal)

Modelo: regresión logística Luna contra Marte con 4,288 cráteres lunares y 573 marcianos (variables log_diam, prof_diam, borde_rel; sitios de Marte excluidos: Elysium, Utopia). Exactitud balanceada fuera de pliegue con grupos espaciales: 78 %; en un sitio de Marte nunca visto, entre 70 % (Gale) y 92 % (Meridiani). Detalle en `ciencia_datos/03_etiquetas_por_fuentes.ipynb`.

**Objeción del instrumento** (MOLA ≈ 463 m de resolución efectiva): con LOLA suavizado a esa resolución (gaussiano con FWHM de 463 m), el d/D lunar baja de 0.058 a 0.043 con todos los tamaños y de 0.059 a 0.051 con D ≥ 2 km (Marte: 0.027 y 0.019). La separación en cráteres de 2 km o más no es instrumental; en los de menos de 1 km, parcialmente sí. No se reentrenó el modelo con LOLA suavizado. Detalle en `model/NIVEL2.md` §B y `analisis/24_experimento_instrumento_marte.py`.

**Cráteres de impacto terrestres** (control positivo de forma): 8 de 8 caen dentro del 95 % de la nube Luna+Marte. Xiuyan se excluye (la depresión detectada no coincide en tamaño) y Brent no se detecta (erosionado, con bosque y lagos). Coordenadas aproximadas del Earth Impact Database.

| nombre | diam_km | prof_diam | P_Luna | dist | dentro_95 |
|---|---|---|---|---|---|
| Meteor Crater | 1.06 | 0.126 | 0.958 | 11 | sí |
| Lonar | 1.81 | 0.0524 | 0.462 | 3.47 | sí |
| Wolfe Creek | 0.782 | 0.0341 | 0.379 | 3 | sí |
| Tenoumer | 1.63 | 0.0245 | 0.209 | 4.89 | sí |
| Pingualuit | 3.07 | 0.0181 | 0.132 | 10.9 | sí |
| Tswaing | 0.903 | 0.0761 | 0.754 | 3.43 | sí |
| Roter Kamm | 1.82 | 0.0347 | 0.275 | 5.14 | sí |
| Talemzane | 1.37 | 0.0199 | 0.205 | 3.37 | sí |

**Detector frente a cráteres volcánicos conocidos de México** (`ciencia_datos/datos/crateres_conocidos_mx.csv`, 70 cráteres con fuente, 66 con coordenadas): de 62 en el rango del detector (0.6–10 km o sin diámetro), encuentra el 40% y el 32% pasa el filtro tipo cráter. No detectados: 15 con lago (el DEM ve el espejo de agua), 3 menores de 0.6 km y 22 por otras razones (islas, coordenadas desplazadas, poca profundidad). Mismo cotejo que `ciencia_datos/03_etiquetas_por_fuentes.ipynb` (radio de 2.5 km; una depresión cuenta una sola vez).

**Exactitud con cráteres de 2 km o más** (respuesta a la objeción del instrumento). Misma validación que `ciencia_datos/03` (celda 10): regresión logística balanceada, `StratifiedGroupKFold(5)` con grupos espaciales de 250 × 250 píxeles (50 × 50 km) por sitio, 10 repeticiones; aquí solo se filtra por diámetro. Con todos los tamaños da 77.6% ± 0.2%; con D ≥ 2 km, 77.6% ± 0.7%. La separación Luna contra Marte se mantiene en los cráteres grandes, donde la resolución de MOLA pesa menos; con d/D sola baja, porque en los grandes el diámetro y el borde aportan más.

| cráteres | variables | n Luna | n Marte | exactitud balanceada | acierto Luna | acierto Marte |
|---|---|---|---|---|---|---|
| todos los tamaños | 3 variables | 4288 | 573 | 77.6% ± 0.2% | 73% | 82% |
| todos los tamaños | solo d/D | 4288 | 573 | 75.8% ± 0.1% | 68% | 83% |
| D ≥ 2 km | 3 variables | 788 | 125 | 77.6% ± 0.7% | 72% | 83% |
| D ≥ 2 km | solo d/D | 788 | 125 | 71.0% ± 0.3% | 57% | 85% |

### ¿La forma distingue un cráter de otra depresión cerrada?

**Tasa base de la nube Luna+Marte.** De las 5,208 depresiones cerradas que el detector encontró en México (cualquier forma, cualquier vegetación), el 84% cae dentro del 95 % de la nube. Es decir: **la nube descarta formas extremas (sobre todo tajos muy hondos), pero no confirma que algo sea un cráter**. Los 8 de 8 impactos de arriba son una condición necesaria, no una prueba.

| filtro | entorno | n | dentro_95 |
|---|---|---|---|
| no lo pasa | árido | 182 | 97 % |
| no lo pasa | intermedio | 1340 | 89 % |
| no lo pasa | húmedo | 3018 | 78 % |
| pasa el filtro de cráter | árido | 46 | 89 % |
| pasa el filtro de cráter | intermedio | 156 | 97 % |
| pasa el filtro de cráter | húmedo | 466 | 91 % |

**Control negativo de forma.** Candidatos áridos con etiqueta de IA de confianza ≥ 0.7: cráteres naturales (volcánico o de impacto) frente a depresiones que no son cráteres (presa o lago, valle o cañada, hondonada eólica o duna). Si la forma distinguiera, los cráteres tendrían puntajes claramente más altos. El AUC mide eso: 0.5 = no separa, 1 = separa perfecto.

| grupo | n | forma_mejor_mediana | P_Luna_mediana | dentro_95 | dD_mediana | dif_perfil_mediana |
|---|---|---|---|---|---|---|
| cráter natural (IA) | 14 | 0.628 | 0.623 | 71 % | 0.0791 | 0.0054 |
| presa, valle o duna (IA) | 26 | 0.766 | 0.348 | 85 % | 0.028 | 0.00265 |

AUC de separación cráter natural frente a presa/valle/duna (14 contra 26 casos; p = prueba de permutación de dos colas, 5,000 repeticiones): puntaje de forma 0.42 (p = 0.43); d/D 0.75 (p = 0.01); diferencia de perfil con el gemelo lunar 0.37 (p = 0.18; menor diferencia = más lunar). Un AUC por debajo de 0.5 quiere decir que las presas, valles y dunas puntúan **más** lunar que los cráteres: son más planas; el puntaje de forma las toma por marcianas (en Marte los cráteres son planos) y la diferencia de perfil absoluta premia lo plano (por eso la lista corta usa `dif_rel` = diferencia media / d/D, en `ciencia_datos/salidas/fichas_integradas.csv`).

**Límite declarado.** La forma sola (3 medidas a 200 m) no distingue un cráter de otra depresión cerrada de tamaño parecido. Por eso el catálogo usa la **etiqueta verificada** (IA sobre imagen de satélite y relieve, revisada contra fuentes) para decidir qué es un cráter, y la forma solo para decir **qué tan lunar o marciano** es un cráter ya identificado. La medida que sí lo distingue es el borde levantado (apartado siguiente al de la precisión del detector).

**Precisión del detector según la IA.** De los 296 candidatos áridos del detector (México + Atacama, Arizona y Arabia), la IA etiqueta 27 como cráteres naturales (9%) y 53 como minas o canteras (18%); el resto son valles, presas, dunas, otras formas o casos que no se pueden decidir: valle_o_canada 94, no_se_puede_decir 57, otro 22, hondonada_eolica_o_duna 22, presa_o_lago 20, dolina_karst 1. Ojo: la IA solo está validada en 33 casos (29 aciertos, IC 95 % 72–97 %) y esos casos son minas, volcanes y Meteor Crater; valles, presas y dunas no tienen casos validados. El detector es un **detector de depresiones cerradas con forma de cráter**, no un detector de cráteres.

### Borde levantado: una medida que sí distingue un cráter de otra depresión

Un impacto o una explosión volcánica apila material alrededor del hoyo: el terreno pegado al cráter queda más alto que el terreno lejano. Un valle cerrado, una presa, una hondonada entre dunas o un tajo no tienen eso. **Medida** (`model/borde.py`, sin consultar nada: usa los perfiles radiales a 80 m de `analisis/18`): `h/D` = altura máxima del perfil radial promedio entre 0.83 y 1.67 radios, sobre el terreno lejano (1.67 a 2 radios), dividida entre el diámetro. Hay borde levantado si `h/D` > 0. Ventana y umbral son provisionales (P).

| grupo | con borde levantado |
|---|---|
| Cráteres con fuente externa (catálogo de México, impactos, literatura) | 10 de 11 (91%) |
| Cráter natural según la IA, confianza ≥ 0.7 | 13 de 14 (93%) |
| Presa, valle o duna según la IA, confianza ≥ 0.7 | 3 de 26 (12%) |
| Tajos con cantera de OpenStreetMap a ≤ 2 km | 4 de 38 (11%) |
| Todos los candidatos áridos con perfil | 57 de 296 (19%) |
| Referencia: gemelos lunares (LOLA a 80 m) | 55 de 248 (22%) |
| Referencia: gemelos marcianos (HRSC+MOLA a 200 m) | 9 de 59 (15%) |

**Separación** (AUC; p = prueba de permutación de dos colas, 5,000 repeticiones). Cráter natural frente a presa, valle o duna (IA ≥ 0.7, 14 contra 26, los mismos casos del control negativo de arriba): altura del borde 0.91 (p < 0.001), puntaje de forma 0.42. Cráteres con fuente externa frente a tajos con cantera de OpenStreetMap (11 contra 38; aquí la IA no interviene en ningún lado): altura del borde 0.91 (p < 0.001), puntaje de forma 0.36.

**¿Pone arriba a los cráteres que ya se conocen?** Al ordenar los 296 candidatos por altura del borde, 7 de los 11 cráteres con fuente quedan entre los 20 primeros y 10 entre los 40; con el puntaje de forma, 2 y 3. Entre los 25 primeros por borde hay 11 cráteres naturales según la IA y 1 mina; entre los 25 primeros por forma, 3 cráteres naturales y 14 minas.

| id | fuente | h/D | borde (m) | levantado | puesto por borde | puesto por forma |
|---|---|---|---|---|---|---|
| G00266 | cono de toba Jabal Bayda, a ~0.04 km (OpenStreetMap; NASA Earth Observatory 2024) | +0.0369 | 38.2 | sí | 2 | 67 |
| G00195 | Meteor Crater, a 0.04 km (lista de cráteres de impacto, ciencia_datos/datos/impactos_tierra.csv) | +0.0217 | 23.5 | sí | 4 | 18 |
| G00263 | maar Al Hutaymah, a ~0.10 km (OpenStreetMap; USGS OFR 85-125) | +0.0140 | 18.1 | sí | 7 | 69 |
| MX0261 | Hoya Rincón de Parangueo, a 0.20 km (catálogo de cráteres de México) | +0.0118 | 16.2 | sí | 11 | 143 |
| MX0008 | Cráter El Elegante, a 0.21 km (catálogo de cráteres de México) | +0.0108 | 15.6 | sí | 12 | 10 |
| MX0010 | Sykes (Cráter Grande / Volcán Romo), a 0.34 km (catálogo de cráteres de México) | +0.0107 | 9.7 | sí | 13 | 207 |
| MX0009 | Celaya (Volcán Los Vidrios), a 0.01 km (catálogo de cráteres de México) | +0.0059 | 5.8 | sí | 20 | 256 |
| MX0012 | Cerro Colorado, a 0.33 km (catálogo de cráteres de México) | +0.0041 | 2.6 | sí | 23 | 245 |
| G00281 | maar Al Wahbah, a ~0.23 km (IUGS Geoheritage) | +0.0028 | 6.1 | sí | 29 | 182 |
| MX0007 | MacDougal (Cráter Verdugo), a 0.35 km (catálogo de cráteres de México) | +0.0021 | 3.4 | sí | 35 | 215 |
| G00176 | Colton Crater (Crater 160), a ~0.05 km (USGS OFR 2005-1190) | -0.0085 | -6.4 | no | 223 | 31 |

**Sensibilidad** a la ventana y al umbral. Ojo: la ventana ancha se eligió después de ver que la estrecha dejaba fuera a cráteres con fuente. Con tan pocos casos eso es ajuste a la muestra, y por eso se reportan todas las combinaciones:

| ventana (radios) | umbral h/D | cráteres con fuente | presa, valle o duna | tajos OSM | todos |
|---|---|---|---|---|---|
| 0.83–1.33 | 0 | 7 de 11 | 1 de 26 | 0 de 38 | 23 de 296 |
| 0.83–1.33 | 0.002 | 7 de 11 | 1 de 26 | 0 de 38 | 17 de 296 |
| 0.67–1.67 | 0 | 10 de 11 | 3 de 26 | 4 de 38 | 57 de 296 |
| 0.67–1.67 | 0.002 | 10 de 11 | 2 de 26 | 4 de 38 | 36 de 296 |
| 0.83–1.67 (la usada) | 0 | 10 de 11 | 3 de 26 | 4 de 38 | 57 de 296 |
| 0.83–1.67 | 0.002 | 10 de 11 | 2 de 26 | 4 de 38 | 36 de 296 |

**Prueba fuera de muestra: cráteres de impacto que la regla no había visto.** La ventana y el umbral se fijaron con los candidatos de México, Atacama, Arizona y Arabia. Después, sin cambiar nada, se midieron con el mismo método los 9 cráteres de impacto de `ciencia_datos/datos/impactos_tierra.csv` que el detector encuentra (`analisis/25_perfiles_impactos.py`; centro y diámetro del detector, igual que en los candidatos). Meteor Crater ya estaba entre los candidatos y no cuenta como nuevo. **De los 8 que la regla no había visto, 7 tienen borde levantado.**

| cráter de impacto | diámetro del detector (km) | diámetro esperado (km) | h/D | borde (m) | levantado | ¿nuevo para la regla? |
|---|---|---|---|---|---|---|
| Meteor Crater | 1.06 | 1.2 | +0.0245 | 25.9 | sí | no: ya era el candidato G00195 |
| Lonar | 1.81 | 1.8 | +0.0031 | 5.6 | sí | sí |
| Wolfe Creek | 0.78 | 0.9 | +0.0076 | 5.9 | sí | sí |
| Tenoumer | 1.63 | 1.9 | +0.0176 | 28.6 | sí | sí |
| Pingualuit | 3.07 | 3.4 | +0.0075 | 23 | sí | sí |
| Tswaing | 0.9 | 1.1 | +0.0094 | 8.5 | sí | sí |
| Roter Kamm | 1.82 | 2.5 | +0.0101 | 18.4 | sí | sí |
| Talemzane | 1.37 | 1.75 | +0.0019 | 2.6 | sí | sí |
| Xiuyan | 0.81 | 1.8 | -0.0075 | -6.1 | no | sí |

No lo tiene: Xiuyan (el detector le mide 0.81 km y el diámetro esperado es 1.8 km: el borde real queda probablemente fuera de la zona medida, como en Colton). Sensibilidad en los 8 nuevos: con la ventana estrecha (0.83–1.33) pasan 5; con la usada y umbral 0.002, 6. Pasan solo con la ventana ancha: Lonar, Talemzane.

Qué prueba y qué no: son 8 casos y no son una muestra al azar. Son cráteres de impacto conocidos, elegidos antes como control positivo del detector (`analisis/15_referencias_extra.py`); los que el detector no encuentra (Brent, erosionado) no entran, así que no dice nada de estructuras de impacto erosionadas o sepultadas. Sí responde a la objeción de que la ventana se ajustó a la muestra: en estos cráteres no se ajustó nada.

**En `data/sites`** (sitios con cráter medido; la variable es `variables.borde_levantado`, en metros):

| categoría | sitios | con borde levantado | cuáles |
|---|---|---|---|
| tajo minero | 22 | 0 | — |
| sin verificar | 28 | 5 | mx0003, mx0017, mx0045, mx0047, mx0121 |
| cráter natural verificado | 5 | 4 | g00263, g00266, g00281, mx0261 |
| curado (documentado) | 6 | 6 | meteor_crater, pinacate, pingualuit, roter_kamm, talemzane, tenoumer |

Ningún tajo minero se marca como novedoso (`model/scan.py`, regla 5): son minas conocidas y análogos operativos, no hallazgos. Sin perfil a 80 m (variable en `null`): mx0090.

**Cómo se usa.** Es la segunda evidencia de la categoría de cada sitio (`model/scan.py`, regla 6), junto a la etiqueta verificada: la nota dice si la medida apoya a la etiqueta o no. **No entra al puntaje ni cambia ningún total.**

**Límites.**
- No mide parecido con la Luna ni con Marte: con la misma medida solo tienen borde levantado 55 de 248 (22%) gemelos lunares y 9 de 59 (15%) marcianos. No comprobamos por qué; una explicación posible es que son cráteres viejos y encimados. Es evidencia de que una depresión terrestre es un cráter, y nada más.
- Muestra chica: la regla se fijó con 11 cráteres con fuente externa, casi todos volcánicos (1 de impacto), y la prueba fuera de muestra son 8 cráteres de impacto más. Siguen siendo pocos casos.
- No lo tienen: G00176 (Colton Crater (Crater 160)). El detector mide el diámetro del área inundada, que puede ser menor que el del borde; si el borde real cae fuera de la ventana, la medida no lo ve. En Colton es la causa probable: el detector mide ~0.75 km y la fuente da ~1.1 km de borde a borde (`model/NIVEL2.md` §A).
- Las etiquetas de presa, valle y duna vienen de la IA, que vio el mismo relieve: esa comparación no es independiente. La de cráteres con fuente frente a canteras de OpenStreetMap sí lo es.
- Una depresión cerrada en lo alto de una loma también da positivo: es evidencia, no prueba.


## Límites que siempre se declaran

Gravedad, presión atmosférica, radiación y vacío lunar no se reproducen en la Tierra; ningún puntaje los incluye.
