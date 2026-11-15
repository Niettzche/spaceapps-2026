# 24 · Experimento: ¿Marte sale "plano" (d/D bajo) por el instrumento?
# Pregunta: el d/D mediano de los cráteres es 0.060 en la Luna (LOLA ldem_80s_80m, 80 m, llevado a 200 m) y 0.027 en
# Marte (mosaico HRSC+MOLA de 200 m). MOLA tiene una resolución efectiva de unos 463 m (rejilla de 1/128°), peor
# que su píxel. Si suavizamos LOLA hasta algo parecido y el d/D lunar cae hacia 0.03, la diferencia es instrumental.
#
# Método (corrido en Colab el 14 nov 2026, celdas 24a–24d al final del cuaderno; usa variables de las celdas 00, 03 y 07):
#   1. Se parte del DEM de LOLA a 80 m (`src`, celda 03).
#   2. Se suaviza a 80 m con tres filtros (declarados abajo en VARIANTES):
#        caja_480m       promedio móvil de 6 x 6 píxeles (480 m)
#        gauss_fwhm463   gaussiano con anchura a media altura de 463 m (sigma = 463 / 2.3548 / 80 = 2.46 px)
#        gauss_sigma463  caso extremo: gaussiano con sigma = 463 m (5.8 px); más suave que MOLA, es una cota
#   3. Se lleva a 200 m con el mismo promedio (Resampling.average) que la celda 03.
#   4. Se corre el mismo detector (`detectar`, celda 07) y el mismo filtro de cráter (0.6–10 km, >= 20 m, circ >= 0.6),
#      solo al sur de 80.5° S, como en la celda 07.
#
# Resultado (d/D mediano y número de cráteres; Marte = 3 sitios de la celda 07: Jezero, Gale, Oxia Planum, n = 284):
#
#   Polo sur (85–90° S)     D >= 0.6 km        D >= 1 km         D >= 2 km         D >= 3 km
#   sin suavizar            0.0581 (1056)      0.0638 (503)      0.0588 (184)      0.0550 (107)
#   caja_480m               0.0464 (909)       0.0537 (510)      0.0504 (192)      0.0465 (114)
#   gauss_fwhm463           0.0427 (737)       0.0487 (486)      0.0513 (188)      0.0470 (112)
#   gauss_sigma463          0.0301 (325)       0.0302 (312)      0.0362 (181)      0.0369 (116)
#   Todo 80.5–90° S, sin suavizar   0.0598 (4288)   0.0688 (2145)  0.0673 (788)  0.0650 (441)
#   Todo 80.5–90° S, gauss_fwhm463  0.0452 (3084)   0.0532 (2045)  0.0576 (823)  0.0506 (476)
#   Marte (HRSC+MOLA)       0.0268 (284)       0.0213 (177)      0.0186 (53)       0.0331 (20)
#
#   Mismos cráteres (emparejados por posición), razón d/D suavizado / original, gauss_fwhm463:
#     0.6–1 km 0.577 · 1–2 km 0.749 · 2–3 km 0.888 · 3–5 km 0.929 · 5–10 km 0.962
#
# Conclusión: con un suavizado tipo MOLA (FWHM 463 m) el d/D lunar del polo sur baja de 0.058 a 0.043 con todos los
# tamaños: el instrumento explica cerca de la mitad de la brecha Luna–Marte (0.058 → 0.027) en cráteres chicos, que
# son los que más se aplanan. Para D >= 2 km la caída es pequeña (0.059 → 0.051) y Marte sigue en 0.019: ahí la
# diferencia no es instrumental. Solo el caso extremo (sigma = 463 m, más suave que MOLA) lleva la Luna a ~0.03.
# Ojo: el mosaico de Marte mezcla HRSC (50–100 m) donde hay cobertura, así que su resolución real puede ser mejor que
# 463 m; este experimento es por eso una cota alta del efecto instrumental.

import time
from scipy import ndimage as ndi
from scipy.spatial import cKDTree

# ---------- 24b · suavizado + detector ----------
src_ok = np.where(np.isfinite(src), src, np.nanmean(src)).astype("float32")

def a200(dem80):
    out = np.zeros((n200, n200), "float32")
    reproject(dem80, out, src_transform=from_origin(-half, half, MAPSC, MAPSC), src_crs=crs_moon,
              dst_transform=from_origin(-half, half, BASE, BASE), dst_crs=crs_moon, resampling=Resampling.average)
    return out

to_ll_moon = Transformer.from_crs(crs_moon, f"+proj=longlat +R={R_MOON} +no_defs", always_xy=True)

def correr(dem200, etiqueta):
    t0 = time.time(); d = detectar(dem200)
    d["lon"], d["lat"] = to_ll_moon.transform((-half + (d.j + 0.5) * BASE).values, (half - (d.i + 0.5) * BASE).values)
    d = d[d.lat <= -80.5].copy(); d["sitio"] = np.where(d.lat <= -85, "Polo sur (85-90°S)", "Anillo 80-85°S")
    d["crater"] = tipo_crater(d); d["variante"] = etiqueta
    print(etiqueta, f"{time.time()-t0:.0f} s", d.crater.sum()); return d

VARIANTES = {
    "caja_480m": lambda a: ndi.uniform_filter(a, size=6, mode="nearest"),
    "gauss_fwhm463": lambda a: ndi.gaussian_filter(a, sigma=463 / 2.3548 / MAPSC, mode="nearest"),
    "gauss_sigma463": lambda a: ndi.gaussian_filter(a, sigma=463 / MAPSC, mode="nearest"),
}
exp24 = [correr(moon200, "sin_suavizar")]
for k, f in VARIANTES.items():
    exp24.append(correr(a200(f(src_ok)), k))
exp24 = pd.concat(exp24, ignore_index=True)

# ---------- 24d · resumen ----------
c = exp24[exp24.crater]
mar = hoyas_ref[(hoyas_ref.cuerpo == "Marte") & hoyas_ref.crater].assign(variante="MARTE (HRSC+MOLA)", sitio="3 sitios")
todo = pd.concat([c, mar], ignore_index=True)
for corte in [0.6, 1.0, 2.0, 3.0]:
    s = todo[todo.diam_km >= corte]
    print(f"\n== D >= {corte} km ==")
    print(s.groupby(["variante", "sitio"]).agg(n=("prof_diam", "size"), dD_med=("prof_diam", "median"),
                                               diam_med=("diam_km", "median"), prof_med=("prof_m", "median")).round(4).to_string())
    print(s.groupby("variante").prof_diam.agg(["size", "median"]).round(4).to_string())
b = c[c.variante == "sin_suavizar"]
for k in VARIANTES:
    v = c[c.variante == k]; dist, idx = cKDTree(v[["i", "j"]].values).query(b[["i", "j"]].values)
    ok = dist < (b.diam_km.values * 1000 / BASE / 2)
    pares = pd.DataFrame({"D0": b.diam_km.values[ok], "r": v.prof_diam.values[idx[ok]] / b.prof_diam.values[ok]})
    print(f"\n{k}: emparejados {ok.sum()} de {len(b)}; razón d/D mediana {pares.r.median():.3f}")
    print(pares.groupby(pd.cut(pares.D0, [0.6, 1, 2, 3, 5, 10]), observed=False).r.agg(["size", "median"]).round(3).to_string())
