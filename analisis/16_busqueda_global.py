# 16 · Búsqueda global mínima: el mismo detector en 3 desiertos priorizados (AGENTS.md §6.4, paso b)
# Cada región es un cuadro de 600 x 600 km en su proyección UTM, a 200 m, con el mismo detectar() y tipo_crater().
# Después: filtro árido (NDVI p90 < 0.35), canteras de OpenStreetMap en la región, gemelo lunar y percentil lunar de d/D.
REGIONES = {   # centro (lat, lon); elegidas por tener controles conocidos y minas grandes
    "Atacama (Chile)":            (-23.5, -69.0),
    "Arizona (EE. UU.)":          (34.0, -111.5),
    "Arabia occidental (Hiyaz)":  (24.5, 40.0),
}
MEDIO = 300_000            # 300 km a cada lado del centro
ndvi_img = ndvi_col.reduce(ee.Reducer.percentile([90])).multiply(1e-4).rename("ndvi_p90")
todas = []
for reg, (la, lo) in REGIONES.items():
    t0 = time.time()
    epsg = (32600 if la >= 0 else 32700) + int((lo + 180) // 6) + 1
    t_xy = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True); t_ll = Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)
    cx, cy = t_xy.transform(lo, la)
    X0, Y1 = cx - MEDIO, cy + MEDIO
    nb = int(np.ceil(2 * MEDIO / (BLOCK * CELL)))
    def bloque(rc):
        r, c_ = rc
        xl, yt = X0 + c_ * BLOCK * CELL - M * BASE, Y1 - r * BLOCK * CELL + M * BASE
        n = BLOCK * N + 2 * M
        a = ee_pixels(dem_ee, xl, yt, n, n, BASE, crs=f"EPSG:{epsg}")["dem"]
        d = detectar(a)
        if d.empty: return d
        d = d[(d.i >= M) & (d.i < M + BLOCK * N) & (d.j >= M) & (d.j < M + BLOCK * N)].copy()
        d["x"], d["y"] = xl + (d.j + 0.5) * BASE, yt - (d.i + 0.5) * BASE
        return d
    with ThreadPoolExecutor(8) as ex:
        h = pd.concat(list(ex.map(bloque, [(r, c_) for r in range(nb) for c_ in range(nb)])), ignore_index=True)
    h = h[(np.abs(h.x - cx) <= MEDIO) & (np.abs(h.y - cy) <= MEDIO)].copy()
    h["lon"], h["lat"] = t_ll.transform(h.x.values, h.y.values)
    h["crater"] = tipo_crater(h); h["region"] = reg; h["epsg"] = epsg
    cr = h[h.crater].reset_index(drop=True)
    # NDVI en cada cráter
    vals = {}
    for a0 in range(0, len(cr), 1000):
        sub = cr.iloc[a0:a0 + 1000]
        fc = ee.FeatureCollection([ee.Feature(ee.Geometry.Point([float(r.lon), float(r.lat)]), {"k": int(i)}) for i, r in sub.iterrows()])
        for f in ndvi_img.reduceRegions(fc, ee.Reducer.first(), 250).getInfo()["features"]:
            vals[f["properties"]["k"]] = f["properties"].get("first")
    cr["ndvi_p90"] = cr.index.map(vals).astype(float)
    # Canteras y minas de OpenStreetMap dentro del cuadro de la región
    lon_min, lat_min = t_ll.transform(cx - MEDIO, cy - MEDIO); lon_max, lat_max = t_ll.transform(cx + MEDIO, cy + MEDIO)
    cr["km_mina"] = np.nan
    for url in ("https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"):
        try:
            q = f'[out:json][timeout:180];(way["landuse"="quarry"]({lat_min},{lon_min},{lat_max},{lon_max});relation["landuse"="quarry"]({lat_min},{lon_min},{lat_max},{lon_max}););out center;'
            js = requests.post(url, data={"data": q}, headers={"User-Agent": "analog-research-notebook/1.0"}, timeout=240).json()
            qll = np.array([(e["center"]["lon"], e["center"]["lat"]) for e in js["elements"] if "center" in e])
            if len(qll):
                qx_, qy_ = t_xy.transform(qll[:, 0], qll[:, 1])
                cr["km_mina"] = (cKDTree(np.c_[qx_, qy_]).query(cr[["x", "y"]].values)[0] / 1000).round(2)
            print(f"  OSM: {len(qll)} canteras en la región"); break
        except Exception as e:
            print("  OSM falló en", url.split('/')[2], str(e)[:60])
    # Gemelo lunar y percentil lunar de d/D (misma población lunar que en México)
    dg, ig = tl.query(np.c_[np.log(cr.diam_km), np.log(cr.prof_m)])
    cr["gem_lat"], cr["gem_lon"] = L.lat.values[ig], L.lon.values[ig]
    cr["gem_diam_km"], cr["gem_prof_m"] = L.diam_km.values[ig], L.prof_m.values[ig]
    cr["pct_lunar_prof_diam"] = np.searchsorted(np.sort(L.prof_diam.values), cr.prof_diam.values) / len(L) * 100
    cr["arido"] = cr.ndvi_p90 < 0.35
    cr["mina"] = cr.km_mina <= 2.0
    todas.append(cr)
    print(f"{reg}: {len(h)} depresiones, {len(cr)} tipo cráter, {int(cr.arido.sum())} en zona árida, "
          f"{int((cr.arido & cr.mina).sum())} junto a una mina. {time.time()-t0:.0f} s")
G = pd.concat(todas, ignore_index=True)
G.insert(0, "gid", ["G%05d" % i for i in range(len(G))])
cols = ["gid", "region", "lon", "lat", "diam_km", "prof_m", "prof_diam", "circ", "relleno", "aspecto", "borde_m", "area_px", "elev_m",
        "crater", "ndvi_p90", "arido", "km_mina", "mina", "pct_lunar_prof_diam", "gem_lat", "gem_lon", "gem_diam_km", "gem_prof_m", "x", "y", "epsg"]
G[cols].round(4).to_csv("/content/global_crateres.csv", index=False)
print("\nLos 20 cráteres áridos más hondos para su tamaño (d/D), todas las regiones:")
print(G[G.arido].nlargest(20, "prof_diam")[["region", "lat", "lon", "diam_km", "prof_m", "prof_diam", "borde_m", "km_mina", "pct_lunar_prof_diam"]].round(3).to_string(index=False))
from google.colab import files
files.download("/content/global_crateres.csv")
