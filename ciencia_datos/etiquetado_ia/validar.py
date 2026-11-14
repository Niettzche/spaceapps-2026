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
print(f"\nAcierto contra fuentes externas: {ok}/{tot} = {ok / max(tot, 1):.0%}")
por = {}
for f in filas: por.setdefault(f[1], [0, 0]); por[f[1]][0] += f[4] == "✓"; por[f[1]][1] += 1
print({k: f"{a}/{b}" for k, (a, b) in por.items()})
from collections import Counter
print("Etiquetas en todos:", Counter(e["tipo"] for e in E.values()).most_common())
