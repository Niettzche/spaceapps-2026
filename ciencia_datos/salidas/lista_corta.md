# Lista corta propuesta (provisional, la decide el equipo)

Generada por `ciencia_datos/05_fichas_integradas.py` a partir de `fichas_integradas.csv`.

**Reglas:**
- base: árido (NDVI p90 < 0.35); etiqueta de IA con confianza ≥ 0.7; forma con sombra polar en ≥ 80 % del cráter (sol a 1.5°)
- natural: cráter volcánico o de impacto según la IA: los 3 con menor diferencia relativa de perfil contra su gemelo lunar (80 m; diferencia media / d/D)
- mina: mina o cantera según la IA y junto a cantera de OpenStreetMap (≤ 2 km): las 3 más hondas para su tamaño (d/D), una por región si se puede

| Papel | id | Lugar | D (km) | d/D | IA | Dif. relativa | Dif. perfil fondo/pared/borde | Sombra polar (Tierra / gemelo) | Ya conocido |
|---|---|---|---|---|---|---|---|---|---|
| cráter natural: forma más lunar | MX0008 | El Elegante (Pinacate), México (31.846, -113.392) | 1.45 | 0.139 | crater_volcanico (0.85) | 0.03 | 0.0008 / 0.0024 / 0.0083 | 0.90 / 0.76 | El Pinacate, cráter El Elegante (Sonora, México) |
| cráter natural: forma más lunar | MX0010 | Sykes (Pinacate), México (31.940, -113.570) | 0.90 | 0.197 | crater_volcanico (0.75) | 0.03 | 0.0056 / 0.0075 / 0.0067 | 0.95 / 0.86 | El Pinacate (entrenamiento Apolo 14, NASA SP-2015-626) |
| cráter natural: forma más lunar | MX0009 | El Pinacate, México (31.984, -113.447) | 0.98 | 0.052 | crater_volcanico (0.75) | 0.03 | 0.0029 / 0.0019 / 0.0013 | 0.80 / 0.74 | El Pinacate (entrenamiento Apolo 14, NASA SP-2015-626) |
| tajo minero: pendientes extremas (analogía rota por exceso) | MX0085 | Hércules (Coah.) (nombre por verificar), México (28.046, -103.782) | 0.81 | 0.257 | mina_o_cantera (0.85) | 0.11 | 0.0704 / 0.0221 / 0.0205 | 0.82 / 0.85 | no |
| tajo minero: pendientes extremas (analogía rota por exceso) | G00027 | sin nombre, Atacama (Chile) (-22.680, -70.170) | 0.90 | 0.251 | mina_o_cantera (0.85) | 0.07 | 0.0465 / 0.0121 / 0.0051 | 0.85 / 0.85 | no |
| tajo minero: pendientes extremas (analogía rota por exceso) | G00211 | sin nombre, Arizona (EE. UU.) (32.959, -109.674) | 1.19 | 0.219 | mina_o_cantera (0.85) | 0.04 | 0.0085 / 0.0130 / 0.0124 | 0.93 / 0.85 | no |

**Lectura principal:** 11 cráteres naturales pasan la regla base; 5 de ellos **no están en ninguna lista de análogos conocidos** y son candidatos nuevos a revisar: G00176 (Arizona (EE. UU.), dif. relativa 0.04); G00263 (Arabia occidental (Hiyaz), dif. relativa 0.06); G00041 (Atacama (Chile), dif. relativa 0.10); G00037 (Atacama (Chile), dif. relativa 0.12); G00266 (Arabia occidental (Hiyaz), dif. relativa 0.71). Los 3 de la lista corta son los de perfil más parecido y 3 ya son análogos conocidos, así que también funcionan como **controles** de que el método encuentra lo que debe. Si el equipo quiere, los nuevos mejor puntuados pueden entrar a la lista. Ojo: "no está en la lista" no significa "nunca usado". `data/known_analogs.json` tiene 20 sitios, y algunos de estos caen en campos volcánicos usados para entrenamiento (por ejemplo, G00176 en el campo volcánico de San Francisco, Arizona); hay que verificarlos en la literatura antes de llamarlos novedosos. Los **tajos mineros** (3 regiones) son el otro hallazgo: análogo operativo de pendientes extremas, con la analogía rota por exceso de profundidad, sobre todo en el fondo.

**Cómo leerla:**
- *Dif. relativa*: diferencia media de perfil con su gemelo lunar dividida entre el d/D del propio cráter (0.10 = el perfil difiere en promedio un 10 % de su profundidad relativa). Es la que ordena la lista: la absoluta premia lo plano.
- *Dif. perfil*: diferencia media con su gemelo lunar por zona, en profundidad/diámetro (mediana de todos los candidatos ≈ 0.002; criterio provisional del visor: < 0.015).
- *Sombra polar*: fracción del cráter en sombra permanente si estuviera en el polo sur (Sol a 1.5°). Es un experimento: ningún lugar de la Tierra tiene ese Sol.
- Clima (NASA POWER): los candidatos caen en 126 celdas de POWER, no en 296 climas distintos; la lluvia de Atacama no está verificada.
- Los nombres de minas, si aparecen, están por verificar. Las coordenadas son las del detector.

**Límites de todos:** gravedad, vacío, radiación, frío extremo (≈ 40 K en la sombra lunar), hielo y composición (el polo sur es anortosita).
