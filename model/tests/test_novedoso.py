"""Ningún tajo minero se presenta como novedoso (model/scan.py, regla 5). El juego muestra NOVEDOSO si novedoso es true."""
import json

from model import scan


def test_ningun_tajo_minero_es_novedoso():
    etiquetas = scan.etiquetas_ia()
    for f in sorted(scan.SITES.glob("*.json")):
        s = json.loads(f.read_text(encoding="utf-8"))
        if s.get("estado") == "candidato_modelo" and scan.categoria(s, etiquetas)[0] == "tajo_minero":
            assert s.get("novedoso") is not True, f"{s['id']} es un tajo minero y está marcado como novedoso"


def test_una_mina_segura_no_es_novedosa_aunque_este_lejos_de_todo():
    nuevo, frase = scan.novedoso_por_ia("x", True, {"x": ("mina_o_cantera", 0.9)})
    assert nuevo is None and "tajo minero" in frase


def test_un_crater_natural_seguro_y_lejos_de_todo_si_puede_ser_novedoso():
    assert scan.novedoso_por_ia("x", True, {"x": ("crater_volcanico", 0.9)})[0] is True
