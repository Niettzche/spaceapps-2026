"""Mide el acierto del etiquetado de la IA contra fuentes externas (no las vio):
- volcánico: catálogo ciencia_datos/datos/crateres_conocidos_mx.csv (GVP y artículos), detección a ≤ 2.5 km
- mina: cantera de OpenStreetMap a ≤ 1 km (más estricto que los 2 km del detector, para que la "verdad" sea más limpia)
- impacto: Meteor Crater (Earth Impact Database), detección G00195
Uso: python3 ciencia_datos/etiquetado_ia/validar.py  (lee ciencia_datos/datos/: etiquetas_ia.csv, candidatos y catálogo)"""
import json, math, csv
from pathlib import Path
AQUI = Path(__file__).parent
DATOS = AQUI.parent / "datos"                      # ciencia_datos/datos del repo (no el visor local)
def leer(n): return list(csv.DictReader(open(DATOS / n, encoding="utf-8")))
S = {}
for r in leer("crateres_mexico.csv"):
    if float(r["ndvi_p90"]) < 0.35:
        S[r["cid"]] = dict(lat=float(r["lat"]), lon=float(r["lon"]), km_mina=float(r["km_mina"]) if r["km_mina"] else None)
for r in leer("global_crateres.csv"):
    if r["arido"] == "True":
        S.setdefault(r["gid"], dict(lat=float(r["lat"]), lon=float(r["lon"]), km_mina=float(r["km_mina"]) if r["km_mina"] else None))
E = {r["id"]: r for r in leer("etiquetas_ia.csv")}
cat = [v for v in leer("crateres_conocidos_mx.csv") if v["lat"]]
def km(a, b, c, d): return math.hypot((a - c) * 111, (b - d) * 111 * math.cos(math.radians(a)))
verdad = {}
for cid, s in S.items():
    if cid not in E: continue
    dist = [(km(s["lat"], s["lon"], float(v["lat"]), float(v["lon"])), v["nombre"]) for v in cat]
    dmin, nom = min(dist)
    if dmin <= 2.5:
        verdad[cid] = ("crater_volcanico", f"catálogo: {nom} ({dmin:.2f} km)")     # el más cercano
    elif s["km_mina"] is not None and s["km_mina"] <= 1.0:
        verdad[cid] = ("mina_o_cantera", f"OSM a {s['km_mina']} km")
verdad["G00195"] = ("crater_impacto", "Meteor Crater")
ok = tot = 0; filas = []
for cid, (t, fuente) in verdad.items():
    if cid not in E: continue
    tot += 1; acierta = E[cid]["tipo"] == t; ok += acierta
    filas.append((cid, t, E[cid]["tipo"], E[cid]["confianza"], "✓" if acierta else "✗", fuente))
for f in sorted(filas, key=lambda x: x[1]): print(*f, sep=" | ")
def binom_cdf(k, n, p):
    return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(k + 1))
def clopper_pearson(x, n, alfa=0.05):
    """Intervalo exacto (Clopper-Pearson) para una proporción binomial, por bisección sobre la binomial (sin scipy)."""
    def biseccion(f, lo=0.0, hi=1.0):
        for _ in range(100):
            m = (lo + hi) / 2
            lo, hi = (m, hi) if f(m) else (lo, m)
        return (lo + hi) / 2
    bajo = 0.0 if x == 0 else biseccion(lambda p: 1 - binom_cdf(x - 1, n, p) < alfa / 2)   # P(X ≥ x | p) = α/2
    alto = 1.0 if x == n else biseccion(lambda p: binom_cdf(x, n, p) > alfa / 2)           # P(X ≤ x | p) = α/2
    return bajo, alto
lo, hi = clopper_pearson(ok, tot)
print(f"\nAcierto contra fuentes externas: {ok}/{tot} = {ok / max(tot, 1):.0%}")
print(f"Intervalo de confianza al 95 % (Clopper-Pearson, exacto): {lo:.1%} – {hi:.1%}  [{lo:.3f}, {hi:.3f}]")
print("Ojo: los casos no son una muestra al azar (son los que tienen verdad externa: minas de OSM, volcanes del catálogo y Meteor Crater);"
      " el intervalo vale para ese tipo de casos. Valle, presa y duna no tienen casos validados: no extrapolar a los 298.")
por = {}
for f in filas: por.setdefault(f[1], [0, 0]); por[f[1]][0] += f[4] == "✓"; por[f[1]][1] += 1
print({k: f"{a}/{b}" for k, (a, b) in por.items()})
from collections import Counter
print("Etiquetas en todos:", Counter(e["tipo"] for e in E.values()).most_common())
