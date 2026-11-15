"""Extracción de variables terrestres desde fuentes de la NASA (y la ESA para el relieve).

Nunca se rellenan valores a mano: si una consulta falla, la variable queda en None y el error se reporta.

Fuentes verificadas el 14 nov 2026:
- NASA POWER, climatología por punto (API v2.10, periodo 2001-2025): T2M_RANGE (°C, igual a K en diferencias)
  y PRECTOTCORR (mm/día). Responde en ~0.1 s, sin llave.
- MODIS MOD13Q1 NDVI (250 m, 16 días). Primero el servicio de subconjuntos de ORNL DAAC (media de 2023, pedida en
  3 tramos porque acepta como máximo 10 compuestos por petición); si falla (el 14 nov respondía 503 por
  mantenimiento), Google Earth Engine (colección MODIS/061/MOD13Q1, media 2021-2025).
- Pendiente: Copernicus DEM GLO-30 (ESA) promediado a 200 m, la MISMA resolución con la que se midieron la Luna
  (LOLA) y Marte (HRSC+MOLA) en analisis/02-03. Media de la pendiente en un cuadro de 10 km centrado en el punto.
  Requiere Earth Engine autenticado (`earthengine authenticate`).
"""
from __future__ import annotations

import math
import time
from concurrent.futures import ThreadPoolExecutor

import requests

POWER_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
MODIS_URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
NDVI_PERIODO = ("2021-01-01", "2026-01-01")
BASE_M = 200          # resolución común Tierra-Luna-Marte
CUADRO_M = 10_000     # tamaño del cuadro donde se promedia la pendiente


def nasa_power(lat: float, lon: float, reintentos: int = 2) -> dict:
    """Climatología anual: oscilación térmica (T2M_RANGE) y precipitación (PRECTOTCORR)."""
    params = {"parameters": "T2M_RANGE,PRECTOTCORR", "community": "AG",
              "latitude": round(lat, 4), "longitude": round(lon, 4), "format": "JSON"}
    ultimo = None
    for i in range(reintentos + 1):
        try:
            r = requests.get(POWER_URL, params=params, timeout=40)
            r.raise_for_status()
            js = r.json()
            p = js["properties"]["parameter"]
            periodo = js.get("header", {}).get("range", "climatología NASA POWER")
            fill = js.get("header", {}).get("fill_value", -999.0)
            t, pr = p["T2M_RANGE"].get("ANN"), p["PRECTOTCORR"].get("ANN")
            t = None if t is None or t == fill else float(t)
            pr = None if pr is None or pr == fill else float(pr)
            return {
                "oscilacion_termica": {"valor": t, "unidad": "K", "fuente": "NASA POWER T2M_RANGE (climatología anual)",
                                       "fecha": "2001-2025", "nota": periodo},
                "precipitacion": {"valor": pr, "unidad": "mm/día", "fuente": "NASA POWER PRECTOTCORR (climatología anual)",
                                  "fecha": "2001-2025", "nota": periodo},
            }
        except Exception as e:  # noqa: BLE001
            ultimo = e
            time.sleep(1.5 * (i + 1))
    return {"error": f"NASA POWER: {ultimo}"}


# ORNL DAAC entrega como máximo 10 compuestos de 16 días por petición ("exceeds maximum subset tiles support of 10"):
# el año 2023 (23 compuestos) se pide en 3 tramos en paralelo. Día del año de inicio de cada compuesto: 1, 17, ..., 353.
ORNL_TRAMOS = (("A2023001", "A2023145"), ("A2023161", "A2023305"), ("A2023321", "A2023365"))
NDVI_RELLENO = -3000  # valor de relleno de MOD13Q1 (píxel sin dato); no entra a la media


def _ndvi_ornl_tramo(lat: float, lon: float, inicio: str, fin: str) -> list[float]:
    params = {"latitude": lat, "longitude": lon, "band": "250m_16_days_NDVI",
              "startDate": inicio, "endDate": fin, "kmAboveBelow": 0, "kmLeftRight": 0}
    r = requests.get(MODIS_URL, params=params, headers={"Accept": "application/json"}, timeout=60)
    r.raise_for_status()
    return [d["data"][0] * 0.0001 for d in r.json().get("subset", [])
            if d.get("data") and d["data"][0] is not None and d["data"][0] > NDVI_RELLENO]


def _ndvi_ornl(lat: float, lon: float) -> float | None:
    """Media anual 2023 del píxel de 250 m. Si falla cualquier tramo se lanza el error (no se promedia un año incompleto)."""
    with ThreadPoolExecutor(max_workers=len(ORNL_TRAMOS)) as ex:
        tramos = list(ex.map(lambda t: _ndvi_ornl_tramo(lat, lon, *t), ORNL_TRAMOS))
    vals = [v for tramo in tramos for v in tramo]
    return round(sum(vals) / len(vals), 4) if vals else None


_EE_LISTO = False


def _ee():
    global _EE_LISTO
    import ee
    if not _EE_LISTO:
        ee.Initialize()
        _EE_LISTO = True
    return ee


def _ndvi_ee(lat: float, lon: float) -> float | None:
    ee = _ee()
    col = ee.ImageCollection("MODIS/061/MOD13Q1").filterDate(*NDVI_PERIODO).select("NDVI")
    v = col.mean().multiply(1e-4).reduceRegion(ee.Reducer.first(), ee.Geometry.Point([lon, lat]), 250).get("NDVI").getInfo()
    return None if v is None else round(float(v), 4)


