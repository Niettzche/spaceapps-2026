# Cráter Gemelo + Misión Cero

## Summary

Earth can help prepare a rover for the Moon and Mars, but no Earth site reproduces every condition. Cráter Gemelo identifies candidate terrestrial analog terrain from open elevation, vegetation and climate data. Misión Cero turns the question into a rover-building experiment: inspect a site, assemble a robot within a budget, test it on Earth and attempt a delivery under lunar or Martian gravity proportions.

## Product and scope

We built a bilingual terrain explorer, site sheets, map, Earth/Moon/Mars terrain quiz, explainable shape-comparison pipeline and a browser rover game using bundled data without a required live API. Mexico is the validated case study. The global search covers Atacama, Arizona and Arabia, three of ten prioritized arid regions. We do not claim full planetary coverage or that every candidate is a novel analog.

Real elevation transects underpin the terrain. Dune faces, loose rocks and flat start/finish areas added for play are labeled recreation. Surface classes are rule-based interpretations. Robot costs, damage, gravity scaling and scoring are game approximations; game results are not evidence of field readiness.

## Data and evidence

NASA: MODIS vegetation/land cover/albedo, POWER climate, LRO LOLA lunar elevation, MOLA Martian elevation and GIBS imagery. ESA: Copernicus DEM and HRSC, combined with MOLA through USGS. Smithsonian GVP, published crater catalogs and OpenStreetMap support external checks. Source, units and missing-data limits are retained.

The Moon/Mars shape classifier reaches about 78% spatially grouped balanced accuracy. The complementary comparator passes 3/3 negative and 9/20 known-analog controls, showing both usefulness and incomplete coverage. AI-assisted image labels were checked on 33 externally referenced cases (29 correct), not validated across the entire catalog. These component evaluations are separate.

## Benefit and tools

The tool makes analog selection inspectable: what matches, what an operation could test and what remains untested. The game connects these limits with design tradeoffs. Processing: Earth Engine and Python. Interface: React, Vite, MapLibre, Phaser and Matter.js.

## AI disclosure

Claude Code and Codex assisted code, tests, documentation and integration; AI assisted art and image-based terrain labeling. Suggested labels and artwork are not measured observations. Missing measurements are not invented. Full declaration: [USO_IA.md](USO_IA.md).

## Submission links · completar con el VPS

- English website and game (`/game/`): completar con el VPS.
- Public video (≤30 seconds): upload the rendered MP4 and add its public URL.
- Repository: https://github.com/Niettzche/spaceapps-2026 (currently private; public access remains a team decision).
- Methodology and sources: [METODOLOGIA.md](METODOLOGIA.md).

Do not submit placeholders as final links. Public accessibility, a UI walkthrough and the official platform submission remain separate checks.
