# 03 · Referencias de la Luna y Marte, a los mismos 200 m por píxel y en cuadros de 10 km
# Luna: LOLA (LRO, NASA), producto polar ldem_80s_80m. Marte: mosaico HRSC+MOLA de 200 m (ESA/NASA vía USGS).
def terrain_stats(dem, valid=None):
    """Una fila por cuadro de 10 km de un mapa de elevación a 200 m. Devuelve también los recortes de relieve."""
    s = slope_deg(dem); rows, patches = [], []
    for i in range(0, dem.shape[0] - N + 1, N):
        for j in range(0, dem.shape[1] - N + 1, N):
            if valid is not None and not valid[i:i + N, j:j + N].all():
                continue
            d = stats_tile(s[i:i + N, j:j + N], dem[i:i + N, j:j + N]); d.update(ti=i // N, tj=j // N)
            rows.append(d); patches.append(dem[i:i + N, j:j + N].astype("float32"))
    return pd.DataFrame(rows), patches

# ---------- Luna ----------
os.makedirs("/content/luna", exist_ok=True)
LOLA = "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/"
for f in ("ldem_80s_80m.lbl", "ldem_80s_80m.img"):
    if not os.path.exists(f"/content/luna/{f}"):
        subprocess.run(["wget", "-q", "-O", f"/content/luna/{f}", LOLA + f], check=True)
lbl = open("/content/luna/ldem_80s_80m.lbl", errors="replace").read()
val = lambda k: re.search(rf"^\s*{k}\s*=\s*([-\d.]+)", lbl, re.M).group(1)
LINES, SCALE, MAPSC = int(val("LINES")), float(val("SCALING_FACTOR")), float(val("MAP_SCALE"))
assert (LINES, SCALE, MAPSC) == (7600, 0.5, 80.0), "la etiqueta PDS no es la esperada"
R_MOON = 1737400.0
crs_moon = f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R={R_MOON} +units=m +no_defs"
src = np.fromfile("/content/luna/ldem_80s_80m.img", dtype="<i2").reshape(LINES, LINES).astype("float32") * SCALE   # metros
half = LINES * MAPSC / 2; n200 = int(LINES * MAPSC / BASE)
moon200 = np.zeros((n200, n200), "float32")
reproject(src, moon200, src_transform=from_origin(-half, half, MAPSC, MAPSC), src_crs=crs_moon,
          dst_transform=from_origin(-half, half, BASE, BASE), dst_crs=crs_moon, resampling=Resampling.average)
luna, p_luna = terrain_stats(moon200)
xm = -half + (luna.tj + 0.5) * CELL; ym = half - (luna.ti + 0.5) * CELL
luna["lon"], luna["lat"] = Transformer.from_crs(crs_moon, f"+proj=longlat +R={R_MOON} +no_defs", always_xy=True).transform(xm.values, ym.values)
luna["cuerpo"] = "Luna"; luna["sitio"] = np.where(luna.lat <= -85, "Polo sur (85-90°S)", "Anillo 80-85°S")
keep = (luna.lat <= -80.5).values
luna, p_luna = luna[keep].reset_index(drop=True), [p for p, k in zip(p_luna, keep) if k]

# ---------- Marte ----------
R_MARS = 3396190.0
MARS_URL = "/vsicurl/https://planetarymaps.usgs.gov/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif"
SITIOS_MARTE = {"Cráter Jezero": (18.44, 77.45), "Cráter Gale": (-5.40, 137.80), "Oxia Planum": (18.20, -24.30)}  # lat, lon este; por verificar contra el nomenclátor IAU
marte, p_marte = [], []
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
    with rasterio.open(MARS_URL) as ds:
        for name, (la, lo) in SITIOS_MARTE.items():
            crs_loc = f"+proj=eqc +lat_ts={la} +lat_0=0 +lon_0={lo} +x_0=0 +y_0=0 +R={R_MARS} +units=m +no_defs"
            ytop = R_MARS * np.radians(la) + 50_000
            with WarpedVRT(ds, crs=crs_loc, transform=from_origin(-50_000, ytop, BASE, BASE), width=500, height=500, resampling=Resampling.bilinear) as vrt:
                a = vrt.read(1).astype("float32")
            okm = np.ones_like(a, bool) if ds.nodata is None else (a != ds.nodata)
            t, pp = terrain_stats(a, okm)
            xs = -50_000 + (t.tj + 0.5) * CELL; ys = ytop - (t.ti + 0.5) * CELL
            t["lon"], t["lat"] = Transformer.from_crs(crs_loc, f"+proj=longlat +R={R_MARS} +no_defs", always_xy=True).transform(xs.values, ys.values)
            t["cuerpo"], t["sitio"] = "Marte", name
            print(f"  {name}: {len(t)} cuadros, elevación {a[okm].min():.0f} a {a[okm].max():.0f} m")
            marte.append(t); p_marte += pp

ref = pd.concat([luna] + marte, ignore_index=True)
ref.insert(0, "cell_id", ref.cuerpo.str[:2].str.upper() + "_" + ref.index.astype(str).str.zfill(4))
parches_ref = dict(zip(ref.cell_id, p_luna + p_marte))
np.savez_compressed(f"{OUT}/parches_referencias.npz", **parches_ref)
ref.to_csv(f"{OUT}/referencias_luna_marte_10km.csv", index=False)
cmp_cols = ["slope_p50", "slope_p90", "slope_mean", "slope_stdDev", "relieve"]
tabla = ref.groupby(["cuerpo", "sitio"])[cmp_cols].median()
tabla["cuadros"] = ref.groupby(["cuerpo", "sitio"]).size()
tabla.loc[("Tierra", "Candidatos México"), :] = list(cand[cmp_cols].median().values) + [len(cand)]
print("\nMediana por grupo (pendientes en grados, relieve en metros):"); print(tabla.round(2).to_string())
