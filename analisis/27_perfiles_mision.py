# 27 · Perfiles reales para las misiones finales (pedido del integrador para el remake del manejo, 15 nov)
#
#   1. Marte: frente del delta de Jezero, por la ruta real de Perseverance (subida de Hawksbill Gap, soles 432 a 477 de la
#      campaña del frente del delta). Ruta: NASA/JPL MMGIS M20_traverse.json. Relieve: Mars 2020 TRN CTX DTM Mosaic a 20 m
#      (Fergason et al. 2020, USGS, doi:10.5066/P906QQT8, CC0). Soles: Williams et al., LPSC 2023 (campaña desde el sol 415;
#      Elkwallow Gap sol 471; Skinner Ridge soles 477–496) y NASA, "Next Stop Hawksbill Gap" (16 may 2022).
#   2. Luna: borde iluminado de Shackleton. Punto: "el lugar más iluminado ... cerca del borde de Shackleton", 88.74°S 124.5°E,
#      86 % del año (Bussey et al. 2010, Icarus 208:558–564, doi:10.1016/j.icarus.2010.03.028; coordenadas del resumen).
#      Relieve: LOLA ldem_875s_20m (NASA LRO, PDS), 20 m. Transecto recto de 4 km a lo largo de la curva de nivel (sigue el
#      borde en vez de caer al cráter); el rumbo sale del plano ajustado al DEM en 1 km alrededor del punto.
#      Alternativa con fuente primaria: Connecting Ridge (Gläser et al. 2014, EPSC2014-136-1), la cresta entre Shackleton y
#      de Gerlache, no el borde de Shackleton.
#
# Superficie: la regla de la Luna y Marte de la celda 21 (roca si pendiente > 20°; si no, arena), tramos de 150 m como en la Tierra.
# --comprobar: antes de medir, reproduce idénticos los perfiles actuales de data/targets (polo_sur_lunar con LOLA 80 m y jezero
# con HRSC+MOLA 200 m, celda 21). Corre en local:
#   uv run --with rasterio --with pyproj --with scipy --with numpy==2.1.3 python analisis/27_perfiles_mision.py --comprobar
# Salida: ciencia_datos/datos/niveles_mision.json. NO escribe data/targets: cambiar el perfil de la misión quita las ventanas
# fijas del juego (game/src/fisica/perfil.js, VENTANAS_JUEGO) con las que se balanceó el camino dorado. Lo decide el equipo.
import argparse
import json
import pathlib
import re
import urllib.request

import numpy as np
from pyproj import Transformer
from scipy.ndimage import map_coordinates

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATOS = RAIZ / "ciencia_datos" / "datos"
SALIDA = DATOS / "niveles_mision.json"
CACHE = pathlib.Path.home() / ".cache" / "marsception"
LOLA = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/"
CTX = ("https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/"
       "JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif")
HRSC = "/vsicurl/https://planetarymaps.usgs.gov/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif"
TRAVERSE = "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json"
WAYPOINTS = "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json"
R_MOON, R_MARS = 1737400.0, 3396190.0
REGLA_LM = "roca si pendiente > 20°; si no, arena (regolito o polvo suelto). Aproximación para el juego: no hay mapa de tipo de suelo a esta escala"
SOL_INI, SOL_FIN = 432, 477          # subida de Hawksbill Gap (waypoints 24_2770 → 26_1004)
BUSSEY = (-88.74, 124.5)
CONNECTING_RIDGE = (-89.4395, 222.8066)   # Gläser et al. 2014, CR1 punto 1


def bajar(url: str) -> pathlib.Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / url.rsplit("/", 1)[1]
    if not f.exists():
        urllib.request.urlretrieve(url, f)
    return f


def tramos(tipos, paso, min_m=150):
    """Igual que en las celdas 21, 23 y 26 (v1)."""
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


def resumen(perfil, paso, fuente_sup, min_m=150):
    p = np.asarray(perfil, float)
    pend = np.degrees(np.arctan(np.abs(np.gradient(p, paso))))
    tipos = ["roca" if x > 20 else "arena" for x in pend]
    return dict(paso_m=paso, perfil_elevacion_m=[round(float(v - p[0]), 1) for v in p], referencia="altura relativa al primer punto (m)",
                superficie_tramos=[dict(t, fuente=fuente_sup, regla=REGLA_LM) for t in tramos(tipos, paso, min_m)],
                resumen_superficie={k: round(tipos.count(k) / len(p) * 100) for k in ("arena", "roca", "compacto")},
                pend_max=round(float(pend.max()), 1), relieve_m=round(float(p.max() - p.min()), 1),
                subida_neta_m=round(float(p[-1] - p[0]), 1))


