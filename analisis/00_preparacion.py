# 00 · Preparación: librerías, Earth Engine y funciones comunes
import os, re, sys, time, subprocess
import numpy as np, pandas as pd
from concurrent.futures import ThreadPoolExecutor
from pyproj import Transformer
import ee

PROJECT = "dulcet-cat-514618-d1"
ee.Authenticate()
ee.Initialize(project=PROJECT)
print("Earth Engine listo:", ee.Number(1).add(1).getInfo() == 2)

try:
    import rasterio
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "rasterio"], check=True)
    import rasterio
from rasterio.warp import reproject, Resampling
from rasterio.vrt import WarpedVRT
from rasterio.transform import from_origin

CELL = 10_000            # lado del cuadro, en metros
BASE = 200               # metros por píxel: resolución común para Tierra, Luna y Marte
N = CELL // BASE         # 50 píxeles por lado de cuadro
CRS = "EPSG:6372"        # proyección métrica oficial de México (cónica de Lambert)
PCTS = list(range(5, 100, 5))
OUT = "/content/salida"; os.makedirs(OUT, exist_ok=True)
to_xy = Transformer.from_crs("EPSG:4326", CRS, always_xy=True)
to_ll = Transformer.from_crs(CRS, "EPSG:4326", always_xy=True)

def ee_pixels(img, x_left, y_top, width, height, scale, crs=CRS, tries=4):
    """Pide a Earth Engine un rectángulo de píxeles como arreglo de numpy."""
    grid = {"dimensions": {"width": int(width), "height": int(height)},
            "affineTransform": {"scaleX": scale, "shearX": 0, "translateX": float(x_left),
                                "shearY": 0, "scaleY": -scale, "translateY": float(y_top)},
            "crsCode": crs}
    err = ""
    for k in range(tries):
        try:
            return ee.data.computePixels({"expression": img, "fileFormat": "NUMPY_NDARRAY", "grid": grid})
        except Exception as e:
            err = str(e)[:200]; time.sleep(2 * (k + 1))
    raise RuntimeError(err)

def to_grid(img, native_proj, reducer=None):
    """Resume una imagen fina dentro de cada píxel de salida (promedio por defecto)."""
    return img.setDefaultProjection(native_proj).reduceResolution(reducer or ee.Reducer.mean(), maxPixels=4096)

def stats_tile(s, e):
    """Medidas de terreno de un cuadro: s = pendientes en grados, e = elevaciones en metros."""
    s, e = s.ravel(), e.ravel()
    d = {f"slope_p{p}": v for p, v in zip(PCTS, np.percentile(s, PCTS))}
    d.update({"slope_mean": s.mean(), "slope_stdDev": s.std()})
    d.update({f"elev_p{p}": v for p, v in zip((5, 50, 95), np.percentile(e, (5, 50, 95)))})
    d["elev_stdDev"] = e.std(); d["relieve"] = d["elev_p95"] - d["elev_p5"]
    return d

def slope_deg(dem):
    """Pendiente en grados por diferencias centrales, sobre un mapa de elevación a BASE metros por píxel."""
    gy, gx = np.gradient(dem.astype("float64"), BASE)
    return np.degrees(np.arctan(np.hypot(gx, gy)))

print("Listo. Salidas en", OUT)
