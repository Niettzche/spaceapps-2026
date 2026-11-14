# Estado — Expediente, explorador y menú

> Lo actualiza SOLO este frente. Rama: `feat/expediente`.

**Responsable:** Diego  ·  **Agente:** Claude Code  ·  **Rama:** feat/expediente
**Última actualización:** 14 nov 2026

## Hecho
- [x] Pantalla de carga con progreso real (eventos del cargador de Phaser sobre el arte de `/assets`; si no hay arte, 100 %)

- [x] Menú: nueva partida → elección de destino (Marte primero, Luna), continuar, explorador, "¿De dónde salen los números?"
- [x] Expediente: lista de sitios del destino (curados primero, luego por similitud; 8 por página) y comparación 1 a 1:
  Tierra a la izquierda, destino a la derecha, misma variable y unidad, fuente y fecha de cada lado; "sin dato" si falta;
  aviso si las unidades no coinciden; banda roja en sitios `ilustrativo` o `demo: true`. Probado también con los 56 sitios
  de `feat/modelo-fichas` (29 Marte, 27 Luna).
- [x] Pruebas de lógica: `cd game && node --test src/scenes/expediente/pruebas/`

- [x] Expediente: recuadro "Lo que la Tierra no puede probar" (une `no_reproducible_en_tierra` del destino y `limites` del sitio;
  gravedad con su valor y la nota de que solo se simula en la misión); las notas largas de `limites` salen como "Límite del cálculo"

## En curso
- [ ] Tickets y paso al Taller con `partida.sitio`

## Siguiente
- [ ] Tickets de prueba (3 por partida)
- [ ] Explorador: consulta de coordenadas → /score → /submit
- [ ] Pantalla '¿De dónde salen los números?'

## Bloqueos / necesito de otro frente
- **Arte:** Boot precarga solo lo que haya en `/assets`. Si se necesitan hojas de sprites, crear `assets/manifest.json`
  (formato en `game/src/scenes/expediente/assets.js`); sin manifiesto, cada imagen se carga con clave = ruta sin extensión.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
-
