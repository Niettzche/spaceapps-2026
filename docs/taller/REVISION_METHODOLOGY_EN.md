# Revisión de `docs/METHODOLOGY_EN.md` (física 2)

> 15 nov 2026 · Leo (con Claude Code) · revisado sobre `main` **bd24a7f**.
> Comparé cada valor de la sección *Game physics* con el código (`game/src/fisica/suelo_v2.js`, `escala.js`, `config/world.js`)
> y con el libro de datos (`docs/taller/Space_Apps_Game_Data.xlsx`, hojas Biomes, Moon y Mars) y los veredictos de
> [FUENTES_FISICA.md](FUENTES_FISICA.md).

## Veredicto: los valores están bien

| Lo que dice la metodología | Código | Libro de datos | ¿Bien? |
|---|---|---|---|
| Luna: c 0.52 kPa, φ 42° (primeros 15 cm) | `regolito_lunar` 0.52 / 42 | MN-056, MN-057; Lunar Sourcebook tabla 9.12 (S79) | ✓ |
| Luna: n 1, k_c 1.4, k_φ 820, valores de diseño del LRV | 1 / 1.4 / 820 | MN-061…063; tabla 9.14 (S79), de Costes et al. 1972 (S80) | ✓ |
| Marte drift: c 1.6 kPa, φ 18° (Viking, Moore 1991) | `drift_marciano` 1.6 / 18 | MR-057, MR-058; S82 | ✓ |
| Hundimiento en Marte con el simulante M90 | n 1.3, k_c 572.1, k_φ 4915.3 | MR-066…068; Oravec et al. 2020 tabla 3 (S20) | ✓ |
| Costra 34.5°, roca 40–60° (Viking) | costra φ 34.5; roca φ 50 (punto medio) | MR-061, BM-016 | ✓ (ver nota 1) |
| Tierra: arena seca genérica (Wong 2001 vía NASA/TM) | `arena_eolica` φ 28, c 1.04, n 1.1, k_c 0.99, k_φ 1528.43 | BM-004, S59 | ✓ |
| Escoria c 0, φ 28.5° (suelta) | `ceniza_volcanica` 0 / 28.5 | BM-003, S103, S61 | ✓ |
| Suelo compactado φ 38° (NAVFAC DM-7.02) | `suelo_firme` 38 / 0 | BM-023, S105 | ✓ |
| Roca μ ≈ 0.7 (P) | `roca_tierra` φ 35 = atan 0.7 | BM-024 (Draft) | ✓ |
| H = A·c + W·tan φ; p = (k_c/b + k_φ)·zⁿ | `empujeMaximo`, `hundimientoEstatico` | S59 | ✓ |
| Gravedad real, escalada por un factor común | 9.81 / 3.71 / 1.62 × 1.5 (P) en el motor; la carga sobre la rueda usa g real | S71 (Marte), S02 (Luna) | ✓ |
| Límites: sin K de Janosi–Hanamoto, sin bulldozing ni transferencia de carga | `M90.K_m` existe pero no se usa | — | ✓ |

## Lo que corregí en el archivo
- **Fuentes de suelo:** faltaban el Lunar Sourcebook (de donde salen 0.52 kPa, 42° y los valores de Bekker lunares) y Moore 1991
  (de donde sale el drift de Viking). Las agregué; el enlace NTRS 20220014634 es la guía de Connolly y Carrier y lo dejé como «guía».
- **Roca de Marte:** aclaré que 40–60° se usa como cota superior (así lo dice la nota de BM-016: el agarre de rueda contra roca no es
  la fricción del suelo).

## Notas para otros frentes (no las cambié)
1. **Frente juego, `suelo_v2.js` `costra_marciana`:** usa c = 1.6 kPa, el punto medio del rango 0–3.2 (así lo dice `FISICA_V2.md`).
   El valor medido es **1.1 ± 0.8 kPa** (Viking Lander 2, Moore 1991, S82; fila MR-060). Propuesta: c 1.1. La metodología no da
   la cohesión de la costra, así que no hay que cambiarla.
2. **`docs/METODOLOGIA.md` (español):** la sección «Física 2» ya tiene los mismos valores; no encontré diferencias.

## Libro de datos (actualizado en este PR)
Las notas de Biomes seguían con valores de antes del rebalanceo:
- BM-008: Bekker lunar con fuente S79 y S80 → Verified (como valores de diseño del LRV, no medidos).
- BM-013: Bekker del drift llenado con M90 (S20), Draft porque es simulante; la nota vieja decía «no se simula hundimiento en Marte».
- BM-023 y BM-024: las notas decían que física 2 usaba φ 40 y φ 45; hoy usa 38 y 35.

Review Log: RV-175…178.
