# 05 · Depresiones cerradas (cráteres, maares, hoyas) en los tres cuerpos
# Se "rellena" cada cuadro como si lloviera y se mide lo que quedaría bajo el agua: es la forma más directa de ver cráteres.
# Límite: solo detecta depresiones que caben dentro del cuadro de 10 km y miden al menos ~400 m.
from skimage.morphology import reconstruction
from scipy import ndimage as ndi

PROF_MIN = 5.0      # metros: profundidad mínima para contar como depresión (por encima del ruido a 200 m)
AREA_MIN = 4        # píxeles: al menos 0.16 km2

def depresiones(dem):
    dem = dem.astype("float64")
    seed = dem.copy(); seed[1:-1, 1:-1] = dem.max()
    prof = reconstruction(seed, dem, method="erosion") - dem           # profundidad del relleno en cada píxel
    lab, n = ndi.label(prof > PROF_MIN)
    if n == 0:
        return {"dep_frac": 0.0, "dep_n": 0, "dep_prof_max": 0.0, "dep_circ": 0.0}
    idx = np.arange(1, n + 1)
    area = ndi.sum(np.ones_like(prof), lab, idx)
    ok = area >= AREA_MIN
    if not ok.any():
        return {"dep_frac": 0.0, "dep_n": 0, "dep_prof_max": 0.0, "dep_circ": 0.0}
    # circularidad: área frente a la del círculo que encierra la caja de la depresión (1 = círculo perfecto)
    circ = []
    for sl, a, o in zip(ndi.find_objects(lab), area, ok):
        if o:
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            circ.append(min(1.0, a / (np.pi * (max(h, w) / 2) ** 2)))
    pmax = ndi.maximum(prof, lab, idx)[ok]
    return {"dep_frac": float(area[ok].sum() / prof.size), "dep_n": int(ok.sum()),
            "dep_prof_max": float(pmax.max()), "dep_circ": float(np.mean(circ))}

t0 = time.time()
dep_mx = pd.DataFrame([dict(cell_id=k, **depresiones(p)) for k, p in parches_mx.items()])
dep_ref = pd.DataFrame([dict(cell_id=k, **depresiones(p)) for k, p in parches_ref.items()])
DEP = ["dep_frac", "dep_n", "dep_prof_max", "dep_circ"]
cand = cand.drop(columns=[c for c in DEP if c in cand.columns]).merge(dep_mx, on="cell_id", how="left")
ref = ref.drop(columns=[c for c in DEP if c in ref.columns]).merge(dep_ref, on="cell_id", how="left")
t = ref.groupby(["cuerpo", "sitio"])[DEP].median()
t["con depresiones %"] = (ref.assign(tiene=ref.dep_n > 0).groupby(["cuerpo", "sitio"]).tiene.mean() * 100).round(0)
t.loc[("Tierra", "Candidatos México"), :] = list(cand[DEP].median().values) + [round((cand.dep_n > 0).mean() * 100)]
print(f"Tiempo {time.time()-t0:.0f} s. Mediana por grupo:"); print(t.round(3).to_string())
for k in PRUEBA:
    x, y = to_xy.transform(CONTROL[k][1], CONTROL[k][0])
    cerca = cand[np.hypot(cand.x - x, cand.y - y) <= 25_000]
    print(f"{k}: de {len(cerca)} cuadros cercanos, {int((cerca.dep_n > 0).sum())} con depresiones; más profunda {cerca.dep_prof_max.max():.0f} m; máx. por cuadro {int(cerca.dep_n.max())}")
cand.to_csv(f"{OUT}/candidatos_mexico_10km.csv", index=False); ref.to_csv(f"{OUT}/referencias_luna_marte_10km.csv", index=False)
