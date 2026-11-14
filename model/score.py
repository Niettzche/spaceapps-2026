"""Comparador de similitud del modelo de análogos (AGENTS.md §6.3).

Dos tipos de dimensión:
- **forma** (principal): puntaje ya calculado en [0, 1] por model/forma.py (modelo explicable Luna contra Marte +
  distancia a la nube Luna+Marte). Solo existe para sitios con un cráter medido por el detector; en un punto
  cualquiera falta, se omite y baja la confianza.
- **complementarias** (clima, vegetación, pendiente): s = exp(-|tierra - destino| / escala)
- Si el destino está fuera del rango alcanzable en la Tierra, se compara contra el extremo terrestre
  ("lo más cerca que llega la Tierra") y se registra en `limites`.
- Total: media geométrica ponderada. Veto: si una dimensión con veto da ~0, el total es 0.
- Dato faltante: se omite la dimensión, se renormalizan pesos y baja la confianza.

Las escalas, pesos y rangos son PROVISIONALES (P): ajústalos y documenta el cambio en model/VALIDATION.md.
"""
from __future__ import annotations
import math

DIMENSIONES = {
    # nombre: escala, peso, veto, rango terrestre (min, max) o None; "precalculada": el sitio trae el puntaje 0..1
    "forma":              {"peso": 0.40, "veto": False, "precalculada": True},
    "oscilacion_termica": {"escala": 20.0, "peso": 0.20, "veto": False, "rango_tierra": (0.0, 40.0)},
    "precipitacion":      {"escala": 1.0,  "peso": 0.15, "veto": False, "rango_tierra": (0.0, None)},
    "ndvi":               {"escala": 0.15, "peso": 0.10, "veto": True,  "rango_tierra": (-1.0, 1.0)},
    "pendiente":          {"escala": 5.0,  "peso": 0.15, "veto": False, "rango_tierra": (0.0, 90.0)},
}
UMBRAL_VETO = 0.05


def _valor(variables: dict, dim: str):
    v = variables.get(dim)
    if isinstance(v, dict):
        return v.get("valor")
    return v


def similitud_dimension(tierra: float, destino: float, cfg: dict) -> tuple[float, str | None]:
    """Devuelve (similitud 0..1, nota de límite o None)."""
    nota = None
    lo, hi = cfg.get("rango_tierra") or (None, None)
    objetivo = destino
    if lo is not None and destino < lo:
        objetivo, nota = lo, f"destino por debajo del mínimo terrestre ({destino} < {lo}); se compara contra el extremo"
    if hi is not None and destino > hi:
        objetivo, nota = hi, f"destino por encima del máximo terrestre ({destino} > {hi}); se compara contra el extremo"
    s = math.exp(-abs(tierra - objetivo) / cfg["escala"])
    return s, nota


def comparar(sitio_vars: dict, destino_vars: dict, dimensiones: dict = DIMENSIONES) -> dict:
    por_dim, limites = {}, []
    peso_total = sum(c["peso"] for c in dimensiones.values())
    peso_usado, log_suma, vetado = 0.0, 0.0, False
    for dim, cfg in dimensiones.items():
        if cfg.get("precalculada"):
            t = _valor(sitio_vars, dim)
            if t is None:
                por_dim[dim] = None
                continue
            s, nota = min(max(float(t), 0.0), 1.0), None
        else:
            t, d = _valor(sitio_vars, dim), _valor(destino_vars, dim)
            if t is None or d is None:
                por_dim[dim] = None
                continue
            s, nota = similitud_dimension(float(t), float(d), cfg)
        por_dim[dim] = round(s, 4)
        if nota:
            limites.append(f"{dim}: {nota}")
        if cfg["veto"] and s < UMBRAL_VETO:
            vetado = True
        peso_usado += cfg["peso"]
        log_suma += cfg["peso"] * math.log(max(s, 1e-9))
    if peso_usado == 0:
        total = None
    elif vetado:
        total = 0.0
    else:
        total = round(math.exp(log_suma / peso_usado), 4)
    confianza = round(peso_usado / peso_total, 4) if peso_total else 0.0
    return {"total": total, "por_dimension": por_dim, "confianza": confianza, "limites_calculo": limites, "vetado": vetado}
