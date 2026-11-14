# 15 · Más referencias: 5 sitios de aterrizaje en Marte y 10 cráteres de impacto de la Tierra (mismo detector, 200 m)
import math
# ---------- (a) Marte: mismo recorte de 100 x 100 km del mosaico HRSC+MOLA ----------
MARTE_EXTRA = {"Meridiani (Opportunity)": (-1.95, -5.53), "Gusev (Spirit)": (-14.57, 175.47), "Elysium (InSight)": (4.50, 135.62),
               "Utopia (Zhurong)": (25.07, 109.93), "Chryse (Viking 1)": (22.27, -47.95)}
nuevas = []
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
    with rasterio.open(MARS_URL) as ds:
        for name, (la, lo) in MARTE_EXTRA.items():
            crs_loc = f"+proj=eqc +lat_ts={la} +lat_0=0 +lon_0={lo} +x_0=0 +y_0=0 +R={R_MARS} +units=m +no_defs"
            ytop = R_MARS * np.radians(la) + 50_000
            with WarpedVRT(ds, crs=crs_loc, transform=from_origin(-50_000, ytop, BASE, BASE), width=500, height=500, resampling=Resampling.bilinear) as vrt:
                a = vrt.read(1).astype("float32")
            dem_marte[name] = a
            # Rugosidad a escala de píxel: el MOLA solo (sin HRSC) es mucho más liso a 200 m
            rug = float(np.median(np.abs(a[1:-1, 1:-1] * 4 - a[:-2, 1:-1] - a[2:, 1:-1] - a[1:-1, :-2] - a[1:-1, 2:])))
            d = detectar(a)
            if d.empty:
                print(name, "sin depresiones"); continue
            d["lon"], d["lat"] = Transformer.from_crs(crs_loc, f"+proj=longlat +R={R_MARS} +no_defs", always_xy=True).transform(
                (-50_000 + (d.j + 0.5) * BASE).values, (ytop - (d.i + 0.5) * BASE).values)
            d["cuerpo"], d["sitio"], d["rugosidad_px_m"] = "Marte", name, round(rug, 2)
            d["crater"] = tipo_crater(d); nuevas.append(d)
            print(f"{name}: {len(d)} depresiones, {int(d.crater.sum())} tipo cráter; rugosidad {rug:.2f} m")
hm_extra = pd.concat(nuevas, ignore_index=True)
# Rugosidad de los 3 sitios originales, para comparar (si es mucho menor, probablemente es solo MOLA)
for s in SITIOS_MARTE:
    a = dem_marte[s]; print(f"  ref {s}: rugosidad {float(np.median(np.abs(a[1:-1,1:-1]*4-a[:-2,1:-1]-a[2:,1:-1]-a[1:-1,:-2]-a[1:-1,2:]))):.2f} m")

# ---------- (b) Cráteres de impacto de la Tierra (Copernicus GLO-30 a 200 m, ventana de 30 km) ----------
IMPACTOS = {"Meteor Crater": (35.027, -111.022, 1.2), "Lonar": (19.976, 76.508, 1.8), "Wolfe Creek": (-19.172, 127.795, 0.9),
            "Tenoumer": (22.918, -10.408, 1.9), "Pingualuit": (61.278, -73.660, 3.4), "Tswaing": (-25.408, 28.083, 1.1),
            "Roter Kamm": (-27.766, 16.292, 2.5), "Talemzane": (33.317, 4.033, 1.75), "Xiuyan": (40.365, 123.460, 1.8),
            "Brent": (46.080, -78.480, 3.8)}
