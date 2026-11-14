"""Sitios curados del MVP (AGENTS.md §6.4 punto 1): llena data/sites/<id>.json con datos medidos.

Cada sitio curado se define abajo con su coordenada y su fuente. Las variables se miden con model/features.py y, si el sitio
tiene un cráter medido por el detector, se agrega la forma (model/forma.py). El perfil del nivel es un transecto real del DEM.
Lo que no se pueda medir queda en null con nota. Los campos de juego (prueba_util) los decide el equipo y no se tocan.

Uso:  uv run python -m model.curados [id ...]
"""
from __future__ import annotations

import json
import pathlib
import sys

import pandas as pd

from model import features, forma
from model.score import comparar
from model.scan import FUENTE_FORMA_MEDIDAS, variable

RAIZ = pathlib.Path(__file__).resolve().parents[1]
SITES = RAIZ / "data" / "sites"

CURADOS = {
    "pinacate": {
        "lat": 31.84444, "lon": -113.39111, "estado": "documentado",
        "fuente_coord": "Smithsonian GVP, subrasgos de Pinacate (vn=341001): cráter El Elegante 31°50′40″N 113°23′28″W",
        "crater_cid": "MX0008",                       # El Elegante medido por el detector
        "novedoso": False,                            # documentado: entrenamiento del Apolo
        "perfil": {"rumbo_grados": 90.0, "largo_m": 4_000.0},   # transecto este-oeste que cruza el cráter
        "uso_exploracion": "Geología de campo y movilidad en terreno volcánico y dentro de un cráter (maar El Elegante)",
        "nota_extra": ("Documentado como análogo: viajes de entrenamiento de geología de 1965–1967 y de la tripulación del Apolo 14 "
                       "(Shepard y Mitchell) del 14 al 18 de febrero de 1970 (Phinney 2015, NASA SP-2015-626). "
                       "Otras detecciones del campo (MacDougal MX0007, Sykes MX0010, Cerro Colorado MX0012, MX0009, MX0011) "
                       "se agregan aquí en vez de exportarse como candidatos."),
    },
    "samalayuca": {
        "lat": 31.263611, "lon": -106.395278, "estado": "candidato_modelo",
        "fuente_coord": ("centro del campo de dunas, N 31°15′49″ W 106°23′43″ (Domínguez-Acosta, Langford y Gill 2023, "
                         "Bol. Soc. Geol. Mex. 75(3) A240823, doi:10.18268/BSGM2023v75n3a240823); ESA WorldCover 2021: suelo desnudo"),
        "perfil": {"rumbo_grados": 90.0, "largo_m": 3_000.0},   # transecto este-oeste sobre las dunas
        "uso_exploracion": "Movilidad de rovers en arena suelta y dunas activas (agarre, hundimiento, subir y bajar crestas)",
        "novedoso": True,
        "nota_extra": ("No se encontró literatura que trate a Samalayuca como análogo planetario (búsqueda del 14 nov 2026); "
                       "el análogo eólico mexicano documentado es el Gran Desierto de Altar, a más de 700 km. No tiene cráter: "
                       "la forma no aplica y la similitud usa solo las dimensiones complementarias."),
    },
}


def construir(sid: str, cfg: dict) -> dict:
    p = SITES / f"{sid}.json"
    sitio = json.loads(p.read_text(encoding="utf-8"))
    destino = sitio["destino_ref"]
    target = json.loads((RAIZ / "data" / "targets" / f"{destino}.json").read_text(encoding="utf-8"))
    lat, lon = cfg["lat"], cfg["lon"]
    tierra = features.variables_tierra(lat, lon)
    variables = {}
    otra = None
    if cfg.get("crater_cid"):
        h = pd.read_csv(RAIZ / "ciencia_datos" / "datos" / "hoyas_mexico.csv")
        r = h[h.cid == cfg["crater_cid"]].iloc[0]
        fz = forma.forma_para(destino, r.diam_km, r.prof_m, r.borde_m)
        otro_destino = next(d for d in forma.CUERPO_DESTINO if d != destino)
        otra = forma.forma_para(otro_destino, r.diam_km, r.prof_m, r.borde_m)
        variables.update({
            "forma": variable(fz["valor"], "0-1", forma.FUENTE,
                              f"Cráter {cfg['crater_cid']}: P(Luna)={fz['P_Luna']}, distancia a la nube={fz['dist']}; {fz['nota']}",
                              "2026-11-14"),
            "diametro": variable(round(float(r.diam_km), 3), "km", FUENTE_FORMA_MEDIDAS),
            "profundidad": variable(round(float(r.prof_m), 1), "m", FUENTE_FORMA_MEDIDAS),
            "profundidad_diametro": variable(round(float(r.prof_diam), 4), "-", FUENTE_FORMA_MEDIDAS),
            "borde": variable(round(float(r.borde_m), 1), "m", FUENTE_FORMA_MEDIDAS),
        })
    variables.update(tierra["variables"])
    sim = comparar(variables, target["variables"])
    perfil = features.perfil_elevacion(lat, lon, **cfg.get("perfil", {}))
    nivel = sitio.get("nivel", {})
    if "error" in perfil:
        nivel.update({"perfil_elevacion_m": [], "fuente": None})
    else:
        nivel.update({"perfil_elevacion_m": perfil["perfil_elevacion_m"],
                      "fuente": f"{perfil['fuente']}; transecto de {perfil['largo_m']:.0f} m, rumbo {perfil['rumbo_grados']:.0f}°, "
                                f"paso {perfil['paso_m']} m",
                      "exageracion_vertical": nivel.get("exageracion_vertical")})
    limites = list(dict.fromkeys(sitio.get("limites", []) + target.get("no_reproducible_en_tierra", []) + sim["limites_calculo"]))
    if "forma" in variables and not forma.forma_para(destino, r.diam_km, r.prof_m, r.borde_m)["dentro_95"]:
        limites.append("forma: fuera de la nube Luna+Marte")
    notas = [f"Coordenada: {cfg['fuente_coord']}.", cfg.get("nota_extra", "")]
    if otra is not None:
        notas.append(f"Forma frente al otro destino ({next(d for d in forma.CUERPO_DESTINO if d != destino)}): {otra['valor']}.")
    if tierra["errores"]:
        notas.append("Errores al medir: " + "; ".join(tierra["errores"]))
    if "error" in perfil:
        notas.append(perfil["error"])
    sitio.update({
        "lat": lat, "lon": lon, "estado": cfg["estado"], "variables": variables,
        "novedoso": cfg.get("novedoso", sitio.get("novedoso")),
        "uso_exploracion": cfg.get("uso_exploracion", sitio.get("uso_exploracion")),
        "similitud": {"total": sim["total"], "por_dimension": sim["por_dimension"], "confianza": sim["confianza"]},
        "limites": limites, "nivel": nivel, "nota": " ".join(n for n in notas if n),
    })
    p.write_text(json.dumps(sitio, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return sitio


if __name__ == "__main__":
    ids = sys.argv[1:] or list(CURADOS)
    for sid in ids:
        s = construir(sid, CURADOS[sid])
        print(sid, s["destino_ref"], s["similitud"], len(s["nivel"]["perfil_elevacion_m"]), "puntos de perfil")
