# 26 · Niveles del juego para 11 sitios más: perfil de elevación real + superficie por tramo (arena / roca / compacto)
#
# Mismo método que analisis/21_niveles_juego.py (nivel_tierra) y analisis/23_segundo_sitio_lunar.py (nivel_utm): Copernicus DEM
# GLO-30 a 30 m, franja de 3 filas (90 m) para rugosidad y pendiente, arena del suelo de OpenLandMap (250 m), misma regla y misma
# función `tramos`. Las funciones están copiadas de esas celdas porque aquellas corren en Colab; esta corre en local, como
# analisis/25_perfiles_impactos.py (necesita Earth Engine autenticado: `earthengine authenticate`):
#   uv run --with earthengine-api --with pyproj --with pandas==2.2.3 --with numpy==2.1.3 python analisis/26_niveles_15.py --comprobar
#
# Proyección: los sitios de México usan EPSG:6372 (la de la celda 21, con la que se hicieron samalayuca, pinacate y mx0207); los
# demás, la zona UTM local (la de la celda 23, con la que se hizo g00281). Transecto oeste → este (rumbo 90°) centrado en el centro
# del cráter que midió el detector; 4 km si el diámetro pasa de 1.2 km y 3 km si no (regla de la celda 23), así que cruza el cráter
# entero y sale al terreno de los dos lados (la salida dice cuánto terreno queda fuera del borde de cada lado).
#
# --comprobar: antes de medir, recalcula los niveles de g00281 (celda 23) y mx0207 (celda 21) y exige que perfil y tramos salgan
# idénticos a los de ciencia_datos/datos/niveles.json y data/sites/; si no, este script no mide lo mismo y no escribe nada.
# Salida: ciencia_datos/datos/niveles_15.json (la lee model/niveles.py para escribir data/sites/).
import argparse
import json
import pathlib
import time

import ee
import numpy as np
import pandas as pd
from pyproj import Transformer

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATOS = RAIZ / "ciencia_datos" / "datos"
SALIDA = DATOS / "niveles_15.json"
PASO = 30.0
CRS_MX = "EPSG:6372"
REGLA_T = "arena si arena del suelo ≥ 65 %; si no, roca si rugosidad local (desv. est. en 90 m) > 2 m o pendiente > 15°; si no, compacto"
FUENTE_SUP = ("Copernicus DEM GLO-30 (rugosidad y pendiente); "
              "OpenLandMap SOL_SAND-WFRACTION v02, 0 cm (arena del suelo, 250 m)")

# (id del sitio, grupo, de dónde sale el centro, id del detector, tabla del detector)
SITIOS = [
    ("g00266", "crater_con_fuente", "G00266", "global_crateres.csv"),
    ("g00263", "crater_con_fuente", "G00263", "global_crateres.csv"),
    ("g00176", "crater_con_fuente", "G00176", "global_crateres.csv"),
    ("mx0261", "crater_con_fuente", "MX0261", "crateres_mexico.csv"),
    ("meteor_crater", "impacto", "G00195", "global_crateres.csv"),
    ("tenoumer", "impacto", "I03", "impactos_tierra.csv"),
    ("roter_kamm", "impacto", "I06", "impactos_tierra.csv"),
    ("talemzane", "impacto", "I07", "impactos_tierra.csv"),
    ("mx0023", "tajo", "MX0023", "crateres_mexico.csv"),
    ("mx0019", "tajo", "MX0019", "crateres_mexico.csv"),
    ("mx0155", "tajo", "MX0155", "crateres_mexico.csv"),
]
RESERVA = [("pingualuit", "impacto", "I04", "impactos_tierra.csv")]


def imagenes():
    glo = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").select("DEM")
    glo30 = glo.mosaic().setDefaultProjection(glo.first().projection()).toFloat()
    arena = ee.Image("OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02").select("b0").rename("arena")
    return glo30, arena


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


