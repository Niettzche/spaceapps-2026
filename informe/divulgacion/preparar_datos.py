"""Prepara los datos de la página de divulgación (informe/divulgacion/public/datos/).

No inventa ni consulta nada: lee lo que ya está en el repo y lo reduce a lo que dibuja cada escena.

- nube.json      cráteres de referencia de la Luna (LOLA) y de Marte (HRSC+MOLA) con las 3 variables del modelo, los 296
                 candidatos áridos de la Tierra, los cráteres de impacto terrestres y el plano P(Luna) = 0.5 de la
                 regresión logística de model/forma.py, pasado a las variables sin estandarizar.
- relieves.json  relieves de 48 × 48 de El Elegante (MX0008) y Peñasquito (MX0155) con sus gemelos lunar y marciano
                 (salida de analisis/20_vista3d.py, corrida en Colab; ver --vista3d).
- perfiles.json  perfil radial promedio de los mismos dos sitios (ciencia_datos/datos/perfiles_radiales.json) y su h/D
                 medido con model/borde.py.

Además comprueba que cada cifra que la página copia de model/VALIDATION.md, model/NIVEL2.md o docs/METODOLOGIA.md siga
apareciendo en esos archivos, y se detiene si alguna ya no está (igual que informe/generar_guia_exposicion.py).

Uso, desde la raíz del repo y con las versiones fijadas (con otras versiones de scikit-learn el plano cambia en el
tercer decimal):

    uv run --with scikit-learn==1.5.2 --with pandas==2.2.3 --with numpy==2.1.3 \
        python informe/divulgacion/preparar_datos.py [--vista3d ~/spaceapps-visor/vista3d]
"""
from __future__ import annotations

import argparse
import json
import math
import pathlib
import sys

import numpy as np
import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))

from model import borde, forma  # noqa: E402

SALIDA = pathlib.Path(__file__).resolve().parent / "public" / "datos"
DATOS = RAIZ / "ciencia_datos" / "datos"
FICHAS = RAIZ / "ciencia_datos" / "salidas" / "fichas_integradas.csv"
SITIOS_RELIEVE = {"MX0008": "El Elegante (Pinacate, Sonora)", "MX0155": "Peñasquito (Zacatecas)"}
# Los 8 impactos que model/VALIDATION.md (sección B) usa como control positivo de forma: Xiuyan se excluye y Brent no se detecta.
IMPACTOS = ["Meteor Crater", "Lonar", "Wolfe Creek", "Tenoumer", "Pingualuit", "Tswaing", "Roter Kamm", "Talemzane"]

# Cifras que la página copia de los documentos del frente modelo. Si una ya no aparece, la página está desactualizada.
CIFRAS = {
    "model/VALIDATION.md": [
        "4,288 cráteres lunares y 573 marcianos", "78 %", "entre 70 % (Gale) y 92 % (Meridiani)",
        "8 de 8 caen dentro del 95 % de la nube", "5,208 depresiones", "el 84% cae dentro del 95 % de la nube",
        "10 de 11 (91%)", "3 de 26 (12%)", "4 de 38 (11%)", "55 de 248 (22%)", "altura del borde 0.91 (p < 0.001), puntaje de forma 0.42",
        "altura del borde 0.91 (p < 0.001), puntaje de forma 0.36", "Controles negativos: 3 de 3 pasan",
        "Análogos conocidos: 9 de 21 pasan", "Luna 176 K, Jezero 55 K", "máximo terrestre de 40 K",
        "296 candidatos áridos", "0.058 a 0.043", "0.059 a 0.051",
        "El Pinacate, cráter El Elegante (Sonora, México) | 14.5",
        "De los 8 que la regla no había visto, 7 tienen borde levantado",
        "Entre los 25 primeros por borde hay 11 cráteres naturales según la IA y 1 mina; entre los 25 primeros por forma, 3 cráteres naturales y 14 minas",
        "con la ventana estrecha (0.83–1.33) pasan 5; con la usada y umbral 0.002, 6",
        "Xiuyan (el detector le mide 0.81 km y el diámetro esperado es 1.8 km",
        "Pasan solo con la ventana ancha: Lonar, Talemzane",
        "De los 57 sitios de `data/sites` con un cráter medido",
    ],
    "model/NIVEL2.md": ["0.027 (284)", "0.019 (53)", "unos 463 m", "Para D ≥ 2 km la diferencia no es instrumental"],
    "docs/METODOLOGIA.md": [
        "9 de 11 cráteres conocidos", "De las 668 detecciones, el 71 %", "solo reduce esas detecciones un 15 %",
        "47 candidatos áridos", "3 de 10 regiones áridas priorizadas", "forma 0.40",
        "Tierra 9.81, Marte 3.71, Luna 1.62 m/s²", "NDVI p90 < 0.35",
    ],
}


