# 07 · Buscador de cráteres: mismo detector en México (todo el país), la Luna y Marte
# Recorre el relieve en ventanas de 12 km con traslape, "rellena" cada ventana y se queda con las hoyas cerradas.
# Límite: a 200 m por píxel solo ve cráteres de unos 0.6 a 8 km de diámetro.
from skimage.morphology import reconstruction
from scipy import ndimage as ndi

T, S = 60, 30                 # ventana de 12 km, paso de 6 km
PROF_BASE, PROF_C = 5.0, 20.0 # metros: contorno de la hoya y profundidad mínima para contarla
AREA_C = 7                    # píxeles (0.28 km2, diámetro ~0.6 km)

def detectar(dem):
    """Devuelve una fila por depresión cerrada: posición en píxeles, tamaño, profundidad, forma y borde."""
    H, W = dem.shape; out = []
    rng = lambda L: sorted(set(list(range(0, L - T + 1, S)) + [L - T]))
    for i0 in rng(H):
        for j0 in rng(W):
            t = dem[i0:i0 + T, j0:j0 + T].astype("float64")
            if t.max() - t.min() < PROF_C:
                continue
            seed = t.copy(); seed[1:-1, 1:-1] = t.max()
            prof = reconstruction(seed, t, method="erosion") - t
            if prof.max() < PROF_C:
                continue
            lab, n = ndi.label(prof > PROF_BASE)
            for k, sl in enumerate(ndi.find_objects(lab), 1):
                m = lab[sl] == k; area = int(m.sum())
                if area < AREA_C:
                    continue
                pmax = float(prof[sl][m].max())
                if pmax < PROF_C:
                    continue
                h, w = m.shape
                ci, cj = ndi.center_of_mass(m)
                mk = lab == k
                d3 = ndi.binary_dilation(mk, iterations=3)
                r1 = ndi.binary_dilation(mk, iterations=2) & ~mk
                r2 = ndi.binary_dilation(mk, iterations=6) & ~d3
                borde = float(t[r1].mean() - t[r2].mean()) if r2.any() and r1.any() else np.nan
                out.append({"i": i0 + sl[0].start + ci, "j": j0 + sl[1].start + cj, "area_px": area, "prof_m": pmax,
                            "relleno": min(1.0, area / (np.pi / 4 * h * w)), "aspecto": min(h, w) / max(h, w), "borde_m": borde,
                            "elev_m": float(t[mk].min())})
    d = pd.DataFrame(out)
    if d.empty:
        return d
    d["diam_km"] = 2 * np.sqrt(d.area_px * (BASE / 1000) ** 2 / np.pi)
    d["circ"] = d.relleno * d.aspecto
    d["prof_diam"] = d.prof_m / (d.diam_km * 1000)
    # la misma hoya aparece en varias ventanas: se conserva la detección más completa
    d = d.sort_values(["area_px", "prof_m"], ascending=False).reset_index(drop=True)
    keep, ki, kj, kr = [], [], [], []
    for r in d.itertuples():
        rad = r.diam_km * 1000 / BASE / 2 + 1
        if ki and (np.hypot(np.array(ki) - r.i, np.array(kj) - r.j) < np.maximum(np.array(kr), rad)).any():
            continue
        keep.append(r.Index); ki.append(r.i); kj.append(r.j); kr.append(rad)
    return d.loc[keep].reset_index(drop=True)

# ---------- México: todo el país ----------
M = 60                                              # margen de 12 km por lado para no cortar cráteres entre bloques
en_mx = np.zeros((ny, nx), bool); en_mx[mx.row.values, mx.col.values] = True
jobs = [(r, c) for r in range(0, ny, BLOCK) for c in range(0, nx, BLOCK) if en_mx[r:r + BLOCK, c:c + BLOCK].any()]
dem_bloques = {}
def bloque_crateres(rc):
    r, c = rc
    h, w = min(BLOCK, ny - r), min(BLOCK, nx - c)
    xl, yt = x0 + c * CELL - M * BASE, y1 - r * CELL + M * BASE
    a = ee_pixels(dem_ee, xl, yt, w * N + 2 * M, h * N + 2 * M, BASE)["dem"]
    dem_bloques[rc] = (a, xl, yt)
    d = detectar(a)
    if d.empty:
        return d
    d = d[(d.i >= M) & (d.i < M + h * N) & (d.j >= M) & (d.j < M + w * N)].copy()   # solo el núcleo del bloque
    d["x"], d["y"] = xl + (d.j + 0.5) * BASE, yt - (d.i + 0.5) * BASE
    d["br"], d["bc"] = r, c
    return d