def modis_ndvi(lat: float, lon: float) -> dict:
    """NDVI medio del píxel de 250 m (MOD13Q1). Intenta Earth Engine y, si falla o no hay dato, ORNL DAAC.

    Earth Engine va primero porque responde en segundos; ORNL tarda 36-60 s por tramo y desde el VPS a veces no
    responde, lo que hacía esperar ~60 s cada consulta del Explorador antes de llegar a Earth Engine."""
    errores = []
    try:
        v = _ndvi_ee(lat, lon)
        if v is not None:
            return {"ndvi": {"valor": v, "unidad": "-", "fuente": "MODIS MOD13Q1 (Google Earth Engine, MODIS/061/MOD13Q1)",
                             "fecha": "2021-2025", "nota": "media del píxel de 250 m"}}
    except Exception as e:  # noqa: BLE001
        errores.append(f"Earth Engine: {e}")
    try:
        v = _ndvi_ornl(lat, lon)
        if v is not None:
            return {"ndvi": {"valor": v, "unidad": "-", "fuente": "MODIS MOD13Q1 (ORNL DAAC)", "fecha": "2023",
                             "nota": "media anual del píxel de 250 m"}}
        errores.append("ORNL: sin dato para el píxel")
    except Exception as e:  # noqa: BLE001
        errores.append(f"ORNL: {e}")
    return {"error": "MODIS: " + " | ".join(errores)}


def _utm(lat: float, lon: float) -> str:
    zona = int((lon + 180) // 6) + 1
    return f"EPSG:{32600 + zona if lat >= 0 else 32700 + zona}"


def pendiente(lat: float, lon: float) -> dict:
    """Pendiente media (grados) en un cuadro de 10 km, con el DEM promediado a 200 m."""
    try:
        ee = _ee()
        glo = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").select("DEM")
        crs = _utm(lat, lon)
        dem200 = (glo.mosaic().setDefaultProjection(glo.first().projection())
                  .reduceResolution(ee.Reducer.mean(), maxPixels=256).reproject(crs=crs, scale=BASE_M))
        caja = ee.Geometry.Point([lon, lat]).buffer(CUADRO_M / 2).bounds()
        v = ee.Terrain.slope(dem200).reduceRegion(ee.Reducer.mean(), caja, BASE_M, crs=crs, maxPixels=1e7).get("slope").getInfo()
        if v is None:
            return {"pendiente": {"valor": None, "unidad": "grados", "fuente": "Copernicus DEM GLO-30 a 200 m",
                                  "fecha": None, "nota": "sin datos de elevación en el cuadro (¿mar?)"}}
        return {"pendiente": {"valor": round(float(v), 3), "unidad": "grados",
                              "fuente": "Copernicus DEM GLO-30 (ESA, versión 2024_1) promediado a 200 m, Google Earth Engine",
                              "fecha": None, "nota": "media de la pendiente en un cuadro de 10 km centrado en el punto"}}
    except Exception as e:  # noqa: BLE001
        return {"error": f"Pendiente: {e}"}


def perfil_elevacion(lat: float, lon: float, rumbo_grados: float = 90.0, largo_m: float = 5_000.0,
                     n: int = 120) -> dict:
    """Transecto real del DEM (Copernicus GLO-30, 30 m) centrado en el punto: n elevaciones equiespaciadas."""
    try:
        ee = _ee()
        dem = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").select("DEM").mosaic()
        dlat = largo_m / 2 * math.cos(math.radians(rumbo_grados)) / 111_320
        dlon = largo_m / 2 * math.sin(math.radians(rumbo_grados)) / (111_320 * math.cos(math.radians(lat)))
        pts = [ee.Feature(ee.Geometry.Point([lon - dlon + 2 * dlon * k / (n - 1), lat - dlat + 2 * dlat * k / (n - 1)]), {"k": k})
               for k in range(n)]
        fc = dem.sampleRegions(ee.FeatureCollection(pts), scale=30, geometries=False).getInfo()
        z = {f["properties"]["k"]: f["properties"].get("DEM") for f in fc["features"]}
        perfil = [round(float(z[k]), 1) for k in range(n) if z.get(k) is not None]
        if len(perfil) < n * 0.9:
            return {"error": f"Perfil incompleto ({len(perfil)} de {n} puntos)"}
        return {"perfil_elevacion_m": perfil, "fuente": "Copernicus DEM GLO-30 (ESA), muestreo a 30 m",
                "largo_m": largo_m, "rumbo_grados": rumbo_grados, "paso_m": round(largo_m / (n - 1), 1)}
    except Exception as e:  # noqa: BLE001
        return {"error": f"Perfil: {e}"}


def variables_tierra(lat: float, lon: float) -> dict:
    """Las tres fuentes se consultan en paralelo (cada una tarda de 20 a 40 s); el orden del resultado no cambia."""
    with ThreadPoolExecutor(max_workers=3) as ex:
        resultados = list(ex.map(lambda f: f(lat, lon), (nasa_power, modis_ndvi, pendiente)))
    out, errores = {}, []
    for res in resultados:
        if "error" in res:
            errores.append(res.pop("error"))
        out.update(res)
    return {"variables": out, "errores": errores}
