"""API mínima (VPS). Ejecutar desde la raíz:  uvicorn api.main:app --reload
El juego DEBE funcionar sin esta API (usa los JSON de data/)."""
from __future__ import annotations
import json, os, pathlib, sqlite3, datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from model.score import comparar
from model.features import variables_tierra

ROOT = pathlib.Path(__file__).resolve().parents[1]
DB = ROOT / "api" / "propuestas.db"
UMBRAL = float(os.getenv("UMBRAL_PROPUESTA", "0.6"))
app = FastAPI(title="Misión Cero API")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
                   allow_methods=["*"], allow_headers=["*"])


def destino(target_id: str) -> dict:
    f = ROOT / "data" / "targets" / f"{target_id}.json"
    if not f.exists():
        raise HTTPException(404, f"destino desconocido: {target_id}")
    return json.loads(f.read_text(encoding="utf-8"))


class Punto(BaseModel):
    lat: float
    lon: float
    destino: str = "jezero"


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/score")
def score(p: Punto):
    t = destino(p.destino)
    tierra = variables_tierra(p.lat, p.lon)
    res = comparar(tierra["variables"], t["variables"])
    return {"punto": p.model_dump(), "variables": tierra["variables"], "errores": tierra["errores"],
            "similitud": res, "no_reproducible_en_tierra": t.get("no_reproducible_en_tierra", []),
            "puede_proponer": (res["total"] or 0) >= UMBRAL, "metodo": "comparador transparente v0"}


class Propuesta(Punto):
    nombre: str
    autor: str | None = None


@app.post("/submit")
def submit(p: Propuesta):
    r = score(p)
    if not r["puede_proponer"]:
        raise HTTPException(400, "La similitud no supera el umbral para proponer el sitio.")
    con = sqlite3.connect(DB)
    con.execute("CREATE TABLE IF NOT EXISTS propuestas (id INTEGER PRIMARY KEY, fecha TEXT, nombre TEXT, autor TEXT, lat REAL, lon REAL, destino TEXT, resultado TEXT, estado TEXT)")
    con.execute("INSERT INTO propuestas (fecha, nombre, autor, lat, lon, destino, resultado, estado) VALUES (?,?,?,?,?,?,?,?)",
                (datetime.datetime.utcnow().isoformat(), p.nombre, p.autor, p.lat, p.lon, p.destino, json.dumps(r, ensure_ascii=False), "propuesto_usuario"))
    con.commit(); con.close()
    return {"ok": True, "estado": "propuesto_usuario", "similitud": r["similitud"]}


@app.post("/feedback")
def feedback(result: dict):
    """Respaldo por reglas. TODO: LLM opcional anclado SOLO en diseño + datos del sitio + reglas + telemetría."""
    tips = []
    eventos = [e.get("tipo") for e in result.get("eventos", [])]
    if "patina" in eventos:
        tips.append("Las ruedas patinaron: prueba ruedas con más agarre para esta superficie.")
    if result.get("energia_restante", 1) <= 0:
        tips.append("Se agotó la energía: reduce masa o usa una batería de mayor capacidad.")
    if result.get("integridad_carga", 1) < 0.6:
        tips.append("La carga se dañó: usa un soporte amortiguado o maneja más lento en caídas.")
    return {"fuente": "reglas", "recomendaciones": tips or ["Sin recomendaciones: compara con otra configuración."]}
