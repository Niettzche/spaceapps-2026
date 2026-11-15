# Ambiente de los sitios jugables y destinos

> Dueño: frente taller. Misma información que la hoja **Ambiente** de `docs/taller/Space_Apps_Game_Data.xlsx` (filas AM-001…AM-037).
> Para las reglas del juego que usan el ambiente (el frío baja la batería, el motor se enfría con el aire). Todos son datos con fuente;
> los derivados se marcan como tales. Fuentes completas en la hoja Sources (S-IDs).

## Cómo se obtuvo

- **Sitios de la Tierra** (`samalayuca`, `pinacate`, `mx0207`, `g00281`): NASA POWER en las coordenadas de `data/sites/<id>.json`.
  - *Típica* = promedio de la mínima diaria del mes más frío y de la máxima diaria del mes más caluroso (datos diarios 2015–2024).
  - *Extrema* = `T2M_MIN` / `T2M_MAX` de la climatología mensual 2001–2025: la más baja y la más alta del año.
  - Presión = `PS` media anual. Densidad **derivada** con gas ideal: ρ = PS / (287.05 J/kg·K × T media).
  - Ojo: POWER da el valor de la **celda de su malla** (~0.5° × 0.625°), no del punto exacto. La altitud de la celda va en la nota.
- **Jezero:** MEDA (Perseverance). Las temperaturas son una **muestra de dos soles** (43–44), no una climatología anual. La densidad es derivada (CO₂, ideal) y coincide con la media de la Mars Fact Sheet (0.016 ± 0.006 kg/m³).
- **Polo sur lunar:** Diviner (LRO) y la NASA Moon Fact Sheet. Prácticamente vacío: presión ~3×10⁻¹⁵ bar de noche, densidad 0 para el juego.

## Tabla

| id | variable | valor | unidad | fuente | fecha |
|---|---|---|---|---|---|
| samalayuca | Temperatura mínima típica | 0.3 | °C | NASA POWER, datos diarios (S75) | 2015-2024 |
| samalayuca | Temperatura máxima típica | 36.2 | °C | NASA POWER, datos diarios (S75) | 2015-2024 |
| samalayuca | Temperatura mínima extrema | -14.5 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| samalayuca | Temperatura máxima extrema | 42.4 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| samalayuca | Temperatura media del aire | 17.9 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| samalayuca | Presión superficial | 87.31 | kPa | NASA POWER, climatología mensual (S74) | 2001-2025 |
| samalayuca | Densidad del aire (derivada) | 1.045 | kg/m³ | Derivada de NASA POWER PS y T2M (S74) | 2001-2025 |
| pinacate | Temperatura mínima típica | 7.1 | °C | NASA POWER, datos diarios (S75) | 2015-2024 |
| pinacate | Temperatura máxima típica | 39.7 | °C | NASA POWER, datos diarios (S75) | 2015-2024 |
| pinacate | Temperatura mínima extrema | -4.7 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| pinacate | Temperatura máxima extrema | 48.4 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| pinacate | Temperatura media del aire | 22.3 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| pinacate | Presión superficial | 96.96 | kPa | NASA POWER, climatología mensual (S74) | 2001-2025 |
| pinacate | Densidad del aire (derivada) | 1.143 | kg/m³ | Derivada de NASA POWER PS y T2M (S74) | 2001-2025 |
| mx0207 | Temperatura mínima típica | 4.5 | °C | NASA POWER, datos diarios (S75) | 2015-2024 |
| mx0207 | Temperatura máxima típica | 30.3 | °C | NASA POWER, datos diarios (S75) | 2015-2024 |
| mx0207 | Temperatura mínima extrema | -7.0 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| mx0207 | Temperatura máxima extrema | 35.8 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| mx0207 | Temperatura media del aire | 16.4 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| mx0207 | Presión superficial | 79.01 | kPa | NASA POWER, climatología mensual (S74) | 2001-2025 |
| mx0207 | Densidad del aire (derivada) | 0.951 | kg/m³ | Derivada de NASA POWER PS y T2M (S74) | 2001-2025 |
| g00281 | Temperatura mínima típica | 9.6 | °C | NASA POWER, datos diarios (S75) | 2015-2024 |
| g00281 | Temperatura máxima típica | 42.1 | °C | NASA POWER, datos diarios (S75) | 2015-2024 |
| g00281 | Temperatura mínima extrema | 0.6 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| g00281 | Temperatura máxima extrema | 45.3 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| g00281 | Temperatura media del aire | 25.9 | °C | NASA POWER, climatología mensual (S74) | 2001-2025 |
| g00281 | Presión superficial | 89.41 | kPa | NASA POWER, climatología mensual (S74) | 2001-2025 |
| g00281 | Densidad del aire (derivada) | 1.042 | kg/m³ | Derivada de NASA POWER PS y T2M (S74) | 2001-2025 |
| jezero | Temperatura mínima (muestra) | -83 | °C | NASA/JPL, primer reporte de MEDA (S22) | 2021-04-06 |
| jezero | Temperatura máxima (muestra) | -22 | °C | NASA/JPL, primer reporte de MEDA (S22) | 2021-04-06 |
| jezero | Temperatura media del aire | -55 | °C | MEDA, Rodriguez-Manfredi et al. 2023 (S21; S23) | 2023-01 |
| jezero | Presión superficial | 718 | Pa | NASA/JPL, primer reporte de MEDA (S22) | 2021-04-06 |
| jezero | Densidad del aire (derivada) | 0.017 | kg/m³ | Derivada de 718 Pa y −55 °C (S22, S21) | 2021-2023 |
| polo_sur_lunar | Temperatura mínima | -248 | °C | LRO Diviner, UCLA (S07) | n/d |
| polo_sur_lunar | Temperatura típica, borde iluminado | -53 | °C | LRO Diviner, UCLA (S07) | n/d |
| polo_sur_lunar | Presión superficial (noche) | 3×10⁻10 | Pa | NASA Moon Fact Sheet (S02) | 2024-01-11 |
| polo_sur_lunar | Densidad del aire | 0 | kg/m³ | NASA Moon Fact Sheet (S02) | 2024-01-11 |

## Límites

- Los valores de POWER son de una malla de reanálisis (MERRA-2), no de una estación en el sitio.
- Las temperaturas de Jezero son de dos soles de primavera; Marte cambia mucho con la estación (presión global 400–870 Pa, WX-023).
- En el polo sur lunar la temperatura depende de la luz: ~25 K en las sombras permanentes y ~220 K en los bordes iluminados.
- La densidad de la Tierra y de Jezero es **derivada** (gas ideal), no medida.
