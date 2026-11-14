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

- [x] Tickets: 3 por partida (`TICKETS_POR_PARTIDA`), se gastan al elegir un sitio nuevo, no se entra sin tickets, volver a probar
  un sitio ya pagado no cuesta; "Nueva partida" los restaura sin duplicar. "Probar" fija `partida.sitio` (objeto del sitio) → Taller.
- [x] Guardado en localStorage (`mision_cero.partida.v1`): se guarda al elegir destino y sitio, y al ocultar/cerrar la pestaña
  (así también se conservan `diseno` y `resultados` que escriben otras escenas). "Continuar" lo restaura en el mismo objeto
  `partida` y va al Taller si ya hay sitio, o al Expediente si no. Verificado: camino dorado Menú → Marte → Samalayuca → ticket
  (3→2) → Taller, y recarga → Continuar.

- [x] Botón "Ficha completa ↗" que abre web/ en otra pestaña con `?sitio=<id>` (y `&ficha=MX0007` para detecciones del detector).
  La URL sale de `VITE_WEB_URL` (archivo `game/.env.local`, no se sube); sin ella el botón aparece deshabilitado ("sin enlace").

## En curso
- [ ] Pantalla "¿De dónde salen los números?" (es/en)

## Siguiente
- [ ] Tickets de prueba (3 por partida)
- [ ] Explorador: consulta de coordenadas → /score → /submit
- [ ] Pantalla '¿De dónde salen los números?'

## Bloqueos / necesito de otro frente
- **Arte:** Boot precarga solo lo que haya en `/assets`. Si se necesitan hojas de sprites, crear `assets/manifest.json`
  (formato en `game/src/scenes/expediente/assets.js`); sin manifiesto, cada imagen se carga con clave = ruta sin extensión.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- **web/ (Alan):** leer `?ficha=<ID>` y `?sitio=<id>` al cargar para abrir la ficha o el sitio directamente (hoy el juego
  enlaza así; si no se implementa, el enlace abre la página en `#mapa`).
- **Despliegue:** definir `VITE_WEB_URL` (URL pública de web/) y `VITE_API_URL` (API del VPS) al construir el juego.
