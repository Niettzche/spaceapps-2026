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
