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


def explicar(diam_km: float, prof_m: float, borde_m: float) -> dict:
    """Contribución exacta de cada variable al logit de la regresión logística, en log-odds hacia la Luna.

    logit(P_Luna) = intercepto + sum_j aporte_j,   aporte_j = -coef_j * z_j
    (sklearn guarda el coeficiente de la clase "Marte"; se cambia de signo para leerlo hacia la Luna).
    """
    clf, *_ = _modelo()
    esc, lr = clf[0], clf[-1]
    x = _preparar([diam_km], [prof_m], [borde_m])[0]
    z = (x - esc.mean_) / esc.scale_
    signo = -1.0 if lr.classes_[1] == "Marte" else 1.0
    aportes = signo * lr.coef_[0] * z
    intercepto = float(signo * lr.intercept_[0])
    logit = intercepto + float(aportes.sum())
    return {"intercepto": round(intercepto, 4), "logit_luna": round(logit, 4), "P_Luna": round(1 / (1 + math.exp(-logit)), 4),
            "aportes": {v: {"valor": round(float(xv), 4), "z": round(float(zv), 3), "aporte_logit": round(float(a), 4)}
                        for v, xv, zv, a in zip(VARIABLES, x, z, aportes)}}


R_MARTE = 3_396_190.0
# Centro de cada recorte de 100 x 100 km de Marte (analisis/03 y analisis/15): lat, lon este
SITIOS_CENTRO_POR_VERIFICAR = {"Cráter Jezero", "Cráter Gale", "Oxia Planum"}
CENTROS_MARTE = {"Cráter Jezero": (18.44, 77.45), "Cráter Gale": (-5.40, 137.80), "Oxia Planum": (18.20, -24.30),
                 "Meridiani (Opportunity)": (-1.95, -5.53), "Gusev (Spirit)": (-14.57, 175.47), "Elysium (InSight)": (4.50, 135.62),
                 "Utopia (Zhurong)": (25.07, 109.93), "Chryse (Viking 1)": (22.27, -47.95)}


@functools.lru_cache(maxsize=1)
def _referencia() -> pd.DataFrame:
    ref = pd.read_csv(REF_CSV)
    ref = ref[ref.crater.astype(bool) & ~ref.sitio.str.contains("|".join(SITIOS_EXCLUIDOS))].reset_index(drop=True)
    # Marte no trae lat/lon: se recupera de la fila/columna del recorte (equidistante, origen x=-50 km, y=R·lat0+50 km, 200 m)
    for sitio, (la0, lo0) in CENTROS_MARTE.items():
        m = (ref.sitio == sitio) & ref.lat.isna()
        if m.any():
            x = -50_000 + (ref.loc[m, "j"] + 0.5) * 200
            y = R_MARTE * np.radians(la0) + 50_000 - (ref.loc[m, "i"] + 0.5) * 200
            ref.loc[m, "lat"] = np.degrees(y / R_MARTE)
            ref.loc[m, "lon"] = lo0 + np.degrees(x / (R_MARTE * np.cos(np.radians(la0))))
    return ref


def gemelos_knn(diam_km: float, prof_m: float, borde_m: float, k: int = 3) -> dict:
    """Los k cráteres más parecidos de cada cuerpo, en el mismo espacio estandarizado del modelo (3 variables)."""
    _, esc, *_ = _modelo()
    ref = _referencia()
    Z = esc.transform(_preparar(ref.diam_km, ref.prof_m, ref.borde_m))
    z0 = esc.transform(_preparar([diam_km], [prof_m], [borde_m]))[0]
    d = np.sqrt(((Z - z0) ** 2).sum(1))
    out = {}
    for cuerpo in ("Luna", "Marte"):
        idx = np.where(ref.cuerpo.to_numpy() == cuerpo)[0]
        mejores = idx[np.argsort(d[idx])[:k]]
        out[cuerpo] = [{"sitio": ref.sitio.iloc[i], "lat": None if pd.isna(ref.lat.iloc[i]) else round(float(ref.lat.iloc[i]), 3),
                        "lon": None if pd.isna(ref.lon.iloc[i]) else round(float(ref.lon.iloc[i]), 3),
                        "diam_km": round(float(ref.diam_km.iloc[i]), 2), "prof_m": round(float(ref.prof_m.iloc[i])),
                        "prof_diam": round(float(ref.prof_diam.iloc[i]), 3), "borde_m": round(float(ref.borde_m.iloc[i]), 1),
                        "distancia_z": round(float(d[i]), 3),
                        **({"coord_nota": "centro del recorte por verificar contra el nomenclátor IAU (analisis/03)"}
                           if ref.sitio.iloc[i] in SITIOS_CENTRO_POR_VERIFICAR else {})} for i in mejores]
    return out


def resumen_modelo() -> dict:
    *_, corte, n = _modelo()
    return {"corte95": round(corte, 3), **n, "variables": VARIABLES, "sitios_marte_excluidos": list(SITIOS_EXCLUIDOS)}


if __name__ == "__main__":
    print(resumen_modelo())
    for nombre, args in {"El Elegante": (1.445, 201, 19.3), "Peñasquito": (1.658, 312, -14), "Meteor Crater": (1.058, 133, 21.9)}.items():
        print(nombre, {d: forma_para(d, *args)["valor"] for d in CUERPO_DESTINO}, forma_para("polo_sur_lunar", *args)["nota"])
