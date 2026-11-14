"""Escaneo sistemático (AGENTS.md §6.4 punto 2 y §8.1): exporta los cráteres candidatos del detector a data/sites/.

Origen: el detector de analisis/07_buscador_crateres.py ya recorrió todo México a 200 m (5,208 depresiones,
ciencia_datos/datos/hoyas_mexico.csv). Aquí:
1. Se quedan las depresiones tipo cráter de zonas áridas (NDVI p90 < 0.35). Las de sierras húmedas son dolinas y cañadas
   (informe/validacion_detector.pdf).
2. Se excluyen las del campo volcánico del Pinacate: enriquecen el sitio curado data/sites/pinacate.json.
3. Por cada candidato: puntaje de forma (model/forma.py), variables complementarias medidas (model/features.py:
   NASA POWER, MODIS, Copernicus DEM), similitud total (model/score.py), nombre si coincide con el catálogo de
   cráteres conocidos (ciencia_datos/datos/crateres_conocidos_mx.csv) o con una mina de OpenStreetMap.
4. destino_ref = el cuerpo al que más se parece su forma (Luna → polo_sur_lunar, Marte → jezero).
5. novedoso = no coincide con data/known_analogs.json (a menos de 50 km).

Uso:  uv run python -m model.scan            (tarda unos minutos: consulta NASA POWER y Earth Engine por sitio)

Alcance global (AGENTS.md §6.4, decisión del 14 nov): este script cubre México, el caso destacado. Para el resto del mundo, el
mismo detector se corre en regiones áridas priorizadas (Sahara, Arabia, Atacama, Australia interior, Gobi, Kalahari, suroeste de
EE. UU., meseta iraní, Thar). Sus CSV, con las mismas columnas que hoyas_mexico.csv, se exportan con esta misma función
cuando estén listos.
"""
from __future__ import annotations

import json
import math
import pathlib
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd

from model import features, forma
from model.score import comparar

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATOS = RAIZ / "ciencia_datos" / "datos"
SITES = RAIZ / "data" / "sites"
NDVI_ARIDO = 0.35
PINACATE = (31.772, -113.498)      # centro del campo volcánico (Smithsonian GVP, volcán 1401-08)
RADIO_PINACATE_KM = 30
RADIO_CATALOGO_KM = 2.5
RADIO_ANALOGO_KM = 50
FUENTE_FORMA_MEDIDAS = "Copernicus DEM GLO-30 (ESA), remuestreado a 200 m; detector analisis/07_buscador_crateres.py"


def km(lat1, lon1, lat2, lon2):
    la1, lo1, la2, lo2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * np.arcsin(np.sqrt(a))


def gemelo(cuerpo: str, diam_km: float, prof_diam: float, ref: pd.DataFrame) -> dict:
    """Cráter de referencia más parecido en (log10 diámetro, profundidad/diámetro), en unidades estandarizadas."""
    r = ref[ref.cuerpo == cuerpo]
    X = np.column_stack([np.log10(r.diam_km), r.prof_diam])
    mu, sd = X.mean(0), X.std(0)
    d = np.hypot(*(((X - mu) / sd) - ((np.array([math.log10(diam_km), prof_diam]) - mu) / sd)).T)
    g = r.iloc[int(np.argmin(d))]
    return {"cuerpo": cuerpo, "sitio": g.sitio, "lat": None if pd.isna(g.lat) else round(float(g.lat), 3),
            "lon": None if pd.isna(g.lon) else round(float(g.lon), 3), "diam_km": round(float(g.diam_km), 2),
            "prof_m": round(float(g.prof_m)), "prof_diam": round(float(g.prof_diam), 3)}


def variable(valor, unidad, fuente, nota=None, fecha=None):
    return {"valor": None if valor is None or (isinstance(valor, float) and math.isnan(valor)) else valor,
            "unidad": unidad, "fuente": fuente, "fecha": fecha, "nota": nota}


