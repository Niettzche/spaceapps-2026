# analisis/ · cuaderno de análisis

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
| 14 | Exporta **todas** las depresiones (5,208) para `ciencia_datos/` | `hoyas_mexico.csv` |
| 15 | Más referencias: **5 sitios de Marte** y **10 cráteres de impacto** de la Tierra | `hoyas_referencia.csv`, `impactos_tierra.csv` |
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

## Archivos

- `analogos_mexico.ipynb`: el cuaderno completo y documentado (ábrelo en Colab).
- `NN_*.py`: el código de cada celda, para leerlo o compararlo en GitHub.
- `construir_notebook.py`: regenera el cuaderno y los `.py`.
