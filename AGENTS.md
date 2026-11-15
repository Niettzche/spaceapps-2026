# AGENTS.md — Misión Cero (NASA Space Apps 2026, sede UDEM)

> **Fuente única de contexto para TODOS los agentes.** Codex lee este archivo directamente. Claude Code lee `CLAUDE.md`, que solo
> contiene la línea `@AGENTS.md` (importa este archivo). Si alguien modifica este archivo, ambos agentes ven el cambio.
> No escribas contexto en CLAUDE.md: todo va aquí.
> Versión: borrador v2 · 14 nov 2026 · Equipo de 6 personas · Responsable del archivo: líder del equipo.
> Valores marcados con (P) son provisionales y editables; no los trates como acuerdos científicos.

---

## 1. Qué estamos construyendo (en una frase)

> **Nombre del juego: MARSCEPTION** (decisión del 14 nov). "Misión Cero" queda como nombre interno del repositorio.
> Lema de la pantalla de título: *Train on Earth. Land on the Moon / Mars. Run it anywhere.*

Un **buscador de análogos terrestres basado en datos de la NASA** (el modelo) + un **juego web 2D** donde el jugador usa esos
análogos para probar un robot antes de mandarlo a Marte o a la Luna a entregar un suministro a un astronauta.

- **El modelo es el núcleo.** Identifica y caracteriza lugares de **todo el mundo** parecidos a un destino lunar o marciano,
  con una búsqueda global en zonas áridas (§6.4). México es el caso destacado (validación completa e Impacto Local), no el límite.
- **El juego es el valor agregado.** "La información ya existe; el chiste es experimentar con ella en un entorno controlado."
- Reto: *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars*.

## 2. Plazos y reglas de la sede (no negociables)

- Entrega en la plataforma: **domingo 15 nov, 23:59 h**. Después = descalificado. **Meta interna: 21:00 h.**
- Pitch a jueces el domingo: **2 min de presentación + 1 min de preguntas**. (Confirmar la hora exacta del pitch.)
- Entrega global: video ≤30 s o ≤7 diapositivas; página del proyecto **en inglés**.
- Criterios (1–5 c/u, mismo peso): Impacto · Creatividad · Validez · Relevancia (**uso significativo de datos de la NASA**) · Presentación.

## 3. Reglas para los agentes (léelas antes de tocar código)

1. **Trabaja solo en las carpetas de tu frente** (sección 9). Si necesitas cambiar algo de otro frente, déjalo como nota en tu PR.
2. **Los contratos de datos (`data/schema/`) solo los cambia el integrador.** Si necesitas un campo nuevo, propónlo en el PR.
3. **Nunca inventes datos.** Ni ubicaciones, ni mediciones, ni fuentes, ni porcentajes. Si falta un dato: `null` + nota de limitación.
4. Todo valor de balance del juego (precios, stats de piezas, puntos) es **valor de juego**: márcalo como tal.
5. **Sin secretos en el repo ni en el navegador.** Llaves de API solo en `.env` del servidor (VPS). `.env` está en `.gitignore`.
6. Commits pequeños y descriptivos. PR hacia `main` con: qué cambió, cómo probarlo, limitaciones.
7. El juego **debe funcionar sin API** (con los JSON estáticos de `data/`). La API es una mejora, no una dependencia de la demo.
8. Arte, nombres y personajes **propios**. Bad Piggies, Earn to Die y Happy Wheels son solo referencias de mecánica. Sin logo de NASA.
9. Antes de terminar una tarea: corre las pruebas de tu frente y revisa el camino dorado (sección 11).

## 4. Producto: recorrido del jugador

1. Pantalla de carga con progreso real → menú.
2. Elegir destino: **Luna (polo sur, Artemis)** o **Marte (Jezero)**. Los dos son destinos finales y **el jugador elige**.
   Misma mecánica en ambos; cambian la gravedad, el perfil del destino (`data/targets/`), los sitios análogos sugeridos y el fondo.
3. Mapa con análogos sugeridos por el modelo → abrir el **Expediente** de un sitio: a la izquierda la Tierra, a la derecha el destino,
   misma variable con misma unidad, y qué diferencias quedarán sin probar.
