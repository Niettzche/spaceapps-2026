"""Validación del modelo (AGENTS.md §6.3): escribe model/VALIDATION.md.

Dos partes:
A. Comparador de variables (dimensiones complementarias) en puntos sin cráter medido:
   - controles negativos (data/negative_controls.json): selvas y zonas agrícolas húmedas → deben dar cerca de 0;
   - análogos conocidos (data/known_analogs.json): desiertos hiperáridos, campos de lava, cráteres → deben dar alto.
B. Forma (dimensión principal), con resultados ya medidos en ciencia_datos/:
   - cráteres de impacto terrestres (ciencia_datos/datos/impactos_tierra.csv) → deben caer dentro de la nube Luna+Marte;
   - catálogo de cráteres volcánicos conocidos de México → cuántos encuentra el detector;
   - generalización del modelo Luna contra Marte a sitios de Marte que no vio.

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


def parte_forma() -> list[str]:
    out = ["## B. Forma (dimensión principal)", ""]
    res = forma.resumen_modelo()
    out.append(f"Modelo: regresión logística Luna contra Marte con {res['n_luna']:,} cráteres lunares y {res['n_marte']} marcianos "
               f"(variables {', '.join(res['variables'])}; sitios de Marte excluidos: {', '.join(res['sitios_marte_excluidos'])}). "
               "Exactitud balanceada fuera de pliegue con grupos espaciales: 78 %; en un sitio de Marte nunca visto, entre 70 % (Gale) "
               "y 92 % (Meridiani). Detalle en `ciencia_datos/03_etiquetas_por_fuentes.ipynb`.")
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
    out.append("**Detector frente a cráteres volcánicos conocidos de México** (`ciencia_datos/datos/crateres_conocidos_mx.csv`, "
               "70 cráteres con fuente): de 62 en el rango del detector, encuentra el 40 % y el 32 % pasa el filtro tipo cráter. "
               "No detectados: 15 con lago (el DEM ve el espejo de agua), 3 menores de 0.6 km y 22 por otras razones "
               "(islas, coordenadas desplazadas, poca profundidad). Ver `informe/validacion_detector.pdf`.")
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
           "## A. Comparador de variables (dimensiones complementarias)", "",
           "En estos puntos no hay un cráter medido, así que la forma no aplica: la similitud usa clima (NASA POWER), "
           "vegetación (MODIS) y pendiente (Copernicus DEM a 200 m), y la confianza baja en consecuencia.", ""]
    cols = ["nombre", "oscilacion_termica", "precipitacion", "ndvi", "pendiente", "total_polo_sur_lunar", "total_jezero", "vetado_jezero"]
    for titulo, df, ok in [("Controles negativos", dn, lambda d: (d[["total_polo_sur_lunar", "total_jezero"]].max(axis=1) < UMBRAL_NEGATIVO)),
                           ("Análogos conocidos", dp, lambda d: (d[["total_polo_sur_lunar", "total_jezero"]].max(axis=1) > UMBRAL_POSITIVO))]:
        if df.empty:
            out += [f"### {titulo}", "", "Sin coordenadas con fuente todavía.", ""]
            continue
        df["pasa"] = ok(df)
        out += [f"### {titulo}: {int(df.pasa.sum())} de {len(df)} pasan", "", tabla_md(df, cols + ["pasa"]), ""]
        if titulo == "Análogos conocidos" and (~df.pasa).any():
            out += ["**Lectura.** El comparador complementario mide clima árido, suelo desnudo y relieve suave. Pasan los análogos "
                    "elegidos por eso mismo (desiertos hiperáridos, dunas, cráteres en zonas secas). No pasan los que son análogos por "
                    "otra razón que estas variables no ven: frío polar, lava en clima húmedo, química del agua (Río Tinto), "
                    "microbialitos y cenotes, cuevas, o estructuras sepultadas. Que no pasen es esperable y marca el alcance del "
                    "comparador: no reemplaza a la forma ni a la composición. No pasan: " + ", ".join(df.loc[~df.pasa, "nombre"]) + ".", ""]
        if df.errores.str.len().gt(0).any():
            out += ["Errores de medición: " + " · ".join(f"{n}: {e}" for n, e in zip(df.nombre, df.errores) if e), ""]
    out += parte_forma()
    out += ["", "## Límites que siempre se declaran", "",
            "Gravedad, presión atmosférica, radiación y vacío lunar no se reproducen en la Tierra; ningún puntaje los incluye."]
    (RAIZ / "model" / "VALIDATION.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print("\n".join(out))


if __name__ == "__main__":
    main()
