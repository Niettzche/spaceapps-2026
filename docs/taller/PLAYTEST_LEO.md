# Playtest de Leo · camino dorado (Marte y Luna), ES y EN, ratón y teclado

> 15 nov 2026 · Leo (con Claude Code) · **sin tocar código**: aquí solo quedan los fallos, con captura.
> Código probado: `main` **6d85e3b** (rediseño de menús y Expediente), servido en local con `npm run dev`, en Edge sin interfaz a
> 960 × 540 (SwiftShader, 14–19 fps). Re-corrida del camino dorado sobre `main` **e659c32** (Taller, HUD y Resultados en pixel
> art, 78b0f3e): ver §5.
> Esta versión reemplaza el informe incompleto del 14 nov (corridas en un equipo cargado).

## 1. Corridas

| # | Idioma | Entrada | Cómo | Resultado |
|---|---|---|---|---|
| A | ES | **Ratón** (clic real en cada botón) + flechas para manejar | `game/e2e/camino_dorado.mjs ambos` | **25 / 25 pasos OK**, Marte y Luna, con entrega |
| B | EN | **Solo teclado** (cero clics): números, Tab, Enter, Esc, I, C, flechas | script local de Playwright (fuera del repo) | **35 / 37 pasos OK**, Marte y Luna, con entrega. Los 2 "fallos" eran del script (leía un campo `entrega` que el registro no tiene); las capturas dicen "Mission accomplished" |
| C | ES | Pruebas puntuales: resaltado del Menú con ratón, reversa al inicio, flechas en la misión | script local | Ver §3 |

| Destino · sitio | Prueba 1 (ruedas estándar) | Prueba 2 (ruedas anchas) | Misión | Puntos (B, EN) |
|---|---|---|---|---|
| Marte · Médanos de Samalayuca | Falla: **atascado** a 42–47 m. Consejo: "Cambia a ruedas anchas para arena" | **Pasa** (meta, 266 m, energía 40 %) | **Entrega** a 267 m, energía 6–8 %, carga 99–100 % | 819 / 1000, 2 ★ |
| Luna · maar Al Wahbah (g00281) | Falla: **sin energía** a 246–249 m. Consejos: ruedas anchas + batería grande | **Pasa** (meta, 266 m, energía 38 %) | **Entrega** a 267 m, energía 9–10 %, carga 98–100 % | 821 / 1000, 2 ★ |

En los dos idiomas, "Enter" en Resultados hace el siguiente paso del camino dorado: tras la falla, **«Aplicar y al taller»** pone
las ruedas anchas en los dos ejes (890 créditos, "✓ Diseño válido"); tras pasar, **«Lanzar misión»**.

Recorrido completo **solo con teclado** (B): Boot (Enter) → Menú → `4` Números (◀ ▶, Esc) → `3` Explorador (el foco cae en
la latitud; Tab hasta «← Menú» y Enter) → `1` Nueva partida → Cómo jugar (Enter ×N) → destino (Tab + Enter) → Expediente
(Tab al sitio, Enter; `I` datos, `C` condiciones, Esc) → «Gastar 1 ticket y probar» (Enter) → Taller (`C`) → Prueba (Enter
cierra instrucciones, Esc pausa) → Resultados (Enter) → Taller (`C`) → Prueba → Resultados (Enter) → Misión → Resultados (`3` Menú).

## 2. Fallos del informe anterior (14 nov)

| # | Antes | Ahora (6d85e3b) |
|---|---|---|
| F1 | Pantalla en negro en el Taller de la Luna; "Probar el robot" no respondía | **No se repite.** El Taller de la Luna responde a clic (A) y a teclado (B) |
| F2 | "Gastar 1 ticket" no respondía al clic en la Luna | **No se repite** (A y B) |
| F3 | Errores de consola de la API en el Expediente | **Ya no hay errores en el Expediente.** Solo el Explorador pide `http://localhost:8000/health` (la API no corre en local) y muestra "Modo sin API"; es lo esperado y no rompe nada |
| F4 | El Menú tardaba más de 20 s | **No se repite** (era la máquina cargada) |
| F5 | Un 404 en el Boot | **Ya no aparece** (ninguna respuesta HTTP ≥ 400 en A ni en B) |

## 3. Lo que pedía revisar la lista

