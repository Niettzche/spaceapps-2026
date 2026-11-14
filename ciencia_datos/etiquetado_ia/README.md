# Etiquetado asistido por IA (y verificado)

**Qué es.** A cada uno de los 298 candidatos áridos (México y búsqueda global) se le pidió a Claude (Claude Code CLI, `claude -p`) que dijera qué es la depresión del centro, mirando dos imágenes: la foto de satélite Sentinel-2 y el relieve sombreado, ambas de 12.8 km de lado, más sus medidas. Categorías: cráter volcánico, cráter de impacto, mina o cantera, dolina, hondonada eólica o duna, presa o lago, valle o cañada, otro y no se puede decir.

**Qué no se le dio:** ni el nombre ni la distancia a minas de OpenStreetMap. Así su acierto se puede medir contra esas fuentes.

**Validación** (`validacion.txt`, generado con `validar.py`): **30 de 34 aciertos (88 %)** contra fuentes externas que no vio.
- Cráteres volcánicos del catálogo `crateres_conocidos_mx.csv` (GVP y artículos): **6 de 6**.
- Canteras o minas de OpenStreetMap a ≤ 1 km: **23 de 27**. Las 4 fallas tienen confianza baja (0.3–0.4) y dicen "no se puede decir" o "valle".
- Meteor Crater: **1 de 1**, como impacto.

**Resultado en los 298:** 94 valles o cañadas, 57 no se puede decir, 53 minas, 26 cráteres volcánicos, 24 hondonadas eólicas o dunas, 22 otro, 20 presas o lagos, 1 impacto y 1 dolina. Confirma que buena parte de las detecciones del detector no son cráteres, y sirve para limpiar la lista.

**Cómo presentarlo:** "etiquetado asistido por IA y verificado contra fuentes". Nunca "la IA descubrió". Es una ayuda para revisar imágenes, con su error medido.

**Archivos:**
- `../datos/etiquetas_ia.csv`: id (cid o gid), tipo, confianza, razón (lo que vio), modelo y fecha.
- `etiquetar.py`, `validar.py`: los scripts. Dependen del visor local (`visor.html` y `visor_img/`, que generan las celdas 17 y 20 de `analisis/`), así que se corren desde ese directorio; no son parte de la CI.

**Limitaciones:**
- La "verdad" de minas es OpenStreetMap, que puede tener errores.
- Solo 34 casos tienen verdad externa; el resto no está verificado individualmente.
- Las imágenes son de 12.8 km a resolución baja: los cráteres de menos de ~1 km se ven pequeños.
