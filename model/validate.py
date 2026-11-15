"""Validación del modelo (AGENTS.md §6.3): escribe model/VALIDATION.md.

Dos partes:
A. Prefiltro ambiental (dimensiones complementarias: árido, sin vegetación, relieve comparable) en puntos sin cráter medido.
   Descarta (veto por NDVI) pero no ordena: se reporta qué fracción de los sitios del detector lo pasa y qué tan juntos quedan:
   - controles negativos (data/negative_controls.json): selvas y zonas agrícolas húmedas → deben dar cerca de 0;
   - análogos conocidos (data/known_analogs.json): desiertos hiperáridos, campos de lava, cráteres → deben dar alto.
B. Forma (dimensión principal), con resultados ya medidos en ciencia_datos/:
   - cráteres de impacto terrestres (ciencia_datos/datos/impactos_tierra.csv) → deben caer dentro de la nube Luna+Marte;
   - catálogo de cráteres volcánicos conocidos de México → cuántos encuentra el detector;
   - generalización del modelo Luna contra Marte a sitios de Marte que no vio;
   - la misma validación por grupos espaciales de ciencia_datos/03, solo con cráteres de 2 km o más (objeción del instrumento);
   - tasa base: qué fracción de CUALQUIER depresión cae dentro de la nube (la nube descarta extremos, no confirma cráteres);
   - control negativo de forma: depresiones que la IA etiqueta como presa, valle o duna frente a cráteres naturales;
   - precisión del detector según la etiqueta de IA.

Uso:  uv run python -m model.validate
"""
from __future__ import annotations

import datetime
import json
import pathlib
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd

from model import features, forma
from model.score import DIMENSIONES, comparar

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATOS = RAIZ / "ciencia_datos" / "datos"
DESTINOS = ["polo_sur_lunar", "jezero"]
UMBRAL_NEGATIVO = 0.10     # (P) un control negativo debe quedar por debajo
UMBRAL_POSITIVO = 0.40     # (P) un análogo conocido debería quedar por encima


def cv_grupos(d: pd.DataFrame, feats: list[str], reps: int = 10) -> dict:
    """Réplica de ciencia_datos/03 (celda 10): logística balanceada, StratifiedGroupKFold(5) con grupos de 250 × 250 píxeles."""
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import balanced_accuracy_score
    from sklearn.model_selection import StratifiedGroupKFold
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    X, y, g = d[feats].to_numpy(float), d.cuerpo.to_numpy(object), d.grupo.to_numpy(object)
    ba, rl, rm = [], [], []
    for s in range(reps):
        pred = np.empty(len(y), object)
        for tr, te in StratifiedGroupKFold(5, shuffle=True, random_state=s).split(X, y, g):
            m = make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=3000)).fit(X[tr], y[tr])
            pred[te] = m.predict(X[te])
        ba.append(balanced_accuracy_score(y, pred))
        rl.append((pred[y == "Luna"] == "Luna").mean()); rm.append((pred[y == "Marte"] == "Marte").mean())
    return {"ba": float(np.mean(ba)), "sd": float(np.std(ba)), "luna": float(np.mean(rl)), "marte": float(np.mean(rm)),
            "n_luna": int((y == "Luna").sum()), "n_marte": int((y == "Marte").sum()), "reps": reps}


