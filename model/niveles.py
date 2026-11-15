"""Niveles jugables para 11 sitios más (data/sites/<id>.json → nivel), a partir de ciencia_datos/datos/niveles_15.json.

El perfil y las superficies los mide analisis/26_niveles_15.py (Copernicus DEM GLO-30 a 30 m + OpenLandMap, misma regla que las
celdas 21 y 23; antes de medir reproduce idénticos los niveles de g00281 y mx0207). Aquí solo se copian al contrato Site:

- Sitios que ya existen (cráteres con fuente g00266, g00263, g00176, mx0261 y tajos mx0023, mx0019, mx0155): se reescribe SOLO
  `nivel`. No cambia total, destino_ref, novedoso, variables ni nota. Se conservan exageracion_vertical y obstaculos.
- Cráteres de impacto (meteor_crater, tenoumer, roter_kamm, talemzane): se crea el sitio. No son hallazgos de la búsqueda: son
  controles positivos del detector (cráteres de impacto conocidos que el detector encuentra; ciencia_datos/datos/impactos_tierra.csv
  y, Meteor Crater, el candidato G00195 de global_crateres.csv). Forma con model/forma.py, destino con la regla 4 de model/scan.py,
  borde levantado con model/borde.py, variables complementarias con model/features.py y similitud con model/score.py.

Uso:  uv run python -m model.niveles --medir   (consulta NASA POWER, MODIS y Earth Engine para los cráteres de impacto y guarda
                                               ciencia_datos/datos/variables_impactos.json; solo hace falta una vez)
      uv run python -m model.niveles           (sin red: escribe data/sites desde los dos JSON; idempotente)
"""
from __future__ import annotations

import json
import pathlib
import sys

import numpy as np
import pandas as pd

from model import borde, forma
from model.scan import FUENTE_FORMA_MEDIDAS, analogos_conocidos, gemelo, km, variable
from model.score import comparar

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATOS = RAIZ / "ciencia_datos" / "datos"
SITES = RAIZ / "data" / "sites"
NIVELES = DATOS / "niveles_15.json"
VARIABLES = DATOS / "variables_impactos.json"
FECHA = "2026-11-15"

# Cráteres de impacto que se crean como sitio: id del sitio → (id del detector, tabla, nombre, país ISO-2)
IMPACTOS = {
    "meteor_crater": ("G00195", "global_crateres.csv", "Meteor Crater (Arizona, EE. UU.)", "US"),
    "tenoumer": ("I03", "impactos_tierra.csv", "Cráter de impacto Tenoumer (Mauritania)", "MR"),
    "roter_kamm": ("I06", "impactos_tierra.csv", "Cráter de impacto Roter Kamm (Namibia)", "NA"),
    "talemzane": ("I07", "impactos_tierra.csv", "Cráter de impacto Talemzane (Argelia)", "DZ"),
}
CRATER_DE_SITIO = {sid: v[0] for sid, v in IMPACTOS.items()}       # lo usa model/borde.py (crater_de)
NOMBRE_LISTA = {"G00195": "Meteor Crater"}                           # nombre del cráter en impactos_tierra.csv

PROYECCION = {"EPSG:6372": "cónica de Lambert de México, la de analisis/21"}


def _niveles() -> dict:
    return {v["id"]: v for v in json.loads(NIVELES.read_text(encoding="utf-8"))["niveles"]}


def nivel_sitio(v: dict, anterior: dict, mundo: str | None) -> dict:
    """Entrada `nivel` del contrato Site (mismos campos y orden que g00281 y mx0207)."""
    proy = PROYECCION.get(v["crs"], "UTM local")
    fuente = (f"{v['fuente']}; transecto de {v['longitud_m']} m, rumbo {v['rumbo_deg']}°, centrado en [{v['centro'][0]}, "
              f"{v['centro'][1]}] (centro del cráter según el detector, {v['cid']}; proyección {v['crs']}, {proy}); "
              f"{v['referencia'].replace(' (m)', '')}")
    a = v["arena_suelo_pct"]
    arena = ("Arena del suelo en el corte: sin dato en todos los puntos." if a is None else
             f"Arena del suelo en el corte: {v['arena_min']}–{v['arena_max']} %, media {a} %"
             + (f", {v['arena_sin_dato']} de {len(v['perfil_elevacion_m'])} puntos sin dato (cuentan como no arena)."
                if v["arena_sin_dato"] else ", sin píxeles sin dato."))
    regla = v["superficie_tramos"][0]["regla"]
    nota = (f"Superficie: clasificación por reglas, no medición directa. {regla}. Fuente: {v['superficie_tramos'][0]['fuente']} "
            f"(ciencia_datos/datos/niveles_15.json, analisis/26). {arena}")
    if v["resumen_superficie"]["arena"] and v["pend_max"] > 15:
        nota += (" Ojo: la arena tiene prioridad sobre la pendiente (regla de la celda 21, para no confundir dunas con roca), así "
                 f"que donde hay arena las paredes quedan como arena aunque lleguen a {v['pend_max']}°; y OpenLandMap es un mapa "
                 "de suelo modelado a 250 m, no una medición en el cráter.")
    if v["grupo"] == "tajo":
        nota += (" Tajo minero: roca y compacto salen de la pendiente y la rugosidad del DEM; las paredes y los bancos del tajo "
                 "son una excavación, no una superficie natural (análogo operativo, no geológico).")
    if mundo == "luna":
        nota += " En el juego, 'arena' de la Luna representa regolito suelto."
    return {"perfil_elevacion_m": v["perfil_elevacion_m"], "fuente": fuente,
            "exageracion_vertical": anterior.get("exageracion_vertical"), "obstaculos": anterior.get("obstaculos", []),
            "paso_m": v["paso_m"],
            "superficies": [{"desde": t["desde_m"], "hasta": t["hasta_m"], "tipo": t["tipo"]} for t in v["superficie_tramos"]],
            "superficies_nota": nota}


