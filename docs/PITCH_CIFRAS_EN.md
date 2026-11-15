# MARSCEPTION · key figures for the judges (one page)

> 15 Nov 2026 · keep it in hand. One line per figure: **number** · what it means · source. (P) = game value, not a measurement.
> Longer answers: [PITCH_QA_EN.md](PITCH_QA_EN.md). Every sourced number is in `docs/taller/Space_Apps_Game_Data.xlsx` (S-IDs).

## The model (finding analogs)
- **200 m per pixel, same code** for Earth, Moon and Mars · Copernicus DEM (ESA), LRO LOLA (NASA), HRSC+MOLA (ESA/NASA via USGS) · [METHODOLOGY_EN.md](METHODOLOGY_EN.md)
- **9 of 11** known Mexican craters found by the detector · the misses have lakes or are very small or shallow · `ciencia_datos/03`, PROYECTO.md
- **~78 %** balanced accuracy, Moon vs Mars craters · logistic regression on **4,288 lunar + 573 Martian** craters, spatially grouped validation; **76 %** with depth/diameter alone · `ciencia_datos/03`, `06_modelo_luna_marte.ipynb`
- **296** arid candidates for review · Mexico + **3 of 10** priority arid regions (Atacama, Arizona, Arabia); not the whole planet · MODIS NDVI p90 < 0.35 · [model/VALIDATION.md](../model/VALIDATION.md)
- **Colton Crater** (Apollo 15 training, 1970) found on its own · a positive control, not a discovery · USGS OFR 2005-1190, `model/NIVEL2.md`

## The game (testing a robot)
- **16 Earth levels with real relief** · 250 m windows of Copernicus GLO-30 transects (30 m), never stretched · `data/sites/*.json` (`nivel.fuente`)
- **7 featured levels**, each asks for one thing · Jabal Bayda: wide or mesh wheel · Tenoumer: mesh wheel + strap mount · Cananea: mesh wheel · Pinacate: reinforced chassis · Pingualuit: mesh wheel · Samalayuca: wide wheel · Rincón de Parangueo: bigger battery · [NIVELES_DESTACADOS.md](juego/NIVELES_DESTACADOS.md)
- **9.81 / 3.71 / 1.62 m/s²** Earth / Mars / Moon · Mars 38 %, Moon 16.5 % of Earth; the engine scales all three by 1.5 (P), ratios stay real · NASA JPL (S71), Moon Fact Sheet (S02)
- **Bekker–Wong sinkage + Mohr–Coulomb thrust** · H = A·c + W·tan φ · NASA/TM-20250006958 (S59)
- **8 → 5 kPa** ground pressure, **1.3 → 0.9 cm** sinkage, standard → wide wheel on dry sand · robot mass and wheel sizes (P), generic dry sand (Wong 2001, S59), not measured at Samalayuca · `game/src/fisica/suelo_v2.js`
- **0.52 kPa, 42°** lunar regolith (top 15 cm) · Lunar Sourcebook Table 9.12 (S79) · **1.6 kPa, 18°** Martian drift · Viking, Moore 1991 (S82) · Mars sinkage uses the **M90 simulant** (S20), not real Martian soil

## The places (what is real about each)
- **Apollo 14** crew trained at Pinacate, Feb 1970 · NASA/SP-2015-626 (S115)
- **−34 °C** Pingualuit winter low · −34.4 °C mean daily minimum of February, 2015–2024 · NASA POWER (S148, AM-077)
- **~1 %** less sunlight when a dust devil passes at Jezero · typical 0.1–1 %, > 15 % in the strongest · Perseverance MEDA (MR-083, S96, S24)
- **1.9 km** Tenoumer impact crater, 1.57 ± 0.14 Ma · (S125–S127) · **3.4 km** Pingualuit, 1.4 ± 0.1 Ma (S131, S132)
- **40–50°** real wall angles at Cananea pit; the game slope is gentler (P) · mine technical report (S137)
- **~718 Pa** air at Jezero (Earth ~100,000 Pa); air density **~1.4 %** of Earth's · MEDA first report (S22, AM-032), Mars and Earth Fact Sheets (S01, S03)

## Say it this way
- "Candidates for review", not "discoveries". "Explainable model", not "AI found". The score is a game rule (P), not evidence.
- Earth cannot test the destination's gravity, vacuum, radiation or polar-shadow cold: the results screen says so.