4. Gastar un **ticket de prueba** en un sitio (3 tickets por partida, sin reposición; reiniciar partida los restaura) (P).
5. **Taller:** armar el robot con presupuesto (1,000 créditos) (P). Chasis con ranuras fijas; la posición importa.
6. **Prueba terrestre:** conducir el recorrido del sitio (perfil de elevación real + obstáculos etiquetados como recreación).
7. Ver resultados, ajustar, volver a probar.
8. **Misión:** lanzar a Marte con gravedad real; llegar a la base y entregar el suministro.
9. **Resultados:** puntuación visible, recomendación (reglas o LLM anclado en datos), reintentar. Compartir = extra.
10. **Explorador libre (modo descubrimiento):** el usuario consulta cualquier coordenada → el modelo calcula su similitud →
    si supera el umbral, puede **proponer el sitio** (ver sección 6.4).

**Condición de victoria (P):** la carga llega a la zona objetivo con integridad ≥ 60 % y el robot detenido 2 s.
Pierde por destrucción, pérdida de la carga o energía agotada. Un fragmento suelto nunca activa la victoria.

## 5. Condiciones que afectan la partida (y su fuente)

| Condición | Efecto en el juego | Fuente del valor |
|---|---|---|
| Gravedad | Saltos, caídas, tracción | Tierra 9.81, Marte 3.71, Luna 1.62 m/s² (solo en la misión de destino) |
| Relieve | Ascensos, estabilidad | Perfil de elevación real del sitio (DEM) con exageración vertical declarada |
| Agarre | Avanzar o patinar | Tipo de superficie del sitio (dunas, lava, suelo compacto) → coeficiente de juego |
| Iluminación | Recarga del panel solar | Insolación del sitio (NASA POWER) / altura del Sol |
| Temperatura, presión | **Solo si hay una regla implementada y explicable** | — |

La gravedad del destino **no** se atribuye al análogo terrestre: esa es justo una de las cosas que la Tierra no puede probar.

## 6. El modelo de análogos (el núcleo científico)

### 6.1 Qué es (y qué no decir)

El modelo tiene dos partes, y así se presenta:

1. **Similitud de forma (núcleo, `analisis/` + `ciencia_datos/`):** un detector de depresiones tipo cráter corre con el mismo código y a
   la misma resolución (200 m) sobre la Tierra (hoy México, validado; se extiende a regiones áridas del mundo, §6.4), el polo sur lunar y Marte. Después, **modelos explicables entrenados con cráteres de la Luna
   y de Marte** (árbol de decisión poco profundo y regresión logística, Luna contra Marte) separan los dos cuerpos con **75–77 % de
   exactitud balanceada** fuera de pliegue (validación por grupos espaciales, `ciencia_datos/02`); con 6 sitios de Marte y 573 cráteres, 78 % (76 % solo con profundidad/diámetro)
   (`ciencia_datos/03`). El puntaje de un cráter mexicano combina ese modelo con su distancia a la nube Luna+Marte. La regla principal
   del árbol es profundidad/diámetro.
2. **Comparador transparente de variables (complemento, `/model`):** variables climáticas y de superficie medidas por la NASA, comparadas
   con el perfil del destino; similitud por dimensión con límites explícitos.

Qué decir: "modelo explicable entrenado con cráteres reales de la Luna y Marte + comparador de variables". Qué **no** decir: red neuronal,
deep learning ni "la IA descubrió": no lo es. Extensión opcional: kNN o clustering sobre la malla de variables, identificado como tal.

### 6.2 Variables del MVP

| Dimensión | Tierra (fuente) | Destino (fuente) | Uso |
|---|---|---|---|
| **Forma del cráter** (profundidad/diámetro, borde) | Copernicus DEM GLO-30 (30 m → 200 m) | Luna: LOLA `ldem_80s_80m` (80 m → 200 m); Marte: HRSC+MOLA blend (200 m) | **Similitud principal** |
| Oscilación térmica diaria | NASA POWER `T2M_RANGE` (climatología) | Marte: MEDA/REMS (Jezero/Gale); Luna: LRO Diviner | Complementaria |
| Aridez | NASA POWER `PRECTOTCORR` | 0 (sin precipitación líquida) | Complementaria |
| Vegetación | MODIS NDVI (MOD13Q1) | 0 | **Veto**: NDVI alto = descartado (equivale al filtro de zonas áridas del detector, NDVI p90 < 0.35) |
| Pendiente y rugosidad | SRTM / Copernicus DEM | MOLA / HRSC (Marte); LOLA (Luna) | Complementaria + perfil del nivel |

