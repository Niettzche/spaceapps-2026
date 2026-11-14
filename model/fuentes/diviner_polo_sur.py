"""Oscilación térmica de la superficie del polo sur lunar (data/targets/polo_sur_lunar.json) desde LRO Diviner.

Fuente: mapas polares estacionales de Williams et al. 2019, "Seasonal Polar Temperatures on the Moon",
JGR Planets 124, 2505 (doi:10.1029/2019JE006028). Datos públicos:
https://luna1.diviner.ucla.edu/~jpierre/diviner/level4_polar/additional_maps/

Cálculo del frente modelo, no publicado como tal:
- amplitud de verano por píxel = Tmax de verano − Tmin de verano (temperatura bolométrica de la superficie, una lunación);
- región: 85–90°S;
- solo terreno iluminado: Tmax de verano ≥ 110 K, umbral de trampa fría de Williams et al. 2019. Excluye la sombra permanente;
- estadístico: mediana. El 14 nov 2026 da p25 160.0 K, mediana 176.5 K y p75 193.3 K, con 1,125,184 píxeles de 240 m.

Uso:  uv run python -m model.fuentes.diviner_polo_sur [carpeta_con_los_tif]
      (rasterio ya viene en las dependencias del proyecto, pyproject.toml; fuera del proyecto: `uv run --with rasterio`)

Descarga: el servidor de UCLA usa una configuración TLS antigua. Con Python 3.13 y OpenSSL actual falla con
CERTIFICATE_VERIFY_FAILED en urllib, y curl responde "dh key too small". No desactives la verificación de certificados.
Si falla, baja a mano con el navegador los dos .tif de ARCHIVOS (unos 25 MB cada uno) desde URL, ponlos en una carpeta
y pásala como argumento: el script los usa sin descargar. El 14 nov 2026 se descargaron en la máquina del frente modelo,
pero no quedó registrado con qué cliente.
No conocemos un espejo en PDS con estos mapas estacionales.
"""
from __future__ import annotations

import pathlib
import sys
import urllib.request

import numpy as np
import rasterio

URL = "https://luna1.diviner.ucla.edu/~jpierre/diviner/level4_polar/additional_maps/"
ARCHIVOS = ["polar_south_80_summer_max-float.tif", "polar_south_80_summer_min-float.tif"]
R_LUNA = 1_737_400.0
LAT_MAX = -85.0
UMBRAL_ILUMINADO_K = 110.0


def descargar(carpeta: pathlib.Path) -> list[pathlib.Path]:
    carpeta.mkdir(parents=True, exist_ok=True)
    rutas = []
    for f in ARCHIVOS:
        p = carpeta / f
        if not p.exists():
            urllib.request.urlretrieve(URL + f, p)
        rutas.append(p)
    return rutas


def amplitud_verano(carpeta: pathlib.Path) -> dict:
    p_max, p_min = descargar(carpeta)
    with rasterio.open(p_max) as a, rasterio.open(p_min) as b:
        tmax, tmin, tr = a.read(1).astype(float), b.read(1).astype(float), a.transform
    filas, cols = np.mgrid[0:tmax.shape[0], 0:tmax.shape[1]]
    x, y = rasterio.transform.xy(tr, filas.ravel(), cols.ravel())
    r = np.hypot(np.asarray(x), np.asarray(y)).reshape(tmax.shape)
    lat = -(90 - 2 * np.degrees(np.arctan(r / (2 * R_LUNA))))      # estereográfica polar sur, esfera de 1737.4 km
    ok = (lat <= LAT_MAX) & np.isfinite(tmax) & np.isfinite(tmin) & (tmin > 0) & (tmax >= UMBRAL_ILUMINADO_K)
    amp = (tmax - tmin)[ok]
    p25, p50, p75 = np.percentile(amp, [25, 50, 75])
    return {"pixeles": int(ok.sum()), "p25_K": round(float(p25), 1), "mediana_K": round(float(p50), 1), "p75_K": round(float(p75), 1)}


if __name__ == "__main__":
    carpeta = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("model/fuentes/_diviner")
    print(amplitud_verano(carpeta))
