# MARSCEPTION

An open-data Earth-analog explorer and 2D rover game for preparing selected Moon and Mars operations.

**Public demo:** [Earth-analog explorer](https://v1.marsception.us/) · [Rover game · English](https://v1.marsception.us/game/?lang=en) · [Captioned video](https://v1.marsception.us/media/mision-cero-30s-en.mp4).

Deployment check: the game title, menu and workshop now display English with `?lang=en`. The gameplay recording and full judge walkthrough remain pending. Source changes in an open PR are not yet part of the public demo.

NASA Space Apps 2026 · Monterrey / UDEM. Challenge: [Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars](https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/).

## What to explore

Inspect candidate Earth sites, their measurements, sources and limits in the web explorer. Build a rover within a 1,000-credit game budget, test it on Earth terrain and attempt a delivery on the Moon or Mars. Bundled data keep the game usable without a live API. Robot balance and added terrain features are declared game approximations, not evidence of field readiness.

Mexico is the validated case study. The global search covers Atacama, Arizona and Arabia: 3 of 10 prioritized arid regions, not the entire planet. Candidate status does not establish geological origin, novelty or permission to access a site.

## Run locally

Clone this repository and run each command from its root. Use a supported Node.js LTS, 22.12+ (or Node 24), and Python 3.12. Run web and game in separate terminals; Vite chooses another port if 5173 is occupied. Use the URL printed by each server.

```sh
git clone https://github.com/Niettzche/spaceapps-2026.git
cd spaceapps-2026
```

| Part | Command from the repository root |
|---|---|
| Rover game | `cd game && npm ci && npm run dev` |
| Web explorer | `cd web && npm ci && npm run dev` |
| Model / data validation | `pip install -r model/requirements.txt && python model/validate_data.py` |
| Model unit tests | `python -m pytest -q model/tests` |
| Optional model API | `pip install -r api/requirements.txt && uvicorn api.main:app --reload` |

For local game-to-web links, configure `VITE_WEB_URL` to the web server's printed URL before starting the game. `VITE_API_URL` is optional for the offline demo. These variables are public URLs; credentials do not belong in browser code.

## Test the complete path

See the header of [game/e2e/camino_dorado.mjs](game/e2e/camino_dorado.mjs) for Chromium, Playwright, development-server, screenshots and report setup. It exercises the actual scene UI for Earth testing and the lunar/Martian delivery routes. A passing build is not a substitute for this walkthrough or a physical-phone check.

## Build for the VPS

After installing dependencies in both `web/` and `game/`:

```sh
node web/scripts/build-demo.mjs
```

Upload `web/dist/`. It contains web `/`, game `/game/` and the video. `DEMO_BASE` supports subdirectory hosting; `VITE_WEB_URL`, `VITE_API_URL` and `VITE_GAME_URL` are coordinated by the build script. See [deployment instructions](web/DEPLOY.md). Publication and the final public URL remain pending VPS access.

## Data and methodology

| Data | Provider and use |
|---|---|
| [MODIS](https://modis.gsfc.nasa.gov/data/) | NASA · vegetation, land cover, albedo |
| [NASA POWER](https://power.larc.nasa.gov/) | NASA · climate |
| [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) | NASA · lunar elevation |
| [HRSC + MOLA](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blend_dem_global_200m) | ESA/NASA via USGS · Martian elevation |
| [Copernicus DEM GLO-30](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) | ESA · Earth elevation |
| [NASA GIBS](https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-standard-services/gibs) | NASA · basemap imagery |
| [GVP](https://volcano.si.edu/) / [OpenStreetMap](https://www.openstreetmap.org/copyright) | Smithsonian / OSM contributors · external landform checks |

The detector compares Earth, Moon and Mars at 200 m resolution. See [methodology](docs/METODOLOGIA.md), [model validation](model/VALIDATION.md) and the [provisional shortlist](ciencia_datos/salidas/lista_corta.md). Surface interpretations, missing values, uncertainty and scientific limits remain explicit.

## AI disclosure and project files

Claude Code and Codex assisted code and documentation. Mauricio created MARSCEPTION artwork with Claude. Claude also assisted image-based terrain labeling; 29/33 externally checked, non-randomly selected cases were correct. This does not estimate accuracy over all candidates. Full declaration: [USO_IA.md](docs/USO_IA.md).

- `analisis/`, `ciencia_datos/`, `model/`: detection, explainable analysis and validation.
- `data/`: versioned sites, targets and schemas; `api/`: optional model service.
- `web/`: public explorer; `game/`: Phaser/Matter rover game; `assets/`: artwork.
- [English submission draft](docs/ENTREGA_EN.md) · [pitch](docs/GUION_PITCH.md) · [team instructions](AGENTS.md).

Repository visibility is currently private. The repository owner must make it public before judging; public demo/video links and official submission must be verified separately.
## Art credits
- MARSCEPTION art (sprites, backgrounds, terrain, UI, title screen): original, generated with code in `assets/fuente/` (AI-assisted, see `docs/USO_IA.md`). See [assets/README.md](assets/README.md).
- **[pixelfx](https://github.com/patch-gg/pixelfx)**: MIT license, Copyright (c) 2026 Patch and Copyright (c) 2026 Hugo Duprez.
  The effects (`assets/fx/`) are pixelfx effects written for the game (`assets/fuente/fx/`); the rest of the art is drawn with its painter and color ramps.
  Its `mini` and `big` fonts are MIT; its "Patch Pixel" font is not and is not used.
