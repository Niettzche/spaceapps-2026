"""Arma analisis/analogos_mexico.ipynb (documentado) y los .py por celda a partir del código de Colab.

Fuente del código: respaldo/colab_cells.json (exportado del Colab). Uso:
    python3 analisis/construir_notebook.py
"""
import json, re
from pathlib import Path

AQUI = Path(__file__).parent
CELDAS = {c["id"]: c["src"] for c in json.load(open(AQUI.parent / "respaldo/colab_cells.json"))}

INTRO = """# Análogos de la Luna y Marte en México · cuaderno de análisis

**Space Apps 2026** · reto *Identify Earth locations that analog the permanent Moon base locations and Mars*.

Este cuaderno busca en todo México **formas del terreno parecidas a cráteres**, las mide con **el mismo código** que cráteres del **polo sur lunar** y de **Marte**, y exporta los datos que usa la página web (`web/`). También contiene la **validación** del detector y un experimento que la explica.

## Qué hace, en una línea por paso

| Celda | Qué hace | Sale |
|---|---|---|
| 00 | Prepara librerías, Earth Engine y funciones comunes | — |
| 01 | Divide México en cuadros de 10 km y marca los **áridos** (poca vegetación, sin agua, ciudad ni cultivo) | 2,587 de 20,356 cuadros |
| 02 | Baja el **relieve** de esos cuadros y mide pendientes | estadística por cuadro |
| 03 | Baja el relieve de la **Luna** (polo sur) y de **Marte** (Jezero, Gale, Oxia Planum) y lo mide igual | 725 cuadros lunares, 300 marcianos |
| 04 | Compara **pendientes y relieve** de cada cuadro mexicano con cada referencia | distancia 0 = idéntico |
| 05 | Cuenta **depresiones cerradas** por cuadro | — |
| 06 | Puntaje de forma combinado (pendientes + relieve + depresiones) | ranking de cuadros |
| 07 | **Buscador de cráteres**: el mismo detector en México (todo el país), la Luna y Marte | 668 en México, 1,056 en el polo sur |
| 08 | **Validación 1**: ¿encuentra los cráteres mexicanos conocidos? | 9 de 11 |
| 09 | Separa **minas**, mide vegetación y brillo, agrupa en sitios y busca el **gemelo lunar** | tipos y gemelos |
| 10 | **Exporta** los datos de la página web | `web_data.zip` |
| 11 | **Validación 2**: imágenes de relieve y satélite de una muestra al azar | `informe/` |
| 12 | Imágenes de **todas las detecciones en zonas áridas** (la lista que importa) | 47 sitios |
| 13 | **Experimento**: ¿un relieve sin árboles (FABDEM) quita los falsos? | No: solo −15 % |
| 99 | Descarga los zip al equipo | — |

## De dónde salen los datos

Todos son **abiertos**. Los de la Tierra se leen a través de **Google Earth Engine** (hace falta una cuenta y un proyecto de Google Cloud; aquí: `dulcet-cat-514618-d1`). Los de la Luna y Marte se bajan directo de los archivos de NASA y USGS.

| Para qué | Dato | Quién lo produce | Resolución original | Dónde |
|---|---|---|---|---|
| Relieve de México | **Copernicus DEM GLO-30** | ESA / Airbus | 30 m | Earth Engine `COPERNICUS/DEM/GLO30_2024_1` |
| Relieve del polo sur lunar | **LOLA** `ldem_80s_80m` (sonda LRO) | NASA | 80 m | [PDS Geosciences](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/) |
| Relieve de Marte | **HRSC + MOLA blend** v2 | ESA (Mars Express) y NASA (MGS), mosaico de USGS | 200 m | [USGS Astrogeology](https://planetarymaps.usgs.gov/mosaic/Mars/HRSC_MOLA_Blend/) |
| Vegetación | **MODIS MOD13Q1** v6.1 (NDVI, 2021–2025) | NASA (LP DAAC) | 250 m | Earth Engine `MODIS/061/MOD13Q1` |
| Cobertura del suelo | **MODIS MCD12Q1** v6.1 (2024) | NASA (LP DAAC) | 500 m | Earth Engine `MODIS/061/MCD12Q1` |
| Brillo de la superficie | **MODIS MCD43A3** (albedo) | NASA (LP DAAC) | 500 m | Earth Engine `MODIS/061/MCD43A3` |
| Fronteras de México | **LSIB** simplificado 2017 | Departamento de Estado de EE. UU. | — | Earth Engine `USDOS/LSIB_SIMPLE/2017` |
| Minas y canteras | **OpenStreetMap** (`landuse=quarry`) | colaboradores de OSM | — | API Overpass |
| Imagen de satélite (solo para revisar) | **Sentinel-2** L2A, mediana 2023–2025 | ESA / Copernicus | 10 m | Earth Engine `COPERNICUS/S2_SR_HARMONIZED` |
| Relieve sin árboles (experimento) | **FABDEM** | Univ. de Bristol (Hawker et al., 2022) | 30 m | Earth Engine `projects/sat-io/open-datasets/FABDEM` |

**Regla clave:** los tres mundos se llevan a **200 m por píxel** y pasan por **el mismo código**. Así la comparación es justa: si un cráter mexicano y uno lunar salen parecidos, no es por usar datos distintos.

## Cómo correrlo

1. Abrir en Google Colab y ejecutar las celdas **en orden** (cada una usa variables de las anteriores).
2. La celda 00 pide autorizar Earth Engine con la cuenta de Google.
3. Tiempo total: unos **30 minutos**. Las más lentas son 01 (~9 min), 07 (~8 min) y 10 (~3 min).
4. Al final, la celda 99 baja `web_data.zip` (para `web/public/data/`) e `informe.zip` (imágenes del PDF de validación).

## Lo que aprendimos (léelo antes de usar los números)

El detector **encuentra 9 de 11 cráteres conocidos**, pero **la mayoría de sus 668 detecciones no son cráteres**: el 71 % cae en sierras con selva del sur, donde hay muchas depresiones reales (dolinas, cañadas cerradas) que a 200 m cumplen las reglas de forma. Un relieve sin árboles (FABDEM, celda 13) no lo arregla. **Lo que funciona es quedarse con las zonas áridas**: ahí están todos los cráteres y minas reales. Detalle con imágenes en `informe/validacion_detector.pdf`.
"""

