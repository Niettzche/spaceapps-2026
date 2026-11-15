# Retro de la demo · 14 noviembre 2026

## Resultados · explicar por qué terminó el intento

Reportado por Alan: indicar batería agotada, patinaje/fuerza insuficiente u otra condición y sugerir cómo avanzar. Implementado en la rama de feedback: diagnóstico desde el motivo final y eventos; sin atribuir tracción cuando no hay evidencia. Pendiente de revisión visual y publicación.

## Resultados · recomendaciones difíciles de leer

Reportado por Alan: añadir un cuadro de fondo al texto final. Implementado: panel oscuro opaco y tarjetas con siguiente/anterior, texto de 16 px, contraste y espacio reservado para acciones. Ratón/táctil y flechas navegan; A abre los límites de la analogía en misión. Pendiente de revisión visual en escritorio y teléfono.

## Prueba y misión · actividad ambiental

Solicitud de Alan: detalles de fondo acordes al escenario. Implementado: siluetas de aves en dos sitios áridos terrestres, polvo distante marciano y roca espacial lunar sin estela atmosférica. Son decoración recreada, nunca mediciones ni obstáculos. Pendiente de revisión visual.

## Menú publicado · inglés no visible con `?lang=en`

Seguimiento: [issue #60](https://github.com/Niettzche/spaceapps-2026/issues/60).

Observado en Chrome en https://v1.marsception.us/game/?lang=en: la carga y el menú mostraron «Nueva partida», «Continuar» y textos en español. No se completó una partida en esa sesión. El código local contiene selección de idioma por URL; primero volver a publicar main y comprobar sin caché. No se atribuye la causa a la lógica local sin reproducirla allí. Bloquea grabar la demostración inglesa pedida.

Seguimiento al retomar: una pestaña nueva mostró el título, «New game» y el taller en inglés. Al recargar, la dirección visible quedó en `https://v1.marsception.us/?lang=en`, mostrando el juego. Falta confirmar con despliegue la separación web en `/` y juego en `/game/`; no se diagnosticó la redirección ni se completó el recorrido. El informe original se conserva como antecedente.

## Pendiente de verificación

- Reproducir el camino dorado completo en inglés y español, Marte y Luna, con teclado y ratón.
- Probar botones táctiles, aviso de orientación y sonido en teléfono real.
- Grabación a cargo de Alan por su indicación. Se confirmó el contador activo de Recortes y audio del sistema activado antes del traspaso; no se guardó ni se incorpora una grabación en este PR.
- Recibir y separar cualquier retro adicional de los otros probadores; estas solicitudes proceden de Alan, no de dos reportes independientes.
