# MARSCEPTION · Space Apps submission draft

Status: final English copy for Edmundo's review. This document does not save or submit the Space Apps form. Edmundo confirms the final submission; verify the next deployment, seven-slide PDF and public repository access first.

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

Physics v2 adds Bekker–Wong wheel sinkage and Mohr–Coulomb traction. Earth sand uses generic reference parameters, lunar sinkage uses Apollo-era LRV design parameters and Martian drift uses an M90 simulant; these are not site-specific measurements or validated predictions for real rovers. Gravity, atmosphere and radiation still limit what Earth training can demonstrate. See the methodology for omissions and game calibration.

The updated demonstration routes are **Samalayuca → Mars** and **Al Hutaymah maar (`g00263`) → Moon**, with Earth testing, design iteration, destination delivery and the results screen showing where the analogy breaks down. Al Wahbah is a cited known analog, not the current lunar golden-path level. Both routes were completed through the published English UI on 15 November; the recording file still needs saving and media verification before use.

## New features · final English form copy

**Discover** turns the exported catalog into a map filtered by impact crater, volcano or maar, open-pit mine, dunes and unverified depression. “Why here?” explains how a place entered the catalog, what its measured shape supports, and what remains missing. It reads existing evidence; it does not discover or certify a new analog on demand.

**Seven featured Earth tests** offer different design decisions: Jabal Bayda (tuff ring, wide or mesh wheels), Tenoumer (Sahara impact crater, mesh wheels and strapped cargo support), Cananea (open pit, wide or mesh wheels), Pinacate (lava, reinforced or titanium chassis), Pingualuit (Arctic impact crater, wide or mesh wheels), Samalayuca (dunes, wide wheels) and Rincón de Parangueo (dry maar lake, medium or large battery). These recommendations are game balance, not certified real-world equipment choices. NASA POWER supplies climate inputs; added patches, blocks and events are declared recreations. Snow uses loose-sand behavior (P), not measured snow terramechanics. Cananea is our operational comparison; Rincón's lunar comparison is shape, not salt composition. [Level rules](juego/NIVELES_DESTACADOS.md) and [source review](taller/FUENTES_NIVELES.md).

**ANA**, the analog tutor, explains the method, site evidence and limits. Suggested questions use deterministic answers and work without a network. Free questions require the live AI service, use project data as context and display an AI warning; answers can be wrong. ANA is separate from the statistical analog model and does not validate a site.

## Recording and trailer handoff · published build, capture pending

- Capture at **960×540** or **1920×1080**, English (`?lang=en`), with system audio: voiced title, Discover, Samalayuca → Jezero, Al Hutaymah (`g00263`) → lunar south pole, results/analogy limits, and a few seconds of each of the seven featured levels. Also capture ANA's offline suggestions and, if available, the explicitly labeled AI response.
- Make the 30-second trailer with Mauricio using [Leo's shot list](media/TRAILER_GUION.md), English subtitles and the current voice/music. Its 0–4 s title and 27–30 s close supersede the earlier five-second still-image plan. The longer Mars/Moon runs remain supporting footage, not extra time in the trailer.
- Keep PR #75 as a draft; do not present its old recording as proof of the new build. The new capture was started manually in Recortes and the UI route was played by Alan's agent; saving, file inspection and trailer editing remain pending. Edmundo reviews the form copy and confirms submission.

Published routes confirmed on 15 November: the project website's Play button opens the game at `https://v1.marsception.us/`; `https://marsception.us/game/` returns 404. The user confirmed the new deployment. Recortes showed 27:25, system audio enabled and microphone disabled at the end of capture. Its Stop control rejects automation; the user must stop/save before audio and file quality can be verified.

## Links · verify against Mario's next deployment before submission

| Field | Value / status |
|---|---|
| Demo | [MARSCEPTION project website](https://marsception.us/) |
| Rover game | [Play in English](https://v1.marsception.us/?lang=en) |
| Submission asset | [Seven-slide English PDF](media/marsception_slides.pdf) · [editable source](media/marsception_slides.pptx) |
| Slides hosting | Use the repository PDF for upload; a public PDF URL still needs Mario's deployment and verification |
| Video | New capture/trailer pending recording, following Leo's shot list. PR #75 stays draft; use the seven-slide PDF meanwhile |
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

Site records and methodology retain the detailed article, unit, date and limitation for each measurement. The seven slides use real elevation-derived relief and declared AI-assisted MARSCEPTION game art. The four gameplay vignettes illustrate the intended path; they are not screenshots proving a completed run. The editable PowerPoint retains source links in the slide notes. Code, artwork and label assistance are disclosed below.

## Tools

Google Earth Engine, Python, NumPy, pandas, scikit-learn, JSON Schema, React, Vite, MapLibre, Phaser and Matter.js. Git/GitHub for collaboration; FFmpeg for the captioned MP4.

Pixel art effects built with pixelfx (MIT License, © 2026 Patch and Hugo Duprez).

## AI disclosure · copy to the platform AI field

Canonical declaration: [USO_IA.md](USO_IA.md), English submission text. The following three paragraphs reproduce that section; re-copy it if the declaration changes before Edmundo submits.

We used Claude Code and OpenAI Codex to assist software development, debugging, integration, testing and documentation. Mauricio created the MARSCEPTION artwork with Claude; AI assisted its creation and iteration; artwork and effects are presentation assets, not scientific observations or topographic reconstructions.

For data review, Claude suggested landform labels for 298 arid candidates using Sentinel-2 satellite images, shaded relief and measurements. Names and distances to OpenStreetMap mines were withheld during labeling. The recorded external check reports 29 correct labels out of 33 non-randomly selected checked cases (88%), using the volcanic-crater catalog, OpenStreetMap and Meteor Crater. This does not estimate accuracy across all 298 candidates. Suggested labels, uncertainty and source provenance are retained; they do not prove a landform's geological origin or novelty. The analog-shape model is an explainable statistical model, separate from the AI image-labeling assistant.

NASA, ESA and other source measurements were not invented or replaced by AI output. Missing measurements remain missing. Team members remain responsible for reviewing code, claims, labels and final deliverables. Generated art is not NASA imagery and does not imply NASA endorsement.

ANA additionally offers an optional live AI question-answer service grounded in project data, labeled as AI and fallible. Its suggested questions use deterministic offline answers. This new runtime use supplements the development and labeling disclosure above; it does not replace the statistical model or provide scientific validation.

## Final five-minute submission checklist

1. Verify title MARSCEPTION and paste summary/description, sources, tools and AI disclosure.
2. Open demo, game and the selected seven-slide PDF in a logged-out browser. Confirm the repository is public after the team approves publication.
3. Confirm the physical-phone and full-path checks in docs/PRUEBA_MOVIL.md; do not mark an unperformed check as passed.
4. Save the draft; review every public URL and preview. Use the PDF with no more than seven slides. The new trailer remains pending deployment and recording; PR #75 stays draft.
5. Edmundo confirms the final submission, completes it before the deadline and retains the confirmation. Do not submit on his behalf from this task.
