# 23 · Segundo sitio lunar jugable: perfil de elevación + superficie por tramo para candidatos naturales lunares
# Misma regla que la celda 21 (analisis/21_niveles_juego.py), con dos cambios:
#   1. Proyección UTM local por sitio (EPSG:6372, la de la celda 21, solo sirve para México).
#   2. OpenLandMap codifica "sin dato" como 255: solo se aceptan valores de 0 a 100 %. (Revisado: en los niveles de la celda 21,
#      samalayuca, pinacate y mx0207, no hay ningún píxel sin dato, así que no cambian.)
# Se corrió el 2026-11-14 en Colab para 14 candidatos naturales (etiqueta de IA crater_volcanico/crater_impacto, confianza ≥ 0.7).
# Elegido: G00281 (Harrat Kishb, Arabia; P(Luna) 0.65, dentro de la nube Luna+Marte, perfil más parecido a su gemelo lunar
# entre los de buena etiqueta, y con tramos de arena y de roca reales). Resultado en ciencia_datos/datos/niveles.json y data/sites/g00281.json.
# Requiere la celda 00 (ee_pixels) y Earth Engine autenticado.
import json
import numpy as np, ee
from pyproj import Transformer

glo30 = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").select("DEM").mosaic().setDefaultProjection(
    ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").first().projection()).toFloat()
arena_img = ee.Image("OpenLandMap/SOL/SOL_SAND-WFRACTION_USDA-3A1A1A_M/v02").select("b0").rename("arena")
REGLA_T = "arena si arena del suelo ≥ 65 %; si no, roca si rugosidad local (desv. est. en 90 m) > 2 m o pendiente > 15°; si no, compacto"


def tramos(tipos, paso, min_m=150):
    """Igual que en la celda 21: junta puntos del mismo tipo; los tramos de menos de min_m se absorben en el anterior."""
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


def nivel_utm(cid, lat, lon, largo_m):
    zona = int((lon + 180) // 6) + 1
    epsg = f"EPSG:{(32600 if lat >= 0 else 32700) + zona}"
    x, y = Transformer.from_crs("EPSG:4326", epsg, always_xy=True).transform(lon, lat)
    paso = 30.0; n = int(largo_m / paso) + 1
    z = ee_pixels(glo30, x - largo_m / 2, y + paso * 1.5, n, 3, paso, crs=epsg)["DEM"].astype(float)   # franja de 3 filas (90 m)
    perfil = z[1]
    rug = np.array([z[:, max(0, k - 1):k + 2].std() for k in range(n)])
    pend = np.degrees(np.arctan(np.abs(np.gradient(perfil, paso))))
    arena = ee_pixels(arena_img, x - largo_m / 2, y + paso * 0.5, n, 1, paso, crs=epsg)["arena"][0].astype(float)
    arena[(arena <= 0) | (arena > 100)] = np.nan                                                       # 0 y 255 = sin dato
    tipos = ["arena" if (not np.isnan(s) and s >= 65) else ("roca" if (r > 2 or p > 15) else "compacto") for r, p, s in zip(rug, pend, arena)]
    return dict(id=cid, crs=epsg, paso_m=paso, longitud_m=largo_m, perfil=[round(float(v - perfil[0]), 1) for v in perfil],
                tramos=tramos(tipos, paso), resumen={k: round(tipos.count(k) / n * 100) for k in ("arena", "roca", "compacto")},
                arena_media=None if np.isnan(arena).all() else round(float(np.nanmean(arena))),
                arena_min=None if np.isnan(arena).all() else round(float(np.nanmin(arena))),
                arena_max=None if np.isnan(arena).all() else round(float(np.nanmax(arena))),
                sin_dato=int(np.isnan(arena).sum()), pend_max=round(float(pend.max()), 1))


# Candidatos naturales lunares (ciencia_datos/salidas/fichas_integradas.csv: etiqueta de IA natural con confianza ≥ 0.7), con diámetro en km
CANDS = [("G00281", 22.9018, 41.1412, 2.188), ("MX0009", 31.9837, -113.4465, 0.984), ("MX0007", 31.9759, -113.6271, 1.596),
         ("G00282", 23.2147, 41.4067, 0.903), ("G00195", 35.0275, -111.0226, 1.082), ("G00263", 26.9888, 42.2465, 1.296),
         ("MX0010", 31.9403, -113.5695, 0.903), ("G00176", 35.5447, -111.6365, 0.749), ("G00041", -22.4423, -67.8902, 0.714),
         ("MX0261", 20.4316, -101.2492, 1.373), ("MX0012", 31.9176, -113.3009, 0.638), ("G00037", -22.8498, -67.8326, 0.931),
         ("G00266", 25.6608, 39.9348, 1.034), ("MX0008", 31.8459, -113.3925, 1.445)]
RES = []
for cid, la, lo, d in CANDS:
    v = nivel_utm(cid.lower(), la, lo, 4000 if d > 1.2 else 3000); RES.append(v); p = v["perfil"]
    print(f"{cid}: relieve {max(p)-min(p):5.0f} m · {v['resumen']} · arena del suelo {v['arena_min']}–{v['arena_max']} % (sin dato: {v['sin_dato']}) · "
          + " | ".join(f"{t['desde_m']:.0f}-{t['hasta_m']:.0f} {t['tipo']}" for t in v["tramos"]))
json.dump(RES, open("/content/niveles_23.json", "w"), ensure_ascii=False, indent=1)
