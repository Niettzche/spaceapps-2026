"""Pruebas sin red de model/features.py: los tramos de ORNL y la media del NDVI (requests simulado)."""

from model import features


def _compuestos(inicio: str, fin: str) -> list[int]:
    a, b = int(inicio[5:]), int(fin[5:])
    return [d for d in range(1, 366, 16) if a <= d <= b]


def test_tramos_cubren_el_anio_sin_pasar_de_10():
    vistos = []
    for inicio, fin in features.ORNL_TRAMOS:
        c = _compuestos(inicio, fin)
        assert 0 < len(c) <= 10
        vistos += c
    assert vistos == list(range(1, 366, 16))  # los 23 compuestos de MOD13Q1, sin huecos ni repetidos
    assert len(vistos) == 23


def test_media_ignora_relleno(monkeypatch):
    class Resp:
        def __init__(self, datos):
            self.datos = datos

        def raise_for_status(self):
            pass

        def json(self):
            return {"subset": [{"data": [v]} for v in self.datos]}

    def falso_get(url, params, headers, timeout):
        n = len(_compuestos(params["startDate"], params["endDate"]))
        return Resp([2000] * (n - 1) + [features.NDVI_RELLENO])

    monkeypatch.setattr(features.requests, "get", falso_get)
    assert features._ndvi_ornl(31.35, -106.48) == 0.2


def test_un_tramo_fallido_no_da_media_parcial(monkeypatch):
    def falso_get(url, params, headers, timeout):
        raise features.requests.HTTPError("400")

    monkeypatch.setattr(features.requests, "get", falso_get)
    try:
        features._ndvi_ornl(0, 0)
    except features.requests.HTTPError:
        return
    raise AssertionError("debió propagar el error")
