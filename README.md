# Misión Cero — NASA Space Apps 2026 (sede UDEM)

Buscador de análogos terrestres con datos de la NASA + juego web 2D para probar robots antes de ir a Marte o la Luna.
**Contexto completo para personas y agentes: [AGENTS.md](AGENTS.md).**

## Arranque rápido (cada integrante)

```bash
git clone <URL-del-repo> && cd <repo>
git checkout feat/<tu-frente>        # modelo | juego | taller | expediente | arte
```
Abre tu agente (Claude Code o Codex) en la carpeta del repo y pégale el prompt de `docs/prompts/<tu-frente>.md`.

## Ejecutar

```bash
# Juego
cd game && npm install && npm run dev          # http://localhost:5173
# Modelo y pruebas
pip install -r model/requirements.txt
python model/validate_data.py && python -m pytest -q model/tests
# API (opcional; el juego funciona sin ella)
pip install -r api/requirements.txt && uvicorn api.main:app --reload
```

## Reglas cortas
Rama propia → PR a `main` · solo tus carpetas · no inventar datos · sin secretos · actualiza `docs/estado/<frente>.md`.

---

# Space Apps 2026 · Análogos terrestres de la Luna y Marte

Reto: *Identify Earth locations that analog the permanent Moon base locations and Mars* (NASA Space Apps Challenge 2026).

Barrido sistemático de México que encuentra formas tipo cráter, las mide con el mismo código que cráteres del polo sur lunar y de Marte, y dice qué tan bien funciona cada una como análogo y dónde se rompe la analogía.

## Estructura

- `analisis/` — el cuaderno de Colab documentado (`analogos_mexico.ipynb`), su código por celda (`00` a `13`) y un README con los datos y sus fuentes.
- `web/` — página (Vite + React + MapLibre): juego "¿Tierra, Luna o Marte?", mapa, fichas y método. Los datos van en `web/public/data/` (los genera `analisis/10_exportar_web.py`).

## Datos

| Uso | Dato | Fuente | Resolución |
|---|---|---|---|
| Vegetación | MODIS MOD13Q1 (NDVI), 2021–2025 | NASA | 250 m |
| Cobertura de suelo | MODIS MCD12Q1 | NASA | 500 m |
| Albedo | MODIS MCD43A3 | NASA | 500 m |
| Relieve México | Copernicus DEM GLO-30 | ESA | 30 m → 200 m |
| Relieve polo sur lunar | LOLA `ldem_80s_80m` (LRO) | NASA | 80 m → 200 m |
| Relieve Marte | HRSC + MOLA blend | ESA/NASA vía USGS | 200 m |
| Minas y canteras | OpenStreetMap (`landuse=quarry`) | OSM | — |

Los tres cuerpos se comparan a la misma resolución (200 m) y con el mismo detector.

## Correr la página

```bash
cd web
npm install
npm run dev
```