MD = {
"lIYdn1woOS1n": """## 00 · Preparación

Instala `rasterio` si falta, conecta con **Earth Engine** y define lo que usan todas las celdas:

- `CELL = 10 km`: tamaño de los cuadros en que se divide el país.
- `BASE = 200 m`: resolución común para la Tierra, la Luna y Marte.
- `CRS = EPSG:6372`: proyección métrica oficial de México (Lambert), para medir distancias en metros.
- `ee_pixels()`: pide a Earth Engine un rectángulo de píxeles como arreglo de numpy (con reintentos).
- `stats_tile()` y `slope_deg()`: miden pendientes y relieve de un cuadro. **Son las mismas funciones para los tres mundos.**""",

"U2607hO2_Vwg": """## 01 · Malla de México y filtro de zonas áridas

**Datos:** MODIS MOD13Q1 (vegetación, NDVI 2021–2025), MODIS MCD12Q1 (cobertura del suelo 2024), fronteras LSIB.

Divide México en cuadros de 10 km y para cada uno calcula: NDVI medio y **NDVI en época verde** (percentil 90), y qué fracción es suelo desnudo, ciudad, agua, cultivo, bosque, matorral o pastizal.

**Filtro de zona árida** (un cuadro pasa si cumple todo):
- NDVI en época verde **< 0.30** (poca vegetación incluso en temporada de lluvias),
- agua < 10 %, ciudad < 5 %, cultivo < 10 %.

El umbral 0.30 se eligió para que entren los análogos conocidos (**El Pinacate**: 0.22, **Cuatro Ciénegas**: 0.23). La tabla final es una **prueba de control**: la Selva Lacandona y el valle de riego de Mexicali deben quedar fuera.

**Resultado:** 2,587 de 20,356 cuadros (13 %) son áridos.""",

"WYajH7ja_mQj": """## 02 · Relieve de los cuadros áridos

**Dato:** Copernicus DEM GLO-30 (ESA). Se pide ya **promediado a 200 m** y se mide con el mismo código que la Luna y Marte.

Por cada cuadro árido: distribución de pendientes (percentiles 5 a 95), pendiente media y desviación, y **relieve** (diferencia entre la elevación alta y la baja). También guarda el relieve de cada cuadro (`parches_mexico.npz`).

**Ojo:** GLO-30 es un modelo de **superficie** (incluye copas de árboles y edificios), hecho con radar.""",

"JwYDKLFw_qVY": """## 03 · Referencias: Luna y Marte

**Luna:** LOLA (sonda LRO de NASA), producto polar `ldem_80s_80m` de 80 m, bajado directo de PDS y **promediado a 200 m**. Se divide en cuadros de 10 km; se separa el **polo sur (85–90° S)**, donde estaría la base Artemis, del anillo de 80–85° S.

**Marte:** mosaico HRSC + MOLA de 200 m (USGS). Se recortan 100 × 100 km alrededor de tres sitios: **cráter Jezero** (rover Perseverance), **cráter Gale** (rover Curiosity) y **Oxia Planum** (rover Rosalind Franklin).

La tabla compara la mediana de pendientes y relieve de cada grupo con los cuadros áridos de México. El polo sur lunar es mucho más empinado (pendiente típica de 8°) que casi todo México (1°).""",

"mqUuFVBH_sW7": """## 04 · Comparación de terreno

Para cada cuadro mexicano y cada referencia calcula **qué tan parecido es el terreno**:

- **Pendientes:** diferencia media entre los 19 percentiles de pendiente (equivale a la distancia de Wasserstein entre las dos distribuciones).
- **Relieve:** diferencia en logaritmo.

Cada distancia se divide entre lo que varía la propia referencia (su percentil 90). Así, **d ≤ 1 significa "tan parecido a la referencia como la referencia lo es a sí misma"**.

**Prueba de humo:** El Pinacate y Cuatro Ciénegas deben quedar arriba frente a la Luna; las dunas de Samalayuca y las llanuras de Vizcaíno, no (y Vizcaíno sí debe parecerse a Oxia Planum, que también es llano). Solo mide **forma del terreno**: nada de composición, temperatura ni luz.""",

"3jhwM7BX_uzq": """## 05 · Depresiones cerradas por cuadro

"Rellena" el relieve como si lloviera (reconstrucción morfológica): lo que quedaría bajo el agua es una **depresión cerrada**. Por cuadro cuenta cuántas hay, su profundidad máxima, qué fracción del área ocupan y qué tan redondas son.

Límite: solo ve depresiones que caben en el cuadro de 10 km y miden al menos ~400 m.""",

"gm03dZP8_w6K": """## 06 · Puntaje de forma combinado

Junta tres criterios: **pendientes**, **relieve** y **depresiones**. El puntaje final es **el peor de los tres**: un cuadro solo sale bien si se parece en todo, no en promedio.

Produce el ranking de cuadros mexicanos más parecidos al polo sur lunar y a cada sitio marciano. La columna `ref. consigo misma` dice qué porcentaje de la propia referencia pasaría el umbral (para calibrar qué es "parecido").""",

"IPrezuDm_2-2": """## 07 · Buscador de cráteres (el corazón del análisis)

Recorre el relieve en **ventanas de 12 km** con traslape y en cada una "rellena" el terreno para encontrar hoyos cerrados. Por cada hoyo mide: posición, diámetro, profundidad, **redondez**, **altura del borde** frente al entorno y proporción **profundidad/diámetro**.

**Filtro "tipo cráter":** diámetro de 0.6 a 10 km, profundidad ≥ 20 m y redondez ≥ 0.6.

Corre **igual** en México (**todo el país**, bloques de 160 km con margen de 12 km para no cortar cráteres), en el polo sur lunar y en los tres sitios de Marte.

**Resultado:** 5,208 hoyos cerrados en México, de los que **668 pasan el filtro**; 1,056 en el polo sur lunar; 284 en Marte.

**Importante:** aquí se busca en todo el país; el filtro de zonas áridas de la celda 01 **no se aplica**. Eso explica la mayoría de los falsos positivos (ver celdas 11 a 13).""",

"pK7qEuDO_5SP": """## 08 · Validación 1: ¿encuentra lo que ya se conoce?

Le damos **11 cráteres mexicanos documentados** (Pinacate, maares de Guanajuato y Puebla, Joya Honda, La Breña) y vemos si hay una detección a menos de 2.5 km. **Las coordenadas de referencia están puestas de memoria y hay que verificarlas.**

**Resultado:** detecta **9 de 11**; 6 pasan el filtro de forma. Los que faltan (Alchichica, La Alberca) tienen **lago**: el relieve ve el espejo de agua, no el fondo.

Esta prueba mide si **encuentra** lo que existe (exhaustividad), **no** cuántas detecciones son falsas (precisión). Eso lo mide la celda 11.""",

"r5fjk0KX_9Qj": """## 09 · De cráteres a sitios

- **(a) Minas:** marca como mina todo cráter a menos de 2 km de una cantera de OpenStreetMap.
- **(b) Superficie:** NDVI, albedo y cobertura del suelo (MODIS) en cada cráter.
- **(c) Tipo probable:** borde levantado ≥ 10 m → "con borde" (volcánico probable); si no → "sin borde" (dolina o cuenca).
- **(d) Sitios:** agrupa cráteres a menos de 15 km entre sí.
- **(e) Gemelo lunar:** el cráter del polo sur más parecido en diámetro y profundidad, y el **percentil** de su proporción profundidad/diámetro dentro de la población lunar.
- **(f) Conocidos frente a nuevos.**

OpenStreetMap a veces no responde; la celda 10 lo reintenta con otro servidor.""",

"SbY9Ezi0AEb4": """## 10 · Exportar para la página web

Genera `web_data.zip` con:

- `fichas.json`: 87 cráteres (con nombre, con borde o minas), cada uno con su gemelo lunar.
- `crateres.json`: los 668 para el mapa.
- `juego.json` + imágenes: 66 rondas (28 Tierra, 24 Luna, 14 Marte).
- `referencia.json`: poblaciones de cráteres de la Luna y Marte, tablas y validación.
- `marte_llanuras.json`: llanuras mexicanas parecidas a Oxia Planum.
- Imágenes de relieve sombreado: **misma luz y mismo tratamiento** para los tres mundos.

Los **nombres de las minas** (Peñasquito, Real de Ángeles, La Herradura, Hércules, Cananea) se asignan por coordenadas y **están por verificar**.

El contenido va a `web/public/data/` en el repositorio.""",

"O_RlxKTFJBJd": """## 11 · Validación 2: ¿qué tan seguido acierta?

**Dato extra:** Sentinel-2 (imagen de satélite en color real, mediana 2023–2025), solo para **revisar a ojo**.

Hace pares de imágenes (relieve a la izquierda, satélite a la derecha, 12.8 km de lado, con un círculo del tamaño de la detección) para:

1. los 11 cráteres conocidos,
2. una **muestra al azar** (semilla 42) de 16 "con borde", 16 "sin borde" y 8 "minas",
3. 12 detecciones del polo sur lunar.

**Resultado (lectura a ojo, por confirmar):** 1 de 16 "con borde", 0 de 16 "sin borde" y 4 de 8 "minas" parecen reales. Los aciertos son grandes, profundos y en desierto; los fallos, pequeños, poco profundos y en sierras con selva.

Las imágenes alimentan `informe/validacion_detector.pdf`.""",

"wXxmoRoWJuBE": """## 12 · Todas las detecciones en zonas áridas

Las mismas imágenes para **las 47 detecciones con NDVI < 0.35**: la lista que proponemos revisar a mano y dejar en la página.

Lectura preliminar: las más profundas (≳ 60 m) son reales (tajos mineros y cráteres del Pinacate y Guanajuato); debajo aparecen hondonadas entre dunas, presas y lagos (depresiones reales, pero no cráteres).""",

"YPrhuvUzMAhE": """## 13 · Experimento: ¿un relieve sin árboles quita los falsos?

**Hipótesis:** Copernicus GLO-30 mide copas de árboles; los huecos del dosel parecerían hoyos. **FABDEM** es el mismo Copernicus con bosques y edificios quitados.

**Prueba:** repetir el detector con FABDEM en 4 bloques de selva (los de más detecciones) y 2 áridos (Pinacate y Zacatecas).

**Resultado:** en selva bajó de 181 a 153 detecciones (**solo −15 %**); en zonas áridas conservó los 4 cráteres reales. **Hipótesis descartada:** los falsos son depresiones **reales** del terreno (dolinas kársticas, cañadas cerradas) que a 200 m cumplen las reglas de forma. La solución es filtrar por zona árida, no cambiar de relieve.""",

"Jmom3x5qAEte": """## 99 · Descargar resultados

Baja al equipo:
- `web_data.zip` → descomprimir en `web/public/data/`.
- `informe.zip` → descomprimir en `informe/datos/` y correr `informe/generar.py` para el PDF.

Colab pide permiso del navegador para descargar; si no baja, ejecuta la celda tú con el botón de play.""",
}

