# MARSCEPTION · Methodology (one page)

Delivery version, 15 November 2026. English summary of [METODOLOGIA.md](METODOLOGIA.md). Weights and thresholds are provisional. The search finds **candidates for review**; it does not certify training sites.

**Question.** Which places on Earth let a team rehearse part of a lunar or Martian operation, and where does each analogy break? Mexico is the fully validated case. The global search has covered **3 of 10 prioritized arid regions** (Atacama, Arizona, Arabia); we have not scanned the whole planet.

**Data (NASA and ESA).**
- **Shape:** Copernicus DEM GLO-30 (ESA) for Earth, LRO LOLA (NASA) for the lunar south pole, and HRSC+MOLA (ESA/NASA, via USGS) for Mars. All three are compared at the same 200 m per pixel.
- **Surface and climate:** MODIS (NASA) for vegetation, land cover and albedo; NASA POWER for climate.
- **Arid mask:** NDVI p90 < 0.35, which discards forests and fields.

**How shape is measured.** The same detector finds crater-like depressions on all three bodies and measures their diameter, depth-to-diameter ratio and rim height. An explainable model then places each Earth depression between Moon and Mars craters and measures its distance to that reference cloud. Shape similarity does **not** mean similar composition, and at 200 m the lunar rim is not reliable evidence on its own.

**Score.** Shape weighs most (0.40). Daily temperature range (0.20), precipitation (0.15), NDVI (0.10) and slope (0.15) add `s = exp(−|earth − target| / scale)` terms, combined as a weighted geometric mean. Dense vegetation vetoes a site. Missing data lowers "confidence", which measures data coverage, not the chance of mission success.

**Validation.** These are separate checks, and each number answers a different question:
- The detector finds **9 of 11** documented Mexican craters.
- Of its 668 Mexican detections, **71%** fall in humid mountains. They are real sinkholes and ravines, false positives for crater interpretation. A bare-earth DEM (FABDEM) removes only 15% of them, so they are not tree canopies, and the arid mask removes them. That leaves 47 arid candidates in Mexico, and **296** arid candidates in total after the global search.
- The complementary comparator passes 3/3 negative controls and 9/21 known analogs (see the current validation report below).
- AI-assisted terrain labels are correct in 29/33 externally checked cases (a non-random sample).

**Explainable model.** It is a logistic regression (Moon versus Mars) trained on **4,288 lunar and 573 Martian craters from 6 Mars sites**. With spatially grouped validation it reaches about **78%** balanced accuracy (76% using depth-to-diameter alone). On a Mars site it never saw, accuracy ranges from 70% (Gale) to 92% (Meridiani). It is not a neural network: its main rule is depth-to-diameter.

**Game physics.** Real values carry a source; game values are marked **(P)**.
- **Terrain:** each level is a real 250 m window of a DEM transect, never stretched. Dune slip faces (~32°) and ~0.3 m rocks that the DEM cannot resolve are added as declared recreations.
- **Gravity:** real values (Earth 9.81, Mars 3.71, Moon 1.62 m/s²), scaled by one common factor that keeps the ratios.
- **Grip:** wheel friction = (part grip)² (P) × soil grip tan φ.
  - Moon regolith: φ 30–50° (Apollo).
  - Mars: drift 15.6–20.4°, crusted soil 29.8–39.2° and rock 40–60° (Viking).
  - Earth soil: a provisional value (P), shown on screen. A sourced dry-sand value (φ 28–34°) exists but stays off until the levels are rebalanced.
- **Game values (P):** prices, part stats, speed, cargo damage and the score. The score is not scientific evidence.

**Limits.**
- No place on Earth reproduces lunar vacuum, the destination's gravity, radiation or polar-shadow cold. The results screen lists what the Earth test could not show.
- Soft-soil sinkage (Bekker) is not modeled: no true Bekker parameters exist for lunar regolith, and none are published for Martian dust.
- Field access and operational suitability need separate review.

**Sources.**
- **Validation and analysis:** [model validation](../model/VALIDATION.md), [shortlist](../ciencia_datos/salidas/lista_corta.md), [AI-label check](../ciencia_datos/etiquetado_ia/validacion.txt).
- **Soil:** [Apollo regolith (NASA NTRS 20220014634)](https://ntrs.nasa.gov/citations/20220014634), [Viking soils (NASA NTRS 20200003046)](https://ntrs.nasa.gov/citations/20200003046), [Bekker limits (NASA/TM-20250006958)](https://ntrs.nasa.gov/citations/20250006958).
- **Gravity:** [Mars gravity 3.71, NASA JPL](https://ssd.jpl.nasa.gov/planets/phys_par.html).
- **Data portals:** [NASA POWER](https://power.larc.nasa.gov/), [MODIS](https://modis.gsfc.nasa.gov/data/), [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm), [Copernicus DEM](https://dataspace.copernicus.eu/), [USGS HRSC+MOLA](https://astrogeology.usgs.gov/).
- **Workbook:** sourced numbers and judge answers are in [the taller workbook](taller/Space_Apps_Game_Data.xlsx) and [PITCH_QA_EN.md](PITCH_QA_EN.md).
- **AI use:** see [USO_IA.md](USO_IA.md).
