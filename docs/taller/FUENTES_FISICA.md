# Fuentes para la física del manejo (v2)

> 15 nov 2026 · Leo (con Claude Code) · para el frente juego (Edmundo) y `docs/juego/FISICA_V2.md`.
> Cada dato tiene su fila en `docs/taller/Space_Apps_Game_Data.xlsx` (hojas **Moon**, **Mars** y **Biomes**; fuentes S79–S102).
> Verified = leído en la fuente primaria · Draft = solo fuente secundaria o dudosa · Gap = no hay fuente.
> No cambié código ni `FISICA_V2.md`: aquí van los veredictos y los valores que propongo.

## 1. Veredicto de las fuentes que usa la física v2 (FISICA_V2.md §3)

| Qué usa el juego | Veredicto | Qué dice la fuente primaria | Propuesta |
|---|---|---|---|
| Luna: k_c 1.4, k_φ 820, n 1 (S62, apuntes UMD) | ✓ **Verified** | *Lunar Sourcebook* (Carrier et al. 1991, S79) tabla 9.14, p. 529: k_c 0.14 N/cm², k_φ 0.82 N/cm³, n 1. Viene de Costes et al. 1972 (NASA TR R-401, S80, p. 15), con datos de Surveyor | Citar S79 y S80 en vez de S62. Son **valores de diseño del LRV, no mediciones** (NASA/TM-20250006958, S59: "no existen parámetros de Bekker reales del regolito") |
| Luna: k_φ 830 (otra diapositiva de S62) | **Gap** | No aparece en ninguna fuente primaria; 820 sí | Usar 820 |
| Luna: c 0.17 kPa | ✓ el número existe, ✗ **mal usado** | 0.017 N/cm² = **c_b, cohesión suelo–rueda** de la misma tabla 9.14, no la cohesión del suelo. La cohesión recomendada del regolito es **0.52 kPa (0.44–0.62) en los primeros 15 cm**, con φ 42° (tabla 9.12, p. 510) | Para `H = A·c + W·tan φ` usar **c 0.52 kPa y φ 42°**. Si se quiere c_b, va con φ_b 35° (no 40°) |
| Luna: φ 33° (diapositiva de S62) | **Gap** | La tabla 9.14 y Costes dan 35° (φ_b) | — |
| Marte, drift: c 1.85 kPa (punto medio de 0–3.7, S20) | ✗ **no es un valor publicado** | Moore 1991 (S82): **1.6 ± 1.2 kPa** (0–3.7) y φ 18 ± 2.4°. Moore et al. 1987 (USGS PP 1389, S81): "0.7 a 3.0 kPa" en el resumen y **1–3 kPa como valor de diseño** (p. 130). El 0–3.7 de Oravec 2020 sí coincide con Moore | Usar **c 1.6 kPa**, φ 18°. Las dos fuentes advierten que son estimaciones de ingeniería y que la cohesión puede estar sobrestimada |
| Marte, drift: Bekker del simulante M90 (S63, preprint) | ✓ **Verified como simulante** | Oravec et al. 2020 (NTRS 20200003046, ya es S20) tabla 3, p. 9: M90 suelto n 1.3, k_c 572.1, k_φ 4915.3 (además φ_b 32°, c_b 0.27 kPa, K 25.4 mm). **No existen parámetros de Bekker del suelo real de Marte** | Citar S20 (primaria) en vez de S63. Declararlo como "simulante M90". GRC-3 (n 1.0, k_c 23.2, k_φ 606.7) es la otra opción publicada y es mucho más blanda. Ojo: la tabla 3 puede traer las unidades de k_c y k_φ invertidas |
| Ceniza volcánica (BM-003): c 0, φ 28.5° | **Pendiente** (se agrega en el siguiente commit de este PR) | | |
| Roca y suelo firme de la Tierra: φ 45 y 40, c 0 (sin fuente) | **Pendiente** (se agrega en el siguiente commit de este PR) | | |

**Dato que llena un hueco de la física v2:** el módulo de deformación cortante **K = 1.8 cm** para la Luna (tabla 9.14; Costes:
0.7 ± 0.3 in) y **K = 25.4 mm** para el simulante M90 (S20). FISICA_V2.md §7 omite `K` (EQ-017) por ser Gap.

