# MARSCEPTION — likely judge questions (English)

> For Alan and the pitch. Each answer is two sentences you can say out loud, then the source. Numbers come from
> `docs/taller/Space_Apps_Game_Data.xlsx` (tabs **Judges** and **Ambiente**); "(P)" marks a game value, not a measurement.

**1. Real rovers crawl. Why does your robot drive at 6 m/s?**
On purpose: speed is a game value (P), so a 266 m test takes about a minute instead of about 44 minutes at VIPER's 0.1 m/s. Real rovers are far slower: Perseverance tops out at 152 meters per hour (0.042 m/s), and VIPER is designed for 0.1–0.2 m/s in transit (it has not flown yet).
*Sources: [NASA, Perseverance rover components](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/); [NASA, VIPER lunar operations](https://science.nasa.gov/mission/viper/lunar-operations/).*

**2. Why did the Spirit rover get stuck?**
In 2009, at a site called "Troy", Spirit's wheels broke through a surface crust into soft, bright, slippery sulfate-rich sand and could not get traction, while its right-front wheel had already stopped turning. NASA rehearsed escapes with test rovers on Earth, then made Spirit a stationary science platform in January 2010; our dune test shows the same lesson: a wheel that works on firm ground can fail in loose sand.
*Sources: [NASA/JPL, Nov 2009 release](https://www.jpl.nasa.gov/news/nasa-to-begin-attempts-to-free-sand-trapped-mars-rover/); [NASA Science, Spirit](https://science.nasa.gov/mission/mer-spirit/).*

**3. How much grip does lunar regolith give?**
Apollo experiments put its internal friction angle at 30–50°, rising toward about 55° within the first metre, so the soil's friction coefficient (tan of the angle) is 0.58–1.19. The game uses the midpoint, 0.84, multiplied by the wheel's own grip.
*Source: [Connolly & Carrier, NASA JSC, An Engineering Guide to Lunar Geotechnical Properties (2023)](https://ntrs.nasa.gov/citations/20220014634).*

**4. And the dust on Mars?**
Loose wind-drift soil is much weaker: about 16–20° at the Viking 1 site (friction coefficient 0.28–0.37) and 20–25° at Spirit's site, so wheels slip there. NASA's own table warns these are engineering estimates, not direct measurements; the game uses 0.32.
*Source: [Oravec et al., NASA NTRS 20200003046, Table 1](https://ntrs.nasa.gov/citations/20200003046).*

**5. Which numbers are real data and which are game values?**
Real, with a source: gravity (Earth 9.81, Mars 3.71, Moon 1.62 m/s²), the terrain profiles from elevation models, the soil friction for the Moon and Mars, and the temperatures and pressures in the Ambiente tab. Game values, marked (P): prices, part stats, speed, damage and score; the score is not scientific evidence.
*Sources: [NASA JPL, planetary physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html); workbook tabs Biomes, Ambiente and Parts.*

**6. What can't an Earth analog test?**
Earth cannot reproduce the destination's gravity, its thin or missing atmosphere, its radiation or the cold of lunar shadows. For example, Jezero's air is about 718 Pa (Earth's is about 100,000 Pa), and the coldest lunar polar craters are about 25 K (−248 °C), so the game always says what the Earth test did not show.
*Sources: [NASA, first weather report from Jezero (MEDA)](https://www.nasa.gov/?p=61574); [UCLA, Diviner science](https://www.diviner.ucla.edu/science).*

**7. Why don't your wheels sink in the sand?**
Sinking needs soil "Bekker" constants, and NASA notes that no true Bekker parameters exist for lunar regolith; none are published for real Martian dust either. So we model slip, not sinkage, and we say so as a limit instead of inventing numbers.
*Source: [NASA/TM-20250006958, An Overview of Tire-Ground Contact Modeling Approaches (2025)](https://ntrs.nasa.gov/citations/20250006958).*

**8. Why a wide wheel for sand?**
A wider wheel spreads the robot's weight over more area, so it presses less on loose sand and sinks less; that is a general principle, and the exact grip number in the game is a game value (P). Real designs follow the same idea: Apollo's lunar rover used 23 cm wide wire-mesh tires, and Perseverance's wheels are 52.5 cm across.
*Sources: [NASA NSSDC, Apollo Lunar Roving Vehicle](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html); [NASA, Perseverance rover components](https://science.nasa.gov/mission/mars-2020-perseverance/rover-components/).*
