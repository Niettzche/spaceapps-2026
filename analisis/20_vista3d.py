# 20 · Relieves para vista 3D: Tierra y gemelo lunar (por perfil) a 80 m, gemelo marciano a 200 m.
# Ventana = 2 diámetros de lado (cráter + borde + alrededor), remuestreada a 48 x 48 para que los tres se vean a la misma escala relativa.
from scipy.ndimage import zoom as nd_zoom
D3 = "/content/vista3d"; shutil.rmtree(D3, ignore_errors=True); os.makedirs(D3, exist_ok=True)
NG = 48
def a_rejilla(a):
    a = np.asarray(a, dtype="float64")
    z = nd_zoom(a, (NG / a.shape[0], NG / a.shape[1]), order=1)[:NG, :NG]
    borde = np.concatenate([z[0], z[-1], z[:, 0], z[:, -1]])
    return np.round(z - np.median(borde)).astype(int).tolist()

def ventana_tierra(cv):
    h = max(int(np.ceil(cv["d"] * 1000 / R80)), 8)            # media ventana = 1 diámetro
    if cv["fuente"] == "mx":
        x, y = to_xy.transform(cv["lon"], cv["lat"]); crs = CRS
    else:
        x, y = cv["x"], cv["y"]; crs = f"EPSG:{cv['epsg']}"
    a = ee_pixels(dem_ee, x - h * R80, y + h * R80, 2 * h, 2 * h, R80, crs=crs)["dem"]
    return a, 2 * h * R80 / 1000

def ventana_luna(g):
    x = -half + (g.j + 0.5) * BASE; y = half - (g.i + 0.5) * BASE
    col, row = int(round((x + half) / MAPSC)), int(round((half - y) / MAPSC))
    h = max(int(np.ceil(g.diam_km * 1000 / MAPSC)), 8)
    if row - h < 0 or col - h < 0 or row + h > src.shape[0] or col + h > src.shape[1]: return None, None
    return src[row - h:row + h, col - h:col + h], 2 * h * MAPSC / 1000

def ventana_marte(m):
    a = dem_marte[m.sitio]; h = max(int(np.ceil(m.diam_km * 1000 / BASE)), 4)
    i, j = int(round(m.i)), int(round(m.j))
    if i - h < 0 or j - h < 0 or i + h > a.shape[0] or j + h > a.shape[1]: return None, None
    return a[i - h:i + h, j - h:j + h], 2 * h * BASE / 1000

Lpolo_ll = np.c_[Lpolo.lat.values, Lpolo.lon.values]
def hacer_3d(cv):
    out = {"id": cv["id"], "exag": 2}
    try:
        a, km = ventana_tierra(cv); out["tierra"] = dict(z=a_rejilla(a), km=round(km, 2), res=R80)
    except Exception as e: out["err"] = str(e)[:80]
    pv = next((p for p in perfiles_v if p["id"] == cv["id"]), None)
    gp = pv.get("gemelo_perfil") if pv else None
    if gp:
        k = int(np.argmin(np.hypot(Lpolo_ll[:, 0] - gp["lat"], Lpolo_ll[:, 1] - gp["lon"])))
        a, km = ventana_luna(Lpolo.iloc[k])
        if a is not None: out["luna"] = dict(z=a_rejilla(a), km=round(km, 2), res=int(MAPSC))
    m = Mm.iloc[tm.query([[np.log(cv["d"]), np.log(cv["p"])]])[1][0]]
    a, km = ventana_marte(m)
    if a is not None: out["marte"] = dict(z=a_rejilla(a), km=round(km, 2), res=BASE, sitio=m.sitio)
    json.dump(out, open(f"{D3}/{cv['id']}.json", "w"))
    return {k: (k in out) for k in ("tierra", "luna", "marte")}

t0 = time.time()
with ThreadPoolExecutor(8) as ex: r3 = list(ex.map(hacer_3d, cand_v))
z = shutil.make_archive("/content/vista3d", "zip", D3)
print(f"3D: tierra {sum(x['tierra'] for x in r3)} · luna {sum(x['luna'] for x in r3)} · marte {sum(x['marte'] for x in r3)} de {len(r3)} · {time.time()-t0:.0f} s · zip {os.path.getsize(z)/1e6:.1f} MB")
from google.colab import files
files.download(z)