## 2. Datos nuevos para la física (pedido de la mañana)

**Cohesión y fricción** (Moon MN-056…060; Mars MR-057…065)
- Luna por profundidad: 0–15 cm c 0.52 kPa, φ 42°; 0–30 cm 0.90 kPa, 46°; 30–60 cm 3.0 kPa, 54° (S79).
- Marte: drift 1.6 ± 1.2 kPa, 18°; costra y terrones 1.1 ± 0.8 kPa, 34.5°; bloques 5.1 ± 2.7 kPa, 30.8° (Viking, S82).
  MER: "alrededor de 10 kPa o menos", φ 30–37° (S83). Phoenix: ≥ 0.1 kPa (S84).

**Bekker** (Moon MN-061…068; Mars MR-066…070)
- Luna: n 1, k_c 1.4, k_φ 820 (diseño, S79/S80). JSC-1A: **Gap**. GRC-1: Draft (valores con k_φ negativo; no usar).
- Marte: M90 y GRC-3 (simulantes, S20). Suelo real: **Gap**.

**Rocas** (Moon MN-069…076; Mars MR-071…074)
- Marte, modelo de Golombek & Rapp 1997: `F_k(D) = k·exp(−q(k)·D)`, `q(k) = 1.79 + 0.152/k` (S85). k medido: Phoenix 2 %,
  InSight 3 %, Spirit 5 %, Viking 1 ~7–8 %, Viking 2 ~16–20 %, Pathfinder 19 %. Roca peligrosa: 0.5 m de alto.
  **k de la elipse de Jezero: Gap.**
- Luna: bloque mayor `B = 0.29·D^(2/3)` (m; cráteres primarios, S87); los mayores a 2–4 radios del borde y ninguno más allá
  de ~8 radios (S88); exponente acumulado ~ −4 (S89); polo sur (cresta Shackleton–de Gerlache) ~116 bloques/km², 80 % < 2 m (S91).

**Remolinos de polvo en Jezero** (Mars MR-075…083)
- ~5 vórtices por sol (Δp > 0.5 Pa), pico a las 12–13 h locales; 25–50 % levantan polvo; diámetro típico 25 m (5–135);
  viento hasta 32 m/s (levantan polvo desde ~15 m/s).
- **Luz:** típico **0.1–1 %** menos (Verified, S96); los más fuertes > 15 % (cota inferior). **Máximo exacto: Gap** (solo en
  figuras de los artículos completos, no accesibles).

**Rocker-bogie** (Mars MR-084…093)
- 6 ruedas con motor propio, 4 giran. Diámetro: Perseverance 52.5 cm, Curiosity 50.0 cm. **Ancho: Curiosity 40.0 cm,
  Perseverance 33.6 cm** (JPL, S99). Inclinación: 45° sin volcar, 30° límite de operación. Pendiente en pruebas:
  22° en roca, 28° en suelo cohesivo, 17° en arena (se entierra) (S100).

**Nieve** (Biomes BM-022; Moon MN-077)
- Parámetros de nieve (Wong vía Lines et al. 2021): n 1.6, k_c 4.37, k_φ 196.72; c 0.6–6 kPa; φ 9–23° (Draft).
  Rovers reales: FrostyBoy (80 km en Groenlandia) y Cool Robot. **No hay fuente que respalde la nieve como análogo del suelo
  lunar** (Gap): el *Lunar Sourcebook* (p. 476) dice que "suelo lunar como nieve fresca" era una creencia descartada.
  Si se agrega un nivel de nieve, presentarlo como terreno blando de la Tierra.

## 3. Límites

- Los valores de Bekker de la Luna y de los simulantes dependen de la densidad y la preparación; no hay mediciones del suelo real.
- Varias fuentes solo se leyeron en su resumen (Golombek & Rapp 1997, Hueso 2023, Toledo 2023, Heverly 2013): están marcadas.
- Los artículos de pago no se abrieron (Sullivan 2011, Shaw 2009, Moore & Jakosky 1989, Bart & Melosh 2010).
