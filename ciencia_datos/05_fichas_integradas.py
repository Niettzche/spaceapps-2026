"""05 · Fichas integradas y propuesta de lista corta.

Une, por candidato árido, todo lo que medimos: forma (detector), perfil por zona contra su gemelo lunar a 80 m, sombra polar,
geología (ASTER), clima (NASA POWER), etiqueta de IA verificada y, donde existe, la probabilidad Luna/Marte del modelo explicable.
Después propone una lista corta (AGENTS.md §6.4 c) con reglas declaradas. La lista es una PROPUESTA: la decide el equipo.

Uso (desde la raíz del repo):  python3 ciencia_datos/05_fichas_integradas.py
Salidas: ciencia_datos/salidas/fichas_integradas.csv, lista_corta.csv, lista_corta.md y naturales_nuevos.csv
"""
import json, math
from pathlib import Path
import pandas as pd

R = Path(__file__).resolve().parent
D, S = R / "datos", R / "salidas"

# ---------- universo: los candidatos áridos con clima (296; G00232 y G00239 son duplicados de Sonora a ≤ 1 km) ----------
clima = pd.read_csv(D / "clima_candidatos.csv")
mx = pd.read_csv(D / "crateres_mexico.csv")
gl = pd.read_csv(D / "global_crateres.csv")
forma = pd.concat([
    mx[mx.ndvi_p90 < 0.35].assign(id=lambda d: d.cid, region="México", mina=lambda d: d.tipo == "mina")
      [["id", "region", "diam_km", "prof_m", "prof_diam", "borde_m", "ndvi_p90", "km_mina", "mina", "nombre"]],
    gl[gl.arido].assign(id=lambda d: d.gid, nombre="")
      [["id", "region", "diam_km", "prof_m", "prof_diam", "borde_m", "ndvi_p90", "km_mina", "mina", "nombre"]],
]).drop_duplicates("id")
F = clima[["id", "lat", "lon", "t2m_media_c", "t2m_rango_diario_c", "t2m_min_extrema_c", "t2m_max_extrema_c", "precip_mm_dia"]].merge(
    forma.drop(columns=["region"]).assign(region=forma.region), on="id", how="left")

# ---------- etiqueta de IA, sombra polar y geología ----------
F = F.merge(pd.read_csv(D / "etiquetas_ia.csv")[["id", "tipo", "confianza", "razon"]].rename(columns={"tipo": "etiqueta_ia", "confianza": "conf_ia", "razon": "razon_ia"}), on="id", how="left")
F = F.merge(pd.read_csv(D / "iluminacion_geologia.csv").drop(columns=["fecha"]), on="id", how="left")

# ---------- perfil por zona contra el gemelo lunar a 80 m ----------
pr = json.load(open(D / "perfiles_radiales.json"))["sitios"]
filas = []
for p in pr:
    if "zonas_luna_perfil" not in p: continue
    z, g = p["zonas_luna_perfil"], p["gemelo_perfil"]
    filas.append(dict(id=p["id"], dif_fondo=z["fondo"], dif_pared=z["pared"], dif_borde=z["borde"], dif_alrededor=z["alrededor"],
                      dif_media=round(sum(z.values()) / 4, 4), gemelo_lat=g["lat"], gemelo_lon=g["lon"], gemelo_diam_km=g["d"], gemelo_prof_m=g["p"]))
F = F.merge(pd.DataFrame(filas), on="id", how="left")
# Diferencia RELATIVA: la absoluta está en unidades de d/D y premia lo plano (un hoyo plano difiere poco en d/D de cualquier cosa);
# dividida entre su propio d/D mide la diferencia como fracción de la profundidad del cráter
F["dif_rel"] = (F.dif_media / F.prof_diam).round(4)

# ---------- P(Luna) del modelo explicable Luna contra Marte, donde ya está calculada ----------
pl = pd.read_csv(S / "puntaje_luna_marte_mexico.csv")[["cid", "P_Luna", "dentro_95"]].rename(columns={"cid": "id"})
fe = json.load(open(S / "fichas_explicables.json"))
pl_g = pd.DataFrame([{"id": k.upper(), "P_Luna": v["forma_explicada"]["P_Luna"]} for k, v in fe.items()
                     if k.startswith("g") and "forma_explicada" in v])
