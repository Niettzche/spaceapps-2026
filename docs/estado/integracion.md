# Estado — Integración, pitch y entrega

Responsable: Alan · Agente: Codex · Rama: main (integración completada por PR)
Actualizado: 2026-11-14

## Hecho
- PR #7 integrado con merge commit, tras CI en verde.
- Web bilingüe, inglés inicial, mapa y quiz preservados. Hero real de Rincón de Parangueo con fuente, escala e iluminación sintética declaradas.
- Alcance: Atacama, Arizona y Arabia, 3/10 regiones priorizadas; fuentes GIBS y GVP y herramientas agregadas.
- Expediente recibe solo sitios con perfil válido o estado distinto de candidato_modelo. Catálogo completo conservado por separado.
- Esquema: paso_m positivo, superficies en metros (arena/roca/compacto), radio_m positivo.
- Transición irA con fundido protegido contra doble activación; Matter runner fijo; reiniciarPartida conserva identidad y limpia estado previo.
- §9 actualizado para fisica, feedback y carpetas de taller; puntuación confirmada: 1000 máximo, estrellas en 750 y 900.
- Solicitado a Mario en PR #4 completar paso_m y superficies de Pinacate y Samalayuca desde niveles.json.
- Build conjunto para VPS: web en / y juego en /game/, con bases y VITE_GAME_URL coordinadas; instrucciones en web/DEPLOY.md.
- Validación JSON y 5 pruebas del modelo pasan; compilación web/juego y 13 casos del taller pasan.

- Filtro verificado sobre datos integrados: 3 sitios jugables / 56 sitios totales. CI de main en verde (0f91d64).
- Comprobaciones adicionales: reinicio idempotente, transición protegida e imagen existente.

## Siguiente
- Stack #2 → #4 → #5 → #6 integrado en ese orden, todos reapuntados a main y con merge commits.
- Prueba visual y camino dorado de ambas misiones con los frentes correspondientes.
- Desplegar al VPS cuando estén disponibles host, usuario SSH y directorio/dominio.
- Metodología final, tráiler y entrega.

## Bloqueos / necesito de otro frente
- VPS sin datos de conexión; no se publicó.
- Mario debe completar paso_m y superficies en sitios curados.
- Preview local inaccesible desde navegador de esta sesión.
- Lint: dos advertencias previas de efectos en MapView; bundles grandes del mapa y Phaser.
- Dependencias existentes del juego: npm audit reporta una vulnerabilidad moderada y una alta; no se aplicaron actualizaciones incompatibles durante integración.

## Cambios a contratos / AGENTS.md
- Los campos nuevos del esquema y la puntuación están documentados en docs/DECISIONES.md.
