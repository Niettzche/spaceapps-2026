# 08 · Validación: ¿encuentra los cráteres mexicanos conocidos? ¿dónde están los grupos más densos?
# Coordenadas aproximadas (de memoria, por verificar contra fuentes): sirven para buscar una detección a menos de 2.5 km.
CONOCIDOS = {
    "El Elegante (Pinacate)": (31.846, -113.392), "MacDougal (Pinacate)": (31.974, -113.627), "Sykes (Pinacate)": (31.938, -113.563),
    "Cerro Colorado (Pinacate)": (31.917, -113.302), "Rincón de Parangueo (Gto.)": (20.431, -101.249), "Hoya La Alberca (Gto.)": (20.388, -101.203),
    "Alchichica (Pue.)": (19.414, -97.403), "Atexcac (Pue.)": (19.335, -97.450), "Aljojuca (Pue.)": (19.092, -97.533),
    "Joya Honda (S.L.P.)": (22.418, -100.787), "La Breña (Dgo.)": (24.420, -104.530)}
filas = []
for nombre, (la, lo) in CONOCIDOS.items():
    x, y = to_xy.transform(lo, la)
    dkm = np.hypot(hoyas_mx.x - x, hoyas_mx.y - y) / 1000
    if dkm.min() <= 2.5:
        h = hoyas_mx.loc[dkm.idxmin()]
        filas.append({"cráter": nombre, "detectado": "sí", "a km": round(dkm.min(), 1), "diám. km": round(h.diam_km, 2), "prof. m": round(h.prof_m),
                      "circ": round(h.circ, 2), "borde m": round(h.borde_m), "pasa filtro": "sí" if h.crater else "no"})
    else:
        filas.append({"cráter": nombre, "detectado": "no", "a km": round(dkm.min(), 1)})
val = pd.DataFrame(filas)
print(val.to_string(index=False))
print(f"\nDetectados: {(val.detectado == 'sí').sum()} de {len(val)}; pasan el filtro tipo cráter: {(val.get('pasa filtro') == 'sí').sum()}")

# Densidad: cráteres tipo cráter a menos de 15 km de cada uno
c_mx = hoyas_mx[hoyas_mx.crater].reset_index(drop=True)
from scipy.spatial import cKDTree
tree = cKDTree(c_mx[["x", "y"]].values)
c_mx["vecinos_15km"] = [len(v) - 1 for v in tree.query_ball_point(c_mx[["x", "y"]].values, 15_000)]
xp, yp = to_xy.transform(CONTROL["El Pinacate"][1], CONTROL["El Pinacate"][0])
c_mx["km_pinacate"] = (np.hypot(c_mx.x - xp, c_mx.y - yp) / 1000).round(0)
print(f"\nCráteres tipo cráter en México: {len(c_mx)}. Por franja de latitud:")
print(pd.cut(c_mx.lat, [14, 18, 20, 22, 24, 28, 33]).value_counts().sort_index().to_string())
print(f"A menos de 30 km del centro de El Pinacate: {(c_mx.km_pinacate <= 30).sum()}")
cols = ["lat", "lon", "diam_km", "prof_m", "prof_diam", "circ", "borde_m", "vecinos_15km", "km_pinacate"]
print("\nLos 25 más profundos:"); print(c_mx.nlargest(25, "prof_m")[cols].round(3).to_string(index=False))
print("\nLos 15 con más vecinos (grupos densos):"); print(c_mx.nlargest(15, "vecinos_15km")[cols].round(3).to_string(index=False))
c_mx.to_csv(f"{OUT}/crateres_mexico.csv", index=False)