W = 150   # 30 km a 200 m
filas = []
for nombre, (la, lo, dexp) in IMPACTOS.items():
    epsg = (32600 if la >= 0 else 32700) + int((lo + 180) // 6) + 1
    t_xy = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True); t_ll = Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True)
    cx, cy = t_xy.transform(lo, la); xl, yt = cx - W * BASE / 2, cy + W * BASE / 2
    a = ee_pixels(dem_ee, xl, yt, W, W, BASE, crs=f"EPSG:{epsg}")["dem"]
    d = detectar(a)
    if d.empty:
        filas.append({"nombre": nombre, "diam_esperado_km": dexp, "detectado": False}); print(nombre, "sin depresiones"); continue
    d["x"], d["y"] = xl + (d.j + 0.5) * BASE, yt - (d.i + 0.5) * BASE
    d["lon"], d["lat"] = t_ll.transform(d.x.values, d.y.values)
    d["a_km_del_centro"] = np.hypot(d.x - cx, d.y - cy) / 1000
    cerca = d[d.a_km_del_centro <= max(3.0, dexp)]
    if cerca.empty:
        filas.append({"nombre": nombre, "diam_esperado_km": dexp, "detectado": False, "a_km_del_centro": round(float(d.a_km_del_centro.min()), 2)})
        print(nombre, f"sin depresión cerca (la más cercana a {d.a_km_del_centro.min():.1f} km)"); continue
    h = cerca.loc[(np.log(cerca.diam_km / dexp)).abs().idxmin()]
    fila = h.to_dict(); fila.update(nombre=nombre, diam_esperado_km=dexp, detectado=True, crater=bool(tipo_crater(pd.DataFrame([h])).iloc[0]), epsg=epsg)
    filas.append(fila)
    print(f"{nombre}: esperado {dexp} km → detectado {h.diam_km:.2f} km, {h.prof_m:.0f} m, d/D {h.prof_diam:.3f}, circ {h.circ:.2f}, borde {h.borde_m:.0f} m, "
          f"a {h.a_km_del_centro:.1f} km del centro, pasa filtro: {fila['crater']}")
imp = pd.DataFrame(filas)
# NDVI para que tenga las mismas columnas que hoyas_mexico.csv
ndvi_img = ndvi_col.reduce(ee.Reducer.percentile([90])).multiply(1e-4).rename("ndvi_p90")
ok = imp.detectado.fillna(False).astype(bool)
fc = ee.FeatureCollection([ee.Feature(ee.Geometry.Point([float(r.lon), float(r.lat)]), {"k": int(i)}) for i, r in imp[ok].iterrows()])
nv = {f["properties"]["k"]: f["properties"].get("first") for f in ndvi_img.reduceRegions(fc, ee.Reducer.first(), 250).getInfo()["features"]}
imp["ndvi_p90"] = imp.index.map(nv)
imp.insert(0, "hid", ["I%02d" % i for i in range(len(imp))]); imp["cid"] = ""; imp["km_mina"] = np.nan; imp["br"] = np.nan; imp["bc"] = np.nan
cols_h = ["hid", "lon", "lat", "diam_km", "prof_m", "prof_diam", "circ", "relleno", "aspecto", "borde_m", "area_px", "elev_m", "crater", "br", "bc", "x", "y", "ndvi_p90", "cid", "km_mina"]
imp = imp[cols_h + ["nombre", "diam_esperado_km", "a_km_del_centro", "detectado", "epsg"]]
imp.round(4).to_csv("/content/impactos_tierra.csv", index=False)

# ---------- (c) hoyas_referencia.csv con los sitios nuevos de Marte ----------
ref_out = pd.concat([hoyas_ref.assign(rugosidad_px_m=np.nan), hm_extra], ignore_index=True)
ref_out.to_csv("/content/hoyas_referencia.csv", index=False)
print(f"\nhoyas_referencia: {len(hoyas_ref)} → {len(ref_out)} filas; tipo cráter en Marte: {int(ref_out[(ref_out.cuerpo=='Marte') & ref_out.crater].shape[0])}")
print(f"Impactos detectados: {int(imp.detectado.sum())} de {len(imp)}; pasan filtro: {int(imp.crater.fillna(False).astype(bool).sum())}")
from google.colab import files
files.download("/content/impactos_tierra.csv"); files.download("/content/hoyas_referencia.csv")
