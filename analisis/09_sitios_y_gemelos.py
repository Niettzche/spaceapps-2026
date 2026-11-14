# 09 · De cráteres a sitios: quitar minas, medir la superficie, agrupar y buscar el gemelo lunar
import requests
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

c = hoyas_mx[hoyas_mx.crater].reset_index(drop=True)

# (a) Minas a cielo abierto: son "cráteres" artificiales. Se marcan con OpenStreetMap (landuse=quarry).
try:
    q = '[out:json][timeout:180];(way["landuse"="quarry"](14,-118.5,33,-86);relation["landuse"="quarry"](14,-118.5,33,-86););out center;'
    js = requests.post("https://overpass-api.de/api/interpreter", data={"data": q}, timeout=240).json()
    qll = np.array([(e["center"]["lon"], e["center"]["lat"]) for e in js["elements"] if "center" in e])
    qx, qy = to_xy.transform(qll[:, 0], qll[:, 1])
    dq, _ = cKDTree(np.c_[qx, qy]).query(c[["x", "y"]].values)
    c["km_mina"] = (dq / 1000).round(1); c["mina"] = c.km_mina <= 2.0
    print(f"Canteras y minas en OpenStreetMap: {len(qll)}. Cráteres a menos de 2 km de una: {int(c.mina.sum())}")
except Exception as e:
    c["km_mina"] = np.nan; c["mina"] = False
    print("No se pudo consultar OpenStreetMap:", str(e)[:150])

# (b) Superficie en cada cráter: vegetación, albedo y cobertura (MODIS, NASA)
try:
    alb = (ee.ImageCollection("MODIS/061/MCD43A3").filterDate("2024-03-01", "2024-06-01").select("Albedo_WSA_shortwave").mean().multiply(0.001).rename("albedo"))
    img = ee.Image.cat([ndvi_col.reduce(ee.Reducer.percentile([90])).multiply(1e-4).rename("ndvi_p90"), alb, lc.rename("lc")])
    pts = ee.FeatureCollection([ee.Feature(ee.Geometry.Point([float(lo), float(la)]), {"k": int(i)}) for i, la, lo in zip(c.index, c.lat, c.lon)])
    props = [f["properties"] for f in img.reduceRegions(pts, ee.Reducer.first(), 500).getInfo()["features"]]
    sup = pd.DataFrame(props).set_index("k")
    for col in ("ndvi_p90", "albedo", "lc"):
        c[col] = sup[col].reindex(c.index).values if col in sup else np.nan
    print("Superficie medida en", int(c.ndvi_p90.notna().sum()), "cráteres")
except Exception as e:
    print("Falló la consulta de superficie:", str(e)[:200])

# (c) Tipo probable por forma: los cráteres volcánicos (maares, conos) tienen borde levantado; las dolinas kársticas no.
c["tipo"] = np.where(c.mina, "mina", np.where(c.borde_m >= 10, "con borde (volcánico probable)", "sin borde (dolina o cuenca probable)"))
print("\nTipos:", c.tipo.value_counts().to_dict())

# (d) Sitios: grupos de cráteres a menos de 15 km entre sí
pairs = cKDTree(c[["x", "y"]].values).query_pairs(15_000, output_type="ndarray")
g = coo_matrix((np.ones(len(pairs)), (pairs[:, 0], pairs[:, 1])), shape=(len(c), len(c)))
c["sitio_id"] = connected_components(g, directed=False)[1]

# (e) Gemelo lunar: el cráter del polo sur más parecido en diámetro y profundidad (escala logarítmica)
L = hoyas_ref[(hoyas_ref.cuerpo == "Luna") & hoyas_ref.crater].reset_index(drop=True)
tl = cKDTree(np.c_[np.log(L.diam_km), np.log(L.prof_m)])
dg, ig = tl.query(np.c_[np.log(c.diam_km), np.log(c.prof_m)])
c["gem_lat"], c["gem_lon"], c["gem_diam_km"], c["gem_prof_m"] = L.lat.values[ig], L.lon.values[ig], L.diam_km.values[ig], L.prof_m.values[ig]
# qué tan "lunar" es la proporción profundidad/diámetro: percentil dentro de la población lunar
c["pct_lunar_prof_diam"] = np.searchsorted(np.sort(L.prof_diam.values), c.prof_diam.values) / len(L) * 100

# (f) Conocidos frente a nuevos
kx, ky = to_xy.transform([v[1] for v in CONOCIDOS.values()], [v[0] for v in CONOCIDOS.values()])
c["km_conocido"] = (cKDTree(np.c_[kx, ky]).query(c[["x", "y"]].values)[0] / 1000).round(1)
c["conocido"] = (c.km_conocido <= 5) | (c.km_pinacate <= 40) if "km_pinacate" in c else (c.km_conocido <= 5)
xp, yp = to_xy.transform(CONTROL["El Pinacate"][1], CONTROL["El Pinacate"][0])
c["km_pinacate"] = (np.hypot(c.x - xp, c.y - yp) / 1000).round(0)
c["conocido"] = (c.km_conocido <= 5) | (c.km_pinacate <= 40)

vol = c[c.tipo.str.startswith("con borde")]
sit = vol.groupby("sitio_id").agg(n=("diam_km", "size"), lat=("lat", "mean"), lon=("lon", "mean"), diam_max=("diam_km", "max"), prof_max=("prof_m", "max"),
                                  borde=("borde_m", "median"), ndvi=("ndvi_p90", "median"), albedo=("albedo", "median"), conocido=("conocido", "any")).reset_index()
print(f"\nCráteres con borde levantado, sin minas: {len(vol)} en {len(sit)} sitios. Conocidos: {int(sit.conocido.sum())} sitios")
print("\nSitios con borde levantado, ordenados por profundidad máxima (los 30 primeros):")
print(sit.sort_values("prof_max", ascending=False).head(30).round(3).to_string(index=False))
print("\nCráteres individuales con borde, poca vegetación (NDVI < 0.35) y no conocidos:")
arid = vol[(vol.ndvi_p90 < 0.35) & ~vol.conocido].sort_values("prof_m", ascending=False)
print(arid[["lat", "lon", "diam_km", "prof_m", "prof_diam", "circ", "borde_m", "ndvi_p90", "albedo", "km_mina", "pct_lunar_prof_diam"]].head(30).round(3).to_string(index=False))
c.to_csv(f"{OUT}/crateres_mexico.csv", index=False); sit.to_csv(f"{OUT}/sitios_mexico.csv", index=False)