# Video de entrega · subtítulos en inglés

Duración: 25.0 s (5 tramos de 5 s). MP4 H.264, 1280×720, sin voz ni música. Es una explicación visual, no una grabación del camino dorado.

| Tiempo | Mensaje |
|---|---|
| 0–5 s | Pantalla de título MARSCEPTION (`docs/media/video_entrada_1280x720.png`); subtítulo: Can Earth help us prepare for the Moon and Mars? |
| 5–10 s | Compare real terrain, then inspect the evidence. |
| 10–15 s | Mexico + Atacama, Arizona and Arabia: 3 of 10 prioritized regions. |
| 15–20 s | Build. Test on Earth. Try a Moon or Mars delivery. |
| 20–25 s | Pantalla de cierre MARSCEPTION (`docs/media/video_cierre_1280x720.png`); subtítulo sobre gravedad, vacío y radiación. |

Relieves locales de `web/public/data/img/`, derivados de Copernicus, LOLA y HRSC+MOLA. La presentación usa arte de la rama ligera de Mauricio, marcado como ilustración. Uso de IA: código, documentación, arte y etiquetado de datos; las mediciones conservan su fuente. Ver [USO_IA.md](USO_IA.md).

**Cada tramo dura 5 segundos exactos** (150 fotogramas a 30 fps): entrada, los tres tramos centrales y cierre. Entrada y cierre usan las imágenes de 1280×720 entregadas por arte, sin escalarlas. Los tramos centrales son diapositivas fijas, así que recortarlos de 6.6–6.7 s a 5 s no quita contenido. El rótulo central dice MARSCEPTION; se conserva la marca visible de asistencia de IA y el crédito del arte. Los cinco intervalos WebVTT están sincronizados con esta distribución. Total: 25.00 s (750 fotogramas), 1280×720 y 30 fps; quedan 5 s libres bajo el límite de 30 s para un tramo de juego grabado en inglés (6 × 5 s = 30 s). Es el video explicativo existente, no una nueva captura de partida.

Crédito de efectos para la entrega: Pixel art effects built with pixelfx (MIT License, © 2026 Patch and Hugo Duprez).

La versión renderizada está en `web/public/media/mision-cero-30s-en.mp4` (copia para la plataforma: `outputs/marsception-30s-en.mp4`), con subtítulos WebVTT y reproductor en la web. También se entrega como archivo de salida del chat. Al completar el VPS, estará en `/media/mision-cero-30s-en.mp4` (ajustar si se usa subruta); copiar el enlace público en [ENTREGA_EN.md](ENTREGA_EN.md). No se precarga un GIF pesado en el juego. #14 permanece sin integrar.
