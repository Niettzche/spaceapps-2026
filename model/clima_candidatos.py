"""Temperatura y aridez de los candidatos áridos con NASA POWER → ciencia_datos/datos/clima_candidatos.csv.

Cubre los criterios del reto "temperaturas extremas" y "aridez" para los cráteres candidatos:
- los 47 de México en zonas áridas (ciencia_datos/datos/crateres_mexico.csv, NDVI p90 < 0.35);
- los áridos de ciencia_datos/datos/global_crateres.csv, sin los que repiten una detección de México a ≤ 1 km
  (el cuadro de Arizona incluye el norte de Sonora y el Pinacate).

Fuente: NASA POWER, API de climatología por punto (v2.10, periodo 2001-2025, comunidad AG), valores anuales (ANN):
  T2M         temperatura media anual del aire a 2 m (°C)
  T2M_RANGE   rango diario medio de la temperatura del aire a 2 m (°C, igual a K en diferencias)
  T2M_MIN     MÍNIMA EXTREMA del periodo (°C): el valor ANN de POWER es el menor de los 12 meses, no una media
  T2M_MAX     MÁXIMA EXTREMA del periodo (°C): el valor ANN de POWER es el mayor de los 12 meses, no una media
  PRECTOTCORR precipitación corregida, media anual (mm/día)
Se agrega amplitud_extrema_c = T2M_MAX − T2M_MIN, la oscilación entre los extremos del año (comprobado el 14 nov 2026:
en MX0000, ANN de T2M_MAX = 49.46 = julio y ANN de T2M_MIN = −4.22 = enero).
Ojo: la resolución nativa de POWER es de 0.5° × 0.625° (MERRA-2), así que candidatos cercanos comparten valores.

Uso:  uv run python -m model.clima_candidatos
"""
from __future__ import annotations

import datetime
import pathlib
import time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd
import requests

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATOS = RAIZ / "ciencia_datos" / "datos"
URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
VARIABLES = ["T2M", "T2M_RANGE", "T2M_MIN", "T2M_MAX", "PRECTOTCORR"]


def km(lat1, lon1, lat2, lon2):
    la1, lo1, la2, lo2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * np.arcsin(np.sqrt(a))


def candidatos() -> pd.DataFrame:
    mx = pd.read_csv(DATOS / "crateres_mexico.csv")
    mx = mx[mx.ndvi_p90 < 0.35][["cid", "lat", "lon"]].rename(columns={"cid": "id"}).assign(region="México")
    g = pd.read_csv(DATOS / "global_crateres.csv")
    g = g[g.arido.astype(bool)]
    h = pd.read_csv(DATOS / "hoyas_mexico.csv")
    dmin = np.array([km(la, lo, h.lat.to_numpy(), h.lon.to_numpy()).min() for la, lo in zip(g.lat, g.lon)])
    g = g[dmin > 1.0][["gid", "lat", "lon", "region"]].rename(columns={"gid": "id"})
    return pd.concat([mx, g], ignore_index=True)


def consultar(lat: float, lon: float, reintentos: int = 3) -> dict:
    params = {"parameters": ",".join(VARIABLES), "community": "AG", "latitude": round(lat, 4), "longitude": round(lon, 4),
              "format": "JSON"}
    for i in range(reintentos):
        try:
            r = requests.get(URL, params=params, timeout=60)
            r.raise_for_status()
            js = r.json()
            fill = js.get("header", {}).get("fill_value", -999.0)
            p = js["properties"]["parameter"]
            return {v.lower(): (None if p[v].get("ANN") in (None, fill) else float(p[v]["ANN"])) for v in VARIABLES} | {"error": None}
        except Exception as e:  # noqa: BLE001
            ultimo = str(e)
            time.sleep(2 * (i + 1))
    return {v.lower(): None for v in VARIABLES} | {"error": ultimo}


def main():
    c = candidatos()
    print(f"Candidatos: {len(c)} (México {int((c.region == 'México').sum())}, otros {int((c.region != 'México').sum())})")
    with ThreadPoolExecutor(4) as ex:
        res = list(ex.map(lambda r: consultar(r[1].lat, r[1].lon), c.iterrows()))
    out = pd.concat([c.reset_index(drop=True), pd.DataFrame(res)], axis=1)
    out["amplitud_extrema_c"] = (out.t2m_max - out.t2m_min).round(2)
    out = out.rename(columns={"t2m": "t2m_media_c", "t2m_range": "t2m_rango_diario_c", "t2m_min": "t2m_min_extrema_c",
                              "t2m_max": "t2m_max_extrema_c", "prectotcorr": "precip_mm_dia"})
    out["fuente"] = "NASA POWER climatología por punto v2.10, 2001-2025 (ANN)"
    out["fecha_consulta"] = datetime.date.today().isoformat()
    out.to_csv(DATOS / "clima_candidatos.csv", index=False)
    print(f"Errores: {out.error.notna().sum()}")
    print(out.groupby("region")[["t2m_media_c", "t2m_rango_diario_c", "t2m_min_extrema_c", "t2m_max_extrema_c", "amplitud_extrema_c",
                                 "precip_mm_dia"]].median().round(2).to_string())
    return out


if __name__ == "__main__":
    main()
