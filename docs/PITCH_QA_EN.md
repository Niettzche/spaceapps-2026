# MARSCEPTION — likely judge questions (English)

> For Alan and the pitch. Each answer is two sentences you can say out loud, then the source. Numbers come from
> `docs/taller/Space_Apps_Game_Data.xlsx` (tabs **Judges** and **Ambiente**); "(P)" marks a game value, not a measurement.

**1. Real rovers crawl. Why does your robot drive at up to 7 m/s?**
On purpose: speed is a game value (P), so a 250 m test takes under a minute instead of about 42 minutes at VIPER's 0.1 m/s. Real rovers are far slower: Perseverance tops out at 152 meters per hour (0.042 m/s), and VIPER is designed for 0.1–0.2 m/s in transit (it has not flown yet).
*Sources: [NASA, Perseverance rover components](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/); [NASA, VIPER lunar operations](https://science.nasa.gov/mission/viper/lunar-operations/).*

**2. Why did the Spirit rover get stuck?**
In 2009, at a site called "Troy", Spirit's wheels broke through a surface crust into soft, bright, slippery sulfate-rich sand and could not get traction, while its right-front wheel had already stopped turning. NASA rehearsed escapes with test rovers on Earth, then made Spirit a stationary science platform in January 2010; our dune test shows the same lesson: a wheel that works on firm ground can fail in loose sand.
*Sources: [NASA/JPL, Nov 2009 release](https://www.jpl.nasa.gov/news/nasa-to-begin-attempts-to-free-sand-trapped-mars-rover/); [NASA Science, Spirit](https://science.nasa.gov/mission/mer-spirit/).*

**3. How much grip does lunar regolith give?**
Apollo experiments put its internal friction angle at 30–50°, rising toward about 55° within the first metre. For the top 15 cm, where a wheel works, the Lunar Sourcebook recommends a friction angle of 42° and a cohesion of 0.52 kPa, and those are the values our traction uses.
*Sources: [Connolly & Carrier, NASA JSC, An Engineering Guide to Lunar Geotechnical Properties (2023)](https://ntrs.nasa.gov/citations/20220014634); [Carrier, Olhoeft & Mendell, Lunar Sourcebook ch. 9, Table 9.12 (1991)](https://www.lpi.usra.edu/publications/books/lunar_sourcebook/pdf/Chapter09.pdf).*

**4. And the dust on Mars?**
Loose wind-drift soil is much weaker: Viking 1 data give a friction angle of 18 ± 2.4° and a cohesion of 1.6 ± 1.2 kPa, and Spirit's site 20–25°, so wheels slip there. NASA's own table warns these are engineering estimates, not direct measurements; the game uses 18° and 1.6 kPa.
*Sources: [Moore, Martian surface materials, NTRS 19910017759 (1991)](https://ntrs.nasa.gov/citations/19910017759); [Oravec et al., NASA NTRS 20200003046, Table 1](https://ntrs.nasa.gov/citations/20200003046).*

**5. Which numbers are real data and which are game values?**
Real, with a source: gravity (Earth 9.81, Mars 3.71, Moon 1.62 m/s²), the terrain profiles from elevation models, the soil friction for the Moon and Mars, and the temperatures and pressures in the Ambiente tab. Game values, marked (P): prices, part stats, speed, damage and score; the score is not scientific evidence.
*Sources: [NASA JPL, planetary physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html); workbook tabs Biomes, Ambiente and Parts.*

**6. What can't an Earth analog test?**
Earth cannot reproduce the destination's gravity, its thin or missing atmosphere, its radiation or the cold of lunar shadows. For example, Jezero's air is about 718 Pa (Earth's is about 100,000 Pa), and the coldest lunar polar craters are about 25 K (−248 °C), so the game always says what the Earth test did not show.
*Sources: [NASA, first weather report from Jezero (MEDA)](https://www.nasa.gov/?p=61574); [UCLA, Diviner science](https://www.diviner.ucla.edu/science).*

**7. Do your wheels sink in the sand?**
Yes: sinking uses Bekker's soil constants, but NASA notes that no true Bekker parameters exist for lunar regolith, and none are published for real Martian soil. So the Moon uses the Apollo-era design estimates (Lunar Sourcebook Table 9.14) and Mars uses a soil simulant tested at NASA Glenn (M90), and the game says so in its data panel instead of calling them measurements.
*Sources: [NASA/TM-20250006958, An Overview of Tire-Ground Contact Modeling Approaches (2025)](https://ntrs.nasa.gov/citations/20250006958); [Lunar Sourcebook ch. 9](https://www.lpi.usra.edu/publications/books/lunar_sourcebook/pdf/Chapter09.pdf); [Oravec et al., NTRS 20200003046, Table 3](https://ntrs.nasa.gov/citations/20200003046).*

**8. Why a wide wheel for sand?**
A wider wheel spreads the robot's weight over more area, so it presses less on loose sand, sinks less and can push more. In the game this comes out of the soil equations, not a grip bonus: on the generic dry sand of the dune level, the 20 cm wheel presses about 8 kPa and sinks about 1.3 cm, the 40 cm wheel about 5 kPa and 0.9 cm, and its maximum thrust per unit of weight rises from 0.66 to 0.74 (the robot's mass and wheel sizes are game values, P; the sand is Wong's generic dry sand, not measured at Samalayuca). Real designs follow the same idea: Apollo's lunar rover used 23 cm wide wire-mesh tires, and Perseverance's wheels are 52.5 cm across.
*Sources: [NASA NSSDC, Apollo Lunar Roving Vehicle](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html); [NASA, Perseverance rover components](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/); [NASA/TM-20250006958, Table 1 (Wong dry sand)](https://ntrs.nasa.gov/citations/20250006958).*

**9. Why does the battery lose capacity on Mars or the Moon?**
Cold makes a battery deliver less energy, and the sourced temperatures are what the game uses: −83 °C measured at Jezero (two sols) and −53 °C on the sunlit lunar rim. The game applies a deliberately mild rule (P): 0.03 % less usable battery per degree below 0 °C, never below 97 %; we chose it because a harsher rule left missions without energy in playtests, and it does not model a battery heater, since we have not found a primary source for one. Rovers protect their electronics with waste heat from their power source (MSL's fluid loop keeps them between −40 and +50 °C).
*Sources: [NASA/JPL, MSL launch press kit, p. 38](https://www.jpl.nasa.gov/news/press_kits/MSLLaunch.pdf); [Mastropietro et al. 2010, NTRS 20150008894](https://ntrs.nasa.gov/citations/20150008894); [NASA, first weather report from Jezero (MEDA)](https://www.nasa.gov/?p=61574).*
**10. Why does the motor overheat if it is so cold outside?**
Air carries heat away from a motor, and Jezero's air is only about 0.017 kg/m³, about 1.4 % of Earth's 1.217 kg/m³ at sea level, while the Moon has no air at all, so a motor there cools mainly by radiation. The cooling rule and the 100 °C limit are game values (P); the air densities are data (Jezero's is derived from MEDA's 718 Pa and agrees with the Mars Fact Sheet's 0.016 ± 0.006 kg/m³).
*Sources: [NASA, first weather report from Jezero (MEDA)](https://www.nasa.gov/?p=61574); [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html); [NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html).*

**11. Are the rocks real?**
No: the half-buried rocks (0.3–0.6 m) and the soft-sand patches are declared recreations, shown on screen as "recreated obstacles", because the elevation models we use (30 m on Earth, 80 m on the Moon, 200 m on Mars) cannot resolve objects that small. The terrain profile underneath is real; the obstacles are placed with a fixed seed so every player gets the same level.
*Source: [Methodology (one page)](METHODOLOGY_EN.md).*

**12. Why isn't the −248 °C lunar shadow on the route?**
The coldest permanently shadowed crater floors at the lunar south pole are about 25 K (−248 °C) and never see the Sun, so a solar-charged robot could not recharge there. Our mission follows the sunlit rim (about −53 °C, nearly constant), the way NASA studies plan polar routes that "chase sunlight" to shorten the night from about 14 days to about 36 hours.
*Sources: [UCLA, LRO Diviner science](https://www.diviner.ucla.edu/science); [NASA NTRS 20240004621](https://ntrs.nasa.gov/citations/20240004621).*

**13. How is traction computed?**
Each wheel can push at most what the soil can take in shear, by Mohr–Coulomb: thrust = contact area × cohesion + load × tan(friction angle). On soft soil the wheel also sinks by Bekker–Wong pressure–sinkage, which adds compaction resistance; if resistance plus the slope's pull beats the thrust, the robot slips or stops. Motor force, wheel size and prices are game values (P).
*Sources: [NASA/TM-20250006958, Tire-Ground Contact Modeling (2025)](https://ntrs.nasa.gov/citations/20250006958); [Lunar Sourcebook ch. 9, Tables 9.12 and 9.14](https://www.lpi.usra.edu/publications/books/lunar_sourcebook/pdf/Chapter09.pdf).*

**14. Are the soil parameters real?**
Friction and cohesion come from missions: lunar regolith from Apollo-era data (42°, 0.52 kPa near the surface) and Martian drift from Viking (18°, 1.6 kPa), which NASA itself calls engineering estimates. The sinking constants are not measured on the Moon or Mars: the Moon uses Apollo-era design estimates, Mars a lab simulant (M90), Earth's sand a generic textbook dry sand, and a few values with no source (like bare rock) are marked as game values (P).
*Sources: [Lunar Sourcebook ch. 9](https://www.lpi.usra.edu/publications/books/lunar_sourcebook/pdf/Chapter09.pdf); [Moore 1991, NTRS 19910017759](https://ntrs.nasa.gov/citations/19910017759); [Oravec et al., NTRS 20200003046](https://ntrs.nasa.gov/citations/20200003046); [NASA/TM-20250006958](https://ntrs.nasa.gov/citations/20250006958).*

**15. Why does wind barely push on Mars?**
Wind force grows in proportion to air density, and Martian surface air is about 0.016–0.020 kg/m³, about 1.4 % of Earth's 1.217 kg/m³, so the same gust pushes about 70 times less. A 10 m/s gust, like those Perseverance measured at Jezero, pushes our robot with about 0.5 N on Mars against about 33 N on Earth (the robot's drag area is a game value, P).
*Sources: [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html); [NASA Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html); [NASA Glenn, the drag equation](https://www.grc.nasa.gov/www/k-12/airplane/drageq.html); [NASA, first weather report from Jezero](https://www.nasa.gov/?p=61574).*

**16. How did the model find these places?**
The same crater detector runs on NASA and ESA elevation data for Earth, the Moon and Mars at 200 m per pixel, and an explainable logistic regression trained on 4,288 lunar and 573 Martian craters (about 78 % balanced accuracy) places each Earth depression between the two by its depth-to-diameter. A vegetation mask (MODIS NDVI p90 < 0.35) keeps only arid land: it finds 9 of 11 known Mexican craters and has given 296 candidates for review in Mexico and 3 of 10 prioritized arid regions; we have not scanned the whole planet.
*Source: [Methodology (one page)](METHODOLOGY_EN.md).*

**17. Is snow a good lunar analog?**
We cannot say it is: we found no source that uses snow as an analog of lunar soil, and the Lunar Sourcebook recalls "lunar soil like fresh snow" as a pre-Apollo belief that proved wrong. Compacted snow is about 0.37–0.56 g/cm³ against 1.50–1.66 g/cm³ for lunar soil and holds together by bonded grains, so in our data it is a Gap, and a snowy level is presented as soft ground on Earth, not as the Moon.
*Sources: [Lunar Sourcebook ch. 9, pp. 476–477](https://www.lpi.usra.edu/publications/books/lunar_sourcebook/pdf/Chapter09.pdf); [Shenvi, Sandu & Untaroiu, J. Terramechanics 100 (2022)](https://doi.org/10.1016/j.jterra.2021.11.006).*

**18. Why 1,000 credits? Are the part prices real?**
No: the budget and every price are game values (P), set so that the choice matters, not real costs. The cheapest complete robot costs 730 and the wide-wheel design of the demo 890, every featured level can be passed with some design under 1,000, and the team fixed the same 1,000 for all levels on 15 November.
*Sources: `docs/DECISIONES.md` (15 Nov); `docs/juego/PRESUPUESTO.md`; `game/src/content/parts.json`.*

**19. Does the score reward the cheapest robot?**
Only a little: delivering gives 500 points, cargo integrity up to 300, energy left up to 100 and money saved up to 100, so a cheap robot that damages the cargo loses more than it saves. The score is a game rule (P) that shows trade-offs; it is not scientific evidence that a design would work on the Moon or Mars.
*Source: `game/src/feedback/puntuacion.js`.*

**20. If gravity is real, why does it feel faster than the Moon?**
The physics engine multiplies the three gravities by the same factor, 1.5 (P), so the game does not feel slow; the ratios stay real (Mars 38 %, Moon 16.5 % of Earth). The soil equations use the real values: each wheel's load is mass × 9.81, 3.71 or 1.62 m/s² divided by the number of wheels.
*Sources: [NASA JPL, planetary physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html); `game/src/fisica/escala.js`, `suelo_v2.js`.*

**21. What does your traction model leave out?**
We do not model how thrust builds up with slip (the Janosi–Hanamoto shear modulus), the soil pushed ahead of a sinking wheel (bulldozing), or weight shifting between axles on a slope. A slipping wheel digs itself deeper, as Spirit did at Troy, but the rate is a game value (P), and grip on bare rock (μ ≈ 0.7) has no measured tire-on-rock value behind it.
*Sources: [NASA/TM-20250006958](https://ntrs.nasa.gov/citations/20250006958); [NASA/JPL, Spirit at Troy (2009)](https://www.jpl.nasa.gov/news/nasa-to-begin-attempts-to-free-sand-trapped-mars-rover/); [NAVFAC DM-7.02 (1986)](https://vulcanhammer.net/wp-content/uploads/2017/01/dm7_02.pdf).*

**22. Is the Earth test harder or easier than the real mission?**
For sinking it is harder: with the same robot, each wheel carries 2.6 times more weight on Earth than on Mars, so in our model it sinks about 1.3 cm in dry sand against about 0.5 cm in Martian drift. Martian drift has a lower friction angle (18° against 28°), but at Mars's light load its cohesion makes up for it, so the maximum thrust per unit of weight comes out about the same (0.67 against 0.66); what Earth cannot reproduce is the low gravity itself, so the robot must still pass the mission, not only the test (robot mass is a game value, P).
*Sources: [Moore 1991, NTRS 19910017759](https://ntrs.nasa.gov/citations/19910017759); [NASA/TM-20250006958](https://ntrs.nasa.gov/citations/20250006958); [Oravec et al., NTRS 20200003046](https://ntrs.nasa.gov/citations/20200003046).*