# ---------- Luna ----------
def lola(nombre):
    lbl = bajar(LOLA + nombre + ".lbl").read_text(errors="replace")
    val = lambda k: re.search(rf"^\s*{k}\s*=\s*([-\d.]+)", lbl, re.M).group(1)
    lines, scale, mapsc = int(val("LINES")), float(val("SCALING_FACTOR")), float(val("MAP_SCALE"))
    src = np.fromfile(bajar(LOLA + nombre + ".img"), dtype="<i2").reshape(lines, lines).astype("float32") * scale
    return src, mapsc, lines * mapsc / 2


CRS_MOON = f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R={R_MOON} +units=m +no_defs"
A_MOON = Transformer.from_crs(f"+proj=longlat +R={R_MOON} +no_defs", CRS_MOON, always_xy=True)


def luna_eje_x(src, mapsc, half, lat, lon, largo_m):
    """nivel_luna de la celda 21: transecto sobre el eje x de la proyección polar."""
    x, y = A_MOON.transform(lon, lat)
    col0, row = (x + half) / mapsc - 0.5, (half - y) / mapsc - 0.5
    n = int(largo_m / mapsc) + 1
    return map_coordinates(src, [np.full(n, row), col0 - (n - 1) / 2 + np.arange(n)], order=1)


def luna_por_curva(src, mapsc, half, lat, lon, largo_m, ventana_m=1000):
    """Transecto recto centrado en el punto, perpendicular a la pendiente media (plano ajustado en `ventana_m`)."""
    x, y = A_MOON.transform(lon, lat)
    c, r = (x + half) / mapsc - 0.5, (half - y) / mapsc - 0.5
    h = int(ventana_m / mapsc / 2)
    ci, ri = int(round(c)), int(round(r))
    w = src[ri - h:ri + h + 1, ci - h:ci + h + 1].astype(float)
    yy, xx = np.mgrid[-h:h + 1, -h:h + 1]
    A = np.column_stack([xx.ravel(), yy.ravel(), np.ones(xx.size)])
    gx, gy, _ = np.linalg.lstsq(A, w.ravel(), rcond=None)[0]        # gradiente en (columna, fila)
    tx, ty = -gy, gx
    nrm = np.hypot(tx, ty); tx, ty = tx / nrm, ty / nrm               # dirección de la curva de nivel, en píxeles
    n = int(largo_m / mapsc) + 1
    s = (np.arange(n) - (n - 1) / 2)
    perfil = map_coordinates(src, [r + s * ty, c + s * tx], order=1)
    rumbo = float(np.degrees(np.arctan2(-ty, tx)) % 360)                 # ángulo desde el eje x de la proyección, antihorario
    pend_media = float(np.degrees(np.arctan(np.hypot(gx, gy) / mapsc)))
    return perfil, rumbo, pend_media, float(src[ri, ci]), float((w < src[ri, ci]).mean() * 100)


# ---------- Marte ----------
def jezero_hrsc():
    """nivel_marte de la celda 21: fila central del recorte de 100 km de la celda 03, 10 km."""
    import rasterio
    from rasterio.transform import from_origin
    from rasterio.vrt import WarpedVRT
    from rasterio.warp import Resampling
    la, lo = 18.44, 77.45
    crs_loc = f"+proj=eqc +lat_ts={la} +lat_0=0 +lon_0={lo} +x_0=0 +y_0=0 +R={R_MARS} +units=m +no_defs"
    ytop = R_MARS * np.radians(la) + 50_000
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        with rasterio.open(HRSC) as ds, WarpedVRT(ds, crs=crs_loc, transform=from_origin(-50_000, ytop, 200, 200), width=500,
                                                  height=500, resampling=Resampling.bilinear) as vrt:
            a = vrt.read(1).astype("float32")
    return a[250, 250 - 25:250 - 25 + 51].astype(float)