def parte_2km() -> list[str]:
    ref = pd.read_csv(DATOS / "hoyas_referencia.csv")
    r = ref[ref.crater.astype(bool) & ~ref.sitio.str.contains("|".join(forma.SITIOS_EXCLUIDOS))].copy()
    r["log_diam"] = np.log10(r.diam_km); r["borde_rel"] = r.borde_m / (r.diam_km * 1000)
    r["grupo"] = r.cuerpo + "|" + r.sitio + "|" + (r.i // 250).astype(int).astype(str) + "_" + (r.j // 250).astype(int).astype(str)
    filas = []
    for nombre, d in [("todos los tamaños", r), ("D ≥ 2 km", r[r.diam_km >= 2])]:
        for vs, feats in [("3 variables", forma.VARIABLES), ("solo d/D", ["prof_diam"])]:
            c = cv_grupos(d, feats)
            filas.append({"cráteres": nombre, "variables": vs, "n Luna": c["n_luna"], "n Marte": c["n_marte"],
                          "exactitud balanceada": f"{c['ba']:.1%} ± {c['sd']:.1%}", "acierto Luna": f"{c['luna']:.0%}",
                          "acierto Marte": f"{c['marte']:.0%}"})
    t = pd.DataFrame(filas)
    a, b = t.iloc[0]["exactitud balanceada"], t.iloc[2]["exactitud balanceada"]
    return ["**Exactitud con cráteres de 2 km o más** (respuesta a la objeción del instrumento). Misma validación que "
            "`ciencia_datos/03` (celda 10): regresión logística balanceada, `StratifiedGroupKFold(5)` con grupos espaciales de "
            "250 × 250 píxeles (50 × 50 km) por sitio, 10 repeticiones; aquí solo se filtra por diámetro. Con todos los tamaños da "
            f"{a}; con D ≥ 2 km, {b}. La separación Luna contra Marte se mantiene en los cráteres grandes, donde la resolución de MOLA "
            "pesa menos; con d/D sola baja, porque en los grandes el diámetro y el borde aportan más.", "",
            tabla_md(t, list(t.columns)), ""]


def parte_prefiltro(targets: dict) -> list[str]:
    """Qué fracción de los sitios del detector (todos áridos) pasa el prefiltro, y qué tan juntos quedan sus totales sin forma."""
    sin_forma = {k: v for k, v in DIMENSIONES.items() if k != "forma"}
    tot, vet = [], 0
    for f in sorted((RAIZ / "data" / "sites").glob("*.json")):
        s = json.loads(f.read_text(encoding="utf-8"))
        if "forma" not in s.get("variables", {}):
            continue
        r = comparar(s["variables"], targets[s["destino_ref"]]["variables"], sin_forma)
        vet += r["vetado"]
        if r["total"] is not None:
            tot.append(r["total"])
    a = np.array(tot)
    return [f"**Tasa del prefiltro en los sitios del detector.** De los {len(a)} sitios de `data/sites` con un cráter medido (todos de zonas "
            f"áridas, NDVI p90 < 0.35), {vet} quedan vetados y el {(a >= UMBRAL_POSITIVO).mean():.0%} da {UMBRAL_POSITIVO} o más sin la forma "
            f"(mediana {np.median(a):.2f}, percentiles 10–90: {np.percentile(a, 10):.2f}–{np.percentile(a, 90):.2f}, máximo {a.max():.2f}). "
            "Es decir: casi todo lo árido pasa y queda en una franja estrecha. El prefiltro **descarta** (selvas, cultivos, nieve) pero "
            "**no ordena** sitios áridos entre sí; lo que dice qué es cada sitio es la etiqueta verificada (sección B).", ""]


UMBRALES_EXPLORADOR = (0.6, 0.5, 0.45, 0.4)   # 0.6 = valor provisional de AGENTS.md §6.4; api/main.py usa 0.4 (P)


def parte_umbral(dn: pd.DataFrame, dp: pd.DataFrame) -> list[str]:
    """Explorador libre: qué umbral de propuesta deja pasar los análogos conocidos sin dejar pasar los controles negativos.
    Los totales son los mismos que devuelve POST /score (api/main.py llama a features.variables_tierra y score.comparar)."""
    hiper = dp.nombre.str.contains("Yungay|Death Valley|Mojave|Gran Desierto|Mars Desert")
    filas = []
    for u in UMBRALES_EXPLORADOR:
        f = {"umbral": u}
        for d in DESTINOS:
            f[f"conocidos {d}"] = f"{int((dp[f'total_{d}'] >= u).sum())} de {len(dp)}"
            f[f"hiperáridos {d}"] = f"{int((dp.loc[hiper, f'total_{d}'] >= u).sum())} de {int(hiper.sum())}"
        f["controles negativos"] = f"{int((dn[['total_polo_sur_lunar', 'total_jezero']].max(axis=1) >= u).sum())} de {len(dn)}"
        filas.append(f)
    t = pd.DataFrame(filas)
    mx = dp[[f"total_{d}" for d in DESTINOS]].max().max()
    return ["**Umbral del explorador libre** (POST /score; un punto libre no tiene cráter medido, así que la forma no entra). "
            f"El total más alto de un análogo conocido es {mx:.3f}: con el umbral provisional de 0.6 (AGENTS.md §6.4) nadie puede "
            "proponer un sitio. Hiperáridos = Yungay, Death Valley, Mojave, Gran Desierto de Altar y la Mars Desert Research Station.", "",
            tabla_md(t, list(t.columns)), "",
            "Con 0.4 (el mismo umbral que usa esta validación para decir que un análogo conocido pasa) los cinco hiperáridos pasan frente "
            "a Jezero y ningún control negativo pasa. Frente al polo sur lunar los totales son más bajos (la oscilación térmica de 176 K "
            "está más lejos del máximo terrestre), así que pasan menos. `api/main.py` usa 0.4 (P); como el prefiltro no ordena sitios "
            "áridos, una propuesta que lo pasa queda `propuesto_usuario`, pendiente de revisión, no validada.", ""]


def puntos(archivo: str, clave: str) -> list[dict]:
    js = json.loads((RAIZ / "data" / archivo).read_text(encoding="utf-8"))
    return [p for p in js.get(clave, []) if p.get("lat") is not None and p.get("lon") is not None]


def evaluar(p: dict, targets: dict) -> dict:
    t = features.variables_tierra(p["lat"], p["lon"])
    fila = {"nombre": p["nombre"], "lat": p["lat"], "lon": p["lon"],
            **{k: v.get("valor") for k, v in t["variables"].items()}, "errores": "; ".join(t["errores"])}
    for d in DESTINOS:
        r = comparar(t["variables"], targets[d]["variables"])
        fila[f"total_{d}"] = r["total"]; fila[f"vetado_{d}"] = r["vetado"]; fila[f"confianza_{d}"] = r["confianza"]
    return fila


def tabla_md(df: pd.DataFrame, cols: list[str]) -> str:
    def f(v):
        if isinstance(v, (bool, np.bool_)):
            return "sí" if v else "no"
        if isinstance(v, float):
            return "—" if np.isnan(v) else f"{v:.3g}"
        return "—" if v is None else str(v)
    filas = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    filas += ["| " + " | ".join(f(r[c]) for c in cols) + " |" for _, r in df.iterrows()]
    return "\n".join(filas)


def cotejo_catalogo(radio_km: float = 2.5) -> dict:
    """Cuántos cráteres del catálogo encuentra el detector (misma lógica que ciencia_datos/03)."""
    cat = pd.read_csv(DATOS / "crateres_conocidos_mx.csv")
    h = pd.read_csv(DATOS / "hoyas_mexico.csv")
    c = cat.dropna(subset=["lat", "lon"]).reset_index(drop=True)
    la1, lo1 = np.radians(c.lat.to_numpy())[:, None], np.radians(c.lon.to_numpy())[:, None]
    la2, lo2 = np.radians(h.lat.to_numpy())[None, :], np.radians(h.lon.to_numpy())[None, :]
    d = 6371 * 2 * np.arcsin(np.sqrt(np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2))
    k = d.argmin(1)
    c["a_km"], c["hid"], c["crater"] = d[np.arange(len(c)), k], h.hid.to_numpy()[k], h.crater.to_numpy()[k].astype(bool)
    c["detectado"] = c.a_km <= radio_km
    dup = c[c.detectado].sort_values("a_km").duplicated("hid")
    c.loc[dup[dup].index, "detectado"] = False
    c["pasa"] = c.detectado & c.crater
    rango = c.diam_km_aprox.between(0.6, 10) | c.diam_km_aprox.isna()
    nd = c[~c.detectado]
    lago = nd.lago.astype(str).str.lower().str.startswith(("si", "sí", "estacional"))
    chico = nd.diam_km_aprox < 0.6
    return {"n_catalogo": len(cat), "con_coord": len(c), "en_rango": int(rango.sum()),
            "detectado": float(c[rango].detectado.mean()), "pasa": float(c[rango].pasa.mean()),
            "chico": int(chico.sum()), "lago": int((lago & ~chico).sum()), "otra": int((~lago & ~chico).sum())}


def parte_forma() -> list[str]:
    out = ["## B. Forma (dimensión principal)", ""]
    res = forma.resumen_modelo()
    out.append(f"Modelo: regresión logística Luna contra Marte con {res['n_luna']:,} cráteres lunares y {res['n_marte']} marcianos "
               f"(variables {', '.join(res['variables'])}; sitios de Marte excluidos: {', '.join(res['sitios_marte_excluidos'])}). "
               "Exactitud balanceada fuera de pliegue con grupos espaciales: 78 %; en un sitio de Marte nunca visto, entre 70 % (Gale) "
               "y 92 % (Meridiani). Detalle en `ciencia_datos/03_etiquetas_por_fuentes.ipynb`.")
    out += ["", "**Objeción del instrumento** (MOLA ≈ 463 m de resolución efectiva): con LOLA suavizado a esa resolución (gaussiano con FWHM de 463 m), "
            "el d/D lunar baja de 0.058 a 0.043 con todos los tamaños y de 0.059 a 0.051 con D ≥ 2 km (Marte: 0.027 y 0.019). La separación en "
            "cráteres de 2 km o más no es instrumental; en los de menos de 1 km, parcialmente sí. No se reentrenó el modelo con LOLA suavizado. "
            "Detalle en `model/NIVEL2.md` §B y `analisis/24_experimento_instrumento_marte.py`."]
    out.append("")
    imp = pd.read_csv(DATOS / "impactos_tierra.csv")
    imp = imp[imp.detectado.astype(bool) & (imp.nombre != "Xiuyan")]
    pf = forma.puntuar(imp.diam_km, imp.prof_m, imp.borde_m)
    imp = imp.assign(P_Luna=pf.P_Luna.round(3).values, dist=pf.dist.round(2).values, dentro_95=pf.dentro_95.values)
    out.append(f"**Cráteres de impacto terrestres** (control positivo de forma): {int(imp.dentro_95.sum())} de {len(imp)} caen dentro "
               "del 95 % de la nube Luna+Marte. Xiuyan se excluye (la depresión detectada no coincide en tamaño) y Brent no se detecta "
               "(erosionado, con bosque y lagos). Coordenadas aproximadas del Earth Impact Database.")
    out.append("")
    out.append(tabla_md(imp, ["nombre", "diam_km", "prof_diam", "P_Luna", "dist", "dentro_95"]))
    out.append("")
    c = cotejo_catalogo()
    out.append("**Detector frente a cráteres volcánicos conocidos de México** (`ciencia_datos/datos/crateres_conocidos_mx.csv`, "
               f"{c['n_catalogo']} cráteres con fuente, {c['con_coord']} con coordenadas): de {c['en_rango']} en el rango del detector "
               f"(0.6–10 km o sin diámetro), encuentra el {c['detectado']:.0%} y el {c['pasa']:.0%} pasa el filtro tipo cráter. "
               f"No detectados: {c['lago']} con lago (el DEM ve el espejo de agua), {c['chico']} menores de 0.6 km y {c['otra']} por otras "
               "razones (islas, coordenadas desplazadas, poca profundidad). Mismo cotejo que `ciencia_datos/03_etiquetas_por_fuentes.ipynb` "
               "(radio de 2.5 km; una depresión cuenta una sola vez).")
    out += [""] + parte_2km()
    out += parte_discriminacion()
    return out


def auc(pos, neg) -> float:
    """Área bajo la curva ROC por Mann-Whitney: probabilidad de que un positivo puntúe más que un negativo (0.5 = no separa)."""
    pos, neg = np.asarray(pos, float), np.asarray(neg, float)
    return float(((pos[:, None] > neg[None, :]).sum() + 0.5 * (pos[:, None] == neg[None, :]).sum()) / (len(pos) * len(neg)))


def p_permutacion(pos, neg, n: int = 5000, semilla: int = 0) -> float:
    """Prueba de permutación de dos colas para el AUC: qué tan seguido el azar da un AUC tan lejos de 0.5 como el observado."""
    pos, neg = np.asarray(pos, float), np.asarray(neg, float)
    obs, todo, k = abs(auc(pos, neg) - 0.5), np.concatenate([pos, neg]), len(pos)
    rng = np.random.default_rng(semilla)
    hits = sum(abs(auc(z[:k], z[k:]) - 0.5) >= obs for z in (rng.permutation(todo) for _ in range(n)))
    return (hits + 1) / (n + 1)


NATURALES_IA = ["crater_volcanico", "crater_impacto"]
NEGATIVOS_IA = ["presa_o_lago", "valle_o_canada", "hondonada_eolica_o_duna"]


def parte_discriminacion() -> list[str]:
    out = ["### ¿La forma distingue un cráter de otra depresión cerrada?", ""]
    # 1. Tasa base de la nube: todas las depresiones de México que encontró el detector (sin filtro de cráter ni de aridez)
    h = pd.read_csv(DATOS / "hoyas_mexico.csv")
    pf = forma.puntuar(h.diam_km, h.prof_m, h.borde_m)
    h = h.assign(dentro=pf.dentro_95.values, entorno=pd.cut(h.ndvi_p90, [-1, 0.35, 0.7, 1.01], labels=["árido", "intermedio", "húmedo"]),
                 filtro=np.where(h.crater.astype(bool), "pasa el filtro de cráter", "no lo pasa"))
    tb = h.groupby(["filtro", "entorno"], observed=True).agg(n=("dentro", "size"), dentro_95=("dentro", "mean")).reset_index()
    tb["dentro_95"] = (tb.dentro_95 * 100).round(0).astype(int).astype(str) + " %"
    out += [f"**Tasa base de la nube Luna+Marte.** De las {len(h):,} depresiones cerradas que el detector encontró en México "
            f"(cualquier forma, cualquier vegetación), el {h.dentro.mean():.0%} cae dentro del 95 % de la nube. Es decir: **la nube "
            "descarta formas extremas (sobre todo tajos muy hondos), pero no confirma que algo sea un cráter**. Los 8 de 8 impactos de "
            "arriba son una condición necesaria, no una prueba.", "", tabla_md(tb, ["filtro", "entorno", "n", "dentro_95"]), ""]
    # 2. Control negativo de forma, con la etiqueta de IA (confianza ≥ 0.7)
    f = pd.read_csv(RAIZ / "ciencia_datos" / "salidas" / "fichas_integradas.csv")
    f = f[f.conf_ia >= 0.7].dropna(subset=["diam_km", "prof_m", "borde_m"]).copy()
    pf = forma.puntuar(f.diam_km, f.prof_m, f.borde_m)
    f = f.assign(P_Luna_m=pf.P_Luna.values, forma_luna=pf.forma_polo_sur_lunar.values, forma_mejor=np.maximum(pf.forma_polo_sur_lunar, pf.forma_jezero).values,
                 dentro=pf.dentro_95.values)
    f["grupo"] = np.where(f.etiqueta_ia.isin(NATURALES_IA), "cráter natural (IA)", np.where(f.etiqueta_ia.isin(NEGATIVOS_IA), "presa, valle o duna (IA)", None))
    g = f[f.grupo.notna()]
    res = g.groupby("grupo").agg(n=("forma_mejor", "size"), forma_mejor_mediana=("forma_mejor", "median"), P_Luna_mediana=("P_Luna_m", "median"),
                                 dentro_95=("dentro", "mean"), dD_mediana=("prof_diam", "median"), dif_perfil_mediana=("dif_media", "median")).reset_index()
    res["dentro_95"] = (res.dentro_95 * 100).round(0).astype(int).astype(str) + " %"
    nat, neg = g[g.grupo.str.startswith("cráter")], g[~g.grupo.str.startswith("cráter")]
    a_forma, a_dd = auc(nat.forma_mejor, neg.forma_mejor), auc(nat.prof_diam, neg.prof_diam)
    nat_p, neg_p = nat.dif_media.dropna(), neg.dif_media.dropna()
    a_perfil = auc(-nat_p, -neg_p) if len(nat_p) and len(neg_p) else float("nan")
    out += ["**Control negativo de forma.** Candidatos áridos con etiqueta de IA de confianza ≥ 0.7: cráteres naturales (volcánico o de impacto) "
            "frente a depresiones que no son cráteres (presa o lago, valle o cañada, hondonada eólica o duna). Si la forma distinguiera, "
            "los cráteres tendrían puntajes claramente más altos. El AUC mide eso: 0.5 = no separa, 1 = separa perfecto.", "",
            tabla_md(res, ["grupo", "n", "forma_mejor_mediana", "P_Luna_mediana", "dentro_95", "dD_mediana", "dif_perfil_mediana"]), "",
            f"AUC de separación cráter natural frente a presa/valle/duna ({len(nat)} contra {len(neg)} casos; p = prueba de permutación de dos colas, "
            f"5,000 repeticiones): puntaje de forma {a_forma:.2f} (p = {p_permutacion(nat.forma_mejor, neg.forma_mejor):.2f}); "
            f"d/D {a_dd:.2f} (p = {p_permutacion(nat.prof_diam, neg.prof_diam):.2f}); diferencia de perfil con el gemelo lunar {a_perfil:.2f} "
            f"(p = {p_permutacion(-nat_p, -neg_p):.2f}; menor diferencia = más lunar). Un AUC por debajo de 0.5 quiere decir que las presas, "
            "valles y dunas puntúan **más** lunar que los cráteres: son más planas; el puntaje de forma las toma por marcianas (en Marte los cráteres son planos) y la diferencia de perfil absoluta premia lo plano (por eso la lista corta usa `dif_rel` = diferencia media / d/D, en `ciencia_datos/salidas/fichas_integradas.csv`).", "",
            "**Límite declarado.** La forma sola (3 medidas a 200 m) no distingue un cráter de otra depresión cerrada de tamaño parecido. "
            "Por eso el catálogo usa la **etiqueta verificada** (IA sobre imagen de satélite y relieve, revisada contra fuentes) para decidir "
            "qué es un cráter, y la forma solo para decir **qué tan lunar o marciano** es un cráter ya identificado.", ""]
    # 3. Precisión del detector según la IA
    todas = pd.read_csv(RAIZ / "ciencia_datos" / "salidas" / "fichas_integradas.csv")
    vc = todas.etiqueta_ia.value_counts()
    n_nat = int(vc.reindex(NATURALES_IA).fillna(0).sum()); n_mina = int(vc.get("mina_o_cantera", 0))
    out += [f"**Precisión del detector según la IA.** De los {len(todas)} candidatos áridos del detector (México + Atacama, Arizona y Arabia), "
            f"la IA etiqueta {n_nat} como cráteres naturales ({n_nat / len(todas):.0%}) y {n_mina} como minas o canteras ({n_mina / len(todas):.0%}); "
            "el resto son valles, presas, dunas, otras formas o casos que no se pueden decidir: "
            + ", ".join(f"{k} {v}" for k, v in vc.items() if k not in NATURALES_IA + ["mina_o_cantera"]) + ". "
            "Ojo: la IA solo está validada en 33 casos (29 aciertos, IC 95 % 72–97 %) y esos casos son minas, volcanes y Meteor Crater; "
            "valles, presas y dunas no tienen casos validados. El detector es un **detector de depresiones cerradas con forma de cráter**, "
            "no un detector de cráteres.", ""]
    return out


def main():
    targets = {d: json.loads((RAIZ / "data" / "targets" / f"{d}.json").read_text(encoding="utf-8")) for d in DESTINOS}
    neg, pos = puntos("negative_controls.json", "controles"), puntos("known_analogs.json", "analogos")
    with ThreadPoolExecutor(6) as ex:
        dn = pd.DataFrame(list(ex.map(lambda p: evaluar(p, targets), neg)))
        dp = pd.DataFrame(list(ex.map(lambda p: evaluar(p, targets), pos)))
    hoy = datetime.date.today().isoformat()
    pesos = ", ".join(f"{k} {v['peso']}" for k, v in DIMENSIONES.items())
    out = ["# Validación del modelo (frente modelo)", "",
           f"Generado por `model/validate.py` el {hoy}. Pesos (P): {pesos}. Umbrales (P): control negativo < {UMBRAL_NEGATIVO}, "
           f"análogo conocido > {UMBRAL_POSITIVO}.", "",
           "Ojo: `oscilacion_termica` vale entre 0.20 y 0.33 en todos los sitios (mediana 0.28), porque los dos destinos (Luna 176 K, "
           "Jezero 55 K) superan el máximo terrestre de 40 K y se recortan ahí. Es una dimensión que la Tierra no alcanza: rebaja todos los "
           "totales casi por igual y no ordena sitios. No se cambia el peso antes de la entrega (`model/NIVEL2.md` §C).", "",
           "## A. Prefiltro ambiental (dimensiones complementarias)", "",
           "Las dimensiones complementarias funcionan como un **prefiltro ambiental**: dicen si un punto es árido, sin vegetación y de "
           "relieve comparable. **Descartan pero no ordenan.** En estos puntos no hay un cráter medido, así que la forma no aplica: la "
           "similitud usa clima (NASA POWER), vegetación (MODIS) y pendiente (Copernicus DEM a 200 m), y la confianza baja en consecuencia.", ""]
    cols = ["nombre", "oscilacion_termica", "precipitacion", "ndvi", "pendiente", "total_polo_sur_lunar", "total_jezero", "vetado_jezero"]
    for titulo, df, ok in [("Controles negativos", dn, lambda d: (d[["total_polo_sur_lunar", "total_jezero"]].max(axis=1) < UMBRAL_NEGATIVO)),
                           ("Análogos conocidos", dp, lambda d: (d[["total_polo_sur_lunar", "total_jezero"]].max(axis=1) > UMBRAL_POSITIVO))]:
        if df.empty:
            out += [f"### {titulo}", "", "Sin coordenadas con fuente todavía.", ""]
            continue
        df["pasa"] = ok(df)
        out += [f"### {titulo}: {int(df.pasa.sum())} de {len(df)} pasan", "", tabla_md(df, cols + ["pasa"]), ""]
        if titulo == "Análogos conocidos" and (~df.pasa).any():
            out += ["**Lectura.** El prefiltro ambiental mide clima árido, suelo desnudo y relieve suave. Pasan los análogos "
                    "elegidos por eso mismo (desiertos hiperáridos, dunas, cráteres en zonas secas). No pasan los que son análogos por "
                    "otra razón que estas variables no ven: frío polar, lava en clima húmedo, química del agua (Río Tinto), "
                    "microbialitos y cenotes, cuevas, o estructuras sepultadas. Que no pasen es esperable y marca el alcance del "
                    "prefiltro: no reemplaza a la forma ni a la composición. No pasan: " + ", ".join(df.loc[~df.pasa, "nombre"]) + ".", ""]
        if titulo == "Análogos conocidos":
            out += parte_umbral(dn, df)
        if df.errores.str.len().gt(0).any():
            out += ["Errores de medición: " + " · ".join(f"{n}: {e}" for n, e in zip(df.nombre, df.errores) if e), ""]
    out += parte_prefiltro(targets)
    out += parte_forma()
    out += ["", "## Límites que siempre se declaran", "",
            "Gravedad, presión atmosférica, radiación y vacío lunar no se reproducen en la Tierra; ningún puntaje los incluye."]
    (RAIZ / "model" / "VALIDATION.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print("\n".join(out))


if __name__ == "__main__":
    main()
