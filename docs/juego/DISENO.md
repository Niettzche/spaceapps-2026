# Diseño de interfaz · análisis de la retro y plan (15 nov 2026)

> Fuente: retro de Leo («letra más grande, más atractiva, menos texto y más keywords»), su playtest (`docs/taller/PLAYTEST_LEO.md`),
> retro de Alan (`docs/RETRO_DEMO.md`) y revisión de capturas de todas las pantallas a 960×540 en es/en.
> Objetivo: que cada pantalla **se entienda en 3 segundos** y sea **accesible** (teléfono, teclado, contraste), **sin perder
> funcionalidad ni datos**: lo que se quita de la vista principal pasa a un detalle (tecla I, clic o «ver más»), nunca se borra.

## 1. Diagnóstico (lo que no funciona hoy)

| Problema | Dónde se ve | Por qué importa |
|---|---|---|
| **Letra chica**: 10–12 px en fuentes, notas, pies, ayudas y subtítulos | Expediente (fuentes 10 px, tabla 11–12), Menú (subtítulos y pie 12), HUD (nota 12), Resultados («aplica» 11) | En teléfono horizontal el lienzo se escala ×0.72: 10 px = **7 px reales**, ilegible |
| **Párrafos en vez de palabras clave** | Expediente: «Proceso…», «Uso para la exploración…» (repetidos arriba y abajo), «Límite del cálculo…», ayuda de tickets; Menú: una frase bajo cada botón; Destino: dos frases por tarjeta; Números: 3 páginas de texto | Nadie lee párrafos en un juego; los jueces tienen 2 min |
| **Contraste insuficiente** | `#6c7393` (muyTenue) sobre panel: **3.7:1**, sobre fila resaltada **3.1:1** | WCAG AA pide **4.5:1** para texto normal |
| **Sin jerarquía visual**: todo es texto monoespaciado del mismo peso; amarillo, verde y cian compiten | Expediente, Taller, Menú | El ojo no sabe qué mirar primero |
| **Datos como frases en lugar de visuales** | «similitud 28 %», «agarre arena 0.40 · roca 0.60…», «Sube 38 m, baja 21 m · pendiente máx. 38°…» | Un número suelto se lee peor que una barra o un ícono con número |
| **Botones que parecen texto** `[ … ]` | Todas las escenas de menú y Expediente | No se distingue qué se puede tocar; zona táctil poco clara |
| **Información solo por color** | Similitud por dimensión, estado de tickets | Daltonismo / pantallas con poco brillo |

## 2. Principios (reglas para todos los frentes)

1. **Tamaños mínimos** (px del juego, lienzo 960×540): **nada por debajo de 14 px**. Cuerpo 16–18 · etiquetas 14–16 ·
   números clave 22–32 · títulos 32–40.
2. **Una pantalla, una pregunta.** Arriba, en grande, lo que decide el jugador (p. ej. «¿Qué tan parecido es? 46 %»).
   Todo lo demás, secundario o en detalle.
3. **Keywords, no frases.** Máx. **6 palabras** por etiqueta visible. Ej.: «Dunas eólicas → movilidad en arena suelta» en vez de
   «Proceso: Dunas formadas por viento (procesos eólicos)» + «Uso para la exploración: Movilidad de rovers en arena…».
   La frase completa va al detalle (tecla I / clic / «ver más»).
4. **Números → visuales.** Similitud = barra de 0–100 % con el número; agarre = 3 barras (arena/roca/compacto); recorrido =
   íconos con número (↗ 38 m · ∠ 38° · 250 m · arena). Siempre con el número escrito (no solo color).
5. **Color con significado fijo** (y nunca solo color):
   - Amarillo `#ffd166` = acción / lo que puedes tocar.
   - Verde `#06d6a0` = bien / foco de teclado.
   - Rojo `#ff7a93` = riesgo / límite (antes `#ef476f`, 4.0:1 en filas resaltadas).
   - Cian `#80e0dc` = dato medido.
   - Texto secundario `#a3abcc` (antes `#6c7393`): **≥ 6.4:1** en todos los fondos.
6. **Botones de verdad:** marco de arte `ui/ui_boton` (9-slice, Mauricio) o caja con borde; zona táctil ≥ 64×44; estado
   ratón/teclado ya resuelto (un solo resaltado). Atajo numérico visible.
7. **Fuentes y unidades siempre a un paso:** cada número conserva fuente, fecha y unidad (AGENTS.md §12) en el detalle.
   En la vista principal basta un ícono «ⓘ» o «I datos».
8. **Bilingüe sin desbordes:** el inglés suele ser 10–20 % más corto, el español más largo; diseñar con el español.
9. **Accesible:** teclado completo, `prefers-reduced-motion`, contraste AA, nada solo por color, textos ≥ 14 px.

