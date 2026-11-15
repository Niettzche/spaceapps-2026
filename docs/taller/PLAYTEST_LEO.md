# Playtest de Leo · `main` 0a5b71f (15 nov, 10:00–11:00) · caminos dorados, 7 niveles destacados, Descubrir, ANA, Música

> Leo (con Claude Code) · **sin tocar código**. `main` **0a5b71f** (#106 mando de celular, #107, #108, #109), en local con
> `npm run dev`, Edge sin interfaz a 960 × 540 (SwiftShader), `?lang=es` y `?lang=en`, **sin API** (ANA responde con reglas).
> Dos formas de jugar:
> - **Recorrido real** (`game/e2e/camino_dorado.mjs`, con clics y teclado reales, y la versión solo teclado en inglés).
> - **Simulación por pasos** con la escena real del juego (60 Hz sin tiempo real, acelerador a fondo; en la misión frena al entrar
>   a la zona de entrega). La física no depende del idioma, así que la matriz de niveles se corrió en español. La simulación por pasos
>   es determinista: «3/3» quiere decir «3 corridas iguales», no 3 intentos distintos de un jugador.
> La computadora estaba cargada (otras sesiones y servidores corriendo), y el recorrido real bajó a 3–16 fps.

## A. Lo que bloquea la demo (arreglar antes de grabar)

| # | Qué | Dónde · cómo verlo | es/en | Captura | Frente |
|---|---|---|---|---|---|
| A1 | **Dos Tierras en el cielo de la misión lunar.** El fondo `fondo_luna_1.png` ya trae una Tierra pequeña, y el evento nuevo dibuja otra grande justo al lado (`evento_tierra` × 4 con disco y halo, `eventos_fondo.js` l. 123–136, commit 744fd38). Se ve en cualquier toma de la Luna, tráiler incluido | Misión → polo sur lunar, desde el primer segundo | ambos | [dos Tierras](playtest/main_dos_tierras_es.png) | juego (o arte: quitar la Tierra del fondo) |
| A2 | **Con el relay del mando corriendo, la ventana del QR tapa el juego al cargar y el teclado no avanza.** `puente.js` llama `abrir()` al montarse: la tarjeta «Usa tu celular como control» cubre el lienzo, Enter no pasa la pantalla de inicio y la prueba del camino dorado falla en Boot. Hay que hacer clic en «Listo · jugar». Solo está en español | Abrir el juego en local con `control-celular` corriendo (puerto 8787) y sin teléfono conectado | ambos (texto solo es) | [QR al inicio](playtest/main_qr_tapa_inicio.png) | control de celular (#106, Leo). Propuesta: no abrirla sola al cargar (solo con la pastilla), cerrarla con Enter o Esc y traducirla con `?lang=en`. En la demo pública (https) no carga |

No encontré nada más que rompa los caminos dorados: con el relay apagado (o con la ventana cerrada), los dos funcionan de punta a punta.

## B. Cosmético y riesgos (después)

| # | Qué | Dónde | es/en | Captura | Frente |
|---|---|---|---|---|---|
| B1 | La pastilla del mando («Conectar celular» / «Control · 1 conectado») tapa el botón **Música** del menú, el botón de idioma, el título de Descubrir y la velocidad del HUD. Siempre sale en español | Arriba a la derecha, en todas las escenas, si el relay corre | ambos | [menú](playtest/main_pastilla_sobre_musica.png) · [Descubrir en EN](playtest/main_pastilla_en_descubrir.png) · [HUD](playtest/main_pastilla_hud.png) | control de celular |
| B2 | **Riesgo del camino dorado lunar:** la misión con ruedas anchas y batería chica entrega con solo **8 % de energía** (simulación, a fondo y frenando en la zona). Con ruedas estándar y batería chica se queda sin energía a 246 m. Al pasar g00263, Resultados recomienda «Prueba ruedas con tacos para roca», no la batería | Al Hutaymah → polo sur | ambos | — | juego (feedback). Para el pitch: si se presenta en vivo, no frenar de más en la misión lunar |
| B3 | ANA, «¿Por qué se parece a la Luna?» en Cananea: lo que «más se parece» es la vegetación (NDVI 0.0096 contra 0, 94 %). Es cierto con los datos, pero un jurado lo puede leer como un argumento débil. Además, la respuesta se corta en «La analogía…» y repite «análogo operativo, no geológico» | Expediente de la Luna → A · Tutora | ambos | [ANA](playtest/main_ana_expediente_es.png) | modelo (`tutor/conocimiento.js`): saltar variables donde el destino vale 0, o empezar por la forma (d/D) |
| B4 | Títulos cortados con «…» en el HUD («Misión · Región candidata de Artemis, po…», «Gravedad 1.62 m/s² · entrega con carg…», «Prueba terrestre · Maar Al Hutaymah (H…») y en la cabecera del Expediente («Luna · Región candidata d…») | HUD y Expediente | ambos | [HUD](playtest/main_pastilla_hud.png) | juego / expediente |
| B5 | La Tierra se dibuja alta en el cielo, pero desde el polo sur lunar se ve pegada al horizonte (el comentario del código también dice «baja sobre el horizonte») | Misión lunar | ambos | [dos Tierras](playtest/main_dos_tierras_es.png) | juego |
| B6 | Descubrir (Luna) dice «0 novedosos» y el filtro N deja la lista vacía | Expediente → Descubrir | ambos | [Descubrir](playtest/main_pastilla_en_descubrir.png) | expediente / modelo: explicar que «novedoso» necesita verificación, o esconder el filtro |
| B7 | Sin API, la consola marca `ERR_CONNECTION_REFUSED` al cargar. El juego sigue bien, pero la prueba e2e cuenta «Boot» como falla por ese error | Boot | ambos | — | expediente (`api.js`) |
| B8 | Tablas desactualizadas (son buenas noticias): g00263 con rueda ancha pasa **5 de 5** (`PRESUPUESTO.md` §4 decía 1 de 3); Rincón con malla y batería chica ya **no** llega (se queda sin energía a 536 m; `NIVELES_DESTACADOS.md` decía «meta con 0 %»); Tenoumer con ancha llega 3/3, con la carga al 77 % | docs | — | — | juego (docs) |

## C. Los 7 niveles destacados (simulación por pasos, física 2)

«E» = energía al final; «C» = carga. Diseño base (730 cr): chasis ligero, motor eficiente, batería chica, soporte básico y ruedas
estándar; en cada fila se cambia solo lo indicado.

| Nivel → destino | Pide (NIVELES_DESTACADOS.md) | Falla | Pasa | ¿Pide lo que dice? | ¿Se siente distinto? |
|---|---|---|---|---|---|
| 1. Jabal Bayda (g00266) → Marte | ancha o malla | estándar atascado a 30 m; tacos atascado a 48 m | ancha meta 61 s E 37 %; malla meta 58 s E 44 % | ✓ | Sí: fondo de toba, viento con ceniza, parches de lapilli |
| 2. Tenoumer → Marte | malla (+ correas) | estándar atascado a 12 m | malla C 88 % E 37 %; malla + correas C 92 %; ancha C 77 % E 23 % | ✓ (la ancha también llega, con la carga más golpeada) | Sí: bloques de eyecta, remolinos |
| 3. Cananea (mx0023) → Luna | malla | estándar a 27 m; tacos a 26 m; ancha atascada a 83 m en 3 de 4 | malla meta 56 s E 46 % (3/3); ancha 1 de 4 | ✓ | Sí: tajo escalonado, piedras que caen ([captura](playtest/main_nivel_mx0023.png)) |
| 4. Pinacate → Luna | chasis reforzado o titanio | ligero + estándar: chasis destruido a 185 m; ligero + ancha: destruido a 168 m | reforzado meta E 28 %; titanio meta E 31 % | ✓ | Sí: bloques de lava aa, daño por golpe |
| 5. Pingualuit → Marte | malla (la ancha casi siempre) | estándar atascado a 23 m | malla meta 54 s E 47 %; ancha meta E 32 % | ✓ | Sí: nieve, cielo ártico, el viento más fuerte |
| 6. Samalayuca → Marte (dorado) | ancha | estándar atascado a 13 m | ancha meta 52 s E 46 % (4/4); malla E 50 % | ✓ | Sí: dunas, arena que vuela (solo visual, como dice el documento) |
| 7. Rincón de Parangueo (mx0261) → Luna | batería mediana o grande | estándar sin energía a 529 m; malla sin energía a 536 m | estándar + mediana meta 106 s E 33 %; ancha + mediana E 24 % | ✓ (la rueda no decide) | Sí: costra de sal blanca, recorrido de 546 m ([captura](playtest/main_nivel_mx0261.png)) |

Tres niveles piden la misma familia de pieza (flotación: g00266, Pingualuit y Samalayuca). Se distinguen por el suelo, el viento y los
eventos, como dice el documento; no lo cuento como fallo.

## D. Caminos dorados

| Camino | Prueba 1 (estándar) | Prueba 2 (ancha) | Misión | Cómo |
|---|---|---|---|---|
| Samalayuca → Jezero | falla, atascado a 12.7 m, con el consejo «Cambia a ruedas anchas para arena» ✓ | pasa: 266 m, E 46 %, carga 90 % ✓ | **entrega**: E 35 %, carga 98 % ✓ | recorrido real (es), clics y teclado |
| Al Hutaymah (g00263) → polo sur | falla, atascado a 12.6 m ✓ | pasa: 266 m, E 37 %, carga 96 % ✓ | en la simulación entrega con **E 8 %** (ver B2). El recorrido real no terminó la misión por tiempo: iba a 3 fps y el robot estaba en 111 m | recorrido real (es) + simulación |
| g00263 con ancha, 5 veces | — | 5 de 5 a la meta, E 40 % | — | simulación |

Misiones por diseño (simulación):

| Misión | Estándar | Ancha | Malla |
|---|---|---|---|
| Jezero (batería chica) | entrega, E 15 % | entrega, E 34 % | entrega, E 41 % |
| Polo sur (batería chica) | sin energía a 246 m | entrega, E 8 % | entrega, E 29 % |
| Polo sur (batería mediana) | entrega, E 28 % | entrega, E 41 % | entrega, E 56 % |

En inglés: recorrido solo con teclado de Marte, en §F.

## E. Descubrir, «¿Por qué aquí?», ANA, Música y la Tierra

- **Descubrir** (Luna): 31 sitios áridos, 10 con nivel, 4 países; mapa con «con nivel» y «solo catálogo»; filtros J, N y T. En inglés
  está todo traducido ([captura](playtest/main_pastilla_en_descubrir.png)). Ver B6.
- **«¿Por qué aquí?»**: ficha con cómo se encontró el sitio, qué es, d/D y gemelo lunar, modelo Luna/Marte, borde, filtro árido y
  novedad. Correcta en los dos idiomas ([EN](playtest/main_porque_en.png)).
- **ANA sin API**, 3 preguntas en el menú y 3 en el Expediente, en los dos idiomas: el campo libre queda deshabilitado y lo dice, y cada
  respuesta trae «datos del juego · sin IA». Las respuestas coinciden con la metodología (9 de 11, ~78 %, 0 % en los 3 controles
  negativos; gravedad 1.62 contra 9.81, «pesará 17 %»). No inventa datos. Ver B3.
- **Música** (leí el estado del módulo; en modo sin interfaz no hay sonido real):

  | Escena | Pista |
  |---|---|
  | Menú | `menu` |
  | Expediente | `menu` |
  | Prueba en la Tierra | `tierra` |
  | Misión lunar | `luna` |
  | Resultados después de la misión lunar | **`luna`** (se conserva) |
  | De vuelta en el Taller | `menu` |
  | Misión a Marte | `marte` |

  El apartado propio funciona: + y − cambian el volumen de 10 en 10 (60 → 70 %), «Quitar la música» funciona y todo se guarda en
  el navegador. En inglés está todo traducido ([captura](playtest/main_musica_en.png)).
- **Tierra en la misión lunar:** se ve, pero dos veces (A1) y demasiado alta (B5).

## F. Inglés, solo teclado (Marte)

Recorrido completo **con teclas reales** en `?lang=en` (Enter, números, flechas, Tab, C); solo el manejo se hizo con la simulación
por pasos para ganar tiempo. Menú → `3` Explorador → Esc → `1` Nueva partida → «1 · Choose Mars» → Expediente → «Spend 1 ticket and
test» → Taller → `C` → prueba con ruedas estándar: **falla** (atascado a 31 m) → Resultados «Test failed» con «Switch to wide sand
wheels» → Enter = «Apply & to workshop» (pone ruedas anchas en los dos ejes) → `C` → **pasa** (266 m, E 33 %) → Enter = misión →
**«Mission accomplished»**, 846/1000, ★★ ([falla](playtest/main_en_resultados_falla.png) · [misión](playtest/main_en_mision_cumplida.png)).
Todo en inglés, sin restos de español en Expediente, Taller, prueba ni Resultados. Ojo: con las flechas no llegué a Samalayuca en la
lista (el foco saltó a «Menu»), así que esta corrida fue con el primer sitio, **Jabal Bayda**; Samalayuca en español sí se hizo
completo (§D).

El guion viejo de solo teclado (`teclado_audit`) marcó fallos en el menú, pero eran del guion: el menú cambió (pantalla de inicio,
zoom a la nave). La comprobación a mano dio `3` → Explorador ✓, Esc → menú ✓, `1` → destino ✓, Enter → Expediente ✓.

## Lo que no pude probar

- El sonido real (volumen frente a los efectos, que el bucle no se trabe): en modo sin interfaz solo se lee el estado del módulo.
- ANA con API (preguntas libres) y el mando con un teléfono real.
- La misión lunar en tiempo real hasta la entrega (la computadora iba a 3 fps); la cubre la simulación por pasos.
- La sensación de manejo en una GPU real: aquí 3–22 fps.

---

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
