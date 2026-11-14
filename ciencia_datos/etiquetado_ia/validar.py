"""Mide el acierto del etiquetado de la IA contra fuentes externas (no las vio):
- volcánico: catálogo ciencia_datos/datos/crateres_conocidos_mx.csv (GVP y artículos), detección a ≤ 2.5 km
- mina: cantera de OpenStreetMap a ≤ 1 km (más estricto que los 2 km del detector, para que la "verdad" sea más limpia)
- impacto: Meteor Crater (Earth Impact Database), detección G00195
Uso: python3 validar.py  (lee etiquetas_ia.jsonl y el visor)"""
import json, math, csv, subprocess
from pathlib import Path
AQUI = Path(__file__).parent
S = {s["id"]: s for s in json.loads((AQUI.parent / "visor.html").read_text().split("const DATOS = ", 1)[1].split(";\nconst S", 1)[0])["sitios"]}
E = {}
for l in (AQUI / "etiquetas_ia.jsonl").read_text().splitlines():
    r = json.loads(l)
    if "error" not in r: E[r["id"]] = r
cat = list(csv.DictReader(subprocess.run(["git", "-C", str(Path.home() / "sa-niveles"), "show", "origin/main:ciencia_datos/datos/crateres_conocidos_mx.csv"],
                                         capture_output=True, text=True).stdout.splitlines()))
def km(a, b, c, d): return math.hypot((a - c) * 111, (b - d) * 111 * math.cos(math.radians(a)))
verdad = {}
for cid, s in S.items():
    for v in cat:
        if v["lat"] and km(s["lat"], s["lon"], float(v["lat"]), float(v["lon"])) <= 2.5:
            verdad[cid] = ("crater_volcanico", "catálogo: " + v["nombre"])
    if s.get("km_mina") is not None and s["km_mina"] <= 1.0 and cid not in verdad:
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
