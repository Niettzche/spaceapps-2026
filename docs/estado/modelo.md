# Estado — Modelo, datos y API del modelo

> Lo actualiza SOLO este frente. Rama: `feat/modelo`.

**Responsable:** Mario  ·  **Agente:** Claude Code / Codex
**Última actualización:** (fecha y hora)

## Hecho
-

## En curso
-

## Siguiente
- [ ] Verificar endpoints de NASA POWER y MODIS (model/features.py)
- [ ] Implementar pendiente desde SRTM/Copernicus DEM
- [ ] Capturar valores de Jezero y polo sur lunar con fuente (data/targets)
- [ ] Elegir coordenadas y llenar los 3 sitios (data/sites)
- [ ] Implementar model/validate.py con controles negativos y análogos conocidos
- [ ] Búsqueda global en zonas áridas (AGENTS.md §6.4), en 3 pasos:
  - [ ] (a) Máscara global de zonas áridas con el filtro de vegetación (MODIS MOD13Q1, NDVI p90 < 0.35)
  - [ ] (b) Detector a 200 m en regiones priorizadas: Sahara, Arabia, Atacama, Australia interior, Gobi, Kalahari,
        suroeste de EE. UU., meseta iraní, Thar, norte de México
  - [ ] (c) 5 a 8 sitios finales globales en data/sites/ (México como caso destacado)
- [ ] Verificar fuentes globales: base de datos de estructuras de impacto (controles positivos) e inventario de minería a cielo abierto
- [ ] Perfil de elevación real por sitio para los niveles (nivel.perfil_elevacion_m)

## Bloqueos / necesito de otro frente
-

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
-