| Qué | Resultado | Captura |
|---|---|---|
| **Final de la misión** | ✓ El robot frena dentro de la zona de entrega (268–304 m), entrega y sale "Misión cumplida / Mission accomplished" en los dos destinos | `capturas/playtest/es_marte_resultados_mision.png`, `en_luna_resultados_mision_teclado.png` |
| **Energía al llegar (~10 %)** | ✓ Marte 6–8 %, Luna 9–10 % con el diseño del camino dorado (890 créditos) | idem |
| **Reversa al inicio** (choca con la pared y termina en atasco) | ✓ El robot retrocede de 6.0 m a 1.5 m, se queda contra la pared y la prueba termina a los 15.7 s de juego: "Quedó atascado: no avanzó en 15 s" | `capturas/playtest/es_reversa_atascado.png` |
| **Menú con un solo resaltado** | ✓ Con el ratón encima de «Explorador libre», solo ese botón tiene marco (blanco) y el foco de teclado se mueve ahí. «Nueva partida» conserva el verde con ⏎ porque es la opción por defecto, no un segundo foco. «Continuar» ya no queda en verde | `capturas/playtest/es_menu_raton_un_resaltado.png` |
| **Ratón y teclado** | ✓ Ratón en todo el camino (A); teclado en todo el juego (B), incluido el Explorador | — |
| **Íconos de las ruedas** (pendiente del taller) | ✓ Se distinguen en el catálogo y en el robot: la estándar es plateada; la ancha, goma negra con cubo amarillo | `capturas/playtest/es_marte_taller_estandar.png`, `es_marte_taller_ancha.png` |

## 4. Fallos y avisos nuevos

| # | Pantalla | Qué pasa | Captura | Frente | ¿Bloquea la demo? |
|---|---|---|---|---|---|
| N1 | Resultados de la misión | La línea "Primera marca en este destino · faltan 86 para ★★★" (12 px) pasa **por debajo de las estrellas**. *En e659c32 el rediseño de Resultados la subió a 14 px y la puso bajo las estrellas (`Resultados.js:105`, auditoría §4): confirmar en §5* | `capturas/playtest/es_marte_resultados_mision.png` | Juego (Edmundo) | No |
| N2 | Resultados tras la reversa | El diagnóstico culpa a las ruedas ("6 eventos de patinaje… Aplicar: rueda ancha") cuando el jugador manejó en reversa contra la pared a propósito. Sugerencia: si el acelerador fue negativo la mayor parte del tiempo, decir "manejaste en reversa" y no recomendar pieza | `capturas/playtest/es_reversa_atascado.png` | Juego (`feedback/diagnostico.js`) | No |
| N3 | Paso Taller → Prueba | ~170 avisos de WebGL `texImage2D: width or height out of range` al crear la escena de la Prueba (no en el Taller: medido por fases). Ninguna textura pasa de 4096 px (máximo del equipo 8192), así que probablemente es una textura de tamaño 0. Solo aviso; el juego sigue | — | Juego (Edmundo) | No |
| N4 | Misión (e2e) | `camino_dorado.mjs` reporta "teclado forzado" en la misión, pero **la flecha real sí mueve el robot** desde el primer momento (6.0 → 8.4 m en 1.1 s de juego, sin pulsar Enter). Es un falso aviso del script: mide 1.5 s de reloj a ~16 fps | — | Quien mantenga `game/e2e/` | No |
| N5 | Prueba de Marte | La prueba 1 ahora se atasca a **42–47 m** (en el informe del 14 nov era a 153 m). Sigue fallando y recomienda ruedas anchas, que es lo que pide el camino dorado; solo cambia dónde | — | Juego (balance) | No |

## 5. Re-corrida sobre `main` e659c32 (Taller, HUD y Resultados en pixel art)

Mientras probaba entró a `main` el rediseño en pixel art del Taller, la Prueba/Misión y Resultados (78b0f3e) y más arte
(#84–#89). Repetí la corrida A (ES, ratón) sobre **e659c32**: **25 / 25 pasos OK**, con los mismos números (Marte: atascado a 42 m →
pasa con anchas → entrega con 6 %, 814 / 1000; Luna: sin energía a 246 m → pasa → entrega con 9 %). Pruebas sobre e659c32:
`diseno.test.mjs` 14/14, `piezas.test.mjs` 13/13, `fisica.test.mjs` 35/35, `validate_data.py` ✓, `npm run build` ✓.

| Qué | En e659c32 |
|---|---|
| N1 (línea de récord bajo las estrellas) | ✓ **Arreglado**: va debajo de las estrellas, en 2 líneas |
| N3 (avisos `texImage2D`) | ✓ **Ya no aparecen** (0 avisos) |
| Ruedas en el Taller nuevo | ✓ Se siguen distinguiendo en el catálogo y en el robot (`capturas/playtest/es_e659c32_taller_ancha.png`) |
| N4 (e2e "teclado forzado") | Marte usó la flecha real y la Luna el respaldo: confirma que es intermitente y del script |