Ojo con el borde: a 200 m, el borde lunar medido sale negativo (mediana −23 m), así que `PROYECTO.md` advierte que no sirve como
criterio de parecido con la Luna. El frente modelo decide cómo usarlo; profundidad/diámetro es la variable que sí separa.

**El modelo calcula para los DOS destinos** (Jezero en Marte y una región candidata de base de Artemis en el polo sur lunar),
y el juego tiene misión en los dos destinos. Así cubrimos las dos mitades del reto ("bases lunares permanentes y Marte").

Endpoints a verificar el sábado: API de NASA POWER (climatología por punto) y servicio de subconjuntos MODIS de ORNL DAAC.
Los valores del destino se capturan una vez en `data/targets/*.json` **con fuente, fecha y unidad**.

Fuentes globales **por verificar** (no usarlas ni citarlas hasta confirmar acceso, licencia y cobertura):
- **Base de datos de estructuras de impacto terrestres** → controles positivos globales del detector. Candidata: Earth Impact Database
  (Planetary and Space Science Centre, Univ. de New Brunswick).
- **Inventario global de minería a cielo abierto** → respaldo del hallazgo de minas fuera de México. Candidatas: Maus et al. (2022,
  *Scientific Data*) y Tang y Werner (2023, *Communications Earth & Environment*). OpenStreetMap (`landuse=quarry`) ya se usa en México.

### 6.3 Cálculo

- **Forma:** puntaje en [0, 1] del modelo Luna contra Marte + distancia a la nube Luna+Marte (`ciencia_datos/`). Es la dimensión
  con más peso (P).
- Dimensiones complementarias: `s = exp(-|tierra - destino| / escala)`; escalas iniciales (P): térmica 20 K, pendiente 5°, rugosidad 5 m.
- Si el destino está fuera del rango terrestre: **recortar al extremo terrestre** y registrarlo en `limites`.
- Total: media geométrica ponderada; **veto** si alguna dimensión es 0 (ej. vegetación densa).
- Dato faltante: se omite la dimensión, se renormalizan los pesos y baja `confianza`.
- **Validación obligatoria:** controles negativos (Amazonas, Congo, zonas agrícolas → cerca de 0 %) y análogos conocidos
  (desiertos hiperáridos, campos de lava) → altos. Si falla, el modelo está mal. Resultado en `model/VALIDATION.md`.
- **Validación del detector (ya hecha, `informe/validacion_detector.pdf`):**
  - Encuentra **9 de 11** cráteres mexicanos conocidos.
  - De sus 668 detecciones, el **71 %** cae en sierras húmedas del sur: son dolinas y cañadas reales que a 200 m cumplen la forma.
    Está explicado: un relieve sin árboles (FABDEM) solo las reduce 15 %, así que no son copas de árboles. Por eso se aplica el filtro árido.
  - Quedan **47 candidatos en zonas áridas**, donde están todos los cráteres y minas reales.
  - Con fuentes citables (`ciencia_datos/03`): los 8 cráteres de impacto terrestres detectados caen dentro de la nube Luna+Marte.
- Límites que siempre se declaran: gravedad, presión atmosférica, radiación, vacío lunar.

### 6.4 Tres formas de identificar ubicaciones (responde a "el reto es identificar")

1. **Curadas y validadas:** 3 sitios del MVP (dunas → agarre; campo de lava → relieve; desierto con pendiente → energía).
   Candidatos a verificar: Samalayuca (Chih.), Pinacate (Son.) y uno más. Estado: `documentado` o `candidato_modelo`.
2. **Búsqueda global en zonas áridas (3 pasos):** es el "descubrimiento" del pitch.
   - **(a) Máscara global de zonas áridas** con el filtro de vegetación del detector (MODIS MOD13Q1, NDVI p90 < 0.35).
   - **(b) Detector a 200 m en regiones áridas priorizadas:** Sahara, península arábiga, Atacama, interior de Australia, Gobi,
     Kalahari, suroeste de EE. UU., meseta iraní, desierto de Thar y norte de México. Mismo código que `analisis/07_buscador_crateres.py`.
   - **(c) 5 a 8 sitios finales globales**, con similitud, gemelo lunar o marciano, uso para la exploración y dónde se rompe la analogía.
     Los que no estén en la lista de análogos conocidos → `candidato_modelo` con `novedoso: true` (ver §8.1).
   - **México es el caso destacado:** ahí la validación está completa (9 de 11 cráteres conocidos, 47 candidatos áridos) y apunta al
     premio de Impacto Local. No es el límite del alcance.
   - **Regla para el pitch:** decir "búsqueda global en zonas áridas" con las cifras reales (regiones cubiertas, detecciones, sitios).
     **Nunca** decir "escaneamos todo el planeta".
   La lista vive en `data/known_analogs.json` (Atacama, Valles Secos de McMurdo, cráter Haughton, Death Valley, Islandia, Hawái,
   desierto de Mojave, Río Tinto, etc.) y sirve para dos cosas: controles positivos de la validación y marcar `novedoso: true`.
   Varias regiones priorizadas (Atacama, suroeste de EE. UU.) contienen análogos famosos: ahí solo cuenta como novedoso lo que no esté en la lista.
3. **Propuestas de usuarios (explorador libre):** el usuario da una coordenada → la API calcula la similitud en vivo →
   si supera el umbral (P: 0.6) puede proponer el sitio → se guarda como `propuesto_usuario` (pendiente de revisión).
   Un sitio aprobado se vuelve jugable automáticamente: su nivel se genera con el perfil de elevación real del DEM.

### 6.5 Del sitio al nivel jugable

Cada nivel guarda el `id` del sitio, su destino de referencia y los parámetros derivados de datos. El perfil del recorrido sale de un
transecto real del DEM (N puntos, exageración vertical declarada). Los obstáculos agregados para jugar llevan `recreacion: true`.
Una ilustración nunca se presenta como reconstrucción topográfica exacta.

## 7. Contratos de datos (`data/schema/`)

Todos los frentes leen y escriben estos formatos. Ejemplos mínimos:

```json
// data/sites/samalayuca.json  (Site)
{
  "id": "samalayuca",
  "nombre": "Médanos de Samalayuca",
  "pais": "MX",
  "lat": null, "lon": null,
  "estado": "candidato_modelo",          // documentado | candidato_modelo | propuesto_usuario | ilustrativo
  "destino_ref": "jezero",
  "prueba_util": "agarre",                // agarre | relieve | energia
  "uso_exploracion": null,                // qué permite probar para la Luna/Marte (ej. movilidad de rovers en arena suelta)
  "proceso": null,                        // proceso análogo si aplica (ej. dunas formadas por viento = procesos eólicos de Marte)
  "novedoso": null,                       // true si no está en data/known_analogs.json
  "variables": {
    "oscilacion_termica": { "valor": null, "unidad": "K", "fuente": "NASA POWER T2M_RANGE", "fecha": null },
    "precipitacion":      { "valor": null, "unidad": "mm/día", "fuente": "NASA POWER PRECTOTCORR", "fecha": null },
    "ndvi":               { "valor": null, "unidad": "-", "fuente": "MODIS MOD13Q1", "fecha": null },
    "pendiente":          { "valor": null, "unidad": "grados", "fuente": "SRTM", "fecha": null }
  },
  "similitud": { "total": null, "por_dimension": {}, "confianza": null },
  "limites": ["gravedad", "presion", "radiacion"],
  "nivel": { "perfil_elevacion_m": [], "fuente": "SRTM", "exageracion_vertical": null, "obstaculos": [] }
}
```

```json
// data/targets/jezero.json  (Target)
{ "id": "jezero", "mundo": "marte", "gravedad_ms2": 3.71,
  "variables": { "oscilacion_termica": { "valor": null, "unidad": "K", "fuente": "MEDA (Perseverance)", "fecha": null } } }
```

```json
// game/src/content/parts.json  (Part) — valores de juego (P)
{ "id": "rueda_ancha", "sistema": "movilidad", "costo": 120, "masa": 8,
  "agarre": { "arena": 0.9, "roca": 0.5, "compacto": 0.7 }, "nota": "valor de juego" }
```

```json
// Result (telemetría de una partida; alimenta la puntuación y el feedback)
{ "sitio": "samalayuca", "destino": "jezero", "diseno": [], "distancia_m": 0, "entrega": false,
  "integridad_carga": 1.0, "energia_restante": 1.0, "costo": 0, "intentos": 1, "eventos": [] }
```

**Puntuación visible (P):** entrega 500 + integridad de carga × 3 + energía restante × 1 + presupuesto ahorrado × 1 (en %).
Confirmado por integración: máximo 1,000 puntos; 1 estrella por entrega, 2 desde 750 y 3 desde 900. Sin entrega: 0 puntos y 0 estrellas. La puntuación del juego **no** es evidencia científica.

## 8. Arquitectura y stack

```
/AGENTS.md      fuente única de contexto
/CLAUDE.md      solo contiene: @AGENTS.md
/docs/estado/   un archivo de estado por frente
/docs/DECISIONES.md  decisiones del equipo (integrador)
/docs/          brief (Mision_Cero_Contexto), bitácora, guion del pitch
/data/schema/   contratos (solo integrador)
/data/targets/  perfiles de destino con fuentes
/data/sites/    sitios curados, candidatos del modelo y propuestos
/model/         Python: features.py, score.py, scan.py, validate.py → escribe en /data/sites
/api/           FastAPI en el VPS: POST /score, POST /submit, POST /feedback (proxy del LLM)
/game/          Phaser 3 + Matter.js (Vite). Escenas: Boot, Menu, Expediente, Taller, Prueba, Mision, Resultados, Explorador
/assets/        arte en pixel art (propio)
```

- Persistencia del jugador: navegador (sin cuenta). Propuestas de usuarios: SQLite en el VPS (Supabase = extra).
- Prototipo existente: `Mision_Cero.html` (componentes + conducción lateral) y `Control_NES_Mision_Cero.html` (mando táctil).
  Reutilizar la física/controles; la pista procedural se reemplaza por perfiles reales.
- Feedback: reglas primero; LLM solo con diseño + datos del sitio + reglas activas + telemetría. Si el LLM falla, reglas.

### 8.1 Módulos existentes: el núcleo del modelo

El **detector de cráteres** (`analisis/` + `ciencia_datos/`) **es el núcleo del modelo de análogos** (§6): con datos reales mide la forma
de cada depresión terrestre con el mismo código y a la misma resolución (200 m) que los cráteres del polo sur lunar y de Marte.
Hoy está corrido y validado en México (caso destacado); la extensión a las regiones áridas del mundo sigue §6.4.
`/model` es la capa que convierte esos resultados (más las dimensiones complementarias) en `data/sites/`. **No se borra ni se reescribe.**

| Carpeta | Qué es | Dueño | Conexión con Misión Cero |
|---|---|---|---|
| `analisis/` | Celdas de Colab (Earth Engine) `00`–`15`: detector de depresiones tipo cráter en México (hoy), el polo sur lunar (LOLA) y Marte (HRSC+MOLA), todo a 200 m con el mismo código | modelo | Búsqueda global en zonas áridas (§6.4, punto 2): sus candidatos se exportan a `data/sites/` |
| `ciencia_datos/` | Notebooks de modelos explicables (árbol, regresión logística Luna contra Marte) y sus salidas | modelo | Similitud de forma y evidencia de validación → `model/VALIDATION.md` y `docs/METODOLOGIA.md` |
| `informe/` | Generadores y PDF de validación del detector y de los modelos | modelo | Respaldo para el pitch y la metodología |
| `web/` | Página Vite + React + MapLibre, bilingüe (en/es): quiz, mapa de detecciones, fichas con gemelo lunar, sitios destacados, método | integración (Alan): estructura y publicación. `web/public/data/`: modelo | Página pública del proyecto en inglés (§14). Enlaza al juego (`game/`); no se fusiona con él |
| `PROYECTO.md` | Memoria del trabajo del detector: decisiones, bitácora, pendientes | modelo | Las decisiones que afecten a todos los frentes se copian a `docs/DECISIONES.md` |

**Reglas de conexión**
- Los cráteres candidatos se exportan a `data/sites/<id>.json` con `estado: "candidato_modelo"`, cumpliendo `data/schema/site.schema.json`.
  El id va en minúsculas (`mx0007`, no `MX0007`), porque el esquema exige `^[a-z0-9_]+$`.
- **Solo se exportan detecciones de zonas áridas** (NDVI p90 < 0.35). Las 668 incluyen dolinas y cañadas de sierras húmedas
  que no son cráteres (ver `informe/validacion_detector.pdf`).
- Las mediciones de forma (diámetro, profundidad, profundidad/diámetro, borde) van en `variables` con `unidad` y `fuente`
  ("Copernicus DEM GLO-30, remuestreado a 200 m"). El puntaje Luna/Marte va en `similitud.por_dimension.forma`.
  `destino_ref` = el cuerpo de su gemelo (`polo_sur_lunar` o `jezero`).
- `novedoso` se calcula contra `data/known_analogs.json`. Si un candidato coincide con un sitio curado
  (ej. MacDougal ↔ `pinacate`), se enriquece el sitio curado en vez de duplicarlo.
- `web/public/data/` lo genera el frente modelo con su script (`analisis/10_exportar_web.py`); **nadie lo edita a mano**.
  Excepción temporal: `sitios.json` (sitios destacados) hoy es curado por el frente modelo y marca sus campos de demostración
  con `demo: true`; mientras no tenga script, solo el frente modelo lo edita. Vence cuando exista el script de exportación
  del frente modelo. Los registros con `demo: true` no se presentan como datos reales en la demo ni en el pitch.
- **El Expediente del juego (`game/`) muestra solo la comparación del sitio que se va a probar** y enlaza a la ficha completa de `web/`.
  El mapa completo, el quiz y las fichas viven en `web/` y **no se duplican en el juego**.
- Los otros frentes no tocan estas carpetas. Si el juego necesita algo de aquí, lo lee de `data/sites/`, nunca de `web/` ni de `analisis/`.

## 9. Frentes de trabajo y sincronización

Cada persona trabaja con su agente en **su propia rama** (`feat/<frente>`). Nadie trabaja directo en `main`.

```bash
git clone <repo> && cd <repo>
git checkout -b feat/<frente>        # modelo | juego | taller | expediente | arte
cp docs/estado/_plantilla.md docs/estado/<frente>.md
```

| # | Frente | Rama | Carpetas que posee | Entregable mínimo |
|---|---|---|---|---|
| 1 | Modelo, datos y API del modelo | feat/modelo | /model, /data/targets, /data/sites, /data/known_analogs.json, /api (/score, /submit), /analisis, /ciencia_datos, /informe, /PROYECTO.md, /web/public/data | Variables reales de 3 sitios, 2 destinos, validación, búsqueda global en zonas áridas (§6.4) con México como caso destacado, endpoints |
| 2 | Juego: física, prueba y misión | feat/juego | /game/src/scenes/Prueba, Mision, Resultados, /game/src/fisica/, /game/src/feedback/ | Recorrido con perfil real, gravedad, victoria/derrota, puntuación, feedback por reglas |
| 3 | Taller y piezas | feat/taller | /game/src/scenes/Taller.js, /game/src/scenes/Taller/, /game/src/content/parts.json, /docs/taller/ | Investigación de ruedas/materiales, armado con ranuras, presupuesto, validación del diseño |
| 4 | Expediente, explorador y menú | feat/expediente | /game/src/scenes/Boot, Menu, Expediente, Explorador | Pantalla de carga, comparación 1 a 1, consulta de coordenadas y propuesta de sitio |
| 5 | Arte | feat/arte | /assets | Estilo, robot y piezas, 3 fondos de sitio + 1 de Marte, UI, tarjetas del expediente |
| 6 | Integración, pitch y entrega | main | /AGENTS.md, /CLAUDE.md, /data/schema, /docs/DECISIONES.md, /web (salvo /web/public/data) | Merges, camino dorado, metodología, tráiler, página en inglés, entrega |

El LLM de feedback es extra: endpoint `/feedback` en /api (frente 1) consumido por el frente 2, siempre con respaldo por reglas.

### 9.1 Cómo nos mantenemos sincronizados (personas y agentes)

Somos 6 personas en 6 computadoras. **GitHub es el punto de sincronización**; los worktrees son opcionales.

- **Ramas por frente + Pull Requests a `main`.** Cada persona clona el repo en su computadora y trabaja en su rama.
- **Worktrees solo si una persona corre varios agentes a la vez** en su máquina (ej. Claude Code en una rama y Codex en otra):
  `git worktree add ../mc-<tarea> -b feat/<frente>-<tarea>`. Así no se pisan entre sí.
- **Al iniciar cada sesión, el agente ejecuta:** `git fetch origin && git rebase origin/main`, y lee este archivo,
  `docs/DECISIONES.md` y `docs/estado/*.md`.
- **Al terminar una tarea, el agente actualiza SOLO el archivo de estado de su frente** (`docs/estado/<frente>.md`):
  qué hizo, qué sigue, qué bloquea. Cada frente tiene su propio archivo para evitar conflictos.
- **Archivos compartidos con dueño único** (solo los cambia el integrador vía PR): `AGENTS.md`, `CLAUDE.md`, `data/schema/`,
  `docs/DECISIONES.md`, y los archivos comunes del juego: `game/src/main.js`, `game/src/data.js`, `game/src/config/world.js`,
  `game/src/scenes/ui.js`, `game/package.json`. Todas las escenas ya están registradas: no necesitas tocar `main.js`. Si un agente necesita cambiarlos, lo propone en su PR.
- **Instrucciones por carpeta (opcional):** un frente puede poner un `AGENTS.md` dentro de su carpeta (ej. `/model/AGENTS.md`) con
  reglas específicas, más un `CLAUDE.md` con `@AGENTS.md`. Ambos agentes lo leen al trabajar en esa carpeta.
- **Validación automática:** una acción de GitHub valida los JSON de `data/` contra `data/schema/` y que el juego compile en cada PR.
- **Puntos de control:** el integrador hace merge a `main` y avisa por el chat del equipo; todos hacen `git pull` / rebase.
- Ningún agente hace merge a `main`. Cada persona revisa el diff de su agente antes de abrir el PR.

## 10. Calendario (ajustar a la hora real del pitch)

| Cuándo | Qué |
|---|---|
| Sáb, arranque | Aceptar este documento, crear worktrees, congelar contratos de datos v1 |
| Sáb 18:00 | Punto de control 1: cada frente muestra algo corriendo con datos de ejemplo |
| Sáb 22:00 | Punto de control 2: primer recorrido completo de principio a fin (aunque sea feo) |
| Dom 10:00 | Punto de control 3: datos reales en los 3 sitios, arte integrado |
| Dom 12:00 | **Congelar funciones.** Solo arreglos, pulido, tráiler y pitch |
| Dom (pitch) | 2 min + 1 min de preguntas |
| Dom 21:00 | Entrega subida (página en inglés, video de 30 s, enlaces) |

## 11. Camino dorado de la demo (debe funcionar siempre)

Carga → Marte → Expediente de Samalayuca (comparación con Jezero) → ticket → Taller: ruedas estándar → prueba en dunas: patina →
feedback "cambia a ruedas anchas" → prueba otra vez: pasa → misión en Marte → llega a la base → entrega → puntuación.
Camino lunar: el mismo flujo eligiendo la Luna, con el maar Al Hutaymah (g00263; decisión del 15 nov, ver DECISIONES) y misión con gravedad 1.62 m/s².
Los dos caminos deben funcionar. Lo que se muestre como funcional debe funcionar en estos caminos; lo que sea visión se presenta como visión.

## 12. Criterios de aceptación

- **Datos trazables:** cada variable del expediente remite a una fuente; los datos de demostración están marcados.
- **Modelo validado:** controles negativos cerca de 0 %; análogos conocidos altos; resultado documentado.
- **Construcción real:** cambiar el tipo o la posición de una pieza cambia una propiedad del robot.
- **Presupuesto:** no se puede iniciar si se excede; quitar piezas actualiza el costo.
- **Entorno efectivo:** cambiar gravedad o agarre cambia el comportamiento de forma consistente.
- **Entrega y reinicio:** victoria y derrota se detectan bien; reiniciar no duplica recursos.
- **Accesible:** se completa con teclado o táctil; carga rápida.
- **Feedback sustentado:** cada recomendación corresponde a eventos reales de la partida.

## 13. Cumplimiento del reto (página oficial) — revisar antes de entregar

| Lo que pide el reto | Cómo lo cubrimos | Dónde |
|---|---|---|
| Usar datos abiertos de la NASA (Tierra) y de la Luna/Marte | NASA POWER, MODIS, SRTM (Tierra); MOLA/HRSC, MEDA (Marte); LOLA, Diviner (Luna) | §6.2 |
| Identificar uno o más lugares de la Tierra | Sitios curados + escaneo sistemático + propuestas de usuarios | §6.4 |
| Caracterizarlos | Expediente con variables, fuente, fecha, unidad y similitud por dimensión | §4, §7 |
| Análogos de bases lunares permanentes o sitios de Marte | Modelo calcula para Jezero y para el polo sur lunar | §6.2 |
| Explicar qué es análogo, qué tanto y dónde se rompe | Similitud por dimensión + `limites` + lo que la Tierra no puede probar | §6.3, §5 |
| Cómo ayuda a preparar la exploración | `uso_exploracion` por sitio + el juego: probar un rover antes de la misión | §7, §4 |
| Ir más allá de la similitud visual | Variables medidas, no imágenes; veto por vegetación | §6.3 |
| Buscar más allá de los análogos famosos | Búsqueda global en zonas áridas (máscara MODIS + detector en regiones priorizadas) + `novedoso` contra `known_analogs.json` | §6.4 |
| Escala fina (un cráter, un valle) | Puntos y transectos concretos, con resolución declarada | §6.5 |
| Procesos, no solo lugares | Campo `proceso` (ej. dunas eólicas) | §7 |
| Reconocer los límites de la Tierra | Gravedad, presión, radiación, vacío siempre declarados | §6.3 |
| Presentarlo como mapa, visualización o herramienta | Mapa + explorador de coordenadas + juego | §4 |
| Documentarlo para el público | `docs/METODOLOGIA.md` (1 página) + página del proyecto en inglés | §14 |

**Pitch de 2 minutos (estructura de la sede: el reto, la solución, por qué importa):**
15 s el reto ("la Tierra puede entrenarte para la Luna y Marte… pero no en todo") · 45 s tráiler del camino dorado ·
30 s el modelo y su validación (datos NASA, búsqueda global en zonas áridas con cifras reales, controles negativos, sitio novedoso) · 20 s por qué importa (educación + catálogo abierto +
propuestas de usuarios) · 10 s cierre. Preparar respuestas para: "¿qué modelo es?", "¿de dónde salen los números?", "¿qué no puede probar la Tierra?".

## 14. Checklist de entrega

- [ ] Demo pública (enlace) funcionando en el camino dorado.
- [ ] Video de ≤30 s (o ≤7 diapositivas) con subtítulos en inglés.
- [ ] Página del proyecto en inglés: descripción, datos de NASA usados (con enlaces), otras fuentes, herramientas.
- [ ] `docs/METODOLOGIA.md`: variables, fórmula, validación y límites.
- [ ] Declarar uso de IA en código, documentación, arte y etiquetado de datos (Claude Code / Codex; etiquetas contrastadas con fuentes). Copiar docs/USO_IA.md al campo correspondiente de la plataforma.
- [ ] Repositorio público con README.
- [ ] Subido antes de las 21:00 del domingo (límite real 23:59).

## 15. Extras (solo después del camino dorado; no empezarlos sin acuerdo del equipo)

- **Estaciones además de robots:** alternar entre construir un robot o una estación/módulo de base (hábitat, energía, protección contra
  el polvo). MVP = robots; estaciones como segundo modo de construcción, con el mismo taller, sitios y modelo.
- Cuadrícula libre de construcción tipo Bad Piggies (el MVP usa ranuras fijas).
- Minijuegos cortos que evalúan componentes (tracción, brazo, energía, sensores).
- Feedback con LLM anclado en telemetría (el MVP usa reglas).
- Compartir puntuación (tarjeta voluntaria).
- Mando tipo NES en el teléfono.
- Cuentas de usuario (Supabase).
- Clustering/kNN sobre la malla de variables.
- Visión a futuro para el pitch: exportar el robot a otros formatos (render, CAD, 3D).

## 16. Pendientes que decide el equipo (no los decidas tú, agente)

Hora exacta del pitch · tercer sitio · sitio análogo del camino lunar · qué destino se muestra en el tráiler · paleta final · tipo de suministro · ¿usar LLM en la demo o solo reglas?
· ¿el "generador de video" mencionado en la reunión es para el tráiler?
