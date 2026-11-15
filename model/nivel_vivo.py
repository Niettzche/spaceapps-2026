"""Nivel jugable de una coordenada cualquiera, calculado en vivo. Lo usa POST /nivel (api/main.py).

Mismo método y misma regla de superficie (v2) que analisis/26_niveles_15.py, con el que se hicieron los niveles de data/sites:
Copernicus DEM GLO-30 a 30 m, franja de 3 filas (90 m) para la rugosidad, pendiente a lo largo del corte, arena del suelo de
OpenLandMap (250 m) y agua superficial de JRC. Transecto oeste → este (rumbo 90°) centrado en el punto, en la zona UTM local.

Diferencias con ese script (que no se puede importar: es una celda con pyproj y corre en local):
- el centro se proyecta con Earth Engine y no con pyproj, para no agregar una dependencia al servidor;
- siempre usa la zona UTM local (el script usa EPSG:6372 en los sitios de México, así que esos no salen idénticos);
- el punto es el que manda quien consulta, no el centro de un cráter medido por el detector.

`comprobar()` vuelve a calcular niveles publicados en data/sites y exige que salgan idénticos:
    uv run --with earthengine-api --with numpy==2.1.3 python -m model.nivel_vivo
"""
from __future__ import annotations

import functools
import json
import math
import pathlib
import re
import time

import numpy as np

from model import features

RAIZ = pathlib.Path(__file__).resolve().parents[1]
PASO = 30.0                # metros entre puntos del perfil
MIN_TRAMO_M = 150          # un tramo más corto se absorbe en el anterior…
MIN_PARED_M = 90           # …salvo una pared (arena del suelo con pendiente > 15°) de 90 m o más
FUERA_MIN_M = 900          # terreno mínimo entre el borde del cráter y cada orilla del transecto
AGUA_MIN = 50              # % de ocurrencia de agua (JRC Global Surface Water) a partir del cual un punto se marca como agua
LAT_MIN, LAT_MAX = -80.0, 84.0     # límites de las zonas UTM
DIAM_MAX_KM = 10.0         # mayor diámetro que mide el detector
# Regla v2 de analisis/26_niveles_15.py (REGLA_T2), copiada tal cual
REGLA = ("roca si pendiente > 15° (también donde la arena del suelo es ≥ 65 %: paredes de cráter); si no, arena si arena del "
         "suelo ≥ 65 %; si no, roca si rugosidad local (desv. est. en 90 m) > 2 m; si no, compacto. Tramos de menos de 150 m se "
         "absorben en el anterior, salvo las paredes de 90 m o más")
FUENTE_DEM = "Copernicus DEM GLO-30 (ESA, 2024_1), muestreo a 30 m"
FUENTE_SUP = ("Copernicus DEM GLO-30 (rugosidad y pendiente); "
              "OpenLandMap SOL_SAND-WFRACTION v02, 0 cm (arena del suelo, 250 m)")


class SinRelieve(ValueError):
    """El punto no tiene relieve medido (mar, o fuera de la cobertura del DEM)."""


