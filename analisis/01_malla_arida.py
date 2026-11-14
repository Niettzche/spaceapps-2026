# 01 · Malla de México (cuadros de 10 km) y filtro de zonas áridas
# Datos: MODIS MOD13Q1 (vegetación) y MCD12Q1 (cobertura del suelo), NASA; límites de país LSIB.
mexico = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017").filter(ee.Filter.eq("country_na", "Mexico")).geometry()
b = np.array(mexico.bounds(100, ee.Projection(CRS)).coordinates().getInfo()[0])
x0, y1 = np.floor(b[:, 0].min() / CELL) * CELL, np.ceil(b[:, 1].max() / CELL) * CELL
nx = int(np.ceil((b[:, 0].max() - x0) / CELL)); ny = int(np.ceil((y1 - b[:, 1].min()) / CELL))

def fetch_grid(img, need=None, block=24, workers=8):
    """Trae una imagen ya resumida a la malla de 10 km, por bloques. `need` limita a los bloques con cuadros de interés."""
    jobs = [(r, c) for r in range(0, ny, block) for c in range(0, nx, block)
            if need is None or need[r:r + block, c:c + block].any()]
    def one(rc):
        r, c = rc
        return r, c, ee_pixels(img, x0 + c * CELL, y1 - r * CELL, min(block, nx - c), min(block, ny - r), CELL)
    with ThreadPoolExecutor(workers) as ex:
        parts = list(ex.map(one, jobs))
    names = parts[0][2].dtype.names
    out = {n: np.full((ny, nx), np.nan, "float32") for n in names}
    for r, c, a in parts:
        for n in names:
            out[n][r:r + a.shape[0], c:c + a.shape[1]] = a[n]
    return out

t0 = time.time()
ndvi_col = ee.ImageCollection("MODIS/061/MOD13Q1").filterDate("2021-01-01", "2026-01-01").select("NDVI")
p_ndvi = ndvi_col.first().projection()
lc = ee.ImageCollection("MODIS/061/MCD12Q1").filterDate("2024-01-01", "2025-01-01").first().select("LC_Type1")
p_lc = lc.projection()
frac = lambda codes, name: to_grid(lc.remap(codes, [1] * len(codes), 0), p_lc).rename(name)
bands = [to_grid(ndvi_col.mean().multiply(1e-4), p_ndvi).rename("ndvi_mean"),
         to_grid(ndvi_col.reduce(ee.Reducer.percentile([90])).multiply(1e-4), p_ndvi).rename("ndvi_p90"),
         frac([16], "f_desnudo"), frac([13], "f_urbano"), frac([17], "f_agua"), frac([12, 14], "f_cultivo"),
         frac([1, 2, 3, 4, 5, 8, 9], "f_bosque"), frac([6, 7], "f_matorral"), frac([10], "f_pastizal"),
         ee.Image(1).clip(mexico).unmask(0).rename("en_mexico")]   # 1 si el centro del cuadro cae dentro de México
g = fetch_grid(ee.Image.cat(bands).toFloat().unmask(-1))

rows, cols = np.mgrid[0:ny, 0:nx]
df = pd.DataFrame({n: g[n].ravel() for n in g})
df["row"], df["col"] = rows.ravel(), cols.ravel()
df["x"] = x0 + (df["col"] + 0.5) * CELL; df["y"] = y1 - (df["row"] + 0.5) * CELL
df["lon"], df["lat"] = to_ll.transform(df["x"].values, df["y"].values)
mx = df[df["en_mexico"] >= 0.5].copy()

# Filtro: poca vegetación incluso en época verde, y casi sin agua, ciudad ni cultivo.
# Umbral 0.30: El Pinacate (0.22) y Cuatro Ciénegas (0.23) quedan dentro con margen.
NDVI_MAX = 0.30
ok = (mx.f_agua < 0.10) & (mx.f_urbano < 0.05) & (mx.f_cultivo < 0.10) & (mx.ndvi_mean >= 0) & (mx.ndvi_p90 < NDVI_MAX)
cand = mx[ok].reset_index(drop=True)
cand.insert(0, "cell_id", "MX_" + cand.row.astype(str).str.zfill(3) + "_" + cand.col.astype(str).str.zfill(3))
cand.to_csv(f"{OUT}/candidatos_mexico_10km.csv", index=False)
print(f"Malla {nx} x {ny}. Cuadros en México: {len(mx)}. Candidatos áridos: {len(cand)} ({len(cand)/len(mx):.0%}). Tiempo {time.time()-t0:.0f} s")

def celda(lat, lon):
    x, y = to_xy.transform(lon, lat)
    return int((y1 - y) // CELL), int((x - x0) // CELL)
CONTROL = {"El Pinacate": (31.77, -113.49), "Cuatro Ciénegas": (26.87, -102.12), "Samalayuca": (31.30, -106.50),
           "Desierto de Vizcaíno": (27.50, -113.80), "Selva Lacandona": (16.50, -91.00), "Valle de Mexicali (riego)": (32.45, -115.20)}
ver = ["ndvi_p90", "f_desnudo", "f_matorral", "f_cultivo", "f_urbano", "f_agua"]
print(pd.DataFrame({k: df[(df.row == celda(*v)[0]) & (df.col == celda(*v)[1])].iloc[0][ver] for k, v in CONTROL.items()}).T.astype(float).round(2))
