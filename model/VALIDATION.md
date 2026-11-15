# Validación del modelo (frente modelo)

Generado por `model/validate.py` el 2026-11-14. Pesos (P): forma 0.4, oscilacion_termica 0.2, precipitacion 0.15, ndvi 0.1, pendiente 0.15. Umbrales (P): control negativo < 0.1, análogo conocido > 0.4.

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

Con 0.4 (el mismo umbral que usa esta validación para decir que un análogo conocido pasa) los cinco hiperáridos pasan frente a Jezero y ningún control negativo pasa. Frente al polo sur lunar los totales son más bajos (la oscilación térmica de 176 K está más lejos del máximo terrestre), así que pasan menos. `api/main.py` usa 0.4 (P); como el prefiltro no ordena sitios áridos, una propuesta que lo pasa queda `propuesto_usuario`, pendiente de revisión, no validada.

**Tasa del prefiltro en los sitios del detector.** De los 57 sitios de `data/sites` con un cráter medido (todos de zonas áridas, NDVI p90 < 0.35), 0 quedan vetados y el 58% da 0.4 o más sin la forma (mediana 0.41, percentiles 10–90: 0.32–0.51, máximo 0.60). Es decir: casi todo lo árido pasa y queda en una franja estrecha. El prefiltro **descarta** (selvas, cultivos, nieve) pero **no ordena** sitios áridos entre sí; lo que dice qué es cada sitio es la etiqueta verificada (sección B).

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

**Límite declarado.** La forma sola (3 medidas a 200 m) no distingue un cráter de otra depresión cerrada de tamaño parecido. Por eso el catálogo usa la **etiqueta verificada** (IA sobre imagen de satélite y relieve, revisada contra fuentes) para decidir qué es un cráter, y la forma solo para decir **qué tan lunar o marciano** es un cráter ya identificado.

**Precisión del detector según la IA.** De los 296 candidatos áridos del detector (México + Atacama, Arizona y Arabia), la IA etiqueta 27 como cráteres naturales (9%) y 53 como minas o canteras (18%); el resto son valles, presas, dunas, otras formas o casos que no se pueden decidir: valle_o_canada 94, no_se_puede_decir 57, otro 22, hondonada_eolica_o_duna 22, presa_o_lago 20, dolina_karst 1. Ojo: la IA solo está validada en 33 casos (29 aciertos, IC 95 % 72–97 %) y esos casos son minas, volcanes y Meteor Crater; valles, presas y dunas no tienen casos validados. El detector es un **detector de depresiones cerradas con forma de cráter**, no un detector de cráteres.


## Límites que siempre se declaran

Gravedad, presión atmosférica, radiación y vacío lunar no se reproducen en la Tierra; ningún puntaje los incluye.