def candidatos() -> pd.DataFrame:
    h = pd.read_csv(DATOS / "hoyas_mexico.csv")
    c = h[h.crater.astype(bool) & (h.ndvi_p90 < NDVI_ARIDO)].copy()
    c["km_pinacate"] = km(c.lat, c.lon, *PINACATE)
    cat = pd.read_csv(DATOS / "crateres_conocidos_mx.csv").dropna(subset=["lat", "lon"])
    nombres, tipos_cat = [], []
    for la, lo in zip(c.lat, c.lon):
        d = km(la, lo, cat.lat.to_numpy(), cat.lon.to_numpy())
        k = int(np.argmin(d))
        ok = d[k] <= RADIO_CATALOGO_KM
        nombres.append(cat.nombre.iloc[k] if ok else None); tipos_cat.append(cat.tipo.iloc[k] if ok else None)
    c["nombre_catalogo"], c["tipo_catalogo"] = nombres, tipos_cat
    mx = pd.read_csv(DATOS / "crateres_mexico.csv")[["cid", "nombre"]].dropna()
    c = c.merge(mx.rename(columns={"nombre": "nombre_previo"}), on="cid", how="left")
    for col in ("nombre_catalogo", "tipo_catalogo", "nombre_previo"):
        c[col] = c[col].astype(object).where(c[col].notna(), None)
    return c


def analogos_conocidos() -> list[tuple[str, float, float]]:
    js = json.loads((RAIZ / "data" / "known_analogs.json").read_text(encoding="utf-8"))
    return [(a["nombre"], a["lat"], a["lon"]) for a in js.get("analogos", []) if a.get("lat") is not None]


