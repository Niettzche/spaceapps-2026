"""Pruebas de POST /nivel sin Earth Engine (model.nivel_vivo.leer_franjas se sustituye). Franjas SINTÉTICAS."""
import numpy as np
import pytest
from fastapi.testclient import TestClient

from api.main import app
from model import nivel_vivo

cliente = TestClient(app)


@pytest.fixture(autouse=True)
def _sin_cache():
    from api import main
    nivel_vivo._medir_cache.cache_clear()
    main._nivel_ip.clear()  # el límite por IP de /nivel no se arrastra entre pruebas
    yield
    nivel_vivo._medir_cache.cache_clear()


def _franjas(perfil_de, arena=40.0, agua=0.0):
    llamadas = []

    def falso(lat, lon, largo_m, crs):
        llamadas.append((lat, lon, largo_m, crs))
        n = int(largo_m / nivel_vivo.PASO) + 1
        p = perfil_de(n)
        return np.vstack([p, p, p]).astype(float), np.full(n, arena), np.full(n, agua)
    return falso, llamadas


def test_devuelve_un_nivel_con_los_campos_de_data_sites(monkeypatch):
    falso, llamadas = _franjas(lambda n: np.linspace(0, 60, n))
    monkeypatch.setattr(nivel_vivo, "leer_franjas", falso)
    r = cliente.post("/nivel", json={"lat": 31.2636, "lon": -106.3953})
    assert r.status_code == 200
    d = r.json()
    assert set(d["nivel"]) == {"perfil_elevacion_m", "fuente", "exageracion_vertical", "obstaculos", "paso_m", "superficies", "superficies_nota"}
    assert len(d["nivel"]["perfil_elevacion_m"]) == 101 and d["nivel"]["paso_m"] == 30.0
    assert d["nivel"]["superficies"] == [{"desde": 0.0, "hasta": 3000.0, "tipo": "compacto"}]
    assert "coordenada pedida" in d["nivel"]["fuente"] and "EPSG:32613" in d["nivel"]["fuente"]
    assert d["resumen"]["longitud_m"] == 3000 and llamadas == [(31.2636, -106.3953, 3000, "EPSG:32613")]


def test_el_diametro_alarga_el_corte_y_el_destino_lunar_cambia_la_nota(monkeypatch):
    falso, llamadas = _franjas(lambda n: np.linspace(0, 60, n), arena=80.0)
    monkeypatch.setattr(nivel_vivo, "leer_franjas", falso)
    d = cliente.post("/nivel", json={"lat": 26.9888, "lon": 42.2465, "diam_km": 1.296, "destino": "polo_sur_lunar"}).json()
    assert llamadas[0][2] == 4000 and len(d["nivel"]["perfil_elevacion_m"]) == 134
    assert d["nivel"]["superficies"][0]["tipo"] == "arena" and "regolito suelto" in d["nivel"]["superficies_nota"]


def test_la_misma_consulta_no_vuelve_a_pedir_el_relieve(monkeypatch):
    falso, llamadas = _franjas(lambda n: np.linspace(0, 60, n))
    monkeypatch.setattr(nivel_vivo, "leer_franjas", falso)
    cliente.post("/nivel", json={"lat": 10.0, "lon": 20.0})
    cliente.post("/nivel", json={"lat": 10.0, "lon": 20.0, "destino": "jezero"})
    assert len(llamadas) == 1


def test_mar_o_sin_relieve_da_422_con_explicacion(monkeypatch):
    falso, _ = _franjas(lambda n: np.zeros(n))
    monkeypatch.setattr(nivel_vivo, "leer_franjas", falso)
    r = cliente.post("/nivel", json={"lat": 0.0, "lon": -30.0})
    assert r.status_code == 422 and "relieve" in r.json()["detail"]


def test_coordenada_fuera_de_rango_y_destino_desconocido(monkeypatch):
    falso, llamadas = _franjas(lambda n: np.linspace(0, 60, n))
    monkeypatch.setattr(nivel_vivo, "leer_franjas", falso)
    assert cliente.post("/nivel", json={"lat": 95, "lon": 0}).status_code == 422
    assert cliente.post("/nivel", json={"lat": 10, "lon": 200}).status_code == 422
    assert cliente.post("/nivel", json={"lat": 10, "lon": 20, "diam_km": 50}).status_code == 422
    assert cliente.post("/nivel", json={"lat": 10, "lon": 20, "destino": "venus"}).status_code == 404
    assert llamadas == []


def test_si_el_relieve_no_responde_da_502_sin_detalles_internos(monkeypatch):
    def roto(*a):
        raise RuntimeError("credenciales en /home/deploy/.config/earthengine")
    monkeypatch.setattr(nivel_vivo, "leer_franjas", roto)
    r = cliente.post("/nivel", json={"lat": 10.0, "lon": 20.0})
    assert r.status_code == 502 and "earthengine" not in r.text and "deploy" not in r.text


def test_avisa_si_hay_agua_en_el_corte(monkeypatch):
    falso, _ = _franjas(lambda n: np.linspace(0, 60, n), agua=90.0)
    monkeypatch.setattr(nivel_vivo, "leer_franjas", falso)
    d = cliente.post("/nivel", json={"lat": 10.0, "lon": 20.0}).json()
    assert d["resumen"]["agua_puntos"] == 101 and any("agua" in a for a in d["avisos"]) and "Agua:" in d["nivel"]["superficies_nota"]


def test_limite_por_ip(monkeypatch):
    """/nivel consulta Earth Engine: más de NIVEL_POR_IP llamadas seguidas de la misma IP dan 429; otra IP sigue pasando."""
    from api import main
    falso, _ = _franjas(lambda n: np.linspace(0, 60, n))
    monkeypatch.setattr(nivel_vivo, "leer_franjas", falso)
    monkeypatch.setenv("NIVEL_POR_IP", "2")
    main._nivel_ip.clear()
    cab = {"cf-connecting-ip": "203.0.113.50"}
    codigos = [cliente.post("/nivel", json={"lat": 31.2636, "lon": -106.3953}, headers=cab).status_code for _ in range(3)]
    assert codigos == [200, 200, 429]
    assert cliente.post("/nivel", json={"lat": 31.2636, "lon": -106.3953}, headers={"cf-connecting-ip": "203.0.113.51"}).status_code == 200
    assert main.nivel_permitido("203.0.113.50", ahora=10**12)  # pasada la ventana, vuelve a pasar
    main._nivel_ip.clear()