## 3. Plan por pantalla

### Expediente (prioridad 1 · el más denso)
- **Cabecera:** nombre del sitio (28 px) + **medidor grande de similitud** (barra + «46 %», 32 px) + chip de estado
  («CANDIDATO DEL MODELO» / «DOCUMENTADO») + chip «Gemelo: Marte · Jezero».
- **Una línea de keywords** con proceso → uso («Dunas eólicas → movilidad en arena suelta»). Quitar la repetición de abajo.
- **Tabla Variable | Tierra | Destino** (ya en ese orden): etiqueta 16 px, valores 18 px, **barra de similitud** por fila en vez de
  «similitud 28 %» escrito chico; fuentes fuera de la vista (clic en la fila o tecla I → panel de fuentes con unidad y fecha).
- **«Lo que la Tierra no puede probar»** como **chips** rojos: GRAVEDAD 0.38 g · PRESIÓN · RADIACIÓN.
- **Recorrido** (prueba y misión) como 4 íconos con número cada uno: ↗ subida · ∠ pendiente máx. · suelo · crítico.
- **Condiciones** (temperatura, aire, luz; `lineasAmbiente`) como 3 chips por lado, solo si caben; si no, en el detalle.
- **Pie:** «← Regresar», tickets como 3 íconos ●●● grandes, **un botón principal** grande «Probar (1 ticket)». Quitar la frase de
  ayuda larga (va al detalle o a un tooltip al enfocar).

### Menú principal, Nueva partida, Números (prioridad 1)
- Menú: botones con marco, sin la frase de debajo de cada uno (pasa a un tooltip de 1 línea al enfocar/pasar el ratón);
  pie de teclado en 1 línea corta.
- Nueva partida: planeta girando + **nombre (28 px)** + 2 datos grandes: «0.38 g» y «1 sitio análogo» + botón «Elegir».
  Quitar las 2 frases por tarjeta.
- Números: convertir cada página en **tarjetas con keyword + fuente** (TIERRA: NASA POWER · MODIS · Copernicus DEM; LUNA: LOLA ·
  Diviner; MARTE: HRSC+MOLA · MEDA) y el modelo en 3 cifras grandes (9/11 cráteres · 78 % exactitud · 296 candidatos).

### Taller (prioridad 2)
- Presupuesto como **barra** (730/1000) con el número.
- Agarre del robot como 3 barras; autonomía y masa como números grandes con ícono.
- Ayuda de teclado: 1 línea; el resto en «?» (tecla H).
- Mantener el layout de Diego (16–17 px) y el deshacer/rehacer.

### Prueba / Misión · HUD e instrucciones (prioridad 2)
- Instrucciones: título + **3 keywords con ícono** (objetivo · regla clave del lugar · controles); el detalle del ambiente sigue en I.
- Nota amarilla del HUD: solo «Suelo: arena · I datos» (14 px).

### Resultados (prioridad 3)
- Viñeta de resultado (arte de Mauricio, #77) + puntuación grande + **1 consejo** visible; el resto en tarjetas (ya está).
- «aplica: …» a 14 px.

## 4. Quién hace qué

| Pantalla | Responsable | Notas |
|---|---|---|
| Expediente | Juego (agente) | Diego **no** toca `Expediente.js` mientras tanto: sigue con Explorador y Boot |
| Menú / Nueva partida / Números | Juego (agente de efectos de menú) | Junto con planetas girando y selector de idioma |
| Taller | Juego (agente) | Respetar layout de Diego |
| HUD, instrucciones, Resultados | Juego (Edmundo + agente) | Con viñetas de #77 |
| Paleta y tokens (`COLOR` en `expediente/interfaz.js`, `C` en `Taller.js`) | Juego | Cambiar `muyTenue` a `#a3abcc` y `alerta` a `#ff7a93` |
| Revisión con jugadores | Leo, Alan | Prueba de 3 segundos: «¿qué te pide esta pantalla?» |
| Arte de botones/paneles | Mauricio | `ui_boton`, `ui_panel` ya existen; íconos de keywords si hacen falta (subida, pendiente, suelo, temperatura, aire, luz) |

## 5. Cómo verificamos (criterios de aceptación)
- Captura de cada pantalla en es/en a 960×540: **ningún texto < 14 px**, ninguno encimado ni fuera de pantalla.
- Contraste ≥ 4.5:1 para todo texto (script de contraste sobre los colores usados).
- Prueba de 3 segundos con alguien que no conoce el juego: dice qué hace la pantalla.
- Camino dorado (e2e) sigue pasando: los textos de los botones que busca la e2e no cambian, o se actualiza la e2e.
- Ningún dato desaparece: lo que sale de la vista principal está en el detalle con fuente, unidad y fecha.