def comprobar_cifras() -> None:
    faltan = []
    for archivo, cifras in CIFRAS.items():
        texto = (RAIZ / archivo).read_text(encoding="utf-8")
        faltan += [f"{archivo}: «{c}»" for c in cifras if c not in texto]
    # «El Pinacate se parece a la Luna»: destino y puntaje de forma del sitio curado
    pin = json.loads((RAIZ / "data" / "sites" / "pinacate.json").read_text(encoding="utf-8"))
    forma_pin = (pin.get("similitud", {}).get("por_dimension") or {}).get("forma")
    if pin.get("destino_ref") != "polo_sur_lunar" or forma_pin is None or round(float(forma_pin), 2) != 0.97:
        faltan.append(f"data/sites/pinacate.json: destino {pin.get('destino_ref')}, forma {forma_pin} (la página dice polo sur lunar, 0.97)")
    if faltan:
        sys.exit("Estas cifras de la página ya no aparecen en su fuente; actualiza src/textos.js:\n  " + "\n  ".join(faltan))


def r4(x) -> float | None:
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 4)


def nube() -> dict:
    clf, esc, mcd, corte, n = forma._modelo()
    ref = forma._referencia()
    X = forma._preparar(ref.diam_km, ref.prof_m, ref.borde_m)

    # Plano P(Luna) = 0.5: en variables estandarizadas w·z + b = 0 (sklearn guarda la clase "Marte"; el signo no cambia el plano).
    sc, lr = clf[0], clf[-1]
    w = lr.coef_[0] / sc.scale_
    b = float(lr.intercept_[0] - (lr.coef_[0] * sc.mean_ / sc.scale_).sum())
    signo = -1.0 if lr.classes_[1] == "Marte" else 1.0          # se expresa hacia la Luna: logit_Luna = signo · (w·x + b)
    plano = {"w": [r4(signo * v) for v in w], "b": round(signo * b, 6), "variables": forma.VARIABLES,
             "lectura": "logit(P_Luna) = w·x + b; el plano es logit = 0 (P_Luna = 0.5)"}

    puntos = {c: [[r4(x[0]), r4(x[1]), r4(x[2])] for x in X[ref.cuerpo.to_numpy() == c]] for c in ("Luna", "Marte")}

    fichas = pd.read_csv(FICHAS)
    fichas = fichas[fichas.diam_km.notna() & fichas.prof_m.notna() & fichas.borde_m.notna()]
    Xt = forma._preparar(fichas.diam_km, fichas.prof_m, fichas.borde_m)
    pt = forma.puntuar(fichas.diam_km.to_numpy(), fichas.prof_m.to_numpy(), fichas.borde_m.to_numpy())
    tierra = [{"id": str(f.id), "nombre": None if pd.isna(f.nombre) else str(f.nombre), "region": str(f.region),
               "etiqueta_ia": None if pd.isna(f.etiqueta_ia) else str(f.etiqueta_ia),
               "x": [r4(x[0]), r4(x[1]), r4(x[2])], "P_Luna": r4(p), "dentro_95": bool(dn)}
              for f, x, p, dn in zip(fichas.itertuples(), Xt, pt.P_Luna, pt.dentro_95)]

    imp = pd.read_csv(DATOS / "impactos_tierra.csv")
    imp = imp[imp.nombre.isin(IMPACTOS)]
    Xi = forma._preparar(imp.diam_km, imp.prof_m, imp.borde_m)
    pi = forma.puntuar(imp.diam_km.to_numpy(), imp.prof_m.to_numpy(), imp.borde_m.to_numpy())
    impactos = [{"nombre": str(f.nombre), "x": [r4(x[0]), r4(x[1]), r4(x[2])], "P_Luna": r4(p), "dentro_95": bool(dn)}
                for f, x, p, dn in zip(imp.itertuples(), Xi, pi.P_Luna, pi.dentro_95)]

    dd = {c: np.array([p[1] for p in puntos[c]]) for c in puntos}
    return {
        "fuente": ("ciencia_datos/datos/hoyas_referencia.csv (LOLA ldem_80s_80m llevado a 200 m; HRSC+MOLA 200 m), "
                   "ciencia_datos/salidas/fichas_integradas.csv, ciencia_datos/datos/impactos_tierra.csv; modelo de model/forma.py"),
        "variables": {"log_diam": "log10 del diámetro (km)", "prof_diam": "profundidad / diámetro",
                      "borde_rel": "borde / diámetro"},
        "n": {"Luna": len(puntos["Luna"]), "Marte": len(puntos["Marte"]), "Tierra": len(tierra), "impactos": len(impactos)},
        "mediana_prof_diam": {c: r4(np.median(v)) for c, v in dd.items()},
        "corte95": round(corte, 3), "plano": plano,
        "luna": puntos["Luna"], "marte": puntos["Marte"], "tierra": tierra, "impactos": impactos,
    }


