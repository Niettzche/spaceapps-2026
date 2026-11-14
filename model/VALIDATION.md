# Validación del modelo (frente modelo)

Generado por `model/validate.py` el 2026-11-14. Pesos (P): forma 0.4, oscilacion_termica 0.2, precipitacion 0.15, ndvi 0.1, pendiente 0.15. Umbrales (P): control negativo < 0.1, análogo conocido > 0.4.

## A. Comparador de variables (dimensiones complementarias)

En estos puntos no hay un cráter medido, así que la forma no aplica: la similitud usa clima (NASA POWER), vegetación (MODIS) y pendiente (Copernicus DEM a 200 m), y la confianza baja en consecuencia.

### Controles negativos: 3 de 3 pasan

| nombre | oscilacion_termica | precipitacion | ndvi | pendiente | total_polo_sur_lunar | total_jezero | vetado_jezero | pasa |
|---|---|---|---|---|---|---|---|---|
| Selva amazónica, Reserva Florestal Adolpho Ducke (Manaos, Brasil) | 5.05 | 5.36 | 0.791 | 3.31 | 0 | 0 | sí | sí |
| Cuenca del Congo, Parque Nacional Nouabalé-Ndoki (República del Congo) | 7.7 | 4.72 | 0.757 | 2.37 | 0 | 0 | sí | sí |
| Zona agrícola húmeda: llanura de arroz Đồng Tháp Mười (Plain of Reeds), delta del Mekong (Vietnam) | 8.61 | 3.46 | 0.552 | 0.163 | 0 | 0 | sí | sí |

### Análogos conocidos: 9 de 20 pasan

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

**Lectura.** El comparador complementario mide clima árido, suelo desnudo y relieve suave. Pasan los análogos elegidos por eso mismo (desiertos hiperáridos, dunas, cráteres en zonas secas). No pasan los que son análogos por otra razón que estas variables no ven: frío polar, lava en clima húmedo, química del agua (Río Tinto), microbialitos y cenotes, cuevas, o estructuras sepultadas. Que no pasen es esperable y marca el alcance del comparador: no reemplaza a la forma ni a la composición. No pasan: Valles Secos de McMurdo, Wright Valley (Antártida), Islandia, campo de lava Holuhraun, Hawái, cima del Mauna Kea, Río Tinto, Peña de Hierro, sondeo BH-10 del proyecto IPBSL (Huelva, España), Meteor Crater (Arizona, EE. UU.), Laguna de Alchichica (Puebla, México), maar con microbialitos, Cuatro Ciénegas (Coahuila, México), Cueva de Villa Luz / Cueva del Azufre (Tabasco, México), Cráter de Chicxulub (Yucatán, México), sepultado, Cenote El Zacatón (Tamaulipas, México), Maar Rincón de Parangueo (Valle de Santiago, Guanajuato, México).

## B. Forma (dimensión principal)

Modelo: regresión logística Luna contra Marte con 4,288 cráteres lunares y 573 marcianos (variables log_diam, prof_diam, borde_rel; sitios de Marte excluidos: Elysium, Utopia). Exactitud balanceada fuera de pliegue con grupos espaciales: 78 %; en un sitio de Marte nunca visto, entre 70 % (Gale) y 92 % (Meridiani). Detalle en `ciencia_datos/03_etiquetas_por_fuentes.ipynb`.

**Cráteres de impacto terrestres** (control positivo de forma): 8 de 8 caen dentro del 95 % de la nube Luna+Marte. Xiuyan se excluye (la depresión detectada no coincide en tamaño) y Brent no se detecta (erosionado, con bosque y lagos). Coordenadas aproximadas del Earth Impact Database.

| nombre | diam_km | prof_diam | P_Luna | dist | dentro_95 |
|---|---|---|---|---|---|
| Meteor Crater | 1.06 | 0.126 | 0.958 | 11.4 | sí |
| Lonar | 1.81 | 0.0524 | 0.462 | 3.73 | sí |
| Wolfe Creek | 0.782 | 0.0341 | 0.379 | 2.84 | sí |
| Tenoumer | 1.63 | 0.0245 | 0.209 | 4.99 | sí |
| Pingualuit | 3.07 | 0.0181 | 0.132 | 11.4 | sí |
| Tswaing | 0.903 | 0.0761 | 0.754 | 3.42 | sí |
| Roter Kamm | 1.82 | 0.0347 | 0.275 | 5.33 | sí |
| Talemzane | 1.37 | 0.0199 | 0.205 | 3.37 | sí |

**Detector frente a cráteres volcánicos conocidos de México** (`ciencia_datos/datos/crateres_conocidos_mx.csv`, 70 cráteres con fuente, 66 con coordenadas): de 62 en el rango del detector (0.6–10 km o sin diámetro), encuentra el 40% y el 32% pasa el filtro tipo cráter. No detectados: 15 con lago (el DEM ve el espejo de agua), 3 menores de 0.6 km y 22 por otras razones (islas, coordenadas desplazadas, poca profundidad). Mismo cotejo que `ciencia_datos/03_etiquetas_por_fuentes.ipynb` (radio de 2.5 km; una depresión cuenta una sola vez).

## Límites que siempre se declaran

Gravedad, presión atmosférica, radiación y vacío lunar no se reproducen en la Tierra; ningún puntaje los incluye.
