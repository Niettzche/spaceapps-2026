# 02 · Terreno de los candidatos (Tierra)
# Datos: Copernicus DEM GLO-30 (ESA). Se baja la elevación ya promediada a 200 m y se mide con el MISMO código que la Luna y Marte.
glo = ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1").select("DEM")
dem_ee = (glo.mosaic().setDefaultProjection(glo.first().projection())
          .reduceResolution(ee.Reducer.mean(), maxPixels=256).unmask(0).toFloat().rename("dem"))

BLOCK = 16                                   # cuadros por lado de cada descarga (160 km = 800 píxeles)
need = np.zeros((ny, nx), bool); need[cand.row.values, cand.col.values] = True
jobs = [(r, c) for r in range(0, ny, BLOCK) for c in range(0, nx, BLOCK) if need[r:r + BLOCK, c:c + BLOCK].any()]

def bloque_terreno(rc):
    r, c = rc
    h, w = min(BLOCK, ny - r), min(BLOCK, nx - c)
    # un píxel extra por lado para que la pendiente en el borde use vecinos reales
    a = ee_pixels(dem_ee, x0 + c * CELL - BASE, y1 - r * CELL + BASE, w * N + 2, h * N + 2, BASE)["dem"]
    s, e = slope_deg(a)[1:-1, 1:-1], a[1:-1, 1:-1]
    out = []
    for i in range(h):
        for j in range(w):
            if need[r + i, c + j]:
                et = e[i * N:(i + 1) * N, j * N:(j + 1) * N]
                st = stats_tile(s[i * N:(i + 1) * N, j * N:(j + 1) * N], et)
                st.update(row=r + i, col=c + j)
                out.append((st, et.astype("float32")))
    return out

t0 = time.time()
with ThreadPoolExecutor(8) as ex:
    res = [x for part in ex.map(bloque_terreno, jobs) for x in part]
terr = pd.DataFrame([st for st, _ in res])
cand = cand.drop(columns=[c for c in terr.columns if c in cand.columns and c not in ("row", "col")]).merge(terr, on=["row", "col"], how="left")
parches_mx = {f"MX_{st['row']:03d}_{st['col']:03d}": p for st, p in res}      # relieve de cada cuadro, para el juego y la red
np.savez_compressed(f"{OUT}/parches_mexico.npz", **parches_mx)
cand.to_csv(f"{OUT}/candidatos_mexico_10km.csv", index=False)
print(f"Bloques: {len(jobs)}. Cuadros medidos: {cand.slope_mean.notna().sum()} de {len(cand)}. Tiempo {time.time()-t0:.0f} s")
print(cand[["slope_p50", "slope_p90", "slope_mean", "slope_stdDev", "relieve"]].describe().T[["mean", "min", "50%", "max"]].round(2))
for k in ("El Pinacate", "Cuatro Ciénegas", "Samalayuca", "Desierto de Vizcaíno"):
    r_, c_ = celda(*CONTROL[k]); m = cand[(cand.row == r_) & (cand.col == c_)]
    print(k, "->", m[["slope_p50", "slope_p90", "slope_stdDev", "relieve"]].round(2).to_dict("records")[0] if len(m) else "no es candidato")