ORDEN = ["lIYdn1woOS1n", "U2607hO2_Vwg", "WYajH7ja_mQj", "JwYDKLFw_qVY", "mqUuFVBH_sW7", "3jhwM7BX_uzq", "gm03dZP8_w6K",
         "IPrezuDm_2-2", "pK7qEuDO_5SP", "r5fjk0KX_9Qj", "SbY9Ezi0AEb4", "O_RlxKTFJBJd", "wXxmoRoWJuBE", "YPrhuvUzMAhE", "Jmom3x5qAEte"]

ARCHIVO = {"lIYdn1woOS1n": "00_preparacion", "U2607hO2_Vwg": "01_malla_arida", "WYajH7ja_mQj": "02_terreno_tierra",
           "JwYDKLFw_qVY": "03_referencias_luna_marte", "mqUuFVBH_sW7": "04_comparacion_terreno", "3jhwM7BX_uzq": "05_depresiones",
           "gm03dZP8_w6K": "06_puntaje_forma", "IPrezuDm_2-2": "07_buscador_crateres", "pK7qEuDO_5SP": "08_validacion",
           "r5fjk0KX_9Qj": "09_sitios_y_gemelos", "SbY9Ezi0AEb4": "10_exportar_web", "O_RlxKTFJBJd": "11_informe_muestra",
           "wXxmoRoWJuBE": "12_informe_aridas", "YPrhuvUzMAhE": "13_experimento_fabdem", "Jmom3x5qAEte": "99_descargar"}


