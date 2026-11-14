# 11 · Imágenes para el informe de validación: relieve + satélite de cráteres conocidos y de una muestra al azar
import json, shutil, io, requests
from PIL import Image, ImageDraw
from concurrent.futures import ThreadPoolExecutor
INF = "/content/informe"; shutil.rmtree(INF, ignore_errors=True); os.makedirs(f"{INF}/img", exist_ok=True)
PX = 320; KM = 2 * P * BASE / 1000          # 12.8 km por recorte

s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterDate("2023-01-01", "2025-12-31")
      .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10)).select(["B4", "B3", "B2"]).median()
      .visualize(min=0, max=2500, gamma=1.2))

def bloque_de(x, y):
    for (r_, c_), (arr, xl, yt) in dem_bloques.items():
        i, j = (yt - y) / BASE - 0.5, (x - xl) / BASE - 0.5
        if P <= i < arr.shape[0] - P and P <= j < arr.shape[1] - P:
            return arr, i, j
    return None, None, None

def circulo(im, diam_km, color):
    d = ImageDraw.Draw(im); r = max(diam_km / KM * PX / 2, 4); c = PX / 2
    d.ellipse([c - r, c - r, c + r, c + r], outline=color, width=3); return im

def relieve_png(lat, lon, diam_km, nombre):
    x, y = to_xy.transform(lon, lat); arr, i, j = bloque_de(x, y)
    if arr is None: return False
    im = Image.fromarray((sombreado(recorte(arr, i, j)) * 255).astype("uint8")).resize((PX, PX), Image.LANCZOS).convert("RGB")
    if diam_km: circulo(im, diam_km, (230, 60, 40))
    im.save(f"{INF}/img/{nombre}_rel.png", optimize=True); return True

def satelite_png(lat, lon, diam_km, nombre):
    x, y = to_xy.transform(lon, lat); h = KM * 500
    reg = ee.Geometry.Rectangle([x - h, y - h, x + h, y + h], ee.Projection(CRS), False)
    for k in range(3):
        try:
            url = s2.getThumbURL({"region": reg, "dimensions": PX, "crs": CRS, "format": "png"})
            im = Image.open(io.BytesIO(requests.get(url, timeout=60).content)).convert("RGB").resize((PX, PX))
            if diam_km: circulo(im, diam_km, (255, 220, 0))
            im.save(f"{INF}/img/{nombre}_sat.png", optimize=True); return True
        except Exception as e:
            err = str(e)[:120]; time.sleep(2)
    print("satélite falló", nombre, err); return False

items = []
# (1) Cráteres conocidos: se dibuja el lugar del catálogo; el círculo es la detección más cercana si la hubo
for k, (nombre, (la, lo)) in enumerate(CONOCIDOS.items()):
    x, y = to_xy.transform(lo, la); dkm = np.hypot(hoyas_mx.x - x, hoyas_mx.y - y) / 1000
    h = hoyas_mx.loc[dkm.idxmin()] if dkm.min() <= 2.5 else None
    items.append({"grupo": "conocido", "id": f"K{k:02d}", "nombre": nombre, "lat": la, "lon": lo,
                  "detectado": h is not None, "pasa_filtro": bool(h.crater) if h is not None else False,
                  "diam_km": round(float(h.diam_km), 2) if h is not None else None, "prof_m": round(float(h.prof_m)) if h is not None else None,
                  "circ": round(float(h.circ), 2) if h is not None else None, "borde_m": round(float(h.borde_m)) if h is not None else None,
                  "c_lat": round(float(h.lat), 4) if h is not None else la, "c_lon": round(float(h.lon), 4) if h is not None else lo})
# (2) Muestra al azar por tipo (semilla fija para que sea reproducible)
for tipo, n in (("con_borde", 16), ("sin_borde", 16), ("mina", 8)):
    sub = c[c.tipo == tipo]
    for r in sub.sample(min(n, len(sub)), random_state=42).itertuples():
        items.append({"grupo": tipo, "id": r.cid, "nombre": r.nombre, "lat": round(r.lat, 4), "lon": round(r.lon, 4), "c_lat": round(r.lat, 4), "c_lon": round(r.lon, 4),
                      "diam_km": round(r.diam_km, 2), "prof_m": round(r.prof_m), "prof_diam": round(r.prof_diam, 3), "circ": round(r.circ, 2),
                      "borde_m": round(r.borde_m), "ndvi": None if pd.isna(r.ndvi_p90) else round(r.ndvi_p90, 2), "pct_lunar": round(r.pct_lunar_prof_diam)})

def hacer(it):
    ok1 = relieve_png(it["c_lat"], it["c_lon"], it.get("diam_km"), it["id"])
    ok2 = satelite_png(it["c_lat"], it["c_lon"], it.get("diam_km"), it["id"])
    it["img_rel"], it["img_sat"] = ok1, ok2; return it
t0 = time.time()
with ThreadPoolExecutor(6) as ex: items = list(ex.map(hacer, items))

# (3) Muestra de detecciones en la Luna (polo sur), solo relieve
luna_items = []
Lp = L[L.sitio == "Polo sur (85-90°S)"]
for k, r in enumerate(Lp.sample(12, random_state=42).itertuples()):
    p_ = recorte(moon200, r.i, r.j)
    if p_ is None: continue
    im = Image.fromarray((sombreado(p_) * 255).astype("uint8")).resize((PX, PX), Image.LANCZOS).convert("RGB")
    circulo(im, r.diam_km, (230, 60, 40)).save(f"{INF}/img/L{k:02d}_rel.png", optimize=True)
    luna_items.append({"id": f"L{k:02d}", "lat": round(r.lat, 2), "lon": round(r.lon, 2), "diam_km": round(r.diam_km, 2), "prof_m": round(r.prof_m), "prof_diam": round(r.prof_diam, 3)})

# (4) Números de resumen
resumen = {"n_mexico": int(len(c)), "tipos": c.tipo.value_counts().to_dict(), "n_hoyas_total": int(len(hoyas_mx)),
           "n_luna_polo": int((hoyas_ref.crater & (hoyas_ref.sitio == "Polo sur (85-90°S)")).sum()),
           "lat_bandas": {str(k): int(v) for k, v in pd.cut(c.lat, [14, 18, 20, 22, 24, 28, 33]).value_counts().sort_index().items()},
           "medianas": json.loads(res.round(3).reset_index().to_json(orient="records")),
           "candidatos": int(len(cand)), "cuadros_mx": int(len(mx))}
json.dump({"items": items, "luna": luna_items, "resumen": resumen}, open(f"{INF}/informe.json", "w"), ensure_ascii=False)
z = shutil.make_archive("/content/informe", "zip", INF)
print(f"{len(items)} sitios ({sum(i['img_sat'] for i in items)} con satélite), {len(luna_items)} lunares. {time.time()-t0:.0f} s. Zip {os.path.getsize(z)/1e6:.1f} MB")