def _km(lo1, la1, lo2, la2, R):
    la1, la2, dl = np.radians(la1), np.radians(la2), np.radians(lo2 - lo1)
    a = np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin(dl / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))


def ruta_perseverance(paso=20.0):
    """Ruta de los soles SOL_INI < sol ≤ SOL_FIN (cada sol empieza donde terminó el anterior), remuestreada cada `paso` m."""
    import rasterio
    tr = json.loads(bajar(TRAVERSE).read_text())["features"]
    tramos_sol = sorted((f for f in tr if SOL_INI < f["properties"]["sol"] <= SOL_FIN), key=lambda f: f["properties"]["sol"])
    pts = []
    for f in tramos_sol:
        for lo, la, *_ in f["geometry"]["coordinates"]:
            if not pts or (lo, la) != pts[-1]:
                pts.append((lo, la))
    pts = np.array(pts)
    d = np.concatenate([[0], np.cumsum(_km(pts[:-1, 0], pts[:-1, 1], pts[1:, 0], pts[1:, 1], R_MARS))])
    s = np.arange(0, d[-1] + 1e-6, paso)
    lon, lat = np.interp(s, d, pts[:, 0]), np.interp(s, d, pts[:, 1])
    with rasterio.open(bajar(CTX)) as ds:
        z = ds.read(1).astype(float)
        nod = ds.nodata
        inv = ~ds.transform
        x, y = R_MARS * np.radians(lon), R_MARS * np.radians(lat)           # eqc lat_ts=0 lon_0=0 (la del DTM)
        if "+lat_ts=0" not in ds.crs.to_proj4().replace(" ", " ") and "eqc" not in ds.crs.to_proj4():
            raise SystemExit(f"CRS inesperado del CTX DTM: {ds.crs}")
        col, row = inv * (x, y)
    z = np.where(z < -1e30 if nod is None else z == nod, np.nan, z)
    perfil = map_coordinates(z, [row - 0.5, col - 0.5], order=1, cval=np.nan)
    if np.isnan(perfil).any():
        raise SystemExit("la ruta sale del CTX DTM o cae en sin dato")
    wp = {w["properties"]["sol"]: w["properties"] for w in json.loads(bajar(WAYPOINTS).read_text())["features"]}
    return dict(perfil=perfil, lonlat=(lon, lat), largo_ruta_m=float(d[-1]), soles=[f["properties"]["sol"] for f in tramos_sol],
                wp_ini=wp.get(SOL_INI), wp_fin=wp.get(SOL_FIN))


def comprobar():
    g = {v["id"]: v for v in json.loads((DATOS / "niveles.json").read_text(encoding="utf-8"))}
    targets = {t: json.loads((RAIZ / "data" / "targets" / f"{t}.json").read_text(encoding="utf-8"))["nivel"]["perfil_elevacion_m"]
               for t in ("polo_sur_lunar", "jezero")}
    src, mapsc, half = lola("ldem_80s_80m")
    p = luna_eje_x(src, mapsc, half, *g["polo_sur_lunar"]["centro"], 4000)
    luna = [round(float(v - p[0]), 1) for v in p]
    pm = jezero_hrsc()
    marte = [round(float(v - pm[0]), 1) for v in pm]
    if not (luna == g["polo_sur_lunar"]["perfil_elevacion_m"] == targets["polo_sur_lunar"]):
        raise SystemExit("polo_sur_lunar: el perfil recalculado no coincide con el publicado. No se escribe nada.")
    if not (marte == g["jezero"]["perfil_elevacion_m"] == targets["jezero"]):
        raise SystemExit("jezero: el perfil recalculado no coincide con el publicado. No se escribe nada.")
    print(f"comprobación: polo_sur_lunar ({len(luna)} puntos, LOLA 80 m) y jezero ({len(marte)} puntos, HRSC+MOLA 200 m) idénticos")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--comprobar", action="store_true")
    args = ap.parse_args()
    if args.comprobar:
        comprobar()
    out = []
    # Marte
    r = ruta_perseverance()
    v = resumen(r["perfil"], 20.0, "Mars 2020 TRN CTX DTM Mosaic, 20 m (pendiente)")
    wi, wf = r["wp_ini"], r["wp_fin"]
    v.update(id="jezero_frente_delta", destino="jezero", mundo="marte",
             nombre="Frente del delta de Jezero: subida de Hawksbill Gap por la ruta de Perseverance",
             fuente=(f"Mars 2020 TRN CTX DTM Mosaic, 20 m (Fergason et al. 2020, USGS, doi:10.5066/P906QQT8, CC0), muestreado cada "
                     f"20 m a lo largo de la ruta real de Perseverance, soles {SOL_INI}–{SOL_FIN} (NASA/JPL MMGIS M20_traverse.json); "
                     f"{len(r['perfil'])} puntos sobre {r['largo_ruta_m']:.0f} m de ruta; la distancia es a lo largo de la ruta, no en línea "
                     "recta; altura relativa al primer punto"),
             fuente_ruta=("Williams et al., LPSC 2023 (campaña del frente del delta desde el sol 415; Elkwallow Gap sol 471; Skinner "
                          "Ridge, Rockytop, soles 477–496); NASA, 'Next Stop Hawksbill Gap' (16 may 2022)"),
             soles=r["soles"], inicio=dict(sol=SOL_INI, rmc=wi and wi.get("RMC"), lat=wi and wi.get("lat"), lon=wi and wi.get("lon"),
                                           elev_geoid_m=wi and wi.get("elev_geoid")),
             fin=dict(sol=SOL_FIN, rmc=wf and wf.get("RMC"), lat=wf and wf.get("lat"), lon=wf and wf.get("lon"),
                      elev_geoid_m=wf and wf.get("elev_geoid")),
             control_waypoints_m=None if not (wi and wf) else round(
                 float((r["perfil"][-1] - r["perfil"][0]) - (wf["elev_geoid"] - wi["elev_geoid"])), 1))
    out.append(v)
    # Luna
    src, mapsc, half = lola("ldem_875s_20m")
    for vid, (la, lo), nombre, fuente_pt in (
            ("shackleton_borde_iluminado", BUSSEY, "Borde iluminado de Shackleton (punto más iluminado del polo sur, Bussey et al. 2010)",
             "Bussey et al. 2010, Icarus 208:558–564, doi:10.1016/j.icarus.2010.03.028: 88.74°S 124.5°E, 86 % del año iluminado"),
            ("connecting_ridge", CONNECTING_RIDGE, "Connecting Ridge, entre Shackleton y de Gerlache (Gläser et al. 2014, CR1)",
             "Gläser et al. 2014, EPSC2014-136-1 (Icarus 243:78, doi:10.1016/j.icarus.2014.08.013): CR1 punto 1, 89.4395°S "
             "222.8066°E, 88.1 % de iluminación media a 2 m")):
        p, rumbo, pm_, z0, pct = luna_por_curva(src, mapsc, half, la, lo, 4000)
        v = resumen(p, mapsc, "LOLA ldem_875s_20m (pendiente)")
        v.update(id=vid, destino="polo_sur_lunar", mundo="luna", nombre=nombre, centro=[la, lo], fuente_punto=fuente_pt,
                 fuente=(f"LOLA ldem_875s_20m (NASA LRO, PDS), 20 m; transecto recto de 4000 m centrado en [{la}, {lo}] a lo largo "
                         f"de la curva de nivel (rumbo {rumbo:.0f}° desde el eje x de la proyección estereográfica polar; pendiente "
                         f"media de 1 km alrededor del punto: {pm_:.1f}°); altura relativa al primer punto"),
                 elev_punto_m=round(z0, 1), percentil_local_2km=round(pct, 1))
        out.append(v)
    SALIDA.write_text(json.dumps({"metodo": "analisis/27_perfiles_mision.py", "regla_superficie": REGLA_LM, "niveles": out},
                                 ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for v in out:
        print(f"{v['id']:>28}: {len(v['perfil_elevacion_m'])} pts cada {v['paso_m']} m · relieve {v['relieve_m']} m · subida neta "
              f"{v['subida_neta_m']} m · pend. máx {v['pend_max']}° · {v['resumen_superficie']}"
              + (f" · control con waypoints: {v['control_waypoints_m']} m" if "control_waypoints_m" in v else
                 f" · punto: {v['elev_punto_m']} m, percentil local {v['percentil_local_2km']}"))
    print(f"{SALIDA.relative_to(RAIZ)}: {len(out)} perfiles")


if __name__ == "__main__":
    main()