def utm(lat: float, lon: float) -> str:
    zona = min(int((lon + 180) // 6) + 1, 60)
    return f"EPSG:{(32600 if lat >= 0 else 32700) + zona}"


def largo_para(diam_km: float | None) -> int:
    """Largo del transecto (m): 3 km; 4 km si el cráter pasa de 1.2 km; más si hace falta para salir 900 m de cada lado."""
    if diam_km is None:
        return 3000
    largo = 4000 if diam_km > 1.2 else 3000
    if diam_km * 1000 + 2 * FUERA_MIN_M > largo:
        largo = int(math.ceil((diam_km * 1000 + 2 * FUERA_MIN_M) / 1000) * 1000)
    return largo


def tramos(tipos: list[str], paso: float = PASO, min_m: float = MIN_TRAMO_M, min_pared_m: float | None = MIN_PARED_M) -> list[dict]:
    """Igual que `tramos` de analisis/26: junta puntos del mismo tipo; los tramos de menos de min_m se absorben en el anterior."""
    t: list[dict] = []
    for k, ti in enumerate(tipos):
        if t and t[-1]["tipo"] == ti:
            t[-1]["hasta_m"] = round((k + 1) * paso, 1)
        else:
            t.append({"desde_m": round(k * paso, 1), "hasta_m": round((k + 1) * paso, 1), "tipo": ti})
    out: list[dict] = []
    for tr in t:
        corto = tr["hasta_m"] - tr["desde_m"] < min_m
        if corto and min_pared_m is not None and tr["tipo"] == "pared" and tr["hasta_m"] - tr["desde_m"] >= min_pared_m:
            corto = False
        if out and corto:
            out[-1]["hasta_m"] = tr["hasta_m"]
        elif out and out[-1]["tipo"] == tr["tipo"]:
            out[-1]["hasta_m"] = tr["hasta_m"]
        else:
            out.append(tr)
    fin = round((len(tipos) - 1) * paso, 1)
    for tr in out:
        tr["hasta_m"] = min(tr["hasta_m"], fin)
    final: list[dict] = []                      # "pared" es roca: se renombra y se juntan los vecinos de roca
    for tr in out:
        tr["tipo"] = "roca" if tr["tipo"] == "pared" else tr["tipo"]
        if final and final[-1]["tipo"] == tr["tipo"]:
            final[-1]["hasta_m"] = tr["hasta_m"]
        else:
            final.append(tr)
    return final


def clasificar(franja: np.ndarray, arena: np.ndarray, agua: np.ndarray | None = None) -> dict:
    """De la franja de 3 filas del DEM (3 × n) y la arena del suelo (n) al perfil y los tramos. Sin red: es la regla sola."""
    z = np.asarray(franja, float)
    n = z.shape[1]
    perfil = z[1]
    if not np.isfinite(perfil).all() or float(perfil.max() - perfil.min()) == 0.0:
        raise SinRelieve("Ese punto no tiene relieve medido: es mar, un lago grande o queda fuera de la cobertura del DEM.")
    rug = np.array([z[:, max(0, k - 1):k + 2].std() for k in range(n)])
    pend = np.degrees(np.arctan(np.abs(np.gradient(perfil, PASO))))
    arena = np.asarray(arena, float).copy()
    arena[(arena <= 0) | (arena > 100)] = np.nan                         # 0 y 255 = sin dato
    tipos = [("pared" if p > 15 else "arena") if (not np.isnan(s) and s >= 65) else ("roca" if (r > 2 or p > 15) else "compacto")
             for r, p, s in zip(rug, pend, arena)]
    hay = not np.isnan(arena).all()
    v = {"paso_m": PASO, "perfil_elevacion_m": [round(float(x - perfil[0]), 1) for x in perfil],
         "superficie_tramos": tramos(tipos),
         "arena_suelo_y_pendiente_15": int(sum(1 for p, s in zip(pend, arena) if p > 15 and not np.isnan(s) and s >= 65)),
         "resumen_superficie": {k: round([("roca" if t == "pared" else t) for t in tipos].count(k) / n * 100) for k in ("arena", "roca", "compacto")},
         "arena_suelo_pct": round(float(np.nanmean(arena))) if hay else None,
         "arena_min": round(float(np.nanmin(arena))) if hay else None,
         "arena_max": round(float(np.nanmax(arena))) if hay else None,
         "arena_sin_dato": int(np.isnan(arena).sum()), "pend_max": round(float(pend.max()), 1),
         "relieve_m": round(float(perfil.max() - perfil.min()), 1)}
    es = np.asarray(agua, float) >= AGUA_MIN if agua is not None else np.zeros(n, bool)
    v.update(agua_puntos=int(es.sum()),
             agua_desde_m=round(float(np.argmax(es) * PASO)) if es.any() else None,
             agua_hasta_m=round(float((len(es) - 1 - np.argmax(es[::-1])) * PASO)) if es.any() else None)
    return v


def _pixeles(ee, img, x_izq: float, y_arriba: float, ancho: int, alto: int, crs: str, intentos: int = 2) -> dict:
    """Rectángulo de píxeles de Earth Engine como arreglo de numpy (igual que ee_pixels de analisis/26)."""
    malla = {"dimensions": {"width": int(ancho), "height": int(alto)},
             "affineTransform": {"scaleX": PASO, "shearX": 0, "translateX": float(x_izq),
                                 "shearY": 0, "scaleY": -PASO, "translateY": float(y_arriba)},
             "crsCode": crs}
    error = ""
    for k in range(intentos):
        try:
            return ee.data.computePixels({"expression": img, "fileFormat": "NUMPY_NDARRAY", "grid": malla})
        except Exception as e:  # noqa: BLE001
            error = str(e)[:200]
            time.sleep(1.5 * (k + 1))
    raise RuntimeError(error)


def leer_franjas(lat: float, lon: float, largo_m: int, crs: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Las tres lecturas de Earth Engine: franja del DEM (3 × n), arena del suelo (n) y ocurrencia de agua (n)."""
    ee = features._ee()
    glo = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").select("DEM")
    glo30 = glo.mosaic().setDefaultProjection(glo.first().projection()).toFloat()
    arena = ee.Image("OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02").select("b0").rename("arena")
    agua = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").unmask(0).rename("agua")
    x, y = ee.Geometry.Point([lon, lat]).transform(crs, 0.001).coordinates().getInfo()
    n = int(largo_m / PASO) + 1
    z = _pixeles(ee, glo30, x - largo_m / 2, y + PASO * 1.5, n, 3, crs)["DEM"].astype(float)
    s = _pixeles(ee, arena, x - largo_m / 2, y + PASO * 0.5, n, 1, crs)["arena"][0].astype(float)
    w = _pixeles(ee, agua, x - largo_m / 2, y + PASO * 0.5, n, 1, crs)["agua"][0].astype(float)
    return z, s, w


def medir(lat: float, lon: float, largo_m: int, crs: str | None = None) -> dict:
    crs = crs or utm(lat, lon)
    v = clasificar(*leer_franjas(lat, lon, largo_m, crs))
    v.update(centro=[lat, lon], crs=crs, rumbo_deg=90, longitud_m=largo_m)
    return v


def _nivel(v: dict, mundo: str | None) -> dict:
    """Entrada `nivel` con los mismos campos que los de data/sites (model/niveles.py, nivel_sitio)."""
    fuente = (f"{FUENTE_DEM}; transecto de {v['longitud_m']} m, rumbo {v['rumbo_deg']}°, centrado en [{v['centro'][0]}, "
              f"{v['centro'][1]}] (coordenada pedida; proyección {v['crs']}, UTM local); altura relativa al primer punto")
    a, n = v["arena_suelo_pct"], len(v["perfil_elevacion_m"])
    arena = ("Arena del suelo en el corte: sin dato en todos los puntos." if a is None else
             f"Arena del suelo en el corte: {v['arena_min']}–{v['arena_max']} %, media {a} %"
             + (f", {v['arena_sin_dato']} de {n} puntos sin dato (cuentan como no arena)." if v["arena_sin_dato"] else ", sin píxeles sin dato."))
    nota = (f"Superficie: clasificación por reglas, no medición directa. {REGLA}. Fuente: {FUENTE_SUP} (calculado en vivo por "
            f"POST /nivel, model/nivel_vivo.py; mismo método que analisis/26). {arena}")
    if v["arena_suelo_y_pendiente_15"]:
        nota += (f" La pendiente va antes que la arena del suelo, porque OpenLandMap es un mapa modelado a 250 m: aquí son roca "
                 f"{v['arena_suelo_y_pendiente_15']} puntos con arena del suelo ≥ 65 % y pendiente > 15°.")
    if v["agua_puntos"]:
        nota += (f" Agua: {v['agua_puntos']} de {n} puntos, entre {v['agua_desde_m']} y {v['agua_hasta_m']} m, son agua superficial "
                 "(JRC Global Surface Water, ocurrencia ≥ 50 %): el DEM ve la superficie del lago como piso plano y la regla la "
                 "clasifica como suelo. El juego no tiene agua: ese tramo es recreación, no terreno real.")
    if mundo == "luna":
        nota += " En el juego, 'arena' de la Luna representa regolito suelto."
    return {"perfil_elevacion_m": v["perfil_elevacion_m"], "fuente": fuente, "exageracion_vertical": None, "obstaculos": [],
            "paso_m": v["paso_m"],
            "superficies": [{"desde": t["desde_m"], "hasta": t["hasta_m"], "tipo": t["tipo"]} for t in v["superficie_tramos"]],
            "superficies_nota": nota}


@functools.lru_cache(maxsize=256)
def _medir_cache(lat: float, lon: float, largo_m: int) -> str:
    return json.dumps(medir(lat, lon, largo_m), ensure_ascii=False)


def nivel_de_punto(lat: float, lon: float, diam_km: float | None = None, mundo: str | None = None) -> dict:
    """Nivel de una coordenada: {'nivel': …, 'resumen': …}. Lanza SinRelieve si el punto no tiene relieve medido."""
    if not (LAT_MIN <= lat <= LAT_MAX) or not (-180 <= lon <= 180):
        raise ValueError(f"La latitud debe estar entre {LAT_MIN:.0f} y {LAT_MAX:.0f}, y la longitud entre -180 y 180.")
    lat, lon = round(float(lat), 5), round(float(lon), 5)
    v = json.loads(_medir_cache(lat, lon, largo_para(diam_km)))
    avisos = []
    if v["agua_puntos"]:
        avisos.append(f"{v['agua_puntos']} de {len(v['perfil_elevacion_m'])} puntos del corte son agua superficial: ese tramo no es terreno real.")
    if v["relieve_m"] < 5:
        avisos.append(f"El corte es casi plano ({v['relieve_m']} m de relieve).")
    if v["arena_suelo_pct"] is None:
        avisos.append("Sin dato de arena del suelo en el corte: la superficie sale solo de la pendiente y la rugosidad.")
    return {"nivel": _nivel(v, mundo),
            "resumen": {k: v[k] for k in ("longitud_m", "relieve_m", "pend_max", "resumen_superficie", "arena_suelo_pct", "agua_puntos")},
            "avisos": avisos}


def comprobar(ids: tuple[str, ...] = ("meteor_crater", "g00263")) -> None:
    """Recalcula niveles publicados (hechos con analisis/26 en UTM) y exige que perfil y superficies salgan idénticos."""
    for sid in ids:
        pub = json.loads((RAIZ / "data" / "sites" / f"{sid}.json").read_text(encoding="utf-8"))["nivel"]
        m = re.search(r"transecto de (\d+) m, rumbo 90°, centrado en \[([-\d.]+), ([-\d.]+)\].*?proyección (EPSG:\d+)", pub["fuente"])
        largo, lat, lon, crs = int(m.group(1)), float(m.group(2)), float(m.group(3)), m.group(4)
        nuevo = _nivel(medir(lat, lon, largo, crs), None)
        if nuevo["perfil_elevacion_m"] != pub["perfil_elevacion_m"] or nuevo["superficies"] != pub["superficies"]:
            raise SystemExit(f"{sid}: el nivel recalculado no coincide con el publicado; este módulo no mide lo mismo.")
        print(f"comprobación {sid}: {len(nuevo['perfil_elevacion_m'])} puntos y {len(nuevo['superficies'])} tramos idénticos a data/sites")


if __name__ == "__main__":
    comprobar()