F = F.merge(pd.concat([pl, pl_g]).drop_duplicates("id"), on="id", how="left")

# ---------- ¿análogo ya conocido? (≤ 5 km de data/known_analogs.json o de El Pinacate, donde entrenó el Apolo) ----------
kn = json.load(open(R.parent / "data/known_analogs.json"))["analogos"]
def km(a, b, c, d): return math.hypot((a - c) * 111, (b - d) * 111 * math.cos(math.radians(a)))
def conocido(r):
    for k in kn:
        if km(r.lat, r.lon, k["lat"], k["lon"]) <= 5: return k["nombre"]
    if km(r.lat, r.lon, 31.84444, -113.39111) <= 40: return "El Pinacate (entrenamiento Apolo 14, NASA SP-2015-626)"
    return ""
F["conocido_como"] = F.apply(conocido, axis=1)
F = F.round(4).sort_values("id")
F.to_csv(S / "fichas_integradas.csv", index=False)

# ---------- lista corta propuesta (reglas declaradas; provisional) ----------
REGLAS = {
    "base": "árido (NDVI p90 < 0.35); etiqueta de IA con confianza ≥ 0.7; forma con sombra polar en ≥ 80 % del cráter (sol a 1.5°)",
    "natural": "cráter volcánico o de impacto según la IA: los 3 con menor diferencia relativa de perfil contra su gemelo lunar (80 m; diferencia media / d/D)",
    "mina": "mina o cantera según la IA y junto a cantera de OpenStreetMap (≤ 2 km): las 3 más hondas para su tamaño (d/D), una por región si se puede",
}
base = F[(F.conf_ia >= 0.7) & (F.sombra_crater_tierra >= 0.8)]
nat = base[base.etiqueta_ia.isin(["crater_volcanico", "crater_impacto"])].nsmallest(3, "dif_rel").assign(papel="cráter natural: forma más lunar")
mn = base[(base.etiqueta_ia == "mina_o_cantera") & (base.km_mina <= 2)].sort_values("prof_diam", ascending=False)
mn = pd.concat([mn.drop_duplicates("region"), mn]).drop_duplicates("id").head(3).assign(papel="tajo minero: pendientes extremas (analogía rota por exceso)")
LC = pd.concat([nat, mn])
cols = ["papel", "id", "nombre", "region", "lat", "lon", "diam_km", "prof_m", "prof_diam", "etiqueta_ia", "conf_ia", "dif_media", "dif_rel", "dif_fondo", "dif_pared",
        "dif_borde", "dif_alrededor", "sombra_crater_tierra", "sombra_crater_luna", "ind_mafico", "t2m_rango_diario_c", "P_Luna", "conocido_como", "razon_ia"]
LC[cols].to_csv(S / "lista_corta.csv", index=False)

md = ["# Lista corta propuesta (provisional, la decide el equipo)", "",
      "Generada por `ciencia_datos/05_fichas_integradas.py` a partir de `fichas_integradas.csv`.", "", "**Reglas:**"]
md += [f"- {k}: {v}" for k, v in REGLAS.items()]
md += ["", "| Papel | id | Lugar | D (km) | d/D | IA | Dif. relativa | Dif. perfil fondo/pared/borde | Sombra polar (Tierra / gemelo) | Ya conocido |", "|---|---|---|---|---|---|---|---|---|---|"]
for r in LC.itertuples():
    if isinstance(r.nombre, str) and r.nombre:
        nom = r.nombre + (" (nombre por verificar)" if r.etiqueta_ia == "mina_o_cantera" else "")
    elif r.conocido_como:
        nom = r.conocido_como.split(" (")[0]
    else:
        nom = "sin nombre"
    lugar = nom + f", {r.region} ({r.lat:.3f}, {r.lon:.3f})"
    md.append(f"| {r.papel} | {r.id} | {lugar} | {r.diam_km:.2f} | {r.prof_diam:.3f} | {r.etiqueta_ia} ({r.conf_ia}) | "
              f"{r.dif_rel:.2f} | {r.dif_fondo:.4f} / {r.dif_pared:.4f} / {r.dif_borde:.4f} | {r.sombra_crater_tierra:.2f} / {r.sombra_crater_luna:.2f} | {r.conocido_como or 'no'} |")
