"""La regla de superficie de model/nivel_vivo.py, sin red (franjas SINTÉTICAS)."""
import numpy as np
import pytest

from model import nivel_vivo as nv


def _franja(perfil):
    return np.vstack([perfil, perfil, perfil]).astype(float)


def test_largo_del_transecto_sigue_la_regla_de_analisis_26():
    assert nv.largo_para(None) == 3000
    assert nv.largo_para(1.0) == 3000 and nv.largo_para(1.3) == 4000
    assert nv.largo_para(3.07) == 5000          # Pingualuit: 3.07 km + 900 m de cada lado → al km siguiente


def test_plano_sin_arena_es_compacto_y_con_arena_es_arena():
    n = 101
    perfil = np.linspace(0, 10, n)              # 10 m en 3 km: ni pendiente ni rugosidad
    v = nv.clasificar(_franja(perfil), np.full(n, 40.0))
    assert [t["tipo"] for t in v["superficie_tramos"]] == ["compacto"]
    v = nv.clasificar(_franja(perfil), np.full(n, 80.0))
    assert [t["tipo"] for t in v["superficie_tramos"]] == ["arena"]
    assert v["perfil_elevacion_m"][0] == 0.0 and v["superficie_tramos"][-1]["hasta_m"] == 3000.0


def test_una_pared_con_arena_del_suelo_es_roca_y_no_se_absorbe():
    n = 101
    perfil = np.zeros(n)
    perfil[50:55] = np.arange(1, 6) * 20.0      # 4 pasos de 20 m en 30 m: ~34° de pendiente, unos 150 m de pared
    perfil[55:] = 100.0
    v = nv.clasificar(_franja(perfil), np.full(n, 80.0))
    tipos = [t["tipo"] for t in v["superficie_tramos"]]
    assert tipos == ["arena", "roca", "arena"] and v["arena_suelo_y_pendiente_15"] >= 4 and v["pend_max"] > 15


def test_un_tramo_corto_se_absorbe_en_el_anterior():
    tipos = ["compacto"] * 20 + ["roca"] * 2 + ["compacto"] * 20          # 60 m de roca: menos de 150 m
    assert [t["tipo"] for t in nv.tramos(tipos)] == ["compacto"]
    tipos = ["arena"] * 20 + ["pared"] * 3 + ["arena"] * 20               # 90 m de pared: se conserva, como roca
    assert [t["tipo"] for t in nv.tramos(tipos)] == ["arena", "roca", "arena"]


def test_sin_relieve_no_hay_nivel():
    with pytest.raises(nv.SinRelieve):
        nv.clasificar(_franja(np.zeros(101)), np.zeros(101))


def test_agua_y_arena_sin_dato_se_declaran():
    n = 101
    perfil = np.linspace(0, 30, n)
    agua = np.zeros(n)
    agua[10:20] = 90
    v = nv.clasificar(_franja(perfil), np.zeros(n), agua)                  # arena 0 = sin dato
    assert v["agua_puntos"] == 10 and v["agua_desde_m"] == 300 and v["agua_hasta_m"] == 570
    assert v["arena_suelo_pct"] is None and v["arena_sin_dato"] == n
