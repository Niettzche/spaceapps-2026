"""Extracción de variables terrestres desde fuentes de la NASA.

TODO(frente modelo): verificar cada endpoint, parámetros y unidades antes de usarlos en el juego.
Nunca rellenes valores a mano sin fuente: si falla una consulta, devuelve None.
"""
from __future__ import annotations
import requests

POWER_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"   # VERIFICAR
MODIS_URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"               # VERIFICAR (ORNL DAAC)


def nasa_power(lat: float, lon: float) -> dict:
    """Climatología anual: oscilación térmica (T2M_RANGE, °C ≈ K) y precipitación (PRECTOTCORR, mm/día)."""
    params = {"parameters": "T2M_RANGE,PRECTOTCORR", "community": "AG",
              "latitude": lat, "longitude": lon, "format": "JSON"}
    try:
        r = requests.get(POWER_URL, params=params, timeout=30)
        r.raise_for_status()
        p = r.json()["properties"]["parameter"]
        return {
            "oscilacion_termica": {"valor": p["T2M_RANGE"].get("ANN"), "unidad": "K", "fuente": "NASA POWER T2M_RANGE (climatología)"},
            "precipitacion": {"valor": p["PRECTOTCORR"].get("ANN"), "unidad": "mm/día", "fuente": "NASA POWER PRECTOTCORR (climatología)"},
        }
    except Exception as e:  # noqa: BLE001
        return {"error": f"NASA POWER: {e}"}


def modis_ndvi(lat: float, lon: float, start: str = "A2023001", end: str = "A2023365") -> dict:
    """NDVI medio anual del píxel (MOD13Q1, factor de escala 0.0001). VERIFICAR formato de respuesta."""
    params = {"latitude": lat, "longitude": lon, "band": "250m_16_days_NDVI",
              "startDate": start, "endDate": end, "kmAboveBelow": 0, "kmLeftRight": 0}
    try:
        r = requests.get(MODIS_URL, params=params, headers={"Accept": "application/json"}, timeout=60)
        r.raise_for_status()
        vals = [d["data"][0] * 0.0001 for d in r.json().get("subset", []) if d.get("data")]
        valor = round(sum(vals) / len(vals), 4) if vals else None
        return {"ndvi": {"valor": valor, "unidad": "-", "fuente": f"MODIS MOD13Q1 ({start}–{end})"}}
    except Exception as e:  # noqa: BLE001
        return {"error": f"MODIS: {e}"}


def pendiente(lat: float, lon: float) -> dict:
    """TODO: pendiente/rugosidad desde SRTM o Copernicus DEM (ventana alrededor del punto)."""
    return {"pendiente": {"valor": None, "unidad": "grados", "fuente": "SRTM (PENDIENTE de implementar)"}}


def variables_tierra(lat: float, lon: float) -> dict:
    out, errores = {}, []
    for f in (nasa_power, modis_ndvi, pendiente):
        res = f(lat, lon)
        if "error" in res:
            errores.append(res.pop("error"))
        out.update(res)
    return {"variables": out, "errores": errores}