t0 = time.time()
with ThreadPoolExecutor(8) as ex:
    hoyas_mx = pd.concat(list(ex.map(bloque_crateres, jobs)), ignore_index=True)
hoyas_mx["lon"], hoyas_mx["lat"] = to_ll.transform(hoyas_mx.x.values, hoyas_mx.y.values)
rr, cc = ((y1 - hoyas_mx.y) // CELL).astype(int), ((hoyas_mx.x - x0) // CELL).astype(int)
hoyas_mx = hoyas_mx[en_mx[rr.clip(0, ny - 1), cc.clip(0, nx - 1)]].reset_index(drop=True)
print(f"México: {len(jobs)} bloques, {len(hoyas_mx)} depresiones cerradas de al menos {PROF_C:.0f} m. Tiempo {time.time()-t0:.0f} s")

# ---------- Luna y Marte ----------
hl = detectar(moon200)
hl["lon"], hl["lat"] = Transformer.from_crs(crs_moon, f"+proj=longlat +R={R_MOON} +no_defs", always_xy=True).transform(
    (-half + (hl.j + 0.5) * BASE).values, (half - (hl.i + 0.5) * BASE).values)
hl = hl[hl.lat <= -80.5].copy(); hl["cuerpo"] = "Luna"; hl["sitio"] = np.where(hl.lat <= -85, "Polo sur (85-90°S)", "Anillo 80-85°S")
hm = []; dem_marte = {}
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
    with rasterio.open(MARS_URL) as ds:
        for name, (la, lo) in SITIOS_MARTE.items():
            crs_loc = f"+proj=eqc +lat_ts={la} +lat_0=0 +lon_0={lo} +x_0=0 +y_0=0 +R={R_MARS} +units=m +no_defs"
            ytop = R_MARS * np.radians(la) + 50_000
            with WarpedVRT(ds, crs=crs_loc, transform=from_origin(-50_000, ytop, BASE, BASE), width=500, height=500, resampling=Resampling.bilinear) as vrt:
                a = vrt.read(1).astype("float32")
            dem_marte[name] = a
            d = detectar(a); d["cuerpo"], d["sitio"] = "Marte", name; hm.append(d)
hoyas_ref = pd.concat([hl] + hm, ignore_index=True)

# ---------- Filtro "tipo cráter" y resumen ----------
def tipo_crater(d):
    return (d.diam_km >= 0.6) & (d.diam_km <= 10) & (d.prof_m >= PROF_C) & (d.circ >= 0.6)
hoyas_mx["crater"] = tipo_crater(hoyas_mx); hoyas_ref["crater"] = tipo_crater(hoyas_ref)
res = hoyas_ref[hoyas_ref.crater].groupby(["cuerpo", "sitio"]).agg(n=("diam_km", "size"), diam_km=("diam_km", "median"), prof_m=("prof_m", "median"),
                                                                      prof_diam=("prof_diam", "median"), borde_m=("borde_m", "median"), circ=("circ", "median"))
c_mx = hoyas_mx[hoyas_mx.crater]
res.loc[("Tierra", "México"), :] = [len(c_mx), c_mx.diam_km.median(), c_mx.prof_m.median(), c_mx.prof_diam.median(), c_mx.borde_m.median(), c_mx.circ.median()]
print("\nDepresiones tipo cráter (0.6-10 km, >= 20 m, circulares). Medianas:"); print(res.round(3).to_string())
hoyas_mx.to_csv(f"{OUT}/hoyas_mexico.csv", index=False); hoyas_ref.to_csv(f"{OUT}/hoyas_referencia.csv", index=False)