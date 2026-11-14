# Estado — Expediente, explorador y menú

> Lo actualiza SOLO este frente. Rama: `feat/expediente`.

**Responsable:** Diego  ·  **Agente:** Claude Code  ·  **Rama:** feat/expediente
**Última actualización:** 14 nov 2026

## Hecho
- [x] Pantalla de carga con progreso real (eventos del cargador de Phaser sobre el arte de `/assets`; si no hay arte, 100 %)

## En curso
- [ ] Menú y elección de destino (Luna o Marte; el jugador elige)

## Siguiente
- [ ] Expediente: comparación 1 a 1 con fuente y unidad
- [ ] Tickets de prueba (3 por partida)
- [ ] Explorador: consulta de coordenadas → /score → /submit
- [ ] Pantalla '¿De dónde salen los números?'

## Bloqueos / necesito de otro frente
- **Arte:** Boot precarga solo lo que haya en `/assets`. Si se necesitan hojas de sprites, crear `assets/manifest.json`
  (formato en `game/src/scenes/expediente/assets.js`); sin manifiesto, cada imagen se carga con clave = ruta sin extensión.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
-
