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
5. novedoso = no coincide con data/known_analogs.json (a menos de 50 km) Y la etiqueta de IA verificada
   (ciencia_datos/datos/etiquetas_ia.csv) dice cráter volcánico, cráter de impacto o mina con confianza ≥ 0.7.
   Si la IA dice valle, presa, duna o "no se puede decir", o no hay etiqueta, novedoso = null: no se presume
   novedoso lo que no sabemos que es un cráter. El tipo y la confianza de la IA van en la nota del sitio.

Uso extra:  python -m model.scan --solo-ia   (aplica solo la regla 5 a los JSON de data/sites/ que ya existen, sin
            consultar NASA POWER ni Earth Engine y sin tocar nivel, variables ni similitud)

Uso:  uv run python -m model.scan            (México; tarda unos minutos: consulta NASA POWER y Earth Engine por sitio)
      uv run python -m model.scan --global   (los N_GLOBAL mejores de ciencia_datos/datos/global_crateres.csv)

Alcance global (AGENTS.md §6.4, decisión del 14 nov): este script cubre México, el caso destacado. Para el resto del mundo, el
mismo detector se corre en regiones áridas priorizadas (Sahara, Arabia, Atacama, Australia interior, Gobi, Kalahari, suroeste de
EE. UU., meseta iraní, Thar). Sus CSV, con las mismas columnas que hoyas_mexico.csv, se exportan con esta misma función
cuando estén listos.
"""
from __future__ import annotations

import json
import math
import pathlib
import re
import sys
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


# Candidatos en zonas con antecedente de análogo sin coordenada con fuente en known_analogs: novedoso queda null
FUENTE_APOLO_AZ = ("USGS, 'Walk in the footsteps of the Apollo astronauts: a field guide to northern Arizona astronaut training sites' "
                   "(https://www.usgs.gov/publications/walk-footsteps-apollo-astronauts-a-field-guide-northern-arizona-astronaut-training)")
POR_VERIFICAR = {
    "g00174": f"en el campo volcánico de San Francisco (Arizona), que tiene sitios de entrenamiento de geología del Apolo ({FUENTE_APOLO_AZ})",
    "g00176": f"en el campo volcánico de San Francisco (Arizona), que tiene sitios de entrenamiento de geología del Apolo ({FUENTE_APOLO_AZ})",
}

PAIS_REGION = {"Atacama": "CL", "Arizona": "US", "Arabia": "SA"}

# Regla 5: solo es novedoso lo que la IA verificada reconoce como cráter o mina (AGENTS.md: no presumir)
TIPOS_IA_NOVEDOSO = {"crater_volcanico", "crater_impacto", "mina_o_cantera"}
CONF_IA_MIN = 0.7
NOTA_IA = re.compile(r" ?Etiqueta de IA:[^\n]*?(?=$| Exportado| Nivel jugable)")


def etiquetas_ia() -> dict:
    e = pd.read_csv(DATOS / "etiquetas_ia.csv")
    return {str(r.id).lower(): (r.tipo, float(r.confianza)) for r in e.itertuples()}


def novedoso_por_ia(sid: str, novedoso_distancia, etiquetas: dict):
    """Combina la regla de distancia (True/False/None) con la etiqueta de IA. Devuelve (novedoso, frase para la nota)."""
    tipo, conf = etiquetas.get(sid, (None, None))
    if tipo is None:
        frase = " Etiqueta de IA: sin etiqueta (no se etiquetó este candidato); tipo no verificado."
    else:
        frase = (f" Etiqueta de IA: {tipo}, confianza {conf:.2f} (claude -p sobre Sentinel-2 y relieve; 29 de 33 aciertos en la "
                 "validación, ciencia_datos/etiquetado_ia).")
    if novedoso_distancia is not True:          # ya conocido (False) o pendiente de verificar (None): se respeta
        return novedoso_distancia, frase
    if tipo in TIPOS_IA_NOVEDOSO and conf >= CONF_IA_MIN:
        return True, frase
    motivo = "sin etiqueta" if tipo is None else (f"tipo según IA: {tipo.replace('_', ' ').replace('canada', 'cañada')}" if tipo not in TIPOS_IA_NOVEDOSO
                                                  else f"confianza de la IA {conf:.2f} < {CONF_IA_MIN}")
    return None, frase + f" novedoso: null ({motivo}; no verificado como cráter)."


def aplicar_regla_ia() -> list[dict]:
    """Modo --solo-ia: recalcula novedoso en los JSON existentes de candidatos del modelo, sin tocar nada más."""
    conocidos, etiquetas, cambios = analogos_conocidos(), etiquetas_ia(), []
    for f in sorted(SITES.glob("*.json")):
        s = json.loads(f.read_text(encoding="utf-8"))
        if s.get("estado") != "candidato_modelo":
            continue
        sid = s["id"]
        if sid in POR_VERIFICAR:
            dist = None
        elif not conocidos:
            dist = None
        else:
            dist = not any(km(s["lat"], s["lon"], la, lo) <= RADIO_ANALOGO_KM for _, la, lo in conocidos)
            if dist and s.get("novedoso") is None and "novedoso: por verificar" in (s.get("nota") or ""):
                dist = None                       # verificación manual pendiente anotada en el sitio (p. ej. g00281)
        nuevo, frase = novedoso_por_ia(sid, dist, etiquetas)
        nota = NOTA_IA.sub("", s.get("nota") or "").rstrip()
        nota = re.sub(r" novedoso: null \((sin etiqueta|tipo según IA|confianza de la IA)[^)]*\)\.", "", nota)
        antes = s.get("novedoso")
        s["novedoso"], s["nota"] = nuevo, nota + frase
        f.write_text(json.dumps(s, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        cambios.append({"id": sid, "antes": antes, "ahora": nuevo, "ia": etiquetas.get(sid, (None, None))[0]})
    return cambios
N_GLOBAL = 12   # (P) cuántos candidatos globales se exportan (AGENTS.md §6.4 c: pocos sitios finales, México destacado)


def candidatos_globales(n: int = N_GLOBAL) -> pd.DataFrame:
    """Cráteres del mismo detector en otras zonas áridas (ciencia_datos/datos/global_crateres.csv, analisis/16).

    Se quedan los áridos tipo cráter, se quitan los que repiten una detección de México a menos de 1 km (el cuadro de
    Arizona incluye el norte de Sonora y el Pinacate) y se exportan los n con mejor forma frente a su destino.
    """
    g = pd.read_csv(DATOS / "global_crateres.csv")
    g = g[g.crater.astype(bool) & g.arido.astype(bool)].copy()
    h = pd.read_csv(DATOS / "hoyas_mexico.csv")
    dmin = [km(la, lo, h.lat.to_numpy(), h.lon.to_numpy()).min() for la, lo in zip(g.lat, g.lon)]
    g = g[np.array(dmin) > 1.0].copy()
    pf = forma.puntuar(g.diam_km, g.prof_m, g.borde_m)
    g["forma_mejor"] = np.maximum(pf.forma_polo_sur_lunar.to_numpy(), pf.forma_jezero.to_numpy())
    g = g.nlargest(n, "forma_mejor").reset_index(drop=True)
    g["cid"] = g.gid
    g["pais"] = g.region.map(lambda r: next((v for k, v in PAIS_REGION.items() if k in r), None))
    g["nombre_catalogo"] = None; g["tipo_catalogo"] = None; g["nombre_previo"] = None
    return g


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
    aviso_nombre = ("" if r.nombre_catalogo or not nombre else
                    " Nombre por verificar: se asignó en analisis/09 por cercanía a una mina o cantera de OpenStreetMap; "
                    "no se cotejó con un inventario minero oficial.")
    if es_mina:
        proceso = "Probable tajo minero a cielo abierto (cantera de OpenStreetMap a ≤ 2 km; por verificar)"
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
    # Sin coordenadas en known_analogs no se puede calcular: queda null con nota (no se asume novedoso)
    novedoso = (None if not conocidos else
                not any(km(r.lat, r.lon, la, lo) <= RADIO_ANALOGO_KM for _, la, lo in conocidos))
    aviso_novedoso = (" novedoso: pendiente; data/known_analogs.json todavía no tiene coordenadas con fuente."
                      if novedoso is None else "")
    if str(r.cid).lower() in POR_VERIFICAR:
        novedoso = None
        aviso_novedoso = f" novedoso: por verificar; está {POR_VERIFICAR[str(r.cid).lower()]}."
    novedoso, frase_ia = novedoso_por_ia(str(r.cid).lower(), novedoso, etiquetas_ia())
    aviso_novedoso += frase_ia
    g = gemelo(cuerpo, float(r.diam_km), float(r.prof_diam), ref)
    return {
        "id": str(r.cid).lower(),
        "nombre": nombre or (f"Depresión tipo cráter {r.cid}" + (f" ({r.region})" if isinstance(r.get("region"), str) else "")),
        "pais": r.get("pais") or "MX", "lat": round(float(r.lat), 5), "lon": round(float(r.lon), 5),
        "estado": "candidato_modelo", "destino_ref": destino, "prueba_util": None,
        "uso_exploracion": uso, "proceso": proceso, "novedoso": novedoso,
        "variables": variables,
        "similitud": {"total": sim["total"], "por_dimension": sim["por_dimension"], "confianza": sim["confianza"]},
        "limites": limites,
        "nivel": {"perfil_elevacion_m": [], "fuente": None, "exageracion_vertical": None, "obstaculos": []},
        "nota": (f"Exportado por model/scan.py el 2026-11-14. Gemelo de forma más cercano: cráter de {g['sitio']} ({g['cuerpo']}), "
                 f"{g['diam_km']} km, {g['prof_m']} m, d/D {g['prof_diam']}"
                 + (f", en {g['lat']}, {g['lon']}" if g["lat"] is not None else "")
                 + (f". Errores al medir: {'; '.join(tierra['errores'])}" if tierra["errores"] else "") + "." + aviso_nombre + aviso_novedoso),
    }


def main():
    if "--solo-ia" in sys.argv:
        t = pd.DataFrame(aplicar_regla_ia())
        print(t.groupby(["ia", "antes", "ahora"], dropna=False).size().to_string())
        return t
    targets = {t: json.loads((RAIZ / "data" / "targets" / f"{t}.json").read_text(encoding="utf-8")) for t in forma.CUERPO_DESTINO}
    ref = pd.read_csv(DATOS / "hoyas_referencia.csv")
    ref = ref[ref.crater.astype(bool) & ~ref.sitio.str.contains("|".join(forma.SITIOS_EXCLUIDOS))]
    c = candidatos()
    pin = c[c.km_pinacate <= RADIO_PINACATE_KM]
    c = c[c.km_pinacate > RADIO_PINACATE_KM].reset_index(drop=True)
    print(f"Candidatos áridos: {len(c) + len(pin)}; del Pinacate (van al sitio curado): {len(pin)}; a exportar: {len(c)}")
    conocidos = analogos_conocidos()
    if "--global" in sys.argv:
        c = candidatos_globales()
        print(f"Candidatos globales a exportar (mejor forma, sin duplicados de México): {len(c)}")
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
