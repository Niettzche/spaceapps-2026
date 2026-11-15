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
- **Terrain:** levels use real DEM transect windows, never stretched, usually 250 m. Rincón de Parangueo uses a declared 530 m window to include the lake floor and wall (546 m with start/finish flats). Dune slip faces and small rocks that the DEM cannot resolve are added as declared recreations; a recreated face (plus the measured slope under it) never exceeds 30°, the lower bound of the angle of repose of dry sand (30–34°; barchan slip faces 32° mean, 34° critical, [Pelletier et al. 2015](https://doi.org/10.1002/2015JF003636)). Obstacle sizes and patches vary by level and are game values (P).
- **Gravity:** real values (Earth 9.81, Mars 3.71, Moon 1.62 m/s²), scaled by one common factor that keeps the ratios.
- **Traction (physics 2, default):** each wheel's maximum thrust is Mohr–Coulomb, H = A·c + W·tan φ, with W = m·g/wheels and the contact area A from **Bekker–Wong sinkage** (p = (k_c/b + k_φ)·zⁿ, rigid wheel). A wider wheel presses less, sinks less and pushes more; compaction resistance slows it; a slipping wheel digs in (P). The game engine's friction is calibrated to H/W (P).
  - Moon regolith: c 0.52 kPa, φ 42° (top 15 cm) and n 1, k_c 1.4, k_φ 820 (Lunar Sourcebook, Carrier et al. 1991, from Costes et al. 1972, NASA TR R-401). The Bekker values are LRV design values, not measurements.
  - Mars drift: c 1.6 kPa, φ 18° (Viking, Moore 1991); sinkage from the **M90 simulant** (Oravec et al. 2020, NASA NTRS 20200003046), not real Martian soil. Crusted soil 34.5°, rock 40–60° (Viking).
  - Earth: generic dry sand (Wong 2001, via NASA/TM-20250006958), not measured at the site; cinder c 0, φ 28.5° (loose); compacted soil φ 38° (NAVFAC DM-7.02); rock μ ≈ 0.7 (P, no measured tire–rock value).
- **Mission autonomy (P):** on the Moon and Mars the robot slows itself over each recreated rock (as rover autonomous navigation does), to the speed at which the hop would not lift the payload over its support wall: v ≤ k·√(2gH)/sin α.
- **Game values (P):** prices, part stats, speed, cargo damage and the score. The score is not scientific evidence.

**Limits.**
- No place on Earth reproduces lunar vacuum, the destination's gravity, radiation or polar-shadow cold. The results screen lists what the Earth test could not show.
- Bekker sinkage is modeled with its limits: no Bekker parameters have been measured for real lunar regolith (the lunar ones are LRV design values) or for Martian soil (a simulant is used); the shear-deformation modulus K (slip-dependent thrust), bulldozing and dynamic load transfer are not modeled.
- Field access and operational suitability need separate review.

**Discover and ANA.** Discover filters the exported site catalog and explains its provenance in “Why here?”, without computing new evidence. ANA provides deterministic suggested answers offline and optional live AI answers grounded in project data, explicitly labeled as fallible; it does not validate a site. [Seven featured levels](juego/NIVELES_DESTACADOS.md) combine sourced climate with declared recreated obstacles and game recommendations; snow uses sand behavior (P), not measured snow constants.

**Sources.**
- **Validation and analysis:** [model validation](../model/VALIDATION.md), [shortlist](../ciencia_datos/salidas/lista_corta.md), [AI-label check](../ciencia_datos/etiquetado_ia/validacion.txt).
- **Soil:** [Apollo regolith (NASA NTRS 20220014634)](https://ntrs.nasa.gov/citations/20220014634), [Viking soils (NASA NTRS 20200003046)](https://ntrs.nasa.gov/citations/20200003046), [Bekker limits (NASA/TM-20250006958)](https://ntrs.nasa.gov/citations/20250006958), Costes et al. 1972 (NASA TR R-401). Every value and verdict: [physics sources](taller/FUENTES_FISICA.md).
- **Gravity:** [Mars gravity 3.71, NASA JPL](https://ssd.jpl.nasa.gov/planets/phys_par.html).
- **Data portals:** [NASA POWER](https://power.larc.nasa.gov/), [MODIS](https://modis.gsfc.nasa.gov/data/), [LRO LOLA](https://pds-geosciences.wustl.edu/missions/lro/lola.htm), [Copernicus DEM](https://dataspace.copernicus.eu/), [USGS HRSC+MOLA](https://astrogeology.usgs.gov/).
- **Workbook:** sourced numbers and judge answers are in [the taller workbook](taller/Space_Apps_Game_Data.xlsx) and [PITCH_QA_EN.md](PITCH_QA_EN.md).
- **AI use:** see [USO_IA.md](USO_IA.md).
