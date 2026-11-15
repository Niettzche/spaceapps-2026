# 25 · Perfiles radiales a 80 m de los cráteres de impacto de ciencia_datos/datos/impactos_tierra.csv
#
# Para qué: es la prueba fuera de muestra del borde levantado (model/borde.py). La zona del borde y el umbral se fijaron con los
# candidatos de México, Atacama, Arizona y Arabia; estos cráteres de impacto de otros países no intervinieron. Aquí solo se
# sacan sus perfiles; la medida y la lectura están en model/borde.py (tabla_impactos) y en model/VALIDATION.md.
#
# Mismo método que analisis/18_perfiles_radiales.py (Copernicus DEM GLO-30 llevado a 80 m, 12 anillos de 0 a 2 radios del
# detector, altura relativa al terreno lejano y dividida entre el diámetro). Las funciones están copiadas de las celdas 00, 02 y 18
# porque aquellas corren en Colab; `--comprobar` vuelve a calcular perfiles ya guardados y exige que salgan idénticos.
#
# A diferencia de las demás celdas, esta corre en local (necesita Earth Engine autenticado: `earthengine authenticate`):
#   uv run --with earthengine-api --with pandas --with numpy python analisis/25_perfiles_impactos.py --comprobar
# Salida: ciencia_datos/datos/perfiles_impactos.json
import argparse
import json
import pathlib
import time

import ee
import numpy as np
import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATOS = RAIZ / "ciencia_datos" / "datos"
RB = np.linspace(0, 2.0, 13)          # r/R en 12 anillos, igual que analisis/18
R80 = 80


def relieve():
    """Copernicus DEM GLO-30 (ESA) promediable a la escala que se pida: misma definición que analisis/02_terreno_tierra.py."""
    glo = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").select("DEM")
    return (glo.mosaic().setDefaultProjection(glo.first().projection())
            .reduceResolution(ee.Reducer.mean(), maxPixels=256).unmask(0).toFloat().rename("dem"))


def ee_pixels(img, x_left, y_top, width, height, scale, crs, tries=4):
    """Pide a Earth Engine un rectángulo de píxeles como arreglo de numpy (analisis/00_preparacion.py)."""
    grid = {"dimensions": {"width": int(width), "height": int(height)},
            "affineTransform": {"scaleX": scale, "shearX": 0, "translateX": float(x_left),
                                "shearY": 0, "scaleY": -scale, "translateY": float(y_top)},
            "crsCode": crs}
    err = ""
    for k in range(tries):
        try:
            return ee.data.computePixels({"expression": img, "fileFormat": "NUMPY_NDARRAY", "grid": grid})
        except Exception as e:
            err = str(e)[:200]
            time.sleep(2 * (k + 1))
    raise RuntimeError(err)


def perfil_desde(dem, cx, cy, R):
    """dem en una malla regular; (cx, cy) centro en píxeles; R radio en píxeles. Recentra en el punto más bajo cerca del centro."""
    yy, xx = np.mgrid[0:dem.shape[0], 0:dem.shape[1]]
    cerca = np.hypot(yy - cy, xx - cx) <= max(0.5 * R, 1.5)
    if cerca.any():
        k = np.argmin(np.where(cerca, dem, np.inf))
        cy, cx = np.unravel_index(k, dem.shape)
    rr = np.hypot(yy - cy, xx - cx) / R
    prof = np.array([dem[(rr >= a) & (rr < b)].mean() if ((rr >= a) & (rr < b)).any() else np.nan for a, b in zip(RB[:-1], RB[1:])])
    fuera = np.nanmean(prof[(RB[:-1] >= 1.6)])
    return None if np.isnan(fuera) else (prof, fuera)


def normaliza(res, diam_km):
    if res is None:
        return None
    prof, fuera = res
    return [None if np.isnan(v) else round(float((v - fuera) / (diam_km * 1000)), 4) for v in prof]


def tierra_80(dem, x, y, epsg, diam_km):
    """Perfil de un cráter con centro (x, y) en la proyección UTM `epsg` y el diámetro que midió el detector."""
    R = diam_km * 1000 / 2 / R80
    h = int(np.ceil(2.2 * R)) + 2
    a = ee_pixels(dem, x - h * R80, y + h * R80, 2 * h, 2 * h, R80, f"EPSG:{int(epsg)}")["dem"]
    return normaliza(perfil_desde(a, h, h, R), float(diam_km))


def comprobar(dem, ids=("G00195", "G00281", "G00266", "G00219")):
    """Vuelve a calcular perfiles ya guardados en perfiles_radiales.json: si no salen idénticos, este script no mide lo mismo."""
    guardados = {s["id"]: s["tierra"] for s in json.loads((DATOS / "perfiles_radiales.json").read_text(encoding="utf-8"))["sitios"]}
    g = pd.read_csv(DATOS / "global_crateres.csv").set_index("gid")
    for gid in ids:
        c = g.loc[gid]
        nuevo = tierra_80(dem, c.x, c.y, c.epsg, c.diam_km)
        if nuevo != guardados[gid]:
            raise SystemExit(f"{gid}: el perfil recalculado no coincide con el guardado; no se escribe nada.")
    print(f"comprobación: {len(ids)} perfiles recalculados idénticos a los de perfiles_radiales.json")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--comprobar", action="store_true", help="antes de medir, exige reproducir perfiles ya guardados")
    args = ap.parse_args()
    ee.Initialize()
    dem = relieve()
    if args.comprobar:
        comprobar(dem)
    imp = pd.read_csv(DATOS / "impactos_tierra.csv")
    imp = imp[imp.detectado.astype(bool)]                     # los que el detector no encuentra no tienen centro ni diámetro medidos
    sitios = [{"id": c.hid, "nombre": c.nombre, "tierra": tierra_80(dem, c.x, c.y, c.epsg, c.diam_km)} for c in imp.itertuples()]
    salida = DATOS / "perfiles_impactos.json"
    salida.write_text(json.dumps({
        "r": [round(float((a + b) / 2), 3) for a, b in zip(RB[:-1], RB[1:])], "res": {"tierra": R80},
        "fuente": "Copernicus DEM GLO-30 (ESA) llevado a 80 m; centro y diámetro del detector (ciencia_datos/datos/impactos_tierra.csv)",
        "metodo": "analisis/25_perfiles_impactos.py (mismo que analisis/18_perfiles_radiales.py)",
        "sitios": sitios}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    completos = sum(1 for s in sitios if s["tierra"] and all(v is not None for v in s["tierra"]))
    print(f"{salida.relative_to(RAIZ)}: {len(sitios)} cráteres de impacto, {completos} con perfil completo")


if __name__ == "__main__":
    main()
