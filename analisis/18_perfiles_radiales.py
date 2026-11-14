# 18 · Perfiles promedio (corte radial) de cada candidato y de sus gemelos, para ver en qué zona del cráter se parecen
# Tierra (Copernicus) y Luna (LOLA nativo) a 80 m; Marte a 200 m (es la resolución del mosaico HRSC+MOLA).
# Altura relativa al terreno de alrededor (1.6–2.0 R), dividida entre el diámetro: así se compara forma, no tamaño.
RB = np.linspace(0, 2.0, 13)          # r/R en 12 anillos: fondo 0–0.3, pared 0.3–0.9, borde 0.9–1.2, alrededor 1.2–2
R80 = 80

def perfil_desde(dem, cx, cy, R):
    """dem en una malla regular; (cx, cy) centro en píxeles; R radio en píxeles. Recentra en el punto más bajo cerca del centro."""
    if dem is None: return None
    yy, xx = np.mgrid[0:dem.shape[0], 0:dem.shape[1]]
    cerca = np.hypot(yy - cy, xx - cx) <= max(0.5 * R, 1.5)
    if cerca.any():
        k = np.argmin(np.where(cerca, dem, np.inf)); cy, cx = np.unravel_index(k, dem.shape)
    rr = np.hypot(yy - cy, xx - cx) / R
    prof = np.array([dem[(rr >= a) & (rr < b)].mean() if ((rr >= a) & (rr < b)).any() else np.nan for a, b in zip(RB[:-1], RB[1:])])
    fuera = np.nanmean(prof[(RB[:-1] >= 1.6)])
    if np.isnan(fuera): return None
    return prof, fuera

def normaliza(res, diam_km):
    if res is None: return None
    prof, fuera = res
    return [None if np.isnan(v) else round(float((v - fuera) / (diam_km * 1000)), 4) for v in prof]

def tierra_80(cv):
    R = cv["d"] * 1000 / 2 / R80
    h = int(np.ceil(2.2 * R)) + 2
    if cv["fuente"] == "mx":
        x, y = to_xy.transform(cv["lon"], cv["lat"]); crs = CRS
    else:
        x, y = cv["x"], cv["y"]; crs = f"EPSG:{cv['epsg']}"
    a = ee_pixels(dem_ee, x - h * R80, y + h * R80, 2 * h, 2 * h, R80, crs=crs)["dem"]
    return normaliza(perfil_desde(a, h, h, R), cv["d"])

def luna_80(g):
    x = -half + (g.j + 0.5) * BASE; y = half - (g.i + 0.5) * BASE      # centro en metros (estereográfica polar)
    col, row = (x + half) / MAPSC - 0.5, (half - y) / MAPSC - 0.5
    R = g.diam_km * 1000 / 2 / MAPSC; h = int(np.ceil(2.2 * R)) + 2
    r0, c0 = int(round(row)) - h, int(round(col)) - h
    if r0 < 0 or c0 < 0 or r0 + 2 * h > src.shape[0] or c0 + 2 * h > src.shape[1]: return None
    a = src[r0:r0 + 2 * h, c0:c0 + 2 * h]
    return normaliza(perfil_desde(a, row - r0, col - c0, R), float(g.diam_km))

def marte_200(m):
    a = recorte(dem_marte[m.sitio], m.i, m.j)
    if a is None: return None
    R = m.diam_km * 1000 / 2 / BASE
    return normaliza(perfil_desde(a, P - 0.5, P - 0.5, R), float(m.diam_km))

def hacer_perfil(cv):
    out = {"id": cv["id"]}
    try: out["tierra"] = tierra_80(cv)
    except Exception as e: out["tierra"] = None; out["err"] = str(e)[:80]
    g = L.iloc[tl.query([[np.log(cv["d"]), np.log(cv["p"])]])[1][0]]
    out["luna"] = luna_80(g)
    m = Mm.iloc[tm.query([[np.log(cv["d"]), np.log(cv["p"])]])[1][0]]
    out["marte"] = marte_200(m)
    return out

t0 = time.time()
with ThreadPoolExecutor(8) as ex: perfiles_v = list(ex.map(hacer_perfil, cand_v))
json.dump({"r": [round(float((a + b) / 2), 3) for a, b in zip(RB[:-1], RB[1:])], "res": {"tierra": 80, "luna": 80, "marte": 200}, "sitios": perfiles_v},
          open("/content/perfiles_vis.json", "w"), ensure_ascii=False)
ok = lambda k: sum(1 for r in perfiles_v if r.get(k))
llenos = lambda k: sum(1 for r in perfiles_v if r.get(k) and all(v is not None for v in r[k]))
print(f"perfiles: tierra {ok('tierra')} ({llenos('tierra')} completos) · luna {ok('luna')} ({llenos('luna')}) · marte {ok('marte')} ({llenos('marte')}) de {len(perfiles_v)} · {time.time()-t0:.0f} s")
from google.colab import files
files.download("/content/perfiles_vis.json")
