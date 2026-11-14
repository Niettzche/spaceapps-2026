"""Similitud de FORMA (dimensión principal del modelo, AGENTS.md §6.1 y §6.3).

Modelo explicable entrenado con cráteres reales de la Luna (LOLA, polo sur) y de Marte (HRSC+MOLA, 6 sitios):
- Regresión logística Luna contra Marte sobre tres variables medidas igual en los tres cuerpos a 200 m:
  log10(diámetro), profundidad/diámetro y borde/diámetro. Exactitud balanceada fuera de pliegue 78 %
  (validación por grupos espaciales; ver ciencia_datos/03_etiquetas_por_fuentes.ipynb).
- Distancia de Mahalanobis robusta (MinCovDet) a la nube Luna+Marte: si un cráter terrestre cae fuera del 95 %
  de esa nube, la analogía de forma se rompe aunque el modelo lo asigne a un cuerpo.

Puntaje de forma frente a un destino (P = provisional, documentado en model/VALIDATION.md):
    s_forma = P(cuerpo del destino) × f_nube,    f_nube = 1 si dist <= corte95, si no exp(-(dist - corte95) / corte95)

No es una red neuronal ni "IA que descubre": es un modelo lineal explicable con 3 variables.
"""
from __future__ import annotations

import functools
import math
import pathlib

import numpy as np
import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parents[1]
REF_CSV = RAIZ / "ciencia_datos" / "datos" / "hoyas_referencia.csv"
VARIABLES = ["log_diam", "prof_diam", "borde_rel"]
SITIOS_EXCLUIDOS = ("Elysium", "Utopia")   # 14 y 9 cráteres en llanuras muy lisas (posible DEM solo MOLA)
CUERPO_DESTINO = {"polo_sur_lunar": "Luna", "jezero": "Marte"}
FUENTE = "Modelo explicable Luna contra Marte (regresión logística, 3 variables) + distancia a la nube Luna+Marte"


def _preparar(diam_km, prof_m, borde_m) -> np.ndarray:
    diam_km, prof_m, borde_m = (np.asarray(x, float) for x in (diam_km, prof_m, borde_m))
    return np.column_stack([np.log10(diam_km), prof_m / (diam_km * 1000), borde_m / (diam_km * 1000)])


@functools.lru_cache(maxsize=1)
def _modelo():
    from sklearn.covariance import MinCovDet
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    ref = pd.read_csv(REF_CSV)
    ref = ref[ref.crater.astype(bool) & ~ref.sitio.str.contains("|".join(SITIOS_EXCLUIDOS))]
    X = _preparar(ref.diam_km, ref.prof_m, ref.borde_m)
    y = ref.cuerpo.to_numpy(object)
    clf = make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=3000)).fit(X, y)
    esc = StandardScaler().fit(X)
    mcd = MinCovDet(random_state=0).fit(esc.transform(X))
    corte = float(np.quantile(mcd.mahalanobis(esc.transform(X)), 0.95))
    return clf, esc, mcd, corte, {"n_luna": int((y == "Luna").sum()), "n_marte": int((y == "Marte").sum())}


def puntuar(diam_km, prof_m, borde_m) -> pd.DataFrame:
    """Puntaje de forma para uno o varios cráteres. Devuelve P_Luna, dist, dentro_95 y s_forma por destino."""
    clf, esc, mcd, corte, _ = _modelo()
    X = _preparar(np.atleast_1d(diam_km), np.atleast_1d(prof_m), np.atleast_1d(borde_m))
    p_luna = clf.predict_proba(X)[:, list(clf.classes_).index("Luna")]
    dist = mcd.mahalanobis(esc.transform(X))
    f_nube = np.where(dist <= corte, 1.0, np.exp(-(dist - corte) / corte))
    return pd.DataFrame({"P_Luna": p_luna, "dist": dist, "dentro_95": dist <= corte, "corte95": corte,
                         "forma_polo_sur_lunar": p_luna * f_nube, "forma_jezero": (1 - p_luna) * f_nube})


def forma_para(destino_id: str, diam_km: float, prof_m: float, borde_m: float) -> dict:
    """Puntaje de forma de un cráter frente a un destino, con su explicación."""
    r = puntuar(diam_km, prof_m, borde_m).iloc[0]
    s = float(r[f"forma_{destino_id}"])
    if r.dentro_95:
        nota = "dentro del 95 % de la nube de cráteres Luna+Marte"
    else:
        nota = (f"fuera de la nube Luna+Marte (distancia {r.dist:.1f} > {r.corte95:.1f}): "
                + ("más hondo que casi cualquier cráter planetario de su tamaño" if prof_m / (diam_km * 1000) > 0.15
                   else "forma poco común en la Luna y Marte"))
    return {"valor": round(s, 4), "P_Luna": round(float(r.P_Luna), 4), "dist": round(float(r.dist), 3),
            "dentro_95": bool(r.dentro_95), "nota": nota, "fuente": FUENTE}


def resumen_modelo() -> dict:
    *_, corte, n = _modelo()
    return {"corte95": round(corte, 3), **n, "variables": VARIABLES, "sitios_marte_excluidos": list(SITIOS_EXCLUIDOS)}


if __name__ == "__main__":
    print(resumen_modelo())
    for nombre, args in {"El Elegante": (1.445, 201, 19.3), "Peñasquito": (1.658, 312, -14), "Meteor Crater": (1.058, 133, 21.9)}.items():
        print(nombre, {d: forma_para(d, *args)["valor"] for d in CUERPO_DESTINO}, forma_para("polo_sur_lunar", *args)["nota"])
