# Estado — Modelo, datos y API del modelo

> Lo actualiza SOLO este frente. Rama: `feat/modelo`.

**Responsable:** Mario  ·  **Agente:** Claude Code / Codex
**Última actualización:** 15 nov 2026, mañana (landing con divulgación científica en `informe/divulgacion/`; ANA, la tutora de análogos, ya en `main`; demo en https://v1.marsception.us/)

## Hecho (`POST /nivel`, 15 nov, 10:15; pedido opcional de integración)
- **Qué es:** `POST /nivel {lat, lon}` devuelve el `nivel` de cualquier coordenada con los mismos campos que los de `data/sites`
  (`perfil_elevacion_m`, `paso_m`, `superficies`, `superficies_nota`, `fuente`…), para que el frente expediente vuelva jugables
  los lugares de «Descubrir» que no tienen nivel (47 de 63). Opcionales: `diam_km` (alarga el corte como en `analisis/26`:
  3 km, 4 km si pasa de 1.2 km, más si hace falta) y `destino` (solo añade la nota del regolito en la Luna).
  Respuesta: `{punto, nivel, resumen, avisos, metodo}`.
- **Cómo:** `model/nivel_vivo.py`, mismo método y misma regla de superficie v2 que `analisis/26_niveles_15.py`. No agrega
  dependencias al servidor (el centro se proyecta con Earth Engine en vez de pyproj). `python -m model.nivel_vivo` recalcula los
  niveles publicados de Meteor Crater y Al Hutaymah y salen **idénticos** (101 y 134 puntos, 5 tramos cada uno).
- **Probado en local con Earth Engine:** un sitio de Atacama sin nivel (g00003) responde en 3.5 s con 134 puntos; la misma
  consulta repetida sale de caché; mar y lago grande dan 422 con explicación; latitud fuera de rango, 422; si Earth Engine no
  responde, 502 sin detalles internos. 13 pruebas nuevas sin red (6 de la regla en `model/tests`, 7 del endpoint en `api/tests`).
- **Límites:** siempre usa la zona UTM local, así que en México no sale idéntico a los niveles hechos con EPSG:6372 (en
  Samalayuca aparece un tramo de roca que el nivel publicado no tiene); el corte va centrado en el punto que se manda, no en
  un cráter medido; sin límite de consultas por persona (igual que `/score`); cada consulta nueva son 4 llamadas a Earth Engine.
- **Falta, de otros frentes:** que el frente expediente lo llame desde «Descubrir»; que integración lo agregue a la lista de
  endpoints de `AGENTS.md` §8; y volver a publicar la API (no hay que instalar nada nuevo).

## Hecho (landing con divulgación científica, 15 nov)
- **`informe/divulgacion/`: landing del juego con la ciencia explicada** (Vite, bilingüe con `?lang=en`, tema oscuro y claro).
  Portada inspirada en la pantalla de inicio del juego (pixel art animado, con el rover del juego), cómo se juega con capturas
  reales, los dos destinos, la ciencia como **infografía de museo en pixel art** (medimos, comparamos, revisamos el borde, y lo que
  la Tierra no puede imitar; imprimible como cartel), «Lo que encontramos y lo que aportamos» (cifras en dígitos de píxel sobre el
  cielo de la portada), detalles técnicos plegables, Marsception for Business y fuentes. Scroll suave con Lenis.
- Cifras: `informe/divulgacion/preparar_datos.py` genera `public/datos/` y comprueba cada cifra del texto contra
  `model/VALIDATION.md`, `model/NIVEL2.md`, `docs/METODOLOGIA.md` y `data/sites/pinacate.json` (hoy coinciden todas). Incluye la
  prueba fuera de muestra del borde (7 de 8) y el orden por borde contra forma (11 cráteres y 1 mina contra 3 y 14).
- Probada en Firefox sin ventana (escritorio de 1280 a 1920, teléfono de 390 px, inglés): sin errores ni desbordamiento horizontal.
- «Contactar a ventas» escribe a hola@marsception.us. Pendiente: publicarla en marsception.us cuando Mario lo decida y verificar dos
  datos que no vienen del repo, ambos solo en los detalles técnicos: Pike (1977) y la presión de Marte (menos del 1 %).

## Hecho (ANA, la tutora de análogos, 15 nov, mañana; rama `feat/modelo-tutor`)
- **Qué es:** una tutora en el juego (Expediente: botón «A · Tutora» o tecla A; menú principal: botón «Tutora ANA» arriba a la
  izquierda o tecla A) que explica qué es un análogo, por qué el
  sitio se parece a su destino, dónde se rompe la analogía y de dónde sale cada dato. Es un extra (AGENTS.md §15): el juego
  funciona igual sin ella.
- **Preguntas sugeridas = reglas, sin IA ni red** (`game/src/tutor/conocimiento.js`): leen solo campos de data/sites y
  data/targets con las funciones del Expediente (filasComparacion, limitesDe). Las cifras fijas son las de numeros.js
  (METODOLOGIA.md + VALIDATION.md). Probado con los 58 sitios en es/en (`node --test src/tutor/`).
- **Preguntas libres = `POST /tutor`** (`api/tutor.py`). El servidor arma el contexto con METODOLOGIA.md, VALIDATION.md,
  un catálogo de una línea por sitio y el JSON del sitio y del destino; el navegador solo manda la pregunta. Usa OpenAI
  Chat Completions con `requests`, sin dependencias nuevas. Modelo por defecto `gpt-5.4-mini` (`OPENAI_MODEL`; razonamiento `low` con `OPENAI_REASONING`, `none` es más rápido). No existe
  `gpt-5.1-mini` y `gpt-5-mini` está marcado como obsoleto (páginas de modelos de OpenAI, 15 nov). Sin llave → 503 y el
  panel lo dice. Unos 14 k tokens de entrada por pregunta, con el bloque fijo al inicio para la caché del proveedor.
- **Defensa contra prompt injection, por capas.** La tutora no tiene herramientas ni secretos en su contexto:
  - historial firmado con HMAC (un turno «tutor» inventado se descarta);
  - entrada saneada (invisibles, bidi, etiquetas Unicode) y pregunta entre `<pregunta_jugador>`;
  - filtro de patrones es/en antes del modelo;
  - moderación del proveedor (falla abierta);
  - canario + filtro de salida;
  - límites de 15 preguntas por IP cada 5 min y 1500 por día, pregunta ≤ 400 caracteres y texto plano (textContent).
  12 pruebas en `api/tests/test_tutor.py`.
- **Landing** (`informe/divulgacion/src/tutora.js`, rama `feat/modelo`): misma ANA como botón flotante, con 4 preguntas
  del método y pregunta libre con `pantalla: "landing"`.
- **Para publicar:** `OPENAI_API_KEY` en el entorno del servicio `marsception-api`. Agregar `https://marsception.us` a
  `ALLOWED_ORIGINS` (la landing llama a v1.marsception.us/api). Agregar `docs/METODOLOGIA.md` al `git archive` de la API:
  si no, la tutora pierde la metodología y solo le queda VALIDATION.md. Poner un tope de gasto en el panel de OpenAI.
- **Pendientes de otros frentes:**
  - el frente expediente revisa el botón del pie de Expediente.js (2 líneas + método `abrirTutora`) y el de Menu.js
    (botón «Tutora ANA» arriba a la izquierda, tecla A, en el recorrido de Tab y ←→ pero no en la rejilla de ↑↓ de la consola);
  - el integrador agrega la tutora a `docs/USO_IA.md`;
  - discrepancia: METODOLOGIA.md dice 9/20 análogos conocidos y VALIDATION.md, 9 de 21.

## Hecho (15 niveles jugables, 15 nov, madrugada; rama `feat/modelo-niveles-15`)
- **11 niveles nuevos con relieve real** (antes 4: samalayuca, pinacate, g00281, mx0207). Cráteres con fuente: g00266,
  g00263, g00176, mx0261. Cráteres de impacto (sitios nuevos): meteor_crater, tenoumer, roter_kamm, talemzane. Tajos: mx0023,
  mx0019, mx0155. Reparto: 10 Luna, 5 Marte (Jezero: samalayuca, g00266, tenoumer, roter_kamm, talemzane, por la regla 4).
- `analisis/26_niveles_15.py`: celdas 21 y 23 pasadas a script local. `--comprobar` reproduce idénticos los niveles de g00281 y
  mx0207 antes de medir. `model/niveles.py` escribe data/sites sin red. Corrido dos veces: la segunda no cambia nada.
- En los sitios existentes solo cambia `nivel`. Los 4 de impacto son controles positivos del detector, no hallazgos:
  `estado: documentado`, borde levantado positivo en los 4, novedoso false (Meteor) o null.
- `model/borde.py` ahora lee también `perfiles_impactos.json`. `python -m model.borde` no cambia ningún sitio.
- Sin obstáculos (`obstaculos: []`). Pendiente máxima del transecto: tajos 49–63°; en la ventana de 250 m que juega el juego, 34–37°.
- Pendiente: `model/VALIDATION.md` (lo genera `model/validate.py` desde data/sites) no se regeneró; sus cuentas de sitios
  no incluyen los 4 nuevos.

## Hecho (publicación de la demo, 15 nov, madrugada)
- **Demo pública: https://v1.marsception.us/**, en inglés con https://v1.marsception.us/?lang=en. Este frente es el
  **único que publica** (pedido del integrador, para que dos sesiones no se pisen).
- **Disposición final (decisión de Mario): solo el juego MARSCEPTION, en la raíz.** La web Cráter Gemelo ya no se publica.
  `/game/` y `/game/?lang=en` redirigen a `/` y conservan los parámetros, así que los enlaces viejos siguen funcionando.
  **Pendiente para Alan:** el README, `web/DEPLOY.md` y `docs/ENTREGA_EN.md` todavía dicen "web en `/` y juego en `/game/`"
  y "pending VPS publication". Hay que cambiarlos al enlace de arriba.
- Versión publicada: el juego de `main` 0ad3b47 (PR #63, el último fusionado a las 03:35 UTC del 15 nov), bilingüe; pruebas del juego en verde (física 35, diseño 14, historial 10). Build: `cd game && npm ci && VITE_API_URL=/api npx vite build --base /`.
  No hay API publicada: `/api` da 404 y el juego usa los JSON que trae (regla 7).
- **Servidor:** nginx sirve una carpeta por versión (`releases/game-<commit>`) y un enlace `current` apunta a la activa. Publicar o
  volver atrás es cambiar ese enlace. El dominio entra por un túnel de Cloudflare.
  Ajustes en nginx: `.mjs` y `.vtt` con su tipo MIME (sin eso, el mapa de MapLibre de la web no cargaba su worker) y redirecciones
  relativas (`absolute_redirect off`), porque detrás del túnel nginx no sabe que la conexión es https.
- **Comprobado:** en Chromium sin ventana, en escritorio y con un teléfono emulado en vertical y horizontal, carga sin errores
  de consola ni peticiones fallidas; con `?lang=en` sale en inglés. **Falta:** probarlo en un teléfono físico y jugar el
  camino dorado completo en producción (`game/e2e/camino_dorado.mjs` solo corre contra el servidor de desarrollo).
- El video de 25 s (`web/public/media/`) ya no está publicado, porque venía con la web. Si la entrega lo necesita en línea, hay
  que subirlo aparte o publicarlo junto al juego.
- **Cómo volver a publicar:** compilar `origin/main` en un worktree aparte (nunca la rama local), subir a `releases/game-<commit>`,
  cambiar el enlace `current` y probar `/` y `/?lang=en`.

## Hecho (15 nov, mañana: los tajos ya no salen como novedosos)
- **Los tajos mineros ya no se marcan como novedosos** (`model/scan.py`, regla 5): 17 sitios pasan de `novedoso: true` a `null`,
  con la razón en la nota. El juego mostraba la etiqueta NOVEDOSO en Cananea, Peñasquito y La Herradura, y Cananea era el primer
  sitio sugerido para la Luna; eso contradecía al guion («no son descubrimientos nuevos»). Ahora ningún sitio del catálogo es
  novedoso. Solo cambian `novedoso` y la frase correspondiente de la nota en esos 17 archivos; ningún total, destino ni nivel.
- El modo `--solo-ia` ya respeta la revisión de literatura (antes habría marcado g00266 como novedoso) y no reescribe los sitios
  cuya nota queda igual. Tres pruebas nuevas (`model/tests/test_novedoso.py`).
- `model/VALIDATION.md` regenerado con los datos de `main`: ahora cuenta 62 sitios con cráter medido (entraron los cinco cráteres
  de impacto documentados), y el intervalo del prefiltro pasa de 0.32–0.51 a 0.32–0.52. La guía y su README ya dicen 0.52.
  Aparece un aviso nuevo de medición: ORNL rechaza la consulta de NDVI de los Valles Secos de McMurdo (antes ese NDVI ya era nulo).
- **Para otros frentes:** el orden de la lista del Expediente sigue siendo por similitud, así que el primer sugerido lunar sigue
  siendo un tajo (Cananea, 0.59). Si se quiere que encabece un cráter verificado, hay que ordenar por categoría en el juego.
  Y el umbral del Explorador va en un PR aparte (0.6 → 0.4, igual que la API).

## Hecho (borde levantado, 14 nov, noche)
- **`model/borde.py`: evidencia medida de que una depresión es un cráter.** `h/D` = altura máxima del perfil radial promedio a
  80 m entre 0.83 y 1.67 radios, sobre el terreno lejano (1.67 a 2 radios). Usa `ciencia_datos/datos/perfiles_radiales.json`
  (analisis/18): no consulta nada. Ventana y umbral provisionales (P).
- **Resultado** (`model/VALIDATION.md`, sección B): tienen borde levantado 10 de 11 cráteres con fuente externa (catálogo de
  México, Meteor Crater, literatura), 3 de 26 presas, valles o dunas (IA ≥ 0.7) y 4 de 38 tajos con cantera de OpenStreetMap.
  AUC 0.91 donde el puntaje de forma da 0.42 y 0.36. Por altura del borde, 7 de los 11 quedan entre los 20 primeros de 296; por
  forma, 2.
- **En `data/sites`:** variable nueva `variables.borde_levantado` (metros, con `h/D` en la nota) en los 57 sitios con cráter
  medido (`mx0090` en `null`: no tiene perfil). Con borde: Pinacate, 4 de los 5 cráteres naturales verificados (Colton no) y 5
  sin verificar (mx0003, mx0017, mx0045, mx0047, mx0121: los primeros que conviene revisar). Ninguno de los 22 tajos.
  La nota de cada candidato dice si la medida apoya a la etiqueta. **No entra al puntaje: ningún total, `destino_ref` ni
  `novedoso` cambió.**
- **Límites:** no mide parecido con la Luna ni con Marte (solo 22 % de los gemelos lunares y 15 % de los marcianos tienen borde
  con esta medida); 11 casos con fuente, uno solo de impacto; la ventana ancha se eligió después de ver los datos (con la
  estrecha pasan 7 de 11). La prueba independiente que faltaba ya está hecha (viñeta «Prueba fuera de muestra», abajo).
- Corregido en `VALIDATION.md`: los totales frente al polo sur lunar son más bajos por la pendiente (objetivo 8.63° contra 3.56°),
  no por la oscilación térmica, que se recorta igual en los dos destinos. Los tajos someros (mx0088, mx0457) ya no dicen
  "pendientes extremas".
- Comandos: `python -m model.borde` (todos los sitios) y `python -m model.scan --solo-categoria` (notas); los dos son idempotentes.
- **Carpeta para exponer el modelo:** `informe/exposicion_modelo/` (con `README.md`). Trae la guía de estudio
  `guia_exposicion_modelo.pdf` (6 páginas; generador `informe/generar_guia_exposicion.py`): guion propuesto de 30 s para el bloque
  «Evidencia y límites», lo que nos distingue, el borde en todos los grupos, 17 preguntas de jueces con respuesta y respaldo, y
  lo que no hay que decir. Y dos cuadernos ya ejecutados que vuelven a calcular sus cifras sin descargar nada:
  `01_borde_levantado.ipynb` y `02_cifras_de_la_guia.ipynb`. El generador y la última celda de cada cuaderno fallan si una cifra
  ya no coincide con `model/VALIDATION.md`.
- **Banco de preguntas (15 nov, madrugada):** `informe/exposicion_modelo/preguntas_modelo.pdf` (generador
  `informe/generar_preguntas_modelo.py`): 48 preguntas sobre el modelo en 10 temas, cada una con qué decir, qué añadir si
  insisten y dónde está el respaldo. El generador se detiene si una frase citada ya no aparece en su documento
  (`VALIDATION.md`, `AGENTS.md`, `score.py`, `NIVEL2.md`…). Las del juego (ruedas, batería) siguen en `docs/PITCH_QA_EN.md`.
- **Figura «¿cráter o mina?» (14 nov, 23:40):** `informe/exposicion_modelo/figura_crater_o_mina_es.png` y `_en.png` (también
  `.svg`), para diapositivas y para la página en inglés. Corte de El Elegante (puesto 10 de 296 por el puntaje de forma) y del
  tajo G00219 de Arizona (puesto 3): solo el cráter sube sobre el terreno lejano. Los ejemplos salen de una regla (el mejor
  puesto por forma de cada clase), no de elegirlos a ojo; el perfil es el promedio por anillos, reflejado. La acompaña la cuenta
  que ya estaba en `VALIDATION.md`: entre los 25 primeros por forma hay 14 minas y 3 cráteres; por borde, 11 cráteres y 1 mina
  (etiquetas de IA). **No cambia el modelo, los datos ni ningún total.** Respaldo: cuaderno 01, secciones 4 y 6.
- **Prueba fuera de muestra del borde (15 nov, madrugada):** con la zona del borde y el umbral ya fijados, se midieron los
  cráteres de impacto de `impactos_tierra.csv` que el detector encuentra y que no intervinieron al fijarlos. **De los 8 que la
  regla no había visto, 7 tienen borde levantado** (Lonar, Wolfe Creek, Tenoumer, Pingualuit, Tswaing, Roter Kamm y Talemzane;
  no Xiuyan, al que el detector le mide 0.81 km de 1.8). Meteor Crater no cuenta: ya era el candidato G00195. Con la zona
  estrecha pasan 5 y con umbral 0.002 pasan 6. No es una muestra al azar: son cráteres conocidos elegidos como control positivo.
  Archivos: `analisis/25_perfiles_impactos.py` (corre en local con Earth Engine; `--comprobar` exige reproducir idénticos 4
  perfiles ya guardados), `ciencia_datos/datos/perfiles_impactos.json`, `model/borde.py` (`tabla_impactos`), apartado nuevo en
  `model/VALIDATION.md` (regenerado: la sección A no cambió) y una prueba más (14 pasan).
- **Revisión de literatura cerrada (Ryan et al. 2024, *Geosphere*):** Harrat Hutaymah **sí está** en esa base global de
  ambientes relevantes para Marte, así que Al Hutaymah (g00263) no es un análogo nuevo para Marte. Jabal Bayda (g00266) y Al
  Wahbah (g00281) no están, pero la base solo reúne campos basálticos y no es exhaustiva. Ninguno se presenta como
  descubrimiento; `novedoso` sigue en `null` en los tres. Detalle en `model/NIVEL2.md` §A. La nota de g00263 y g00266 se
  reescribió con `python -m model.scan --solo-literatura` (modo nuevo: solo cambia esa frase de la nota).
- **Probado y descartado: gemelo por perfil completo.** Comparar el corte entero de cada sitio con el de su gemelo lunar no
  sirve como evidencia: entre los 25 que mejor encajan hay 1 cráter natural según la IA y el resto son valles, presas, minas y
  casos sin decidir (somero contra somero), y los 11 cráteres con fuente quedan entre los puestos 62 y 289 de 296 (El Elegante:
  84 m por km de diámetro de diferencia cuadrática media; Meteor Crater: 76). Fue una exploración rápida; no se agregó al repo.

## Hecho (auditoría del 14 nov, noche)
- **Pinacate** ahora usa la misma regla que `scan.py` (destino = cuerpo al que más se parece su forma): `polo_sur_lunar`,
  forma 0.972, total 0.529 (antes `jezero`, 0.028 y 0.149). El total frente a Jezero queda en la nota. `model/curados.py --sin-perfil`
  conserva el nivel jugable. El sitio del camino lunar sigue siendo decisión del equipo (§16).
- **Categoría de cada candidato** (`scan.py`, regla 6; modo `--solo-categoria`): cráter natural verificado 5, tajo minero 22, sin
  verificar 29. Va en `nota`; en los tajos también en `uso_exploracion` (dónde se rompe la analogía, con el percentil de d/D lunar).
- **G00263** (maar Al Hutaymah) y **G00266** (cono de toba Jabal Bayda) exportados con `scan.py --global --ids`, `novedoso: null`
  hasta revisar Ryan et al. 2024.
- `VALIDATION.md`: comparador presentado como **prefiltro ambiental** con su tasa en los sitios del detector; exactitud con
  D ≥ 2 km (77.6 % ± 0.7 %, 788 lunares y 125 marcianos); tabla de umbral del explorador. Análogos conocidos: 9 de 21 (no 9 de 20: Colton se agregó después).
- `api/main.py`: umbral de propuesta 0.6 → 0.4 (P); con 0.6 ningún análogo conocido podía proponerse.

## Hecho
- Detector de cráteres (núcleo del modelo, AGENTS.md §6.1 y §8.1): `analisis/00–15`. Corre igual sobre México (5,208 depresiones),
  el polo sur lunar (LOLA, 4,288 cráteres) y Marte (HRSC+MOLA, 6 sitios y 573 cráteres), todo a 200 m.
- Modelos explicables (`ciencia_datos/01–03`):
  - Luna contra Marte con 78 % de exactitud balanceada (grupos espaciales); entre 70 y 92 % en un sitio de Marte nunca visto.
  - Validación con cráteres de impacto terrestres: 8 de 8 dentro de la nube Luna+Marte.
  - Catálogo de 70 cráteres volcánicos de México con fuente: el detector encuentra el 40 % de los que están en su rango.
- `model/features.py`: NASA POWER verificado (T2M_RANGE y PRECTOTCORR, climatología 2001–2025). NDVI de MOD13Q1: el servicio de
  ORNL DAAC daba 503 el 14 nov, así que se usa Earth Engine como respaldo. Pendiente y perfil de elevación desde Copernicus GLO-30
  a 200 m, la misma resolución que la Luna y Marte. Las variables que salen de Earth Engine requieren `earthengine authenticate`.
- `model/forma.py`: dimensión **forma**, que combina el modelo Luna contra Marte con la distancia a la nube.
  `model/score.py` la usa con peso 0.40 (P).
- `data/targets`: pendiente medida de Jezero (3.56°) y del polo sur lunar (8.63°), mediana de cuadros de 10 km a 200 m.
- `model/scan.py`: **41 candidatos** áridos exportados a `data/sites/mxNNNN.json` como `candidato_modelo`.
- `model/curados.py`: **Pinacate** con variables reales y perfil de elevación de 4 km que cruza El Elegante (`documentado`).
- `model/validate.py`: escribe `model/VALIDATION.md`.
- Destinos con oscilación térmica con fuente: Jezero 55 K (aire a 1.45 m, MEDA, Munguira et al. 2023) y polo sur 176 K
  (superficie, LRO Diviner, Williams et al. 2019; solo comparable en orden de magnitud). Pinacate y candidatos, confianza 1.0.
- `data/known_analogs.json` (20 con coordenada y fuente, 10 de México) y `data/negative_controls.json` (3, verificados con WorldCover).
  `novedoso` ya se calcula: 7 candidatos quedan como no novedosos por estar a menos de 50 km del Gran Desierto de Altar,
  del Pinacate o de Rincón de Parangueo.
- **Samalayuca** con variables reales y perfil de dunas de 3 km (coordenada de Domínguez-Acosta et al. 2023). No hay literatura
  que la trate como análogo planetario, así que va como `candidato_modelo` con `novedoso: true`.
- `model/VALIDATION.md`: controles negativos 3 de 3 en 0 (veto por NDVI). Análogos conocidos: 9 de 21 por encima de 0.4; los que
  no pasan son análogos por razones que el comparador no ve (frío, lava húmeda, química, cuevas). Impactos terrestres: 8 de 8
  dentro de la nube de forma.

- `ciencia_datos/04_fichas_explicables.ipynb` → `salidas/fichas_explicables.json` (54 sitios): aporte exacto de cada variable al logit, gemelos kNN lunares y marcianos con coordenadas (las de Marte recuperadas de la posición en el recorte) y puntaje por dimensión frente a los dos destinos.

## En curso
- Sumar las variables de `perfiles_radiales.csv` (analisis/17, sesión del Colab) a una versión del modelo de la Luna, sin mezclar resoluciones con Marte.
- `model/scan.py --global`: los 12 mejores en forma de `global_crateres.csv` (Atacama 6, Arizona 6; Arabia ninguno en el top), sin duplicados de México a ≤1 km. 9 de 12 están junto a una cantera: el patrón de las minas se repite fuera de México. g00174 y g00176 (campo volcánico de San Francisco, AZ) quedan con novedoso null por verificar.

## Siguiente
- [ ] Regenerar `web/public/data/sitios.json` desde `data/sites` (quitar `demo: true`).
- [ ] Búsqueda global en zonas áridas (AGENTS.md §6.4), en 3 pasos. El paso (b) lo corre la sesión del Colab:
  - [ ] (a) Máscara global de zonas áridas con el filtro de vegetación (MODIS MOD13Q1, NDVI p90 < 0.35)
  - [ ] (b) Detector a 200 m en regiones priorizadas: Sahara, Arabia, Atacama, Australia interior, Gobi, Kalahari,
        suroeste de EE. UU., meseta iraní, Thar, norte de México (este último ya está hecho)
  - [ ] (c) 5 a 8 sitios finales globales en data/sites/ (México como caso destacado)
- [ ] Verificar fuentes globales: base de datos de estructuras de impacto (controles positivos) e inventario de minería a cielo abierto
- [ ] API `/score`: hoy usa forma = null en puntos libres (correcto: no hay cráter medido). Probar en el VPS si Earth Engine está disponible.

## Bloqueos / necesito de otro frente
- Sitio análogo del camino lunar (el jugador elige Luna o Marte): la sesión del Colab propone El Elegante (forma 0.97 frente a la Luna). Lo decide Mario.
- **Decisión del equipo (§16):** la forma de El Elegante da 0.97 frente al polo sur lunar y 0.03 frente a Jezero, y la similitud
  total del Pinacate contra Jezero es 0.13. Si el MVP sigue en Jezero, el sitio de relieve no sale como buen análogo de forma.
  Los datos favorecen la Luna como destino.
- Tercer sitio (§16): candidatos del escaneo con buena forma y acceso, por ejemplo Cananea (mx0023, forma 0.87 frente a la Luna),
  La Herradura (mx0019) o Peñasquito (mx0155). Son tajos mineros: análogo operativo (rovers en paredes empinadas, excavación),
  no geológico.

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- `site.schema.json`: un campo opcional `gemelo` ({cuerpo, sitio, lat, lon, diam_km, prof_m}). Hoy el gemelo va como texto en `nota`.
- `site.schema.json`: permitir `similitud_por_destino` (polo_sur_lunar y jezero), para no perder la comparación con el otro destino.
- `docs/GUION_PITCH.md`, sección "Preguntas": agregar la respuesta a "¿qué tiene que ver el borde levantado con los análogos?".
  El texto exacto, las tres razones y lo que no hay que decir están en `model/NIVEL2.md` §D. Ojo: la frase "dos evidencias
  independientes" no se sostiene (la IA también vio el relieve); la correcta está ahí.
- Juego y web: la variable nueva `variables.borde_levantado` sale sin etiqueta propia ("Borde levantado" solo en español en el
  Expediente; `borde_levantado` en la ficha de la web). Propuesta de etiqueta: "Borde levantado (80 m)" / "Raised rim (80 m)".
- **Decisión del equipo:** ¿entra Harrat Hutaymah a `data/known_analogs.json`? Con eso g00263 pasaría a `novedoso: false` y los
  análogos conocidos serían 22, no 21 (cambia la cifra «9 de 21» del guion y de la validación). Mientras, queda en `null`.
- `docs/GUION_PITCH.md`: además de la frase de las minas, propongo «Fijamos la regla y después la probamos en ocho cráteres de
  impacto de otros países que nunca había visto: siete la pasan» (texto y cuidados en `model/NIVEL2.md` §D).
- `docs/GUION_PITCH.md`, bloque «Evidencia y límites»: propongo decir «Ordenados solo por forma, entre los 25 primeros hay 14
  minas y 3 cráteres. Ordenados por el borde levantado, 11 cráteres y 1 mina.» Es lo que distingue al proyecto y hoy el guion no
  menciona el borde. Texto y cuidados en `model/NIVEL2.md` §D; figura lista en `informe/exposicion_modelo/`.
- `game/src/scenes/expediente/config.js`: `UMBRAL_PROPUESTA` sigue en 0.6 en `main` (la API ya usa 0.4). Con 0.6 ningún análogo
  conocido puede proponerse desde el Explorador (el más alto da 0.556).
- `docs/METODOLOGIA.md` dice «9/20 análogos conocidos»; lo correcto es 9 de 21, como ya dice el guion.
- `site.schema.json`: valor de `estado` nuevo `control_positivo` para los cráteres de impacto conocidos (meteor_crater,
  tenoumer, roter_kamm, talemzane). Hoy van como `documentado` con la explicación en la nota.
- Pinacate: sumar MacDougal (MX0007), Sykes (MX0010) y Cerro Colorado (MX0012) como niveles alternos del sitio curado
  (p. ej. `nivel` por cráter); hoy el contrato tiene un solo `nivel` por sitio.
