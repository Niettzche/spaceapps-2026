"""Pruebas del borde levantado (model/borde.py). Los perfiles de la primera parte son SINTÉTICOS (no son datos reales)."""
import numpy as np

from model import borde

R = np.array([0.083, 0.25, 0.417, 0.583, 0.75, 0.917, 1.083, 1.25, 1.417, 1.583, 1.75, 1.917])
TAZON_CON_BORDE = [-0.10, -0.09, -0.07, -0.05, -0.02, 0.01, 0.02, 0.01, 0.005, 0.002, 0.0, 0.0]     # el borde sube sobre el terreno lejano
VALLE = [-0.05, -0.045, -0.04, -0.035, -0.03, -0.025, -0.02, -0.015, -0.01, -0.005, -0.001, 0.001]  # sube sin parar hasta 2 R


def test_tazon_con_borde_sintetico():
    h = borde.altura(TAZON_CON_BORDE, R)
    assert h == 0.02 and borde.levantado(h) is True


def test_valle_sintetico_sin_borde():
    h = borde.altura(VALLE, R)
    assert h < 0 and borde.levantado(h) is False


def test_perfil_incompleto_no_se_rellena():
    assert borde.altura(None, R) is None
    assert borde.altura(TAZON_CON_BORDE[:5] + [None] + TAZON_CON_BORDE[6:], R) is None
    assert borde.levantado(None) is None


def test_la_ventana_estrecha_ve_menos():
    tardio = [-0.10, -0.09, -0.08, -0.07, -0.06, -0.05, -0.03, -0.01, 0.01, 0.02, 0.0, 0.0]   # el borde aparece hasta 1.4–1.6 R
    assert borde.altura(tardio, R, (0.9, 1.3)) < 0 < borde.altura(tardio, R, (0.9, 1.6))


def test_variable_cumple_el_contrato_y_no_inventa():
    v = borde.variable_borde("ID_QUE_NO_EXISTE", 1.0)
    assert v["valor"] is None and v["unidad"] == "m" and v["fuente"] and "no se midió" in v["nota"]


def test_poner_variable_es_idempotente_y_va_tras_borde():
    sitio = {"id": "x", "variables": {"forma": {}, "diametro": {"valor": 1.0}, "borde": {"valor": 1}, "ndvi": {"valor": 0.1}}}
    una = list(borde.poner_variable(sitio, "ID_QUE_NO_EXISTE")["variables"])
    dos = list(borde.poner_variable(sitio, "ID_QUE_NO_EXISTE")["variables"])
    assert una == dos == ["forma", "diametro", "borde", borde.CLAVE, "ndvi"]


# --- Con los perfiles reales del repo (ciencia_datos/datos/perfiles_radiales.json) ---
def test_el_elegante_y_meteor_crater_tienen_borde():
    assert borde.levantado(borde.medir("MX0008")) is True      # El Elegante (Pinacate), catálogo de México
    assert borde.levantado(borde.medir("G00195")) is True      # Meteor Crater, lista de cráteres de impacto


def test_tajo_hercules_no_tiene_borde():
    assert borde.levantado(borde.medir("MX0085")) is False     # tajo con cantera de OpenStreetMap a 0.1 km