def _mundo(destino: str) -> str:
    return {"polo_sur_lunar": "luna", "jezero": "marte"}[destino]


def _crater(cid: str, tabla: str) -> pd.Series:
    t = pd.read_csv(DATOS / tabla)
    return t[t[{"global_crateres.csv": "gid", "impactos_tierra.csv": "hid"}[tabla]] == cid].iloc[0]


def medir_variables() -> dict:
    """Variables complementarias medidas (NASA POWER, MODIS, Copernicus DEM) en el centro del detector. Con red."""
    from model import features
    out = {}
    for sid, (cid, tabla, *_) in IMPACTOS.items():
        r = _crater(cid, tabla)
        out[sid] = {"cid": cid, "lat": float(r.lat), "lon": float(r.lon), "medido": FECHA,
                    **features.variables_tierra(float(r.lat), float(r.lon))}
        print(sid, out[sid]["errores"] or "sin errores")
    VARIABLES.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return out


def construir_impacto(sid: str, niveles: dict, medidas: dict, targets: dict, ref: pd.DataFrame, conocidos: list) -> dict:
    cid, tabla, nombre, pais = IMPACTOS[sid]
    r = _crater(cid, tabla)
    lista = pd.read_csv(DATOS / "impactos_tierra.csv")
    fila = lista[lista.nombre == NOMBRE_LISTA.get(cid, r.get("nombre"))].iloc[0]       # fila de la lista de impactos
    pf = forma.puntuar(r.diam_km, r.prof_m, r.borde_m).iloc[0]
    destino = "polo_sur_lunar" if pf.P_Luna >= 0.5 else "jezero"                        # regla 4 de model/scan.py
    cuerpo = forma.CUERPO_DESTINO[destino]
    fz = forma.forma_para(destino, r.diam_km, r.prof_m, r.borde_m)
    otro = forma.forma_para(next(d for d in forma.CUERPO_DESTINO if d != destino), r.diam_km, r.prof_m, r.borde_m)
    fuente_det = (FUENTE_FORMA_MEDIDAS if tabla == "global_crateres.csv" else
                  "Copernicus DEM GLO-30 (ESA), remuestreado a 200 m; mismo detector, corrido sobre la lista de cráteres de impacto "
                  "(ciencia_datos/datos/impactos_tierra.csv)")
    m = medidas[sid]
    variables = {
        "forma": variable(fz["valor"], "0-1", forma.FUENTE,
                          f"Cráter {cid}: P(Luna)={fz['P_Luna']}, distancia a la nube={fz['dist']}; {fz['nota']}", FECHA),
        "diametro": variable(round(float(r.diam_km), 3), "km", fuente_det,
                             f"diámetro de la lista de impactos: {fila.diam_esperado_km} km (Earth Impact Database, aproximado)"),
        "profundidad": variable(round(float(r.prof_m), 1), "m", fuente_det),
        "profundidad_diametro": variable(round(float(r.prof_diam), 4), "-", fuente_det),
        "borde": variable(round(float(r.borde_m), 1), "m", fuente_det,
                          "a 200 m el borde lunar medido es negativo (mediana −23 m): no se usa como criterio de parecido"),
        "ndvi_p90": variable(round(float(r.ndvi_p90), 3), "-", "MODIS MOD13Q1 percentil 90, 2021-2025 (Earth Engine)",
                             "filtro de zonas áridas del detector: < 0.35"),
        **m["variables"],
    }
    sim = comparar(variables, targets[destino]["variables"])
    otra_sim = comparar({**variables, "forma": variable(otro["valor"], "0-1", forma.FUENTE)},
                        targets[next(d for d in forma.CUERPO_DESTINO if d != destino)]["variables"])
    limites = ["gravedad", "presion_atmosferica", "radiacion"] + (["vacio", "iluminacion_polar_rasante"] if cuerpo == "Luna" else [])
    if not fz["dentro_95"]:
        limites.append("forma: " + fz["nota"])
    limites += sim["limites_calculo"]
    d_k, nom_k = min((float(km(r.lat, r.lon, la, lo)), n) for n, la, lo in conocidos)
    if d_k <= 5:
        novedoso, frase_nov = False, f"novedoso: false; es {nom_k} de data/known_analogs.json (a {d_k:.1f} km)."
    else:
        novedoso, frase_nov = None, ("novedoso: null; no está en data/known_analogs.json, pero es un cráter de impacto ya "
                                     "catalogado: no se presenta como hallazgo.")
    g = gemelo(cuerpo, float(r.diam_km), float(r.prof_diam), ref)
    h = borde.medir(cid)
    sitio = {
        "id": sid, "nombre": nombre, "pais": pais, "lat": round(float(r.lat), 5), "lon": round(float(r.lon), 5),
        "estado": "documentado", "destino_ref": destino, "prueba_util": None,
        "uso_exploracion": ("Navegación y movilidad de rovers dentro y en el borde de un cráter de impacto; geología de campo en "
                            "un cráter de impacto real"),
        "proceso": "Impacto: cráter de impacto de la lista ciencia_datos/datos/impactos_tierra.csv (Earth Impact Database)",
        "novedoso": novedoso,
        "variables": variables,
        "similitud": {"total": sim["total"], "por_dimension": sim["por_dimension"], "confianza": sim["confianza"]},
        "limites": limites,
        "nivel": nivel_sitio(niveles[sid], {"exageracion_vertical": None, "obstaculos": []}, _mundo(destino)),
        "nota": (f"Creado por model/niveles.py el {FECHA}. No es un hallazgo de la búsqueda: es un control positivo del detector "
                 f"(cráter de impacto conocido que el detector encuentra; centro y medidas del detector, {cid} en "
                 f"ciencia_datos/datos/{tabla}; la coordenada de la lista es aproximada, del Earth Impact Database). "
                 "estado: documentado, porque el esquema no tiene un valor para 'control positivo' (propuesto al integrador). "
                 f"Destino por la regla 4 de model/scan.py (P(Luna)={fz['P_Luna']}); frente "
                 f"{'a Jezero' if destino == 'polo_sur_lunar' else 'al polo sur lunar'} el total sería {otra_sim['total']}. "
                 f"Gemelo de forma más cercano: cráter de {g['sitio']} ({g['cuerpo']}), {g['diam_km']} km, {g['prof_m']} m, "
                 f"d/D {g['prof_diam']}" + (f", en {g['lat']}, {g['lon']}" if g["lat"] is not None else "")
                 + (f". Errores al medir: {'; '.join(m['errores'])}" if m["errores"] else "") + f". {frase_nov} "
                 f"Borde levantado: h/D = {h:+.4f} (model/borde.py), "
                 + ("positivo: la medida coincide con que es un cráter de impacto." if borde.levantado(h) else
                    "no positivo en esta medida.")
                 + " El puntaje describe qué tan lunar o marciana es su forma; no decide qué es (model/VALIDATION.md)."),
    }
    borde.poner_variable(sitio, cid)
    return sitio