# Lectura principal: se genera de los datos (no se escribe a mano)
base_nat = base[base.etiqueta_ia.isin(["crater_volcanico", "crater_impacto"])].sort_values("dif_rel")
nuevos = base_nat[base_nat.conocido_como == ""]
conocidos_en_lista = int((nat.conocido_como != "").sum())
lista_nuevos = "; ".join(f"{r.id} ({r.region}, dif. relativa {r.dif_rel:.2f})" for r in nuevos.itertuples())
md += ["", f"**Lectura principal:** {len(base_nat)} cráteres naturales pasan la regla base; {len(nuevos)} de ellos **no están en ninguna lista de análogos conocidos** "
       f"y son candidatos nuevos a revisar: {lista_nuevos}. Los {len(nat)} de la lista corta son los de perfil más parecido y {conocidos_en_lista} ya son análogos conocidos, "
       f"así que también funcionan como **controles** de que el método encuentra lo que debe. Si el equipo quiere, los nuevos mejor puntuados pueden entrar a la lista. "
       f"Ojo: \"no está en la lista\" no significa \"nunca usado\". `data/known_analogs.json` no es exhaustivo. Revisión del 2026-11-14 (`model/NIVEL2.md` §A): G00176 resultó ser Colton Crater, del entrenamiento del Apolo 15, y ya está en esa lista. G00263 (maar Al Hutaymah) y G00266 (cono Jabal Bayda) no aparecen como análogos en la literatura revisada. G00041 y G00037 no se revisaron. "
       f"Los **tajos mineros** ({mn.region.nunique()} regiones) son el otro hallazgo: análogo operativo de pendientes extremas, con la analogía rota por exceso de profundidad, sobre todo en el fondo."]
pd.DataFrame(nuevos[["id", "region", "lat", "lon", "diam_km", "prof_diam", "etiqueta_ia", "conf_ia", "dif_media", "dif_rel", "sombra_crater_tierra", "razon_ia"]]).to_csv(S / "naturales_nuevos.csv", index=False)
md += ["", "**Cómo leerla:**",
       "- *Dif. relativa*: diferencia media de perfil con su gemelo lunar dividida entre el d/D del propio cráter (0.10 = el perfil difiere en promedio un 10 % de su profundidad relativa). Es la que ordena la lista: la absoluta premia lo plano.",
       "- *Dif. perfil*: diferencia media con su gemelo lunar por zona, en profundidad/diámetro (mediana de todos los candidatos ≈ 0.002; criterio provisional del visor: < 0.015).",
       "- *Sombra polar*: fracción del cráter en sombra permanente si estuviera en el polo sur (Sol a 1.5°). Es un experimento: ningún lugar de la Tierra tiene ese Sol.",
       "- Clima (NASA POWER): los candidatos caen en 126 celdas de POWER, no en 296 climas distintos; la lluvia de Atacama no está verificada.",
       "- Los nombres de minas, si aparecen, están por verificar. Las coordenadas son las del detector.",
       "", "**Límites de todos:** gravedad, vacío, radiación, frío extremo (≈ 40 K en la sombra lunar), hielo y composición (el polo sur es anortosita)."]
(S / "lista_corta.md").write_text("\n".join(md) + "\n", encoding="utf-8")
print(f"fichas_integradas: {len(F)} candidatos · lista corta: {len(LC)}")
print(LC[["papel", "id", "nombre", "region", "prof_diam", "etiqueta_ia", "conf_ia", "dif_media", "dif_rel", "sombra_crater_tierra", "conocido_como"]].to_string(index=False))
