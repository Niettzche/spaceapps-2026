# Estado — Modelo, datos y API del modelo

> Lo actualiza SOLO este frente. Rama: `feat/modelo`.

**Responsable:** Mario  ·  **Agente:** Claude Code / Codex
**Última actualización:** 14 nov 2026, 14:30

## Hecho
- Detector de cráteres (núcleo del modelo, AGENTS.md §6.1 y §8.1): `analisis/00–15`. Corre igual sobre México (5,208 depresiones),
  el polo sur lunar (LOLA, 4,288 cráteres) y Marte (HRSC+MOLA, 8 sitios y 596 cráteres), todo a 200 m.
- Modelos explicables (`ciencia_datos/01–03`):
  - Luna contra Marte con 78 % de exactitud balanceada (grupos espaciales); entre 70 y 92 % en un sitio de Marte nunca visto.
  - Validación con cráteres de impacto terrestres: 8 de 8 dentro de la nube Luna+Marte.
  - Catálogo de 70 cráteres volcánicos de México con fuente: el detector encuentra el 40 % de los que están en su rango.
- `model/features.py`: NASA POWER verificado (T2M_RANGE y PRECTOTCORR, climatología 2001–2025). NDVI de MOD13Q1: el servicio de
  ORNL DAAC daba 503 el 14 nov, así que se usa Earth Engine como respaldo. Pendiente y perfil de elevación desde Copernicus GLO-30
  a 200 m, la misma resolución que la Luna y Marte. Las variables que salen de Earth Engine requieren `earthengine authenticate`.
- `model/forma.py`: dimensión **forma**, que combina el modelo Luna contra Marte con la distancia a la nube.
  `model/score.py` la usa con peso 0.40 (P).
- `data/targets`: pendiente medida de Jezero (3.56°) y del polo sur lunar (8.63°), mediana de cuadros de 10 km a 200 m.
- `model/scan.py`: **41 candidatos** áridos exportados a `data/sites/mxNNNN.json` como `candidato_modelo`.
- `model/curados.py`: **Pinacate** con variables reales y perfil de elevación de 4 km que cruza El Elegante (`documentado`).
- `model/validate.py`: escribe `model/VALIDATION.md`.
- Destinos con oscilación térmica con fuente: Jezero 55 K (aire a 1.45 m, MEDA, Munguira et al. 2023) y polo sur 176 K
  (superficie, LRO Diviner, Williams et al. 2019; solo comparable en orden de magnitud). Pinacate y candidatos, confianza 1.0.
- `data/known_analogs.json` (20 con coordenada y fuente, 10 de México) y `data/negative_controls.json` (3, verificados con WorldCover).
  `novedoso` ya se calcula: 7 candidatos quedan como no novedosos por estar a menos de 50 km del Gran Desierto de Altar,
  del Pinacate o de Rincón de Parangueo.
- **Samalayuca** con variables reales y perfil de dunas de 3 km (coordenada de Domínguez-Acosta et al. 2023). No hay literatura
  que la trate como análogo planetario, así que va como `candidato_modelo` con `novedoso: true`.
- `model/VALIDATION.md`: controles negativos 3 de 3 en 0 (veto por NDVI). Análogos conocidos: 9 de 20 por encima de 0.4; los que
  no pasan son análogos por razones que el comparador no ve (frío, lava húmeda, química, cuevas). Impactos terrestres: 8 de 8
  dentro de la nube de forma.

- `ciencia_datos/04_fichas_explicables.ipynb` → `salidas/fichas_explicables.json` (54 sitios): aporte exacto de cada variable al logit, gemelos kNN lunares y marcianos con coordenadas (las de Marte recuperadas de la posición en el recorte) y puntaje por dimensión frente a los dos destinos.

## En curso
- Sumar las variables de `perfiles_radiales.csv` (analisis/17, sesión del Colab) a una versión del modelo de la Luna, sin mezclar resoluciones con Marte.
- `model/scan.py --global`: los 12 mejores en forma de `global_crateres.csv` (Atacama 6, Arizona 6; Arabia ninguno en el top), sin duplicados de México a ≤1 km. 9 de 12 están junto a una cantera: el patrón de las minas se repite fuera de México. g00174 y g00176 (campo volcánico de San Francisco, AZ) quedan con novedoso null por verificar.

## Siguiente
- [ ] Regenerar `web/public/data/sitios.json` desde `data/sites` (quitar `demo: true`).
- [ ] Búsqueda global en zonas áridas (AGENTS.md §6.4), en 3 pasos. El paso (b) lo corre la sesión del Colab:
  - [ ] (a) Máscara global de zonas áridas con el filtro de vegetación (MODIS MOD13Q1, NDVI p90 < 0.35)
  - [ ] (b) Detector a 200 m en regiones priorizadas: Sahara, Arabia, Atacama, Australia interior, Gobi, Kalahari,
        suroeste de EE. UU., meseta iraní, Thar, norte de México (este último ya está hecho)
  - [ ] (c) 5 a 8 sitios finales globales en data/sites/ (México como caso destacado)
- [ ] Verificar fuentes globales: base de datos de estructuras de impacto (controles positivos) e inventario de minería a cielo abierto
- [ ] API `/score`: hoy usa forma = null en puntos libres (correcto: no hay cráter medido). Probar en el VPS si Earth Engine está disponible.

## Bloqueos / necesito de otro frente
- Sitio análogo del camino lunar (el jugador elige Luna o Marte): la sesión del Colab propone El Elegante (forma 0.97 frente a la Luna). Lo decide Mario.
- **Decisión del equipo (§16):** la forma de El Elegante da 0.97 frente al polo sur lunar y 0.03 frente a Jezero, y la similitud
  total del Pinacate contra Jezero es 0.13. Si el MVP sigue en Jezero, el sitio de relieve no sale como buen análogo de forma.
  Los datos favorecen la Luna como destino.
- Tercer sitio (§16): candidatos del escaneo con buena forma y acceso, por ejemplo Cananea (mx0023, forma 0.87 frente a la Luna),
  La Herradura (mx0019) o Peñasquito (mx0155). Son tajos mineros: análogo operativo (rovers en paredes empinadas, excavación),
  no geológico.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- `site.schema.json`: un campo opcional `gemelo` ({cuerpo, sitio, lat, lon, diam_km, prof_m}). Hoy el gemelo va como texto en `nota`.
- `site.schema.json`: permitir `similitud_por_destino` (polo_sur_lunar y jezero), para no perder la comparación con el otro destino.