def aplicar() -> list[dict]:
    niveles = _niveles()
    medidas = json.loads(VARIABLES.read_text(encoding="utf-8"))
    targets = {t: json.loads((RAIZ / "data" / "targets" / f"{t}.json").read_text(encoding="utf-8")) for t in forma.CUERPO_DESTINO}
    ref = pd.read_csv(DATOS / "hoyas_referencia.csv")
    ref = ref[ref.crater.astype(bool) & ~ref.sitio.str.contains("|".join(forma.SITIOS_EXCLUIDOS))]
    conocidos = analogos_conocidos()
    out = []
    for sid, v in niveles.items():
        f = SITES / f"{sid}.json"
        if sid in IMPACTOS:
            s = construir_impacto(sid, niveles, medidas, targets, ref, conocidos)
        elif f.exists():
            s = json.loads(f.read_text(encoding="utf-8"))
            s["nivel"] = nivel_sitio(v, s.get("nivel") or {}, _mundo(s["destino_ref"]) if s["destino_ref"] in forma.CUERPO_DESTINO else None)
        else:
            continue                                   # reserva medida pero no usada (p. ej. Pingualuit)
        f.write_text(json.dumps(s, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        p = np.array(v["perfil_elevacion_m"])
        out.append({"id": sid, "grupo": v["grupo"], "destino": s["destino_ref"], "largo_m": v["longitud_m"], "puntos": len(p),
                    "pend_max": v["pend_max"], "relieve_m": round(float(p.max() - p.min()), 1), **v["resumen_superficie"],
                    "borde_m": (s["variables"].get("borde_levantado") or {}).get("valor"), "total": s["similitud"]["total"]})
    return out


if __name__ == "__main__":
    if "--medir" in sys.argv:
        medir_variables()
    print(pd.DataFrame(aplicar()).to_string(index=False))