| # | Nuevo en e659c32 | Captura | Frente | ¿Bloquea la demo? |
|---|---|---|---|---|
| N6 | **En la fuente pixel, el 6 se lee como G.** Resultados de la misión: "2G7.2 m" (267.2), "energía G %" (6 %), "faltan 8G para ★★★" (86). En la pantalla de puntuación los números parecen erróneos | `capturas/playtest/es_e659c32_resultados_mision_6_como_G.png` | Arte (Mauricio, glifo "6" de la fuente BMFont) / Juego | **Sí para el pitch**: es lo que ven los jueces al final. Arreglar el glifo o usar la monoespaciada para las cifras |
| N7 | Aviso en el Boot: `[arte] nombre repetido en /assets: chasis_ligero.png (se usa el primero)`. Hay `entidades/`, `iconos/` y la nueva `piezas/chasis_ligero.png`; `fisica/aspecto.js:64` indexa solo por nombre de archivo. Hoy el robot se ve bien, pero depende del orden de las carpetas | — | Arte (Mauricio) + Juego (`aspecto.js`) | No |

## 6. Explorador sin API: ¿los números coinciden con `data/sites`?

Método: para **cada uno de los 58 sitios** de `data/sites/` (todos tienen coordenadas) se escribieron su latitud y longitud exactas
en el Explorador (sin API: "Modo sin API · 58 sitios") y se comparó la ficha con el JSON, sin usar el código del juego: tolerancia
de media unidad del último decimal que muestra la pantalla. En español y en inglés.

**Resultado: 58 / 58 fichas coinciden** en nombre, distancia (0.0 km), coordenadas, similitud total, confianza y cada fila
(valor Tierra con unidad, valor del gemelo de `data/targets/`, similitud por dimensión). **Ningún número distinto.**
Revisados también a mano, fila por fila: Pinacate (53 %, confianza 100 %), g00281 (50 %) y g00174 (56 %).

| Prueba extra | Resultado |
|---|---|
| Punto lejano (0, 0 y 40 N 100 W) | Lista de los 3 más cercanos con la distancia correcta (haversine recalculada: 5123 / 5146 / 5418 km y 1109 / 1111 / 1116 km) |
| Punto a 10 km de Pinacate (radio del catálogo: 25 km) | Abre la ficha de Pinacate "a 10.0 km" |
| Aviso ILUSTRATIVO | No sale en ninguna ficha, y ningún JSON es `ilustrativo` ni `demo`: correcto |
| Clima de NASA POWER en vivo | Solo se pide fuera del catálogo. Similitudes recalculadas a mano: coinciden. Si POWER no responde: "Live climate not available right now…", sin romper nada |
| «Proponer sitio» | Deshabilitado sin API, con el motivo escrito |

| # | Problema (etiqueta, no número) | Captura | Frente |
|---|---|---|---|
| E1 | **3 minas detectadas solo por la etiqueta de IA** (g00016, mx0088, mx0457) se ven como cráteres: "CANDIDATO DEL MODELO", "Forma del cráter" (g00016 además "NOVEDOSO"). Su `nota` dice "Categoría: tajo minero (etiqueta de IA mina_o_cantera, confianza 0.80–0.85)", pero `proceso` dice "Depresión cerrada tipo cráter…", y el juego decide "mina" solo con `proceso` (`expediente/logica.js:26-28`, `esMina`). Arreglo: que `model/scan.py` escriba el `proceso` de mina también para las de etiqueta de IA (hoy solo para las de OpenStreetMap) | `capturas/playtest/es_explorador_g00016_mina_como_crater.png` | Modelo (Mario) |
| E2 | Fuera del catálogo, la etiqueta "Resultado precalculado del catálogo (sin consulta en vivo)" queda encima de una columna con **clima en vivo** de NASA POWER (`Explorador.js:251-258`). Arreglo: en ese caso decir "Catálogo precalculado + clima en vivo (NASA POWER)" | `capturas/playtest/es_explorador_punto_lejano_clima.png` | Expediente (Diego) |
| E3 | (menor) En la fila «Forma», la columna Tierra muestra la profundidad/diámetro (p. ej. 0.139) sin decir qué es, junto al 97 % de forma; se puede leer como si 0.139 fuera la forma. Arreglo: "d/D 0.139" | `capturas/playtest/es_explorador_ficha_pinacate.png` | Expediente (Diego) |

## Límites

- Edge sin interfaz con SwiftShader a 14–19 fps: los tiempos de pared no dicen nada del rendimiento en un equipo normal.
- No probé en un teléfono real (las zonas táctiles están en la auditoría, `AUDITORIA_DATOS.md` §4).
- Las combinaciones ES + teclado y EN + ratón no se corrieron completas: el teclado se probó en inglés y el ratón en español.
  Los botones y atajos son los mismos en los dos idiomas.
- Los scripts locales (teclado, pruebas puntuales) no están en el repo: usan el gancho `window.__mc` de `npm run dev`.
