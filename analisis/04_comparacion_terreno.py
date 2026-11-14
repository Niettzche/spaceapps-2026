# 04 · Comparación de terreno y prueba de humo
# Distancia de cada cuadro mexicano al perfil típico (mediana) de cada referencia:
#   pendientes = diferencia media entre los 19 percentiles (distancia de Wasserstein), relieve = diferencia en logaritmo.
# Cada una se divide entre el percentil 90 de esa misma distancia dentro de la referencia:
#   d <= 1 significa "tan parecido a la referencia como la referencia a sí misma". Solo mide forma del terreno.
Q = [f"slope_p{p}" for p in PCTS]

def distancias(tabla, grupo):
    prof = grupo[Q].median().values
    rel = np.log(grupo.relieve.clip(lower=1)).median()
    d_s = lambda t: np.abs(t[Q].values - prof).mean(axis=1)
    d_r = lambda t: np.abs(np.log(t.relieve.clip(lower=1).values) - rel)
    s90, r90 = np.percentile(d_s(grupo), 90), np.percentile(d_r(grupo), 90)
    zs, zr = d_s(tabla) / s90, d_r(tabla) / r90
    return zs, zr, np.maximum(zs, zr)

GRUPOS = {"luna": ("Luna · polo sur", ref[ref.sitio == "Polo sur (85-90°S)"]), "jezero": ("Marte · Jezero", ref[ref.sitio == "Cráter Jezero"]),
          "gale": ("Marte · Gale", ref[ref.sitio == "Cráter Gale"]), "oxia": ("Marte · Oxia Planum", ref[ref.sitio == "Oxia Planum"])}
PRUEBA = ["El Pinacate", "Cuatro Ciénegas", "Samalayuca", "Desierto de Vizcaíno"]
resumen = []
for k, (nombre, g) in GRUPOS.items():
    cand[f"zs_{k}"], cand[f"zr_{k}"], cand[f"d_{k}"] = distancias(cand, g)
    cand[f"rank_{k}"] = cand[f"d_{k}"].rank(method="min").astype(int)
    fila = {"referencia": nombre, "cuadros ref": len(g), "mexicanos con d<=1": int((cand[f"d_{k}"] <= 1).sum())}
    for lugar in PRUEBA:
        x, y = to_xy.transform(CONTROL[lugar][1], CONTROL[lugar][0])
        cerca = cand[np.hypot(cand.x - x, cand.y - y) <= 25_000]
        fila[lugar] = f"{cerca[f'd_{k}'].min():.2f} (#{int(cerca[f'rank_{k}'].min())})" if len(cerca) else "sin cuadros"
    resumen.append(fila)
print(f"Mejor cuadro a menos de 25 km de cada lugar de control: distancia y lugar entre {len(cand)} candidatos")
print(pd.DataFrame(resumen).to_string(index=False))
print("\nLos 8 cuadros mexicanos más parecidos al polo sur lunar (solo terreno):")
print(cand.nsmallest(8, "d_luna")[["cell_id", "lat", "lon", "slope_p50", "slope_p90", "relieve", "d_luna"]].round(2).to_string(index=False))
cand.to_csv(f"{OUT}/candidatos_mexico_10km.csv", index=False)