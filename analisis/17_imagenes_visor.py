# 17 · Imágenes para el visor: cada candidato árido con su gemelo lunar y marciano (misma luz, misma escala) + satélite
import io, shutil, zipfile
VIS = "/content/visor_img"; shutil.rmtree(VIS, ignore_errors=True); os.makedirs(VIS, exist_ok=True)
PXV = 256
def png_relieve(dem, ruta):
    Image.fromarray((sombreado(dem) * 255).astype("uint8")).resize((PXV, PXV), Image.LANCZOS).save(ruta, optimize=True)

# Gemelos marcianos: misma búsqueda que el lunar (diámetro y profundidad en log), en los 6 sitios de Marte con buen relieve
# (ref_out = hoyas_ref + los 5 sitios de aterrizaje de la celda 15)
Mm = ref_out[(ref_out.cuerpo == "Marte") & ref_out.crater.astype(bool) & ~ref_out.sitio.isin(["Elysium (InSight)", "Utopia (Zhurong)"])].reset_index(drop=True)
tm = cKDTree(np.c_[np.log(Mm.diam_km), np.log(Mm.prof_m)])

# Candidatos: México árido (c) y global árido (G) sin los duplicados del Pinacate
cand_v = [dict(id=r.cid, lat=r.lat, lon=r.lon, d=r.diam_km, p=r.prof_m, fuente="mx", br=int(r.br), bc=int(r.bc), i=r.i, j=r.j)
          for r in c[c.ndvi_p90 < 0.35].itertuples()]
mxll = c[["lat", "lon"]].values
for r in G[G.arido].itertuples():
    if np.hypot((mxll[:, 0] - r.lat) * 111, (mxll[:, 1] - r.lon) * 111 * np.cos(np.radians(r.lat))).min() <= 1.0:
        continue
    cand_v.append(dict(id=r.gid, lat=r.lat, lon=r.lon, d=r.diam_km, p=r.prof_m, fuente="gl", epsg=int(r.epsg), x=r.x, y=r.y))

def tierra_dem(cv):
    if cv["fuente"] == "mx":
        arr, xl, yt = dem_bloques[(cv["br"], cv["bc"])]
        return recorte(arr, cv["i"], cv["j"])
    n = 2 * P
    return ee_pixels(dem_ee, cv["x"] - P * BASE, cv["y"] + P * BASE, n, n, BASE, crs=f"EPSG:{cv['epsg']}")["dem"]

def satelite_vis(cv):
    x, y = to_xy.transform(cv["lon"], cv["lat"]) if cv["fuente"] == "mx" else (cv["x"], cv["y"])
    crs = CRS if cv["fuente"] == "mx" else f"EPSG:{cv['epsg']}"
    h = P * BASE
    reg = ee.Geometry.Rectangle([x - h, y - h, x + h, y + h], ee.Projection(crs), False)
    url = s2.getThumbURL({"region": reg, "dimensions": PXV, "crs": crs, "format": "jpg"})
    Image.open(io.BytesIO(requests.get(url, timeout=60).content)).convert("RGB").save(f"{VIS}/{cv['id']}_sat.jpg", quality=82)

def hacer_vis(cv):
    out = {"id": cv["id"]}
    try:
        t = tierra_dem(cv)
        if t is not None: png_relieve(t, f"{VIS}/{cv['id']}_tierra.png"); out["tierra"] = True
    except Exception as e: out["err_t"] = str(e)[:80]
    g = L.iloc[tl.query([[np.log(cv["d"]), np.log(cv["p"])]])[1][0]]
    pl = recorte(moon200, g.i, g.j)
    if pl is not None: png_relieve(pl, f"{VIS}/{cv['id']}_luna.png"); out["luna"] = dict(lat=round(float(g.lat), 2), lon=round(float(g.lon), 2), d=round(float(g.diam_km), 2), p=round(float(g.prof_m)))
    m = Mm.iloc[tm.query([[np.log(cv["d"]), np.log(cv["p"])]])[1][0]]
    pm = recorte(dem_marte[m.sitio], m.i, m.j)
    if pm is not None: png_relieve(pm, f"{VIS}/{cv['id']}_marte.png"); out["marte"] = dict(sitio=m.sitio, d=round(float(m.diam_km), 2), p=round(float(m.prof_m)))
    for k in range(3):
        try: satelite_vis(cv); out["sat"] = True; break
        except Exception as e: time.sleep(2); out["err_s"] = str(e)[:80]
    return out

t0 = time.time()
with ThreadPoolExecutor(8) as ex: res_vis = list(ex.map(hacer_vis, cand_v))
json.dump(res_vis, open(f"{VIS}/gemelos.json", "w"), ensure_ascii=False)
z = shutil.make_archive("/content/visor_img", "zip", VIS)
ok = lambda k: sum(1 for r in res_vis if r.get(k))
print(f"{len(res_vis)} candidatos · tierra {ok('tierra')} · luna {ok('luna')} · marte {ok('marte')} · satélite {ok('sat')} · {time.time()-t0:.0f} s · zip {os.path.getsize(z)/1e6:.1f} MB")
from google.colab import files
files.download(z)