def construir_sitio(r: pd.Series, targets: dict, ref: pd.DataFrame, conocidos: list) -> dict:
    pf = forma.puntuar(r.diam_km, r.prof_m, r.borde_m).iloc[0]
    destino = "polo_sur_lunar" if pf.P_Luna >= 0.5 else "jezero"
    cuerpo = forma.CUERPO_DESTINO[destino]
    fz = forma.forma_para(destino, r.diam_km, r.prof_m, r.borde_m)
    tierra = features.variables_tierra(float(r.lat), float(r.lon))
    es_mina = bool(r.km_mina <= 2.0)
    nombre = r.nombre_catalogo or (r.nombre_previo if isinstance(r.nombre_previo, str) else None)
    if es_mina:
        proceso = "Excavación artificial: tajo minero a cielo abierto (cantera a menos de 2 km en OpenStreetMap)"
        uso = ("Análogo operativo, no geológico: probar navegación y movilidad de rovers en paredes empinadas, "
               "excavación (ISRU) y operación con sombra en el fondo del tajo")
    elif r.tipo_catalogo:
        proceso = f"Volcánico: {r.tipo_catalogo.replace('_', ' ')} del catálogo de cráteres conocidos de México"
        uso = "Navegación y movilidad de rovers dentro y en el borde de un cráter; geología de campo en un cráter real"
    else:
        proceso = ("Depresión cerrada tipo cráter de origen sin confirmar "
                   + ("(borde levantado: probable volcánico)" if r.borde_m >= 10 else "(sin borde: dolina, cuenca o maar erosionado)"))
        uso = "Candidato a verificar en campo: navegación y movilidad dentro de una depresión tipo cráter"
    variables = {
        "forma": variable(fz["valor"], "0-1", forma.FUENTE,
                          f"P(Luna)={fz['P_Luna']}, distancia a la nube={fz['dist']}; {fz['nota']}", "2026-11-14"),
        "diametro": variable(round(float(r.diam_km), 3), "km", FUENTE_FORMA_MEDIDAS),
        "profundidad": variable(round(float(r.prof_m), 1), "m", FUENTE_FORMA_MEDIDAS),
        "profundidad_diametro": variable(round(float(r.prof_diam), 4), "-", FUENTE_FORMA_MEDIDAS),
        "borde": variable(round(float(r.borde_m), 1), "m", FUENTE_FORMA_MEDIDAS,
                          "a 200 m el borde lunar medido es negativo (mediana −23 m): no se usa como criterio de parecido"),
        "ndvi_p90": variable(round(float(r.ndvi_p90), 3), "-", "MODIS MOD13Q1 percentil 90, 2021-2025 (Earth Engine)",
                             "filtro de zonas áridas del detector: < 0.35"),
        **tierra["variables"],
    }
    sim = comparar(variables, targets[destino]["variables"])
    limites = ["gravedad", "presion_atmosferica", "radiacion"] + (["vacio", "iluminacion_polar_rasante"] if cuerpo == "Luna" else [])
    if not fz["dentro_95"]:
        limites.append("forma: " + fz["nota"])
    limites += sim["limites_calculo"]
    novedoso = not any(km(r.lat, r.lon, la, lo) <= RADIO_ANALOGO_KM for _, la, lo in conocidos)
    g = gemelo(cuerpo, float(r.diam_km), float(r.prof_diam), ref)
    return {
        "id": str(r.cid).lower(),
        "nombre": nombre or f"Depresión tipo cráter {r.cid}",
        "pais": "MX", "lat": round(float(r.lat), 5), "lon": round(float(r.lon), 5),
        "estado": "candidato_modelo", "destino_ref": destino, "prueba_util": None,
        "uso_exploracion": uso, "proceso": proceso, "novedoso": novedoso,
        "variables": variables,
        "similitud": {"total": sim["total"], "por_dimension": sim["por_dimension"], "confianza": sim["confianza"]},
        "limites": limites,
        "nivel": {"perfil_elevacion_m": [], "fuente": None, "exageracion_vertical": None, "obstaculos": []},
        "nota": (f"Exportado por model/scan.py el 2026-11-14. Gemelo de forma más cercano: cráter de {g['sitio']} ({g['cuerpo']}), "
                 f"{g['diam_km']} km, {g['prof_m']} m, d/D {g['prof_diam']}"
                 + (f", en {g['lat']}, {g['lon']}" if g["lat"] is not None else "")
                 + (f". Errores al medir: {'; '.join(tierra['errores'])}" if tierra["errores"] else "") + "."),
    }


def main():
    targets = {t: json.loads((RAIZ / "data" / "targets" / f"{t}.json").read_text(encoding="utf-8")) for t in forma.CUERPO_DESTINO}
    ref = pd.read_csv(DATOS / "hoyas_referencia.csv")
    ref = ref[ref.crater.astype(bool) & ~ref.sitio.str.contains("|".join(forma.SITIOS_EXCLUIDOS))]
    c = candidatos()
    pin = c[c.km_pinacate <= RADIO_PINACATE_KM]
    c = c[c.km_pinacate > RADIO_PINACATE_KM].reset_index(drop=True)
    print(f"Candidatos áridos: {len(c) + len(pin)}; del Pinacate (van al sitio curado): {len(pin)}; a exportar: {len(c)}")
    conocidos = analogos_conocidos()
    with ThreadPoolExecutor(6) as ex:
        sitios = list(ex.map(lambda row: construir_sitio(row[1], targets, ref, conocidos), c.iterrows()))
    for s in sitios:
        (SITES / f"{s['id']}.json").write_text(json.dumps(s, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tabla = pd.DataFrame([{"id": s["id"], "nombre": s["nombre"], "destino": s["destino_ref"], "total": s["similitud"]["total"],
                           "forma": s["similitud"]["por_dimension"].get("forma"), "confianza": s["similitud"]["confianza"],
                           "novedoso": s["novedoso"]} for s in sitios]).sort_values("total", ascending=False)
    print(tabla.to_string(index=False))
    return sitios


if __name__ == "__main__":
    main()
