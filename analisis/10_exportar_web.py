# 10 · Exportar los datos para la página web: cráteres, gemelos lunares, imágenes de relieve y juego
import json, shutil
from PIL import Image
WEB = "/content/web_data"; shutil.rmtree(WEB, ignore_errors=True); os.makedirs(f"{WEB}/img", exist_ok=True)
P = 32   # medio lado del recorte: 64 px = 12.8 km

# --- Minas: OpenStreetMap (si responde) + identificación por coordenadas (por verificar) ---
MINAS = {"Peñasquito (Zac.)": (24.649, -101.673), "Real de Ángeles (Zac.)": (22.414, -101.911), "La Herradura (Son.)": (31.147, -112.863),
         "Hércules (Coah.)": (28.046, -103.782), "Cananea (Son.)": (30.953, -110.320)}
osm_ok = False
for url in ("https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"):
    try:
        q = '[out:json][timeout:180];(way["landuse"="quarry"](14,-118.5,33,-86);relation["landuse"="quarry"](14,-118.5,33,-86););out center;'
        r = requests.post(url, data={"data": q}, headers={"User-Agent": "analog-research-notebook/1.0"}, timeout=240)
        qll = np.array([(e["center"]["lon"], e["center"]["lat"]) for e in r.json()["elements"] if "center" in e])
        qx, qy = to_xy.transform(qll[:, 0], qll[:, 1])
        c["km_mina"] = (cKDTree(np.c_[qx, qy]).query(c[["x", "y"]].values)[0] / 1000).round(1)
        osm_ok = True; print(f"OpenStreetMap: {len(qll)} canteras/minas; cráteres a menos de 2 km: {int((c.km_mina <= 2).sum())}"); break
    except Exception as e:
        print("OSM falló en", url.split('/')[2], "->", str(e)[:80])
mx_, my_ = to_xy.transform([v[1] for v in MINAS.values()], [v[0] for v in MINAS.values()])
dman, iman = cKDTree(np.c_[mx_, my_]).query(c[["x", "y"]].values)
c["nombre"] = ""
c.loc[dman <= 2500, "nombre"] = np.array(list(MINAS))[iman[dman <= 2500]]
c["mina"] = (dman <= 2500) | ((c.km_mina <= 2.0) if osm_ok else False)
dk, ik = cKDTree(np.c_[kx, ky]).query(c[["x", "y"]].values)
c.loc[dk <= 2500, "nombre"] = np.array(list(CONOCIDOS))[ik[dk <= 2500]]
c["tipo"] = np.where(c.mina, "mina", np.where(c.borde_m >= 10, "con_borde", "sin_borde"))
c["cid"] = ["MX%04d" % i for i in range(len(c))]
print("Tipos:", c.tipo.value_counts().to_dict(), "| con nombre:", int((c.nombre != "").sum()))

# --- Imágenes: relieve sombreado en gris, misma luz y mismo tratamiento para los tres cuerpos ---
def sombreado(dem, az=315.0, alt=35.0):
    gy, gx = np.gradient(dem.astype("float64"), BASE)
    slope = np.pi / 2 - np.arctan(np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
    a, h = np.radians(360 - az + 90), np.radians(alt)
    sh = np.sin(h) * np.sin(slope) + np.cos(h) * np.cos(slope) * np.cos(a - aspect)
    lo, hi = np.percentile(sh, [2, 98])
    return np.clip((sh - lo) / max(hi - lo, 1e-6), 0, 1)
def guardar(dem, nombre):
    Image.fromarray((sombreado(dem) * 255).astype("uint8")).resize((320, 320), Image.LANCZOS).save(f"{WEB}/img/{nombre}.png", optimize=True)
def recorte(arr, i, j):
    i, j = int(round(i)), int(round(j))
    if i - P < 0 or j - P < 0 or i + P > arr.shape[0] or j + P > arr.shape[1]:
        return None
    return arr[i - P:i + P, j - P:j + P]
def recorte_mx(r):
    arr, xl, yt = dem_bloques[(int(r.br), int(r.bc))]
    return recorte(arr, r.i, r.j)

# --- Fichas: cráteres con nombre + los de borde levantado + minas; cada uno con su gemelo lunar ---
sel = c[(c.nombre != "") | (c.tipo == "con_borde") | c.mina].copy()
fichas = []
for r in sel.itertuples():
    p = recorte_mx(r)
    g = L.iloc[tl.query([[np.log(r.diam_km), np.log(r.prof_m)]])[1][0]]
    pg = recorte(moon200, g.i, g.j)
    if p is None or pg is None:
        continue
    guardar(p, r.cid); guardar(pg, r.cid + "_luna")
    fichas.append({"id": r.cid, "nombre": r.nombre, "tipo": r.tipo, "lat": round(r.lat, 4), "lon": round(r.lon, 4), "diam_km": round(r.diam_km, 2),
                   "prof_m": round(r.prof_m), "prof_diam": round(r.prof_diam, 3), "circ": round(r.circ, 2), "borde_m": round(r.borde_m),
                   "ndvi": None if pd.isna(r.ndvi_p90) else round(r.ndvi_p90, 2), "albedo": None if pd.isna(r.albedo) else round(r.albedo, 3),
                   "pct_lunar": round(r.pct_lunar_prof_diam), "conocido": bool(r.conocido), "km_pinacate": int(r.km_pinacate),
                   "gemelo": {"lat": round(float(g.lat), 3), "lon": round(float(g.lon), 3), "diam_km": round(float(g.diam_km), 2), "prof_m": round(float(g.prof_m))}})
json.dump(fichas, open(f"{WEB}/fichas.json", "w"), ensure_ascii=False)

# --- Mapa: todos los cráteres detectados, ligeros ---
todos = [{"id": r.cid, "lat": round(r.lat, 4), "lon": round(r.lon, 4), "d": round(r.diam_km, 2), "p": round(r.prof_m), "t": r.tipo, "n": r.nombre} for r in c.itertuples()]
json.dump(todos, open(f"{WEB}/crateres.json", "w"), ensure_ascii=False)

# --- Referencia: poblaciones de cráteres en la Luna y Marte, y resumen por cuadros ---
R = hoyas_ref[hoyas_ref.crater]
refj = {"luna_polo": R[R.sitio == "Polo sur (85-90°S)"][["diam_km", "prof_m"]].round(2).values.tolist(),
        "marte": {s: R[R.sitio == s][["diam_km", "prof_m"]].round(2).values.tolist() for s in SITIOS_MARTE},
        "mexico": c[["diam_km", "prof_m"]].round(2).values.tolist(),
        "resumen": json.loads(res.round(3).reset_index().to_json(orient="records")),
        "terreno": json.loads(tabla.round(2).reset_index().to_json(orient="records")),
        "validacion": json.loads(val.to_json(orient="records"))}
json.dump(refj, open(f"{WEB}/referencia.json", "w"), ensure_ascii=False)

# --- Marte: llanuras mexicanas frente a Oxia Planum (puntaje por cuadros) ---
ll = cand.nsmallest(25, "f_oxia")[["cell_id", "lat", "lon", "slope_p50", "slope_p90", "relieve", "dep_n", "ndvi_p90", "f_desnudo", "f_oxia"]].round(3)
json.dump(json.loads(ll.to_json(orient="records")), open(f"{WEB}/marte_llanuras.json", "w"), ensure_ascii=False)

# --- Juego: recortes de cráteres de los tres cuerpos ---
rng = np.random.default_rng(7); juego = []
def add(dem, cuerpo, k, **info):
    if dem is None: return
    guardar(dem, f"j_{cuerpo}_{k}"); juego.append(dict(img=f"j_{cuerpo}_{k}.png", cuerpo=cuerpo, **info))
lsel = L[(L.sitio == "Polo sur (85-90°S)") & L.diam_km.between(0.8, 3) & (L.prof_m >= 40)]
for k, r in enumerate(lsel.sample(min(24, len(lsel)), random_state=7).itertuples()):
    add(recorte(moon200, r.i, r.j), "luna", k, lugar="Polo sur lunar", lat=round(r.lat, 2), lon=round(r.lon, 2), diam_km=round(r.diam_km, 2), prof_m=round(r.prof_m))
for s in SITIOS_MARTE:
    ms = R[(R.sitio == s) & R.diam_km.between(0.8, 3)]
    for k, r in enumerate(ms.sample(min(8, len(ms)), random_state=7).itertuples()):
        add(recorte(dem_marte[s], r.i, r.j), "marte", f"{s[:3]}{k}", lugar=s, diam_km=round(r.diam_km, 2), prof_m=round(r.prof_m))
tierra = pd.concat([c[c.nombre != ""], c[(c.tipo == "sin_borde") & (c.nombre == "")].nlargest(10, "prof_m"), c[(c.tipo == "con_borde") & (c.nombre == "")].nlargest(6, "prof_m")]).drop_duplicates("cid")
for r in tierra.itertuples():
    add(recorte_mx(r), "tierra", r.cid, lugar=r.nombre or "México", tipo=r.tipo, lat=round(r.lat, 3), lon=round(r.lon, 3), diam_km=round(r.diam_km, 2), prof_m=round(r.prof_m))
json.dump(juego, open(f"{WEB}/juego.json", "w"), ensure_ascii=False)

# --- Tablas y código, y zip final ---
for f in ("crateres_mexico.csv", "hoyas_referencia.csv", "candidatos_mexico_10km.csv", "referencias_luna_marte_10km.csv"):
    c.to_csv(f"{OUT}/crateres_mexico.csv", index=False)
    if os.path.exists(f"{OUT}/{f}"): shutil.copy(f"{OUT}/{f}", f"{WEB}/{f}")
get_ipython().run_line_magic("history", f"-f {WEB}/codigo_sesion.py")
z = shutil.make_archive("/content/web_data", "zip", WEB)
print(f"Fichas: {len(fichas)} | cráteres en el mapa: {len(todos)} | rondas de juego: {pd.Series([j['cuerpo'] for j in juego]).value_counts().to_dict()}")
print(f"Zip: {z} ({os.path.getsize(z)/1e6:.1f} MB), {len(os.listdir(WEB + '/img'))} imágenes")
print(pd.DataFrame(fichas)[["id", "nombre", "tipo", "lat", "lon", "diam_km", "prof_m", "prof_diam", "borde_m", "ndvi", "pct_lunar"]][lambda d: d.nombre != ""].to_string(index=False))