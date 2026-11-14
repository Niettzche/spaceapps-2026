"""Búsqueda global de análogos en zonas áridas → candidatos `candidato_modelo` (AGENTS.md §6.4).

Estrategia en 3 pasos:
  (a) Máscara global de zonas áridas con el filtro de vegetación del detector (MODIS MOD13Q1, NDVI p90 < 0.35).
  (b) Detector a 200 m (mismo código que analisis/07_buscador_crateres.py) en regiones áridas priorizadas:
      Sahara, península arábiga, Atacama, interior de Australia, Gobi, Kalahari, suroeste de EE. UU.,
      meseta iraní, desierto de Thar y norte de México.
  (c) 5 a 8 sitios finales globales; México es el caso destacado, no el límite.

TODO(frente modelo): definir las regiones (bbox), cachear consultas (respetar límites de las APIs) y excluir
`data/known_analogs.json`. Guardar el top-N en data/sites/ con estado "candidato_modelo" y novedoso=true.
"""
if __name__ == "__main__":
    raise SystemExit("TODO: implementar escaneo (ver docstring)")
