# MARSCEPTION · trailer script (30 s, English)

> 15 Nov 2026 · Leo (with Claude Code) · for whoever records and edits the trailer (Alan / video).
> Rule: every number on screen is verified in `docs/taller/Space_Apps_Game_Data.xlsx` (source IDs below). Game values (P) appear
> **without numbers**. Recreated elements (rocks, dust devils, snow patches) are shown as gameplay, never captioned as measurements.
> Record the game with `?lang=en` at 960×540 (or 1920×1080 scaled ×2), physics 2 (default).

## Shot list

| Time | On screen | Subtitle (EN) | Data on screen and source |
|---|---|---|---|
| 0–4 s | Title screen: MARSCEPTION logo over the turning Mars; stars. **Voice: "MARSCEPTION"** | *Train on Earth. Land on the Moon or Mars.* | Game tagline (no data) |
| 4–8 s | **Discover**: Earth map with the places the model found; filter chips (impact crater, volcano or maar, open-pit mine, dunes) light up one by one | **Discover**<br>*Earth's Moon and Mars twins, found with NASA and ESA data* | Elevation (Copernicus DEM, LRO LOLA, HRSC+MOLA) and MODIS NDVI arid filter: `docs/METHODOLOGY_EN.md`. No count on screen (the map shows the exported catalog, not every candidate) |
| 8–10 s | **Pinacate**: robot crossing dark aa lava blocks at low speed | **Pinacate, Mexico**<br>*Apollo 14's crew trained here* | NASA field trip, 14–18 Feb 1970 (S115, NASA/SP-2015-626) |
| 10–12 s | **Pingualuit**: robot on snow, blowing snow particles, crater rim | **Pingualuit, Canada**<br>*Winter lows of −34 °C* | −34.4 °C = mean daily minimum of the coldest month (Feb), NASA POWER 2015–2024 (S148, AM-077) |
| 12–14 s | **Tenoumer**: dust devil crossing behind the robot, crater rim | **Tenoumer crater, Sahara**<br>*Dust devils, as on Mars* | The dust devil is a game event (recreation). Fact: ~5 vortices per sol at Jezero (S93, S24). Tenoumer is a 1.9 km impact crater (S125) |
| 14–16 s | **Cananea**: robot climbing a benched pit slope, rocks rolling | **Cananea open pit, Mexico**<br>*Real walls: 40–50°* | Inter-ramp angles 40–50° (S137, mine technical report). The game slope is gentler (P): do not show its angle |
| 16–18 s | **Jabal Bayda**: robot in wind with ash particles, crater rim of the tuff ring | **Jabal Bayda, Saudi Arabia**<br>*A volcanic tuff ring* | Tuff ring, Harrat Khaybar (S106–S108) |
| 18–20 s | **Samalayuca**: robot slipping, then climbing a dune with wide wheels | **Samalayuca, Mexico**<br>*Dunes shaped like Mars dunes* | Earth and Mars dunes share forms and processes (S143 Curiosity at Bagnold; S144) |
| 20–22 s | **Rincón de Parangueo**: robot on the white, cracked floor of the dry crater lake | **Rincón de Parangueo, Mexico**<br>*A dried-up salt lake* | Maar lake dried in the 1980s; trona and halite (S118) |
| 22–25 s | **Physics**: slow-motion close-up of a wheel sinking in sand, with the data panel (key I) showing φ, c and sinkage | **Wheels sink: Bekker–Wong**<br>*Soil data from Apollo and Viking* | Lunar Sourcebook ch. 9 (S79), Viking soil (S82); method NASA/TM-20250006958 (S59). Do not show the panel's numbers if they are (P) |
| 25–27 s | **Mission on Mars (Jezero)**: landing on the delivery zone, astronaut, supply handed over | **Then Mars**<br>*38 % of Earth's gravity* | 3.71 / 9.81 m/s² (MR-056, S71) |
| 27–30 s | Logo; small "NASA Space Apps 2026" | *Train on Earth. Land on Mars.* | — |

## Notes for editing
- Subtitles: two lines, the place name in small caps on top, the fact below (≤ 32 characters, readable in 2 s).
- Order of the 7 levels: alternate Moon and Mars targets and very different looks (lava, snow, desert crater, pit, volcano, dunes, salt).
- If levels 6 and 7 (Rincón de Parangueo, Samalayuca) are not in the build in time, replace them with 2 s of the Moon mission
  (*The Moon: 16 % of Earth's gravity*, 1.62 / 9.81, S02) and 2 s of the Workshop (*Build it under 1,000 credits* is (P): show
  the Workshop **without** the number).
- Voice: only "MARSCEPTION" at the start. Music without lyrics.
- Do not use the NASA logo (AGENTS.md §3.8).

## What is not in the trailer, on purpose
- Dust-devil light loss, rock sizes, part prices, speed and score: game values (P) or not verified for these sites.
- "Snow is a lunar analog": Gap (no source).
- Claims that a site is a *published* Mars analog: only true for dunes in general, not for Samalayuca or Rincón by name.