def codigo(cid):
    s = CELDAS[cid]
    if cid == "O_RlxKTFJBJd":   # línea muerta que quedó de una prueba
        s = re.sub(r'\n\s*"control": .*?else None,', "", s)
    if cid == "wXxmoRoWJuBE":
        s = s.replace("# 11b · ", "# 12 · ").replace("from google.colab import files\nfiles.download(z)\n", "")
    if cid == "YPrhuvUzMAhE":
        s = s.replace("# 12 · Prueba:", "# 13 · Experimento:")
    if cid == "Jmom3x5qAEte":
        s = ('# 99 · Descargar al equipo los resultados (si no baja, ejecuta esta celda tú con el botón de play)\n'
             'from google.colab import files\n'
             'for z in ("/content/web_data.zip", "/content/informe.zip"):\n'
             '    if os.path.exists(z):\n'
             '        files.download(z)\n')
    return s


def construir():
    celdas = [{"cell_type": "markdown", "metadata": {}, "source": INTRO}]
    for cid in ORDEN:
        celdas.append({"cell_type": "markdown", "metadata": {}, "source": MD[cid]})
        celdas.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": codigo(cid)})
        (AQUI / f"{ARCHIVO[cid]}.py").write_text(codigo(cid) + "\n", encoding="utf-8")
    nb = {"cells": celdas, "metadata": {"kernelspec": {"name": "python3", "display_name": "Python 3"}, "language_info": {"name": "python"},
                                        "colab": {"provenance": []}}, "nbformat": 4, "nbformat_minor": 5}
    json.dump(nb, open(AQUI / "analogos_mexico.ipynb", "w"), ensure_ascii=False, indent=1)
    (AQUI / "README.md").write_text(INTRO.replace("# Análogos de la Luna y Marte en México · cuaderno de análisis",
                                                   "# analisis/ · cuaderno de análisis") +
                                    "\n## Archivos\n\n- `analogos_mexico.ipynb`: el cuaderno completo y documentado (ábrelo en Colab).\n"
                                    "- `NN_*.py`: el código de cada celda, para leerlo o compararlo en GitHub.\n"
                                    "- `construir_notebook.py`: regenera el cuaderno y los `.py`.\n", encoding="utf-8")
    print("ok:", len(celdas), "celdas")


if __name__ == "__main__":
    construir()
