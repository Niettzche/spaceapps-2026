# 14 · Exportar TODAS las depresiones de México (también las que no pasan el filtro) para ciencia_datos/
cols = ["lon", "lat", "diam_km", "prof_m", "prof_diam", "circ", "relleno", "aspecto", "borde_m", "area_px", "elev_m", "crater", "br", "bc", "x", "y"]
H = hoyas_mx[cols].copy().reset_index(drop=True)
H.insert(0, "hid", ["H%05d" % i for i in range(len(H))])
# Vegetación en cada depresión (NDVI percentil 90, 2021-2025), por lotes para no pasar límites de Earth Engine
ndvi_img = ndvi_col.reduce(ee.Reducer.percentile([90])).multiply(1e-4).rename("ndvi_p90")
vals = {}
for a in range(0, len(H), 1000):
    sub = H.iloc[a:a + 1000]
    fc = ee.FeatureCollection([ee.Feature(ee.Geometry.Point([float(r.lon), float(r.lat)]), {"k": int(i)}) for i, r in sub.iterrows()])
    for f in ndvi_img.reduceRegions(fc, ee.Reducer.first(), 250).getInfo()["features"]:
        vals[f["properties"]["k"]] = f["properties"].get("first", f["properties"].get("ndvi_p90"))
H["ndvi_p90"] = H.index.map(vals).astype(float)
# Enlace con la tabla de 668 (cid) y distancia a la cantera de OpenStreetMap más cercana
link = cKDTree(c[["x", "y"]].values).query(H[["x", "y"]].values)
H["cid"] = np.where(link[0] < 1, c.cid.values[link[1]], "")
if osm_ok:
    H["km_mina"] = (cKDTree(np.c_[qx, qy]).query(H[["x", "y"]].values)[0] / 1000).round(2)
H.round(4).to_csv("/content/hoyas_mexico.csv", index=False)
print(len(H), "depresiones;", int(H.crater.sum()), "pasan el filtro;", int(H.ndvi_p90.notna().sum()), "con NDVI;", int((H.cid != "").sum()), "enlazadas a cid")
from google.colab import files
files.download("/content/hoyas_mexico.csv")
