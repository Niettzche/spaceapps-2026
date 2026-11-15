# Estado — Modelo, datos y API del modelo

> Lo actualiza SOLO este frente. Rama: `feat/modelo`.

**Responsable:** Mario  ·  **Agente:** Claude Code / Codex
**Última actualización:** 15 nov 2026, madrugada (demo publicada en https://v1.marsception.us/)

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
  estrecha pasan 7 de 11). Falta la prueba independiente: perfiles a 80 m de los cráteres de impacto de `impactos_tierra.csv`.
- Corregido en `VALIDATION.md`: los totales frente al polo sur lunar son más bajos por la pendiente (objetivo 8.63° contra 3.56°),
  no por la oscilación térmica, que se recorta igual en los dos destinos. Los tajos someros (mx0088, mx0457) ya no dicen
  "pendientes extremas".
- Comandos: `python -m model.borde` (todos los sitios) y `python -m model.scan --solo-categoria` (notas); los dos son idempotentes.
- **Carpeta para exponer el modelo:** `informe/exposicion_modelo/` (con `README.md`). Trae la guía de estudio
  `guia_exposicion_modelo.pdf` (4 páginas; generador `informe/generar_guia_exposicion.py`): guion propuesto de 30 s para el bloque
  «Evidencia y límites», figura del borde, 12 preguntas de jueces con respuesta y respaldo, y lo que no hay que decir. Y dos
  cuadernos ya ejecutados que vuelven a calcular sus cifras sin descargar nada: `01_borde_levantado.ipynb` y
  `02_cifras_de_la_guia.ipynb`. El generador y la última celda de cada cuaderno fallan si una cifra ya no coincide con
  `model/VALIDATION.md`.

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
