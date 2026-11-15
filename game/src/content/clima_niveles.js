// Generado desde NASA POWER (ver _nota y consulta). Módulo JS (no .json) para que las pruebas de Node lo importen sin atributos.
// Dueño: frente juego (niveles destacados). No editar a mano: regenerar con las consultas de `consulta`.
export default {
 "_nota": "Clima real de los niveles destacados desde NASA POWER (API v2.10.1, sin llave; mismo servicio que model/features.py). Valores de la celda de la malla de POWER (MERRA-2, ~0.5° × 0.625°), no de una estación en el sitio. Típicas = media de la mínima diaria del mes más frío y de la máxima diaria del mes más caluroso (datos diarios 2015-2024, mismo método que docs/taller/AMBIENTE.md; con él, pinacate da 7.1 / 39.7 °C, igual que la tabla). Extremos, media, presión, viento y nieve = climatología mensual 2001-2025 (fila ANN). Densidad del aire DERIVADA con gas ideal: ρ = PS / (287.05 J/kg·K × (T2M + 273.15)). WS10M_MAX ANN = la mayor de las 12 climatologías mensuales del viento máximo diario. No se edita a mano: se regenera con las consultas de 'consulta'.",
 "fecha_consulta": "2026-11-15",
 "consulta": {
  "climatologia": "https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_MIN,T2M_MAX,PS,WS10M,WS10M_MAX,SNODP&community=RE&longitude={lon}&latitude={lat}&format=JSON&start=2001&end=2025",
  "diaria": "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MIN,T2M_MAX,WS10M&community=RE&longitude={lon}&latitude={lat}&start=20150101&end=20241231&format=JSON"
 },
 "unidades": {
  "min_tipica_C": "°C",
  "max_tipica_C": "°C",
  "min_extrema_C": "°C",
  "max_extrema_C": "°C",
  "media_C": "°C",
  "ps_kPa": "kPa",
  "rho_kg_m3": "kg/m³ (derivada)",
  "viento_medio_ms": "m/s a 10 m",
  "viento_max_ms": "m/s a 10 m",
  "viento_p90_diario_ms": "m/s a 10 m",
  "nieve_media_cm": "cm",
  "nieve_max_mes_cm": "cm"
 },
 "sitios": {
  "g00266": {
   "lat": 25.6608,
   "lon": 39.9348,
   "celda_power": {
    "lon": 39.935,
    "lat": 25.661,
    "elevacion_m": 1304.44
   },
   "min_tipica_C": 5.5,
   "max_tipica_C": 40.3,
   "min_extrema_C": -5.75,
   "max_extrema_C": 43.76,
   "media_C": 22.95,
   "ps_kPa": 86.97,
   "rho_kg_m3": 1.023,
   "viento_medio_ms": 5.06,
   "viento_max_ms": 17.06,
   "viento_p90_diario_ms": 6.8,
   "nieve_media_cm": 0.0,
   "nieve_max_mes_cm": 0.0
  },
  "tenoumer": {
   "lat": 22.918,
   "lon": -10.4062,
   "celda_power": {
    "lon": -10.406,
    "lat": 22.918,
    "elevacion_m": 258.24
   },
   "min_tipica_C": 9.5,
   "max_tipica_C": 44.6,
   "min_extrema_C": 2.2,
   "max_extrema_C": 48.77,
   "media_C": 26.09,
   "ps_kPa": 98.38,
   "rho_kg_m3": 1.145,
   "viento_medio_ms": 4.53,
   "viento_max_ms": 15.1,
   "viento_p90_diario_ms": 6.32,
   "nieve_media_cm": 0.0,
   "nieve_max_mes_cm": 0.0
  },
  "mx0023": {
   "lat": 30.9528,
   "lon": -110.3202,
   "celda_power": {
    "lon": -110.32,
    "lat": 30.953,
    "elevacion_m": 1344.68
   },
   "min_tipica_C": 2.6,
   "max_tipica_C": 35.1,
   "min_extrema_C": -11.24,
   "max_extrema_C": 43.11,
   "media_C": 17.44,
   "ps_kPa": 86.65,
   "rho_kg_m3": 1.039,
   "viento_medio_ms": 3.6,
   "viento_max_ms": 15.91,
   "viento_p90_diario_ms": 5.37,
   "nieve_media_cm": 0.13,
   "nieve_max_mes_cm": 0.51
  },
  "pinacate": {
   "lat": 31.84444,
   "lon": -113.39111,
   "celda_power": {
    "lon": -113.391,
    "lat": 31.844,
    "elevacion_m": 374.11
   },
   "min_tipica_C": 7.1,
   "max_tipica_C": 39.7,
   "min_extrema_C": -4.65,
   "max_extrema_C": 48.41,
   "media_C": 22.3,
   "ps_kPa": 96.96,
   "rho_kg_m3": 1.143,
   "viento_medio_ms": 3.81,
   "viento_max_ms": 18.42,
   "viento_p90_diario_ms": 5.56,
   "nieve_media_cm": 0.01,
   "nieve_max_mes_cm": 0.04
  },
  "pingualuit": {
   "lat": 61.2773,
   "lon": -73.6619,
   "celda_power": {
    "lon": -73.662,
    "lat": 61.277,
    "elevacion_m": 457.48
   },
   "min_tipica_C": -34.4,
   "max_tipica_C": 12.1,
   "min_extrema_C": -49.09,
   "max_extrema_C": 23.89,
   "media_C": -9.69,
   "ps_kPa": 95.37,
   "rho_kg_m3": 1.261,
   "viento_medio_ms": 5.64,
   "viento_max_ms": 20.89,
   "viento_p90_diario_ms": 8.94,
   "nieve_media_cm": 38.53,
   "nieve_max_mes_cm": 70.41
  },
  "samalayuca": {
   "lat": 31.263611,
   "lon": -106.395278,
   "celda_power": {
    "lon": -106.395,
    "lat": 31.264,
    "elevacion_m": 1279.63
   },
   "min_tipica_C": 0.3,
   "max_tipica_C": 36.2,
   "min_extrema_C": -14.51,
   "max_extrema_C": 42.41,
   "media_C": 17.85,
   "ps_kPa": 87.31,
   "rho_kg_m3": 1.045,
   "viento_medio_ms": 4.05,
   "viento_max_ms": 19.28,
   "viento_p90_diario_ms": 6.24,
   "nieve_media_cm": 0.58,
   "nieve_max_mes_cm": 2.39
  },
  "mx0261": {
   "lat": 20.4316,
   "lon": -101.2492,
   "celda_power": {
    "lon": -101.249,
    "lat": 20.432,
    "elevacion_m": 1864.07
   },
   "min_tipica_C": 7.5,
   "max_tipica_C": 32.6,
   "min_extrema_C": -2.2,
   "max_extrema_C": 37.31,
   "media_C": 18.54,
   "ps_kPa": 81.58,
   "rho_kg_m3": 0.974,
   "viento_medio_ms": 2.86,
   "viento_max_ms": 14.73,
   "viento_p90_diario_ms": 4.24,
   "nieve_media_cm": 0.0,
   "nieve_max_mes_cm": 0.01
  }
 }
};
