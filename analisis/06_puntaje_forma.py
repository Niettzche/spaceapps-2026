# 06 · Puntaje combinado de forma: pendientes + relieve + depresiones
# La distancia de depresiones compara número, profundidad máxima (en log) y fracción de área, cada una en unidades
# de la dispersión interna de la referencia (percentil 90). El puntaje final es el peor de los tres criterios:
# un cuadro solo sale bien si se parece en todo, no en promedio.
SITIO_REF = {"luna": ("Luna · polo sur", "Polo sur (85-90°S)"), "jezero": ("Marte · Jezero", "Cráter Jezero"),
             "gale": ("Marte · Gale", "Cráter Gale"), "oxia": ("Marte · Oxia Planum", "Oxia Planum")}
GRUPOS = {k: (n, ref[ref.sitio == s]) for k, (n, s) in SITIO_REF.items()}   # se rehace: `ref` ya trae las columnas de depresiones

def z_dep(tabla, grupo):
    feats = [lambda t: t["dep_n"].values.astype(float), lambda t: np.log1p(t["dep_prof_max"].values), lambda t: t["dep_frac"].values]
    zs = []
    for f in feats:
        med = np.median(f(grupo)); s90 = max(np.percentile(np.abs(f(grupo) - med), 90), 1e-9)
        zs.append(np.abs(f(tabla) - med) / s90)
    return np.mean(zs, axis=0)

resumen = []
for k, (nombre, g) in GRUPOS.items():
    cand[f"zd_{k}"] = z_dep(cand, g)
    cand[f"f_{k}"] = cand[[f"zs_{k}", f"zr_{k}", f"zd_{k}"]].max(axis=1)
    cand[f"frank_{k}"] = cand[f"f_{k}"].rank(method="min").astype(int)
    propio = np.maximum(distancias(g, g)[2], z_dep(g, g))
    fila = {"referencia": nombre, "mexicanos con f<=1": int((cand[f"f_{k}"] <= 1).sum()), "ref. consigo misma f<=1 %": round((propio <= 1).mean() * 100)}
    for lugar in PRUEBA:
        x, y = to_xy.transform(CONTROL[lugar][1], CONTROL[lugar][0])
        cerca = cand[np.hypot(cand.x - x, cand.y - y) <= 25_000]
        fila[lugar] = f"{cerca[f'f_{k}'].min():.2f} (#{int(cerca[f'frank_{k}'].min())})"
    resumen.append(fila)
print(f"Forma completa. Mejor cuadro a menos de 25 km de cada lugar de control: puntaje y lugar entre {len(cand)}")
print(pd.DataFrame(resumen).to_string(index=False))

xp, yp = to_xy.transform(CONTROL["El Pinacate"][1], CONTROL["El Pinacate"][0])
cand["km_pinacate"] = (np.hypot(cand.x - xp, cand.y - yp) / 1000).round(0)
cols = ["cell_id", "lat", "lon", "slope_p50", "slope_p90", "relieve", "dep_n", "dep_prof_max", "ndvi_p90", "f_desnudo", "f_luna", "km_pinacate"]
print("\nLos 20 cuadros mexicanos más parecidos al polo sur lunar (forma completa):")
print(cand.nsmallest(20, "f_luna")[cols].round(2).to_string(index=False))
cand.to_csv(f"{OUT}/candidatos_mexico_10km.csv", index=False)