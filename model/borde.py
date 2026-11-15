"""Borde levantado: evidencia MEDIDA de que una depresión terrestre es un cráter (model/VALIDATION.md, sección B).

Un impacto o una explosión volcánica apila material alrededor del hoyo, así que el terreno pegado al cráter queda más alto que
el terreno lejano. Un valle cerrado, una presa, una hondonada entre dunas o un tajo minero no tienen eso. El puntaje de forma
(model/forma.py) no ve esta diferencia: usa 3 medidas a 200 m y no distingue un cráter de otra depresión (AUC 0.42).

Medida (no consulta nada: usa los perfiles radiales que ya calculó analisis/18_perfiles_radiales.py):
    h/D = máximo del perfil radial promedio en los anillos cercanos al borde (VENTANA, en radios del detector), relativo al
          terreno lejano (los dos anillos de afuera, hasta 2 radios), con Copernicus DEM GLO-30 llevado a 80 m.
    borde levantado  ⇔  h/D > UMBRAL

Qué es y qué no es:
- Es evidencia de que la depresión es un cráter EN LA TIERRA. Se usa como segunda evidencia de la categoría del sitio
  (model/scan.py, regla 6), junto a la etiqueta verificada. No entra al puntaje ni cambia ningún total.
- NO mide parecido con la Luna ni con Marte: con la misma medida, la mayoría de los cráteres lunares y marcianos de referencia
  no muestra borde levantado (no comprobamos por qué; quizá porque son viejos y están encimados). AGENTS.md §6.2 ya advierte
  que el borde no sirve como criterio de parecido con la Luna.
- La ventana y el umbral son provisionales (P). La sensibilidad a los dos está en model/VALIDATION.md.
- Prueba fuera de muestra: tabla_impactos() mide, con la ventana y el umbral ya fijados, cráteres de impacto de otros países que
  no intervinieron al fijarlos (perfiles de analisis/25_perfiles_impactos.py).

Uso:  uv run python -m model.borde     (escribe variables.borde_levantado en los JSON de data/sites que tienen un cráter medido;
                                        sin red; idempotente)
"""
from __future__ import annotations

import functools
import json
import pathlib

import numpy as np
import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parents[1]
DATOS = RAIZ / "ciencia_datos" / "datos"
SITES = RAIZ / "data" / "sites"
PERFILES = DATOS / "perfiles_radiales.json"
PERFILES_IMPACTOS = DATOS / "perfiles_impactos.json"     # analisis/25_perfiles_impactos.py
FICHAS = RAIZ / "ciencia_datos" / "salidas" / "fichas_integradas.csv"

CLAVE = "borde_levantado"
VENTANA = (0.9, 1.6)     # (P) centros de los anillos que cuentan como "borde", en radios del detector
UMBRAL = 0.0             # (P) h/D por encima del cual se dice que hay borde levantado
RADIO_COTEJO_KM = 2.5    # mismo radio que el cotejo del catálogo en model/validate.py y ciencia_datos/03
FUENTE = ("Copernicus DEM GLO-30 (ESA) llevado a 80 m; perfil radial promedio del cráter "
          "(analisis/18_perfiles_radiales.py, ciencia_datos/datos/perfiles_radiales.json)")

FUENTE_IMPACTOS = ("Copernicus DEM GLO-30 (ESA) llevado a 80 m; perfil radial promedio del cráter "
                   "(analisis/25_perfiles_impactos.py, ciencia_datos/datos/perfiles_impactos.json)")

# Cráteres identificados por literatura, con la distancia entre la detección y la coordenada de la fuente (model/NIVEL2.md §A).
# Los del catálogo de México y Meteor Crater no van aquí: se cotejan por coordenada en crateres_con_fuente().
IDENTIFICADOS = {
    "G00176": "Colton Crater (Crater 160), a ~0.05 km (USGS OFR 2005-1190)",
    "G00263": "maar Al Hutaymah, a ~0.10 km (OpenStreetMap; USGS OFR 85-125)",
    "G00266": "cono de toba Jabal Bayda, a ~0.04 km (OpenStreetMap; NASA Earth Observatory 2024)",
    "G00281": "maar Al Wahbah, a ~0.23 km (IUGS Geoheritage)",
}


@functools.lru_cache(maxsize=1)
def perfiles() -> tuple[np.ndarray, dict]:
    """(centros de los anillos en radios, {id del detector en mayúsculas: registro con los perfiles tierra/luna/marte})."""
    js = json.loads(PERFILES.read_text(encoding="utf-8"))
    return np.array(js["r"], float), {str(s["id"]).upper(): s for s in js["sitios"]}


def limites_ventana(ventana: tuple[float, float] = VENTANA) -> tuple[float, float, float]:
    """Radios reales que cubre la ventana (orillas de los anillos) y dónde empieza el terreno lejano, para describirla sin error."""
    r, _ = perfiles()
    medio = float(r[1] - r[0]) / 2
    dentro = r[(r >= ventana[0]) & (r < ventana[1])]
    lejano = r[r >= 1.6]          # analisis/18: el terreno lejano son los anillos que empiezan en 1.6 R o más
    return float(dentro.min() - medio), float(dentro.max() + medio), float(lejano.min() - medio)


def altura(perfil, r: np.ndarray | None = None, ventana: tuple[float, float] = VENTANA) -> float | None:
    """h/D: máximo del perfil (altura sobre el terreno lejano, dividida entre el diámetro) en la ventana del borde.

    Devuelve None si no hay perfil o le falta algún anillo: no se rellena.
    """
    if r is None:
        r = perfiles()[0]
    if perfil is None or len(perfil) != len(r) or any(v is None for v in perfil):
        return None
    p = np.asarray(perfil, float)
    return float(p[(r >= ventana[0]) & (r < ventana[1])].max())


@functools.lru_cache(maxsize=1)
def perfiles_impactos() -> dict:
    """{id de impactos_tierra.csv (I00…): registro con el perfil tierra} de analisis/25, con los mismos anillos que perfiles()."""
    js = json.loads(PERFILES_IMPACTOS.read_text(encoding="utf-8"))
    if not np.array_equal(np.array(js["r"], float), perfiles()[0]):
        raise ValueError("perfiles_impactos.json no usa los mismos anillos que perfiles_radiales.json")
    return {str(s["id"]).upper(): s for s in js["sitios"]}


def medir(cid: str, cuerpo: str = "tierra", ventana: tuple[float, float] = VENTANA) -> float | None:
    """h/D del cráter `cid` del detector (p. ej. MX0008, G00263, o I03 de impactos_tierra.csv). `cuerpo`: tierra, o el perfil
    de su gemelo (luna, marte; los cráteres de impacto de analisis/25 solo tienen el de la Tierra)."""
    r, sitios = perfiles()
    s = sitios.get(str(cid).upper())
    if s is None and cuerpo == "tierra":
        s = perfiles_impactos().get(str(cid).upper())
    return None if s is None else altura(s.get(cuerpo), r, ventana)


def levantado(h: float | None) -> bool | None:
    return None if h is None else bool(h > UMBRAL)


def variable_borde(cid: str, diam_km: float | None) -> dict:
    """Entrada de `variables` (contrato Site): altura del borde en metros, con la lectura y los límites en la nota."""
    h = medir(cid)
    if h is None or not diam_km:
        return {"valor": None, "unidad": "m", "fuente": FUENTE, "fecha": None,
                "nota": "Sin perfil radial a 80 m para este cráter: el borde levantado no se midió."}
    a, b, lejos = limites_ventana()
    fuente = FUENTE_IMPACTOS if str(cid).upper() in perfiles_impactos() else FUENTE
    lectura = ("positiva: el borde queda más alto que el terreno lejano, lo que es evidencia de cráter de impacto o de explosión"
               if levantado(h) else "no positiva: sin borde levantado en esta medida")
    return {"valor": round(h * float(diam_km) * 1000, 1) + 0.0, "unidad": "m", "fuente": fuente, "fecha": None,
            "nota": (f"h/D = {h:+.4f}, {lectura}. Altura máxima del perfil radial promedio entre {a:.2f} y {b:.2f} radios, sobre el "
                     f"terreno lejano ({lejos:.2f} a 2 radios). No mide parecido con la Luna ni con Marte: dice si la depresión "
                     "tiene borde de cráter (model/VALIDATION.md, sección B). Ventana y umbral provisionales (P).")}


def poner_variable(sitio: dict, cid: str) -> dict:
    """Escribe variables.borde_levantado justo después de `borde`. Idempotente; no toca nada más del sitio."""
    v = sitio.get("variables") or {}
    nueva = variable_borde(cid, (v.get("diametro") or {}).get("valor"))
    out = {}
    for k, x in v.items():
        if k == CLAVE:
            continue
        out[k] = x
        if k == "borde":
            out[CLAVE] = nueva
    out.setdefault(CLAVE, nueva)
    sitio["variables"] = out
    return sitio


def crater_de(sitio: dict) -> str | None:
    """Id del detector del cráter medido en un sitio: el propio id en los candidatos, `crater_cid` en los curados."""
    if "forma" not in (sitio.get("variables") or {}):
        return None                         # sin cráter medido (p. ej. las dunas de Samalayuca)
    from model import curados               # import perezoso: curados importa scan, y scan importa este módulo
    from model import niveles               # cráteres de impacto creados por model/niveles.py (id del sitio ≠ id del detector)
    return (curados.CURADOS.get(sitio["id"], {}).get("crater_cid") or niveles.CRATER_DE_SITIO.get(sitio["id"])
            or sitio["id"].upper())


def _km(lat1, lon1, lat2, lon2):
    la1, lo1, la2, lo2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * np.arcsin(np.sqrt(a))


def crateres_con_fuente(fichas: pd.DataFrame, radio_km: float = RADIO_COTEJO_KM) -> dict:
    """{id del candidato: de dónde se sabe que es un cráter}, sin usar la etiqueta de IA.

    Tres fuentes: el catálogo de cráteres volcánicos de México y la lista de cráteres de impacto, cotejados por coordenada
    (el candidato más cercano a menos de `radio_km`), y los identificados en la literatura (IDENTIFICADOS).
    """
    out, dist = {}, {}
    for archivo, etiqueta in (("crateres_conocidos_mx.csv", "catálogo de cráteres de México"),
                              ("impactos_tierra.csv", "lista de cráteres de impacto, ciencia_datos/datos/impactos_tierra.csv")):
        cat = pd.read_csv(DATOS / archivo).dropna(subset=["lat", "lon"])
        for c in cat.itertuples():
            d = _km(c.lat, c.lon, fichas.lat.to_numpy(), fichas.lon.to_numpy())
            k = int(np.argmin(d))
            cid = str(fichas.id.iloc[k])
            if d[k] <= radio_km and d[k] < dist.get(cid, np.inf):      # si dos del catálogo caen en el mismo candidato, el más cercano
                dist[cid] = float(d[k])
                out[cid] = f"{c.nombre}, a {d[k]:.2f} km ({etiqueta})"
    for cid, fuente in IDENTIFICADOS.items():
        if cid in set(fichas.id):
            out.setdefault(cid, fuente)
    return out


def tabla_candidatos() -> pd.DataFrame:
    """Los candidatos áridos con ficha, con su h/D medida y, si la hay, la fuente que dice que son un cráter."""
    f = pd.read_csv(FICHAS)
    f["h"] = [medir(i) for i in f.id]
    f["con_fuente"] = f.id.map(crateres_con_fuente(f))
    return f


def tabla_impactos() -> pd.DataFrame:
    """Prueba fuera de muestra: los cráteres de impacto de impactos_tierra.csv que el detector encuentra, con su h/D.

    `visto` dice si el cráter ya estaba entre los candidatos áridos con los que se fijaron la ventana y el umbral (mismo radio de
    cotejo que crateres_con_fuente): esos no cuentan como nuevos. Centro y diámetro son los del detector, como en los candidatos.
    """
    js = json.loads(PERFILES_IMPACTOS.read_text(encoding="utf-8"))
    r = np.array(js["r"], float)
    if not np.array_equal(r, perfiles()[0]):
        raise ValueError("perfiles_impactos.json no usa los mismos anillos que perfiles_radiales.json")
    imp = pd.read_csv(DATOS / "impactos_tierra.csv").set_index("hid")
    f = pd.read_csv(FICHAS)
    filas = []
    for s in js["sitios"]:
        c = imp.loc[s["id"]]
        d = _km(c.lat, c.lon, f.lat.to_numpy(), f.lon.to_numpy())
        k = int(np.argmin(d))
        visto = bool(d[k] <= RADIO_COTEJO_KM)
        filas.append({"id": s["id"], "nombre": c.nombre, "lat": float(c.lat), "lon": float(c.lon), "diam_km": float(c.diam_km),
                      "diam_esperado_km": float(c.diam_esperado_km), "h": altura(s["tierra"], r), "perfil": s["tierra"],
                      "visto": visto, "candidato": str(f.id.iloc[k]) if visto else None})
    return pd.DataFrame(filas)


def perfiles_referencia(cuerpo: str) -> list[tuple]:
    """Perfiles distintos y completos de los gemelos de referencia (luna a 80 m, marte a 200 m)."""
    r, sitios = perfiles()
    vistos = {tuple(s[cuerpo]) for s in sitios.values()
              if s.get(cuerpo) and len(s[cuerpo]) == len(r) and all(v is not None for v in s[cuerpo])}
    return sorted(vistos)


def aplicar() -> list[dict]:
    """Escribe la variable en todos los sitios de data/sites con un cráter medido (candidatos y curados)."""
    out = []
    for f in sorted(SITES.glob("*.json")):
        s = json.loads(f.read_text(encoding="utf-8"))
        cid = crater_de(s)
        if cid is None:
            continue
        poner_variable(s, cid)
        f.write_text(json.dumps(s, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        out.append({"id": s["id"], "crater": cid, "borde_m": s["variables"][CLAVE]["valor"], "levantado": levantado(medir(cid))})
    return out


if __name__ == "__main__":
    t = pd.DataFrame(aplicar())
    print(t.to_string(index=False))
    print(f"\nSitios con cráter medido: {len(t)}; con borde levantado: {int(t.levantado.fillna(False).sum())}; "
          f"sin perfil: {int(t.levantado.isna().sum())}")
