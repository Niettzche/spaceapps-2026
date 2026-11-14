# 13 · Experimento: ¿FABDEM (Copernicus sin bosques ni edificios) elimina los falsos cráteres de selva?
# Se re-detecta con FABDEM en los mismos bloques de 160 km de una muestra de detecciones y se compara con GLO-30.
fab = ee.ImageCollection("projects/sat-io/open-datasets/FABDEM")
print("FABDEM imágenes:", fab.size().getInfo(), "| bandas:", fab.first().bandNames().getInfo())
fab_ee = (fab.mosaic().setDefaultProjection(fab.first().projection())
          .reduceResolution(ee.Reducer.mean(), maxPixels=256).unmask(0).toFloat().rename("dem"))

def detectar_bloque(img, rc):
    r, c_ = rc; h, w = min(BLOCK, ny - r), min(BLOCK, nx - c_)
    xl, yt = x0 + c_ * CELL - M * BASE, y1 - r * CELL + M * BASE
    a = ee_pixels(img, xl, yt, w * N + 2 * M, h * N + 2 * M, BASE)["dem"]
    d = detectar(a)
    if d.empty: return d
    d = d[(d.i >= M) & (d.i < M + h * N) & (d.j >= M) & (d.j < M + w * N)].copy()
    d["x"], d["y"] = xl + (d.j + 0.5) * BASE, yt - (d.i + 0.5) * BASE
    return d[tipo_crater(d)]

# Bloques: 4 de selva (Chiapas/Oaxaca/Huasteca) con muchas detecciones + 2 áridos con cráteres reales (Pinacate, Zacatecas)
cnt = c.assign(rc=list(zip(c.br.astype(int), c.bc.astype(int))))
selva = cnt[cnt.ndvi_p90 > 0.7].rc.value_counts().head(4).index.tolist()
arido = [tuple(cnt.loc[cnt.cid == k, "rc"].iloc[0]) for k in ("MX0008", "MX0207")]
filas = []
for rc in selva + arido:
    g = detectar_bloque(dem_ee, rc); f = detectar_bloque(fab_ee, rc)
    # ¿siguen las detecciones reales? (cráteres áridos conocidos del bloque)
    reales = c[(c.br == rc[0]) & (c.bc == rc[1]) & (c.ndvi_p90 < 0.35) & (c.prof_m >= 60)]
    keep = sum(int((np.hypot(f.x - r_.x, f.y - r_.y) < 1500).any()) for r_ in reales.itertuples()) if len(f) else 0
    filas.append({"bloque": rc, "zona": "selva" if rc in selva else "árida", "GLO-30": len(g), "FABDEM": len(f),
                  "reales (prof≥60 m, árido)": len(reales), "reales que FABDEM conserva": keep})
print(pd.DataFrame(filas).to_string(index=False))
