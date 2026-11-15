# Estado — Integración, pitch y entrega

Responsable: Alan · Agente: Codex · Actualización: 2026-11-15

## Siete diapositivas y web pixel art · 15 noviembre

- Rama `feat/slides-web-pixel`, desde main 34e6b3b. #75 convertido a borrador; el video sigue en pausa.
- PDF de siete páginas en inglés en `docs/media/marsception_slides.pdf`, fuente editable PPTX y generador MJS/Python. Orden solicitado, cifras separadas 9/11 / ~78% / 296, fuentes en notas y arte ilustrativo de Mauricio identificado como asistido por IA. Revisadas las siete páginas renderizadas, sin capturas ficticias ni afirmaciones de misión completada.
- Web: paleta del juego, botones/paneles 9-slice, fuente OTF/WOFF2 de Mauricio del #86, títulos/keywords, datos amplios en detalles, planetas animados con movimiento reducido. Cuerpo de 22 px, textos mínimos de 16 px y zonas táctiles de al menos 44 px; cuadrículas pasan a una columna en móvil.
- Contenido ES/EN: piezas con fuente (LRV, radiador y panel grande), condiciones por nivel, API disponible con catálogo sin API, menú vivo, límites y acceso al PDF. Se conservan quiz, fichas, mapa, fuentes y metodología; la navegación abre los detalles del quiz/método.
- Auditoría de los roles de texto en las tres superficies sólidas: mínimo 5.87:1. `node web/scripts/check-contrast.mjs`. Build y lint sin errores; permanecen dos advertencias previas de hooks en MapView.
- No se verificó visualmente esta web en navegador/teléfono: la sesión previa detectó bloqueo EACCES de loopback y no hay preview local activo. La revisión móvil real sigue pendiente; no se presenta CSS responsive como prueba de dispositivo físico.
- Por indicación del usuario, se omiten por ahora las seis capturas del juego y los checks publicados de /, /game/?lang=en y /api/health. El issue #60 queda abierto; no se cierra sin comprobar esa versión publicada.
- Entrega inglesa enlaza las siete diapositivas como alternativa al video. No se guarda ni se envía el formulario: Edmundo confirma el envío.
- Rama actualizada con main 542a621, sin conflictos; se usa directamente la fuente web recién subida por Mauricio. Atributos Git preservan los bytes de los PDF/PPTX en Windows.

## Entrega, metadatos y guion

- Rama `feat/entrega-metadatos`: título exacto MARSCEPTION · Earth analogs for the Moon & Mars; descripción y Open Graph con imagen absoluta de 1200×630 en `web/public/media/og_1200x630.png`. Favicons SVG, PNG 32 y Apple 180 conectados desde `web/public/`, con base de Vite. Archivos originales copiados sin cambios del PR #67, commit 84582f6; no se mergeó el resto de la rama de arte.
- README y ENTREGA_EN enlazan `docs/METHODOLOGY_EN.md`. Texto de entrega en inglés con enlaces de demo, juego, metodología, datos NASA/ESA, herramientas y declaración inglesa de USO_IA.md; se conserva el crédito pixelfx. Edmundo confirma el envío: no se guarda ni se envía el formulario desde esta tarea.
- Guion recortado de 255 a 172 palabras habladas. Con 30 s reservados para video: estimación de 1:49.4 a 130 palabras/min (10.6 s de margen), o 1:56 a 120. No es un ensayo humano cronometrado; falta esa lectura con el equipo. Se mantienen segmentos sin repartir personas y las cifras ampliadas quedan para preguntas.
- Grabaciones Marte/Luna y clip de 5 s condicionados a la próxima publicación desde main por Mario. Se pidió confirmar que esa publicación ya ocurrió. No se etiqueta una captura de la versión anterior como si fuera la nueva.
- En el remoto consultado, la integración de #61 está en `feat/juego` (adfa1f5), mientras main sigue en cd939c0. Falta incorporar/publicar esa versión antes de grabar las tarjetas y decoración nuevas.
- Verificación: build y lint de web sin errores (dos advertencias previas de hooks en MapView); HTML generado con título/OG correctos, PNG de 1200×630 e iconos existentes. Declaración de IA contrastada byte a byte como texto con la sección inglesa de USO_IA.md; enlaces locales a metodología comprobados.

## Portada web · arte del PR #64

- Rama `feat/web-portada-marsception`, desde main con #64 ya integrado. Copiada la imagen original de `docs/media/web_portada_960x960.png` a `web/src/assets/` e importada en `Project.jsx`.
- Pie y texto alternativo en español/inglés: arte original ilustrativo de MARSCEPTION, no un sitio real ni un relieve medido. `.hero-visual img` usa `image-rendering: pixelated`.
- Cambio independiente del PR #61, que tiene conflictos con cambios recientes de juego. No se tocaron archivos del juego ni se movieron carpetas. Grabación a cargo de Alan.
- Verificación: build de web correcto e imagen incluida en los assets generados; lint sin errores, con las dos advertencias previas de dependencias de hooks en `MapView.jsx`.

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