def tramos(tipos, paso, min_m=150):
    """Igual que en las celdas 21 y 23: junta puntos del mismo tipo; los tramos de menos de min_m se absorben en el anterior."""
    t = []
    for k, ti in enumerate(tipos):
        if t and t[-1]["tipo"] == ti: t[-1]["hasta_m"] = round((k + 1) * paso, 1)
        else: t.append({"desde_m": round(k * paso, 1), "hasta_m": round((k + 1) * paso, 1), "tipo": ti})
    out = []
    for tr in t:
        if out and (tr["hasta_m"] - tr["desde_m"] < min_m): out[-1]["hasta_m"] = tr["hasta_m"]
        elif out and out[-1]["tipo"] == tr["tipo"]: out[-1]["hasta_m"] = tr["hasta_m"]
        else: out.append(tr)
    fin = round((len(tipos) - 1) * paso, 1)
    for tr in out: tr["hasta_m"] = min(tr["hasta_m"], fin)
    return out


def utm(lat, lon):
    zona = int((lon + 180) // 6) + 1
    return f"EPSG:{(32600 if lat >= 0 else 32700) + zona}"


def nivel(imgs, sid, lat, lon, largo_m, crs):
    """nivel_tierra (celda 21) / nivel_utm (celda 23) con la proyección como parámetro."""
    glo30, arena_img = imgs
    x, y = Transformer.from_crs("EPSG:4326", crs, always_xy=True).transform(lon, lat)
    n = int(largo_m / PASO) + 1
    z = ee_pixels(glo30, x - largo_m / 2, y + PASO * 1.5, n, 3, PASO, crs)["DEM"].astype(float)   # franja de 3 filas (90 m)
    perfil = z[1]
    rug = np.array([z[:, max(0, k - 1):k + 2].std() for k in range(n)])
    pend = np.degrees(np.arctan(np.abs(np.gradient(perfil, PASO))))
    arena = ee_pixels(arena_img, x - largo_m / 2, y + PASO * 0.5, n, 1, PASO, crs)["arena"][0].astype(float)
    arena[(arena <= 0) | (arena > 100)] = np.nan                                                       # 0 y 255 = sin dato
    tipos = ["arena" if (not np.isnan(s) and s >= 65) else ("roca" if (r > 2 or p > 15) else "compacto")
             for r, p, s in zip(rug, pend, arena)]
    hay = not np.isnan(arena).all()
    return dict(id=sid, centro=[lat, lon], crs=crs, rumbo_deg=90, longitud_m=largo_m, paso_m=PASO,
                perfil_elevacion_m=[round(float(v - perfil[0]), 1) for v in perfil], referencia="altura relativa al primer punto (m)",
                fuente="Copernicus DEM GLO-30 (ESA, 2024_1), muestreo a 30 m",
                superficie_tramos=[dict(t, fuente=FUENTE_SUP, regla=REGLA_T) for t in tramos(tipos, PASO)],
                resumen_superficie={k: round(tipos.count(k) / n * 100) for k in ("arena", "roca", "compacto")},
                arena_suelo_pct=round(float(np.nanmean(arena))) if hay else None,
                arena_min=round(float(np.nanmin(arena))) if hay else None,
                arena_max=round(float(np.nanmax(arena))) if hay else None,
                arena_sin_dato=int(np.isnan(arena).sum()), pend_max=round(float(pend.max()), 1))


def centro(cid, tabla):
    """Centro y diámetro del cráter según el detector. crateres_mexico.csv guarda la coordenada con todos sus decimales (la que
    usó la celda 21 para mx0207); global_crateres.csv e impactos_tierra.csv, con 4."""
    t = pd.read_csv(DATOS / tabla)
    col = {"global_crateres.csv": "gid", "impactos_tierra.csv": "hid", "crateres_mexico.csv": "cid"}[tabla]
    r = t[t[col] == cid].iloc[0]
    return float(r.lat), float(r.lon), float(r.diam_km)


def medir(imgs, sid, grupo, cid, tabla):
    lat, lon, d = centro(cid, tabla)
    largo = 4000 if d > 1.2 else 3000
    v = nivel(imgs, sid, lat, lon, largo, CRS_MX if tabla == "crateres_mexico.csv" else utm(lat, lon))
    p = np.array(v["perfil_elevacion_m"])
    v.update(grupo=grupo, cid=cid, tabla_detector=f"ciencia_datos/datos/{tabla}", diam_km=round(d, 4),
             terreno_fuera_del_borde_m=round(largo / 2 - d * 1000 / 2),        # de cada lado, entre el borde del detector y la orilla
             relieve_m=round(float(p.max() - p.min()), 1),
             punto_mas_bajo_m=round(float(np.argmin(p) * PASO)))              # ¿cae cerca del centro (largo/2)?
    return v


def comprobar(imgs):
    """Recalcula g00281 (celda 23, UTM) y mx0207 (celda 21, EPSG:6372) y exige que salgan idénticos a lo publicado."""
    guardados = {v["id"]: v for v in json.loads((DATOS / "niveles.json").read_text(encoding="utf-8"))}
    casos = [("g00281", 22.9018, 41.1412, 4000, utm(22.9018, 41.1412)),
             ("mx0207", *centro("MX0207", "crateres_mexico.csv")[:2], 3000, CRS_MX)]
    for sid, la, lo, largo, crs in casos:
        nuevo = nivel(imgs, sid, la, lo, largo, crs)
        g = guardados[sid]
        sitio = json.loads((RAIZ / "data" / "sites" / f"{sid}.json").read_text(encoding="utf-8"))["nivel"]
        claves = lambda ts: [(t["desde_m"], t["hasta_m"], t["tipo"]) for t in ts]
        ok = (nuevo["perfil_elevacion_m"] == g["perfil_elevacion_m"] == sitio["perfil_elevacion_m"]
              and claves(nuevo["superficie_tramos"]) == claves(g["superficie_tramos"])
              == [(t["desde"], t["hasta"], t["tipo"]) for t in sitio["superficies"]]
              and nuevo["resumen_superficie"] == g["resumen_superficie"] and nuevo["arena_suelo_pct"] == g["arena_suelo_pct"])
        if not ok:
            raise SystemExit(f"{sid}: el nivel recalculado no coincide con el publicado; este script no mide lo mismo. No se escribe nada.")
        print(f"comprobación {sid}: {len(nuevo['perfil_elevacion_m'])} puntos y {len(nuevo['superficie_tramos'])} tramos idénticos")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--comprobar", action="store_true", help="antes de medir, exige reproducir g00281 y mx0207")
    ap.add_argument("--reserva", action="store_true", help="mide también la reserva (Pingualuit)")
    args = ap.parse_args()
    ee.Initialize()
    imgs = imagenes()
    if args.comprobar:
        comprobar(imgs)
    lista = SITIOS + (RESERVA if args.reserva else [])
    res = [medir(imgs, *s) for s in lista]
    SALIDA.write_text(json.dumps({
        "metodo": "analisis/26_niveles_15.py (mismo que analisis/21_niveles_juego.py y analisis/23_segundo_sitio_lunar.py)",
        "regla_superficie": REGLA_T, "niveles": res}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for v in res:
        print(f"{v['id']:>14} {v['grupo']:>17} {v['crs']:>10} {v['longitud_m']} m, {len(v['perfil_elevacion_m'])} pts · relieve "
              f"{v['relieve_m']:6.1f} m · pend. máx {v['pend_max']:5.1f}° · {v['resumen_superficie']} · arena del suelo "
              f"{v['arena_min']}–{v['arena_max']} % (sin dato {v['arena_sin_dato']}) · fuera del borde {v['terreno_fuera_del_borde_m']} m · "
              f"más bajo en {v['punto_mas_bajo_m']} m")
    print(f"{SALIDA.relative_to(RAIZ)}: {len(res)} niveles")


if __name__ == "__main__":
    main()
