"""Textos verificados con fuente por el frente taller (model/scan.py, modo --solo-textos)."""
import json
import re

from model import scan


def _sitio(sid):
    return json.loads((scan.SITES / f"{sid}.json").read_text(encoding="utf-8"))


def test_los_json_llevan_los_textos_verificados():
    for sid, proceso in scan.PROCESOS_VERIFICADOS.items():
        assert _sitio(sid)["proceso"] == proceso
    s = _sitio("g00266")
    assert s["nombre"] == scan.NOMBRES_GLOBALES["g00266"][0] and s["nombre"].startswith("Anillo de toba")
    assert scan.NOMBRES_GLOBALES["g00266"][1] in s["nota"]
    assert scan.NOMBRES_VERIFICADOS["mx0023"] in s_nota("mx0023") and "Nombre por verificar" not in s_nota("mx0023")


def s_nota(sid):
    return _sitio(sid)["nota"]


def test_cananea_sigue_siendo_tajo_para_el_modelo_y_para_el_juego():
    s = _sitio("mx0023")
    assert scan.categoria(s, scan.etiquetas_ia())[0] == "tajo_minero"
    # misma expresión que esMina() en game/src/scenes/expediente/logica.js: el juego lee el tajo de `proceso`
    assert re.search(r"tajo minero|mina a cielo abierto", s["proceso"], re.I)
    assert "Probable" not in s["proceso"] and "por verificar" not in s["proceso"]


def test_solo_textos_no_cambia_nada_si_ya_esta_aplicado(tmp_path, monkeypatch):
    for sid in ("g00266", "mx0023"):
        (tmp_path / f"{sid}.json").write_text((scan.SITES / f"{sid}.json").read_text(encoding="utf-8"), encoding="utf-8")
    monkeypatch.setattr(scan, "SITES", tmp_path)
    assert [c["cambio"] for c in scan.aplicar_textos_verificados()] == [False, False]