def relieves(vista3d: pathlib.Path) -> dict:
    perf = {s["id"]: s for s in json.loads((DATOS / "perfiles_radiales.json").read_text(encoding="utf-8"))["sitios"]}
    fichas = pd.read_csv(FICHAS).set_index("id")
    out = {"fuente": ("analisis/20_vista3d.py (Colab): ventana de 2 diámetros de lado remuestreada a 48 × 48; Tierra Copernicus "
                      "DEM GLO-30 a 80 m, gemelo lunar LOLA a 80 m, gemelo marciano HRSC+MOLA a 200 m. Altura en metros sobre "
                      "la mediana de la orilla de la ventana."),
           "sitios": {}}
    for sid, nombre in SITIOS_RELIEVE.items():
        v = json.loads((vista3d / f"{sid}.json").read_text(encoding="utf-8"))
        f = fichas.loc[sid]
        g = perf[sid].get("gemelo_perfil") or {}
        out["sitios"][sid] = {
            "nombre": nombre, "exag_sugerida": v.get("exag"),
            "diam_km": r4(f.diam_km), "prof_m": r4(f.prof_m), "prof_diam": r4(f.prof_diam), "borde_m": r4(f.borde_m),
            "etiqueta_ia": str(f.etiqueta_ia), "P_Luna": r4(f.P_Luna),
            "tierra": v["tierra"],
            "luna": {**v["luna"], "gemelo": {"lat": g.get("lat"), "lon": g.get("lon"), "diam_km": g.get("d"), "prof_m": g.get("p")}},
            "marte": v["marte"],
        }
    return out


def perfiles() -> dict:
    r, todos = borde.perfiles()
    a, b, lejos = borde.limites_ventana()
    out = {"r": [r4(x) for x in r], "ventana": [r4(a), r4(b)], "lejano_desde": r4(lejos), "sitios": {}}
    for sid, nombre in SITIOS_RELIEVE.items():
        p = todos[sid]["tierra"]
        out["sitios"][sid] = {"nombre": nombre, "tierra": p, "h_D": r4(borde.altura(p, r))}
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--vista3d", type=pathlib.Path, default=pathlib.Path.home() / "spaceapps-visor" / "vista3d",
                    help="carpeta con los JSON de analisis/20_vista3d.py (descomprimidos de vista3d.zip)")
    args = ap.parse_args()

    comprobar_cifras()
    SALIDA.mkdir(parents=True, exist_ok=True)
    escritos = {"nube.json": nube(), "perfiles.json": perfiles()}
    if args.vista3d.is_dir():
        escritos["relieves.json"] = relieves(args.vista3d)
    elif (SALIDA / "relieves.json").exists():
        print(f"(sin {args.vista3d}: se conserva el relieves.json que ya está)")
    else:
        sys.exit(f"No encuentro {args.vista3d} y no hay relieves.json previo")
    for nombre, datos in escritos.items():
        (SALIDA / nombre).write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"{nombre}: {(SALIDA / nombre).stat().st_size / 1024:.0f} KB")
    n = escritos["nube.json"]
    print("n:", n["n"], "· mediana d/D:", n["mediana_prof_diam"], "· plano:", n["plano"]["w"], n["plano"]["b"])
    print("h/D:", {k: v["h_D"] for k, v in escritos["perfiles.json"]["sitios"].items()})


if __name__ == "__main__":
    main()
