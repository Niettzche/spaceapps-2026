# MARSCEPTION · Space Apps submission draft

Status: final English copy for Edmundo's review. This document does not save or submit the Space Apps form. Edmundo confirms the final submission; verify the next deployment, final video and public repository access first.

## Project title

MARSCEPTION

## Summary · 3 lines

MARSCEPTION connects an open-data Earth-analog explorer with a 2D rover-building game for selected Moon and Mars operations.
Use NASA and ESA measurements to compare candidate terrain, inspect uncertainty, and test design choices before attempting a simulated delivery.
Mexico is our validated case study; the global search covers Atacama, Arizona and Arabia, with explicit limits on what Earth can reproduce.

## Project description

The web explorer combines site sheets, a map and transparent comparisons of terrestrial, lunar and Martian terrain. An explainable Moon-versus-Mars shape model and a complementary climate/vegetation/slope comparator characterize candidate analogs. MARSCEPTION adds an educational experiment: build a robot within a game budget, test on Earth terrain and attempt a Moon or Mars delivery. Bundled data make the core game usable without a live API.

The detector compares the three bodies at 200 m resolution. Mexico is the validated case study; Atacama, Arizona and Arabia represent 3 of 10 prioritized arid regions. We do not claim full planetary coverage or that every candidate is novel. Real DEM windows underpin game terrain, while added dune faces, loose rocks and robot balance are declared game approximations. A score does not certify geological origin, field access or mission readiness.

Distinct component evaluations include 9/11 documented Mexican craters in the original detector validation, about 78% spatially grouped balanced accuracy for Moon/Mars shape classification, 3/3 negative and 9/21 known-analog controls for the complementary comparator, and 29/33 correct externally checked AI-assisted labels from a non-random sample. These figures are not interchangeable and are not accuracy estimates for every candidate. See the [English methodology](METHODOLOGY_EN.md) and [validation report](../model/VALIDATION.md).

## Links · verify against Mario's next deployment before submission

| Field | Value / status |
|---|---|
| Demo | [MARSCEPTION](https://v1.marsception.us/) |
| Rover game | [Play in English](https://v1.marsception.us/game/?lang=en) |
| Video | [Current captioned overview](https://v1.marsception.us/media/mision-cero-30s-en.mp4); replace with the final 30-second cut after gameplay is recorded |
| Source code | [GitHub repository](https://github.com/Niettzche/spaceapps-2026) — owner must verify public access |
| Methodology | [English, in this repository](METHODOLOGY_EN.md) · [Public GitHub URL](https://github.com/Niettzche/spaceapps-2026/blob/main/docs/METHODOLOGY_EN.md) |

## NASA and other space-agency data

- **[NASA MODIS](https://modis.gsfc.nasa.gov/data/):** vegetation, land cover and albedo.
- **[NASA POWER](https://power.larc.nasa.gov/):** climate variables, including daily temperature range and precipitation.
- **[NASA LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm):** elevation near the lunar south pole.
- **[ESA HRSC + NASA MOLA, via USGS](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blend_dem_global_200m):** blended Mars elevation model.
- **[ESA Copernicus DEM GLO-30](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM):** Earth elevation. This is an ESA source, not a NASA product.
- **[NASA GIBS](https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-standard-services/gibs):** basemap imagery.

## Other sources

- Smithsonian Global Volcanism Program and cited crater literature: https://volcano.si.edu/
- OpenStreetMap contributors, quarries and open-pit mines: https://www.openstreetmap.org/copyright
- OpenLandMap soil sand fraction, used with declared rules for surface classes: https://openlandmap.org/
- Apollo regolith properties: https://ntrs.nasa.gov/citations/20220014634
- Viking soil properties: https://ntrs.nasa.gov/citations/20200003046
- NASA JPL planetary physical parameters, adopted Mars gravity convention: https://ssd.jpl.nasa.gov/planets/phys_par.html

Site records and methodology retain the detailed article, unit, date and limitation for each measurement. The video uses local elevation-derived relief and MARSCEPTION presentation artwork; it is not a recording of a rover mission.

## Tools

Google Earth Engine, Python, NumPy, pandas, scikit-learn, JSON Schema, React, Vite, MapLibre, Phaser and Matter.js. Git/GitHub for collaboration; FFmpeg for the captioned MP4.

Pixel art effects built with pixelfx (MIT License, © 2026 Patch and Hugo Duprez).

## AI disclosure · copy to the platform AI field

Canonical declaration: [USO_IA.md](USO_IA.md), English submission text. The following three paragraphs reproduce that section; re-copy it if the declaration changes before Edmundo submits.

We used Claude Code and OpenAI Codex to assist software development, debugging, integration, testing and documentation. Mauricio created the MARSCEPTION artwork with Claude; AI assisted its creation and iteration; artwork and effects are presentation assets, not scientific observations or topographic reconstructions.

For data review, Claude suggested landform labels for 298 arid candidates using Sentinel-2 satellite images, shaded relief and measurements. Names and distances to OpenStreetMap mines were withheld during labeling. The recorded external check reports 29 correct labels out of 33 non-randomly selected checked cases (88%), using the volcanic-crater catalog, OpenStreetMap and Meteor Crater. This does not estimate accuracy across all 298 candidates. Suggested labels, uncertainty and source provenance are retained; they do not prove a landform's geological origin or novelty. The analog-shape model is an explainable statistical model, separate from the AI image-labeling assistant.

NASA, ESA and other source measurements were not invented or replaced by AI output. Missing measurements remain missing. Team members remain responsible for reviewing code, claims, labels and final deliverables. Generated art is not NASA imagery and does not imply NASA endorsement.

## Final five-minute submission checklist

1. Verify title MARSCEPTION and paste summary/description, sources, tools and AI disclosure.
2. Open demo, game and video in a logged-out browser. Confirm the repository is public.
3. Confirm the physical-phone and full-path checks in docs/PRUEBA_MOVIL.md; do not mark an unperformed check as passed.
4. Save the draft; review every public URL and preview. Keep the video under 30 seconds.
5. Edmundo confirms the final submission, completes it before the deadline and retains the confirmation. Do not submit on his behalf from this task.