## Video y créditos — revisión MARSCEPTION
- Entrada (0–6 s) y cierre (24–29.9 s) con docs/media/video_entrada_1280x720.png y video_cierre_1280x720.png. Rótulos centrales actualizados a MARSCEPTION; marca visible de asistencia de IA y crédito de Mauricio con Claude.
- Video explicativo de 29.90 s, H.264 1280×720, 30 fps, sin voz ni música. Se conservan ruta pública y tiempos WebVTT. No es una nueva grabación del camino dorado.
- Crédito exacto de pixelfx añadido a docs/ENTREGA_EN.md.
- Verificación: inspección visual de entrada/centro/cierre, decodificación completa del MP4, duración y dimensiones comprobadas, diff --check limpio. Sin cambios a física, piezas ni carpetas de juego.
- Rama: feat/video-marsception-creditos; pendiente de revisión e integración por PR.

## Ajuste de tiempos del video
- Entrada: 0–5.00 s (150 fotogramas). Contenido central: 5.00–24.90 s. Cierre: 24.90–29.90 s (150 fotogramas). Total 897 fotogramas a 30 fps.
- Sin escalar las imágenes de título. WebVTT resincronizado; texto de los cinco subtítulos conservado.
- Verificados los fotogramas 149/150 y 746/747, el último fotograma 896 y la decodificación completa del MP4. Cada pantalla de título dura exactamente 5 s.
- Rama fix/video-entrada-cierre-5s, sin cambios a gameplay, piezas o física.


## Retro de Alan · resultados, ambiente y demo pública

Esta actualización sustituye los pendientes anteriores de dominio: Mario publicó https://v1.marsception.us/. El despliegue sigue a cargo de Mario.

- Rama `feat/feedback-ambiente-legible`: causa final explícita y consejo contextual en español/inglés. La condición de fin prioriza las recomendaciones de piezas. Un atasco sin evidencia no se atribuye a tracción.
- Resultados: fondo opaco, texto de 16 px en tarjetas navegables con ratón/táctil y flechas; no se cortan recomendaciones por límite de cantidad. En misión, `A` o el enlace abre los límites de la analogía; puntuación y desglose se conservan.
- Ambiente: aves planeadoras en Samalayuca/Pinacate, polvo distante en Marte y roca espacial sin fuego en Luna. Recreaciones declaradas en el panel de datos (`I`); sin colisiones, daño ni cambios de física. Se detienen con pausa y respetan movimiento reducido del sistema.
- No se modificaron carpetas existentes, exportaciones del taller, piezas ni valores de balance.
- README y ENTREGA_EN tienen los enlaces del dominio recibido. Web, juego y video devolvieron HTTP 200; el video tiene Content-Type video/mp4. Comparador corregido a 9/21 según model/VALIDATION.md (no confundir con 9/11 del detector).
- Observación en la demo publicada: `/game/?lang=en` abrió textos de menú en español. Ver `docs/RETRO_DEMO.md`. La rama de juego contiene más cambios pendientes; esta rama no los integra. Coordinar Resultados.js con ese frente antes de mergear.
- Validación: ocho pruebas nuevas, 23 casos de física, 14 de taller, pruebas de Expediente/precarga, límite de fps y enlaces web pasan. Build conjunto web/juego correcto; continúa el aviso conocido de bundles grandes.
- Captura real: el usuario detuvo Computer Use con Escape antes de iniciar la grabación; no se produjo una captura. No se continuó con control de pantalla. Prueba en teléfono real, sonido y recorrido completo ES/EN siguen pendientes.
- Formulario oficial: sesión iniciada y texto preparado anteriormente; guardar requiere que el usuario acepte términos/declaración de originalidad. No se envió el proyecto.

## Reanudación de verificación

- Incorporado `origin/main` 9649ca8 a la rama del PR #61, sin conflictos. No se mergeó el PR a main. Pruebas de juego/taller/Expediente/precarga/fps/enlaces y build conjunto vuelven a pasar.
- La versión pública ahora muestra título, menú y taller en inglés. La navegación observada terminó en `/?lang=en`; coordinar con Mario la ruta definitiva de web/juego. El issue #60 recibe este seguimiento; no se presenta como recorrido completo certificado.
- Grabación transferida a Alan por su indicación. Se observó el contador activo y audio del sistema activado en Recortes antes del traspaso. No se guardó ni se incluye una grabación en el PR.
- Siguen pendientes: camino dorado completo ES/EN en ambos destinos, revisión visual del PR #61 (aún no publicado), teléfono real y grabación.
