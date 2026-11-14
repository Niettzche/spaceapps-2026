"""Pruebas con valores SINTÉTICOS (no son datos reales)."""
from model.score import comparar

DEST = {"oscilacion_termica": 60, "precipitacion": 0, "ndvi": 0, "pendiente": 3}

def test_desierto_sintetico_alto():
    r = comparar({"oscilacion_termica": 25, "precipitacion": 0.1, "ndvi": 0.05, "pendiente": 4}, DEST)
    assert r["total"] > 0.4 and not r["vetado"]

def test_selva_sintetica_vetada():
    r = comparar({"oscilacion_termica": 8, "precipitacion": 7, "ndvi": 0.85, "pendiente": 2}, DEST)
    assert r["total"] == 0.0 and r["vetado"]

def test_recorte_al_extremo_terrestre():
    r = comparar({"oscilacion_termica": 40, "precipitacion": 0, "ndvi": 0, "pendiente": 3}, DEST)
    assert any("extremo" in l for l in r["limites_calculo"])

def test_dato_faltante_baja_confianza():
    r = comparar({"oscilacion_termica": 25, "precipitacion": None, "ndvi": 0.05, "pendiente": 4}, DEST)
    assert r["confianza"] < 1 and r["total"] is not None
