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

## Recorrido publicado en inglés · 15 de noviembre

Web observada: `https://marsception.us/`; su botón Jugar abre `https://v1.marsception.us/`. `https://marsception.us/game/` devuelve 404. Juego probado con `?lang=en`, teclado, clics y arrastre en el taller. No sustituye la prueba en español ni en teléfono real.

- Samalayuca con estándar: atasco a 10.9 m, carga 98 %, energía 81 %; el resultado explica falta de progreso y patinaje. «Apply & to workshop» puso ruedas anchas en ambos ejes. Segundo intento: meta 266 m, carga 91 %, energía 45 %.
- Misión Jezero: entrega, 845 puntos, dos estrellas, carga 100 %, energía 34 %. Se abrió «Where the analogy breaks down».
- Al Hutaymah (`g00263`) con anchas: meta 266.1 m, carga 96 %, energía 33 %. Misión lunar: entrega, 825 puntos, dos estrellas, carga 100 %, energía 14 %; recomendó radiador tras llegar al límite de temperatura del motor. Se abrió la explicación de gravedad lunar.
- Descubrir mostró el mapa y catálogo; ANA respondió una pregunta sugerida con etiqueta «game data · no AI». No se probó una pregunta libre de IA.
- Tomas breves: Cananea, Pinacate, Rincón de Parangueo, Jabal Bayda, Tenoumer y Pingualuit; Samalayuca está en el recorrido completo. Se abandonaron deliberadamente esas seis muestras al tener el material; no se reportan como pruebas superadas.
- Recortes mostró 27:25 con audio del sistema activado y micrófono deshabilitado. Archivo, resolución y audio pendientes de verificar después de guardar; no se afirma que el tráiler esté listo.

Problemas observados, uno por pantalla:

1. **Misión lunar:** aparecen dos Tierras juntas en el cielo. Mantener una sola representación del planeta.
2. **Prueba, panel I (Jabal Bayda):** bloque de texto muy denso y cortado verticalmente en el encuadre observado. Separar datos por secciones o permitir desplazamiento sin ocultar fuentes y valores (P).
3. **Resultados → Taller (Pinacate):** aplicar la recomendación de tacos sobre el diseño con anchas + chasis reforzado elevó el costo de 1,000 a 1,080; el taller sí bloqueó la prueba y mostró el exceso. Advertir el costo antes de aplicar o proponer una alternativa asequible.

### Pendientes anteriores (historial)

- Reproducir el camino dorado completo en inglés y español, Marte y Luna, con teclado y ratón.
- Probar botones táctiles, aviso de orientación y sonido en teléfono real.
- Grabación a cargo de Alan por su indicación. Se confirmó el contador activo de Recortes y audio del sistema activado antes del traspaso; no se guardó ni se incorpora una grabación en este PR.
- Recibir y separar cualquier retro adicional de los otros probadores; estas solicitudes proceden de Alan, no de dos reportes independientes.
