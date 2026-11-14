# Estado — Integración, pitch y entrega

Responsable: Alan · Agente: Codex · Actualización: 2026-11-14

## Hecho
- #21 actualizado con feat/juego y mergeado, incluyendo fps target/limit 60 y runner fijo. #16 de Leo mergeado. #14 sigue abierto, sin integrar.
- Se recibieron luego 20bea74 y ea8984f (sacudidas/rocas y guía de arte); incluidos en la rama de seguimiento feat/integracion-entrega.
- Prueba de límite con Phaser real y reloj sintético a 60/120/144/240 Hz: ningún caso supera 60 updates/s.
- Marte conserva 3.71 m/s² (gravedad ecuatorial NASA JPL). 3.73 es la convención media de la Mars Fact Sheet, documentada como alternativa distinta.
- Pruebas locales: 22 casos de física/juego, 14 de taller, 9 de Expediente, regresión de fps y enlaces web pasan. JSON válido y 5 pruebas del modelo pasan.
- Web y juego compilan juntos. Sitios curados ya contienen paso_m y superficies canónicas del esquema; superficie_tramos queda como formato del archivo de origen, que el juego acepta por compatibilidad.
- Web abre ?sitio=<id> y admite ficha= para fichas antiguas. Los sitios de data/sites tienen ficha propia con fuentes, unidades y valores faltantes explícitos.
- Build conjunto configura VITE_WEB_URL, VITE_API_URL y VITE_GAME_URL sin secretos, coordinados con DEMO_BASE.
- METODOLOGIA.md bilingüe, ENTREGA_EN.md, GUION_PITCH.md y USO_IA.md completados. §14 y pie de web declaran IA en código, documentación, arte y etiquetado.
- Video explicativo de 29.90 s, H.264 1280×720, 30 fps, subtítulos en inglés, generado y revisado visualmente. No es captura de una partida. Fuente de arte: rama ligera, sin mergear #14 ni precargar GIF pesado.
- Regresiones de juego/fps y build/enlaces de web probados localmente. GitHub rechazó actualizar workflows por falta de scope workflow; se conservó la configuración de CI existente.

## Ajustes de revisión de entrega
- #24, #23 y #25 mergeados. #14 permanece sin integrar.
- Metodología: 9/11, 71 % de detecciones húmedas explicadas como dolinas/cañadas, FABDEM reduce 15 % y filtro de 47/668; física sustituida por el texto revisado y su traducción.
- USO_IA: MARSCEPTION de Mauricio, hecho con Claude; 29/33 (88 %) procede de casos no aleatorios. No se cita intervalo de confianza.
- Subtítulos WebVTT: comas restauradas; cinco textos coinciden con el SRT original y se conservan los tiempos hasta 29.900 s. El MP4 ya mostraba la puntuación correcta, por lo que no se recodificó.
- Página: alcance del detector acotado a Earth (Mexico + 3 arid regions), también en español.
- Comprobaciones tras los merges: 22 casos de juego, 14 de taller, 9 de Expediente, regresiones de fps/enlaces, 5 pruebas del modelo y validación JSON pasan; build web/juego conjunto comprobado.
- Ajustes guardados en rama docs/ajustes-entrega para revisión.

## Camino dorado y límites de verificación
- Edmundo reporta verificación sin interfaz con data/ real: Samalayuca estándar falla, ancha llega en 59 s; Luna y Marte entregan con batería chica.
- Integración ejecutó las pruebas y builds mencionados; NO certifica aún el recorrido visual completo en navegador, porque la conexión al preview local estuvo bloqueada. Hace falta recorrer carga → destino → ficha → ticket → taller → prueba → feedback → misión → entrega → puntuación en la máquina del pitch.
- El video es explicativo; no sustituye esa verificación ni acredita operación en un rover real.

## Siguiente
- Seguimiento #24, taller #23 y juego #25 integrados con merge commit y CI en verde.
- Prueba visual en escritorio/táctil y nueva partida: comprobar que no duplica recursos.
- Página en inglés y juego publicados: completar con el VPS.
- Subir el MP4 a un enlace público; copiar links a ENTREGA_EN.md y plataforma oficial.
- Confirmar derechos y créditos finales de arte, accesibilidad pública del repo y envío oficial antes de la meta interna.

## Bloqueos / necesito de otro frente
- Completar con el VPS. No se publicó ni se asumió dominio.
- No hay enlace público del video todavía.
- Web lint mantiene dos advertencias previas de efectos en MapView.jsx; bundles grandes del mapa y Phaser.

## Contratos / decisiones
- superficies [{desde,hasta,tipo}] y paso_m en data/; geometría de origen puede conservar superficie_tramos. No mezclar sus nombres al exportar al esquema.
- docs/DECISIONES.md registra fps, convención de gravedad, puntuación (1000 máximo; estrellas 750/900) y despliegue.
