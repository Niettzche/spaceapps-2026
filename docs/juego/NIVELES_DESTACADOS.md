# Niveles destacados: 7 lugares distintos, con clima real, viento, obstáculos y eventos

> Dueño: frente juego. Código: `game/src/content/niveles_destacados.js` (configuración), `game/src/content/clima_niveles.js`
> (NASA POWER), `game/src/fisica/viento.js`, `elementos_nivel.js`, `eventos_fondo.js`, `nivel_destacado.js` (enlace con
> `recorrido.js`). Pruebas: `node --test game/src/fisica/niveles_destacados.test.mjs`.
> Fuentes verificadas por Leo: `docs/taller/FUENTES_NIVELES.md` (#96; filas AM-038…076, fuentes S106–S147 del libro de datos).
> Regla (AGENTS.md §3): nada inventado. Lo agregado al perfil del DEM es **recreación** (`recreacion: true`, se declara en el panel
> de datos, tecla I) y todo número sin fuente es **valor de juego (P)**. Balance medido con la **física 2** (modo por defecto).

## Cómo se eligieron

Los 5 sitios de mayor similitud de `data/sites` con nivel jugable, uno por tipo de lugar: volcán de toba, impacto en desierto,
mina a cielo abierto, campo de lava e impacto helado. Tres entrenan para Marte (Jezero) y dos para la Luna (polo sur).
Después (15 nov, para tener variación de todo y un tráiler más interesante) se agregaron dos: **6. Samalayuca** (dunas y viento;
es el camino dorado de Marte, así que solo recibe ambiente) y **7. Hoya Rincón de Parangueo** (maar con lago seco salino).

## Lo que es igual en los 7

- **Clima real de NASA POWER** (API de climatología por punto, sin llave, consultada el 15 nov 2026; el mismo servicio de
  `model/features.py`). Temperaturas típicas con el método de `docs/taller/AMBIENTE.md` (datos diarios 2015–2024; Pinacate
  reproduce 7.1 / 39.7 °C de la tabla), extremos, media, presión `PS`, viento a 10 m `WS10M` (media) y `WS10M_MAX`, nieve `SNODP`.
  La densidad del aire es **derivada** (gas ideal). Son valores de la celda de la malla (MERRA-2, ~0.5° × 0.625°), no de una estación.
- **Viento con física:** `F = ½ · ρ · v · |v| · Cd · A` (EQ-021 del libro de datos), con ρ del lugar. El viento de 10 m se baja a la
  altura del robot (1 m) con el perfil logarítmico, `z0 = 0.03 m` (P). `Cd = 1.0`, `A = 1.5 m²` (P). Ráfagas de 2–4 s cada 8–16 s
  (P, con semilla), con pico entre la media (`WS10M`) y el máximo (`WS10M_MAX`); 60 % de frente (P). La fuerza se aplica al chasis
  (`Matter.Body.applyForce`, sin tocar `robot.js`) con la misma escala del juego que la gravedad (× 1.5), así se conserva la
  proporción real viento / peso. Partículas de polvo, ceniza o nieve vuelan con la ráfaga.
- **En Marte el viento casi no empuja:** con ρ = 0.017 kg/m³ (~1.4 % de la Tierra; S01, S03), una ráfaga de 10 m/s (WX-017, primer reporte de
  MEDA, S22) da ~0.5 N sobre el robot (0.2 % de su peso en Marte). La misma ráfaga en la Tierra daría ~33 N. El juego lo dice en el
  panel de datos de la misión. En la Luna no hay aire: no hay viento.
- **«Qué entrena»** aparece en las instrucciones al empezar la prueba (fila con ★) y en el panel de datos (tecla I).

| Sitio | T típica (°C) | Extremos (°C) | Media (°C) | PS (kPa) | ρ (kg/m³, derivada) | Viento medio / máx. a 10 m (m/s) | Nieve media (cm) |
|---|---|---|---|---|---|---|---|
| g00266 Jabal Bayda | 5.5 a 40.3 | −5.75 / 43.76 | 22.95 | 86.97 | 1.023 | 5.06 / 17.06 | 0 |
| tenoumer | 9.5 a 44.6 | 2.2 / 48.77 | 26.09 | 98.38 | 1.145 | 4.53 / 15.10 | 0 |
| mx0023 Cananea | 2.6 a 35.1 | −11.24 / 43.11 | 17.44 | 86.65 | 1.039 | 3.60 / 15.91 | 0.13 |
| pinacate | 7.1 a 39.7 | −4.65 / 48.41 | 22.30 | 96.96 | 1.143 | 3.81 / 18.42 | 0.01 |
| pingualuit | −34.4 a 12.1 | −49.09 / 23.89 | −9.69 | 95.37 | 1.261 | 5.64 / 20.89 | 38.53 (2.5–70 por mes) |
| samalayuca | 0.3 a 36.2 | −14.51 / 42.41 | 17.85 | 87.31 | 1.045 | 4.05 / 19.28 | 0.58 |
| mx0261 Rincón de Parangueo | 7.5 a 32.6 | −2.2 / 37.31 | 18.54 | 81.58 | 0.974 | 2.86 / 14.73 | 0 |

Fuente de todas las filas: NASA POWER, climatología mensual 2001–2025 y datos diarios 2015–2024; URL de consulta en
`game/src/content/clima_niveles.js`. Samalayuca ya estaba en `docs/taller/AMBIENTE.md`: el juego conserva esos valores y solo toma
el viento y la nieve; con el mismo método, la consulta nueva reproduce la tabla (0.3 / 36.2 °C, 87.31 kPa, 1.045 kg/m³).

## 1. Anillo de toba Jabal Bayda (g00266, Arabia Saudita) → Marte

- **Analogía:** anillo de toba de **comendita** (riolita) en Harrat Khaybar (S106; GVP y NASA lo llaman cono de toba, los especialistas
  anillo de toba: Draft), con depósitos ricos en **lapilli** y bombas en coliflor (S108). Diámetro publicado ~1.4–1.5 km (el detector a
  200 m da 1.03 km). Suelo suelto y viento: lo que tiene Marte, pero allá el aire empuja ~70 veces menos.
- **Qué entrena:** cruzar lapilli sueltos y bombas volcánicas con viento («ceniza blanda» no está en ninguna fuente: se quitó).
- **Recreado:** parches de lapilli de toba suelto (cada 18–24 m, 9–13 m de largo, solo en tramos ≤ 18°): para la física son arena que se hunde
  (Bekker de arena seca genérica, FISICA_V2.md) con −40 % de agarre (P); sin Bekker de lapilli con fuente, no se cambió el balance. El ángulo de reposo de ceniza y escoria es 25–32° (NPS, S61).
  Bombas volcánicas de 0.3–0.6 m (P). Fondo: `maar`.
- **Viento:** ráfagas de hasta 17 m/s a 10 m (≈ 10 m/s a 1 m) → hasta ~80 N, ~12 % del peso (Tierra). Partículas de ceniza.
- **Eventos:** velos de polvo con las ráfagas.
- **Pide:** rueda **ancha o de malla** (flotación). Fallan la estándar, la de tacos y la de Nitinol: se hunden en la toba.

## 2. Cráter de impacto Tenoumer (Mauritania) → Marte

- **Analogía:** cráter de impacto real de 1.9 km y 1.57 ± 0.14 Ma (S125–S127) en el Sáhara: borde levantado, eyecta **muy erosionada**
  (bloques y megabloques en el borde sur) y arena, como los cráteres de Marte. Jezero tiene más remolinos de polvo que cualquier sitio visitado por una misión (WX-018, S21).
- **Qué entrena:** cruzar arena y subir el borde de un cráter entre bloques de eyecta.
- **Recreado:** bloques de eyecta de 0.6–1 m cada 12–18 m (arte `obstaculo_eyecta_*`). **Gap** para Tenoumer (solo hay bloques de brecha de cm a
  dm): tamaño y separación son (P). Regla general disponible: Golombek y Rapp 1997, reformulado en Golombek et al. 2012 (S86, S129, MR-071). Las paredes de arena de más de 20° ya son roca por la
  regla de paredes de la física 2 (suelo_v2.js). Fondo: `desierto`.
- **Viento:** hasta 15 m/s a 10 m. Partículas de polvo.
- **Eventos:** remolinos de polvo (`evento_remolino`): mientras pasan cerca, el panel recibe ~1 % menos luz y, en 1 de cada 5
  (proporción P), 15 % menos (lo medido: 0.1–1 % típico y > 15 % en los más fuertes, MR-083; antes era 30 %, demasiado). WX-018/019:
  «brief power dip», 4 vórtices por sol en Jezero, S24.
- **Pide:** rueda **de malla** (la más grande, 0.55 m de radio: pasa sobre los bloques) y, para la carga, **soporte con correas**.
  Fallan la estándar y la de tacos (se hunden en el piso de arena). La ancha también llega: 3 de 3 a la meta, con la carga al 77 %
  (playtest de Leo, 15 nov (simulación por pasos); antes: llegó con la carga al 72 % y, con correas, se atascó a 74 m).

## 3. Tajo de Cananea (mx0023, Sonora) → Luna

- **Analogía:** análogo **operativo, no geológico**, y encuadre nuestro: un tajo escalonado como el que excavaría la minería de recursos
  (ISRU) en la Luna (la NASA dice que las lecciones de la minería se transfieren, pero nadie nombra un tajo como análogo: Draft, S140).
  Tajo de cobre Buenavista del Cobre (S137). En la Luna no hay viento.
- **Qué entrena:** subir las rampas del tajo con talud suelto y piedras que ruedan. Las paredes reales tienen 40–50° entre rampas y caras
  de banco de 60–80° (S138); el DEM de 30 m las suaviza y la ventana jugable no pasa de 30°: es simplificación (P).
- **Recreado:** talud de roca suelta en las paredes (cada 16–24 m, en tramos de 12–30°, por debajo del ángulo de reposo de la roca suelta,
  34–41°, típico 37°; Call 1985, S138): sin parámetros de talud con fuente, se trata
  como material granular que se hunde (arena, P) con −30 % de agarre (P). Probado: como «roca» con menos agarre no cambia nada, porque
  en roca la fricción no limita la subida. Desprendimientos: al pasar los m 70 y 150, caen 3 piedras de 0.2–0.3 m delante del robot,
  ruedan y se quedan como obstáculo (P). Fondo: `mina`.
- **Viento:** hasta 16 m/s a 10 m (es la prueba en la Tierra). Partículas de polvo.
- **Pide:** rueda **de malla** (5 de 5). La ancha pasa solo a veces (2 de 5) desde que la roca de la Tierra usa μ ≈ 0.7 (15 nov,
  FISICA_V2.md §5.2): la pared de roca de 23.6° (m 79–93) le queda en el límite. Fallan la estándar, la de tacos y la de Nitinol.

## 4. Campo volcánico El Pinacate (Sonora) → Luna

- **Analogía:** campo basáltico donde la NASA entrenó a la tripulación del **Apolo 14** (feb. 1970) en cráteres y coladas (S115, ✓); la
  mayoría de sus flujos son aa (S110, S111). Los mares lunares son basalto, pero su superficie es regolito, no bloques aa (Draft, S116).
  La Tierra no reproduce el vacío ni la gravedad.
- **Qué entrena:** pasar bloques de lava aa donde la NASA entrenó a la tripulación del Apolo 14 (1970): frena o blinda el robot.
- **Recreado:** bloques de lava aa de 0.5–0.8 m cada 16–24 m (arte `obstaculo_lava_aa_*`; tamaño **P**: Gap para Pinacate, y en aa en
  general la mayoría mide < 0.3 m y el máximo 0.1–0.6 m, S113, S114). Golpearlos a más de 3.5 m/s (el mismo umbral
  del daño del chasis, `danio.js`) quita 2 puntos de resistencia por m/s extra, también al pisarlos con las ruedas (P). Despacio no hay
  daño. Fondo: `lava`.
- **Viento:** hasta 18 m/s a 10 m. Partículas de ceniza.
- **Pide:** **chasis reforzado o de titanio**. El chasis ligero se destruye (con rueda estándar o de tacos), salvo que se maneje despacio.

## 5. Cráter de impacto Pingualuit (Nunavik, Quebec) → Marte

- **Analogía:** cráter de impacto real de 3.4 km y 1.4 ± 0.1 Ma en el Ártico (S131, S132), con nieve la mayor parte del año (SNODP medio
  38.5 cm; en julio y agosto solo 2–3 cm, S134). Marte tiene hielo y frío, pero su aire casi no empuja. **Nieve como análogo de Marte:
  Gap** (ningún rover se probó en nieve para Marte; Devon Island fue permafrost en verano, S135, S136): abstracción de juego (P).
- **Qué entrena:** cruzar nieve profunda y hielo con frío ártico y el viento más fuerte de los cinco.
- **Recreado:** nieve casi continua (parches de 10–11 m cada 11–12 m): sin parámetros de nieve con fuente (FISICA_V2.md §3), se trata como
  arena suelta que se hunde (P) con −50 % de agarre (P). Hielo en tramos casi planos con −65 % de agarre (P). Fondo: `desierto`
  (no hay fondo ártico: pedir a Mauricio).
- **Viento:** ráfagas de hasta 21 m/s a 10 m (≈ 12.5 m/s a 1 m) → hasta ~150 N, ~22 % del peso. Partículas de nieve.
- **Frío:** la mínima típica es −34.4 °C: la regla del frío (ambiente.js) deja la batería al 99 %; el calentador quita esa pérdida.
- **Eventos:** nieve que sopla.
- **Pide:** rueda **de malla** (5 de 5); la ancha pasa 4 de 5 (la pared de roca de 30°, m 60–73, con roca μ ≈ 0.7; FISICA_V2.md §5.2).
  Fallan la estándar y la de tacos.

## 6. Médanos de Samalayuca (Chihuahua) → Marte · camino dorado, solo ambiente

- **Analogía:** dunas formadas por el viento (procesos eólicos, campo `proceso` del sitio). Las dunas de la Tierra y de Marte tienen la
  misma forma y los mismos procesos (Curiosity en las dunas Bagnold, S143, S144, ✓), pero **ningún artículo usa Samalayuca por nombre
  (Gap)**. Datos: 139.7 km², arena de cuarzo al 88–95 %, dunas de 4–5 m a 120 m (S141). Límite: la arena de Marte es basáltica y necesita
  ~7 veces más viento para moverse (S145, S146).
- **Qué entrena:** subir y bajar dunas de arena suelta sin hundirse.
- **Es el camino dorado de Marte (AGENTS.md §11):** con la rueda estándar se hunde y con la ancha pasa, calibrado con la física 2
  (FISICA_V2.md §5). Por eso la configuración tiene `solo_visual: true` y `viento: { empuja: false }`: **no** se agregan parches, bloques
  ni fuerza del viento, y el remolino **no** baja la luz del panel en este nivel. El panel de datos (tecla I) lo dice.
- **Viento (visual):** el real del sitio, hasta 19 m/s a 10 m (NASA POWER WS10M_MAX), con el mismo programa de ráfagas. La arena que vuela
  sigue la intensidad: en calma se ve un tercio de los granos y con ráfaga todos, con estelas más largas.
- **Eventos (visuales):** remolinos de polvo (`evento_remolino`) y arena que se vuela de las crestas de duna (`cresta_humea`: máximos
  locales del perfil que sobresalen ≥ 0.8 m en ±8 m, P), más larga y densa con más viento. Fondo: `dunas` (el que ya tenía).
- **Balance sin cambios** (simulación por pasos, física 2, 2 corridas por diseño, mismo diseño base): estándar atascada a 12–13 m,
  ancha a la meta en 53 s con E 43 %, igual que antes del cambio. Las corridas varían ±1 m y ±0.4 m/s de velocidad máxima también sin
  el cambio (la escena corre unos cuadros en tiempo real antes de la simulación).

## 7. Hoya Rincón de Parangueo (mx0261, Guanajuato) → Luna (polo sur)

- **Destino:** `polo_sur_lunar`, tal cual `data/sites/mx0261.json` (su gemelo de forma es un cráter del polo sur lunar de 1.37 km y
  104 m de hondo). La sal es del lugar, no de la Luna: el panel lo dice («en la Luna no hay sal, agua ni aire»).
- **Analogía con Marte (comparación nuestra, Draft):** ningún artículo usa Rincón como análogo. El proceso se parece (lago cerrado que se
  evapora: sulfatos en Gale; cloruros, sulfatos y percloratos en Jezero, S121–S124), pero las sales no (aquí, carbonatos de sodio).
- **Fuentes del lago** (✓ S118–S120): Aranda-Gómez et al. 2013 (Bol. Soc. Geol. Mex. 65(1), 169–188): lago perenne hasta los años ochenta, desecado
  por la sobreexplotación del acuífero; hoy es lago-playa con evaporitas abundantes (trona, termonatrita, eitelita, halita, silvita) y
  fue «el lago más salino de la región». Sánchez-Sánchez et al. 2021 (RMCG 38(3), doi 10.22201/cgeo.20072902e.2021.3.1636): capa de
  lodo saturado y móvil bajo el piso seco.
- **Tramo del DEM:** la ventana crítica automática (m 1170–1420) era solo la pared y dejaba fuera el piso del lago. Se fijó en
  `perfil.js` (`VENTANAS_JUEGO.mx0261`) el tramo m 1700 → 1170 del transecto (530 m, sentido inverso): 80 m del piso del lago seco
  (tramo `compacto` del DEM) y la pared oeste del maar, que sube 96 m con hasta 28°. Es más largo que los otros (546 m con los planos)
  porque el cráter es ancho.
- **Recreado:** costra de sal (`obstaculo_sal`, −30 % de agarre, P; superficie `compacto`: no se hunde) y lodo donde la costra se rompe
  (−40 % de agarre, P; sin Bekker de lodo con fuente, se trata como arena genérica que se hunde, P). Los dos **solo sobre el piso
  `compacto` del DEM** (`soloSobre`), nunca en la pared. Fondo: `maar` (Al Wahbah, con fondo de costra blanca de sal); falta un fondo de
  salar propio.
- **Viento con física:** hasta 14.7 m/s a 10 m (ρ = 0.974). Partículas de sal.
- **Eventos (visuales):** espejismo sobre la playa caliente y velos de polvo salino con las ráfagas.
- **Pide:** **batería mediana o grande** (recorrido largo y subida de 96 m). Con la batería chica ninguna rueda llega con holgura
  (estándar, ancha y tacos se quedan sin energía a 511–538 m; la malla, a ~536 m según el playtest de Leo, 15 nov (simulación por
  pasos); antes llegaba con 0 %). La rueda no decide: la costra y el lodo son
  tramos cortos y planos.

## Obstáculos v2 (15 nov, mañana): que se vean, más donde se juega y avisos

Respuesta a «los obstáculos no los acabo de ver, lo sigo viendo muy lineal» (Edmundo). Código: `fisica/obstaculos.js`,
`fisica/elementos_nivel.js`, `fisica/avisos.js`. Todo lo agregado es **recreación** (`recreacion: true`) con semilla fija por nivel;
lo que no trae fuente es (P).

| Nivel | Antes | Después | Fuente o P |
|---|---|---|---|
| Misión Jezero | 8 rocas de 0.34–0.60 m | **17 rocas de 0.25–0.62 m** (separación ≥ 5 m) | Distribución de Golombek y Rapp 1997, reformulada en Golombek et al. 2012 (S86, S129; MR-071): F_k(D) = k·e^(−qD), q = 1.79 + 0.152/k. **k de Jezero = Gap**: k = 8 % (P; Viking 1 midió ~7–8 %). De F_k sale cuántas rocas corta la ruta por metro (λ ≈ 0.089 /m para D 0.25–0.8 m). D < 0.25 m no se ve a esta escala y D > 0.8 m se esquiva al planear la ruta (P). Asoman 0.8 del radio (P). |
| Misión Luna | 3 rocas de 0.34–0.36 m | **2 cráteres pequeños de 4.4 y 4.6 m** (0.26 y 0.27 m de hondo) + 3 rocas | d/D = **0.060**: el que mide nuestro detector en el polo sur con LOLA (PROYECTO.md). Es la forma de cráteres de km aplicada a cráteres de 3–5 m (P; con 3–7 m la energía de la misión lunar bajaba a 5 %); separación (P). Cuenco coseno sin borde levantado (a 200 m el borde lunar sale negativo). Solo en tramos de ≤ 8° (los primeros 95 m: después el perfil sube a 16–21°). |
| Samalayuca (camino dorado Marte) | 1 parche de arena blanda | **4 parches** (3 nuevos en los valles entre dunas) + rizaduras de viento y matorral seco (solo dibujo, sin colisión) | Valle = mínimo local que baja ≥ 0.4 m en ±8 m (P); agarre −25 % (P, el mismo de antes). Rizaduras: dunas activas de cuarzo (S141). |
| Al Hutaymah g00263 (camino dorado Luna) | nada | **5 bloques de toba** de 0.3–0.4 m (asoman ≤ 0.13 m) + matorral (solo dibujo) | Anillo de toba de un campo basáltico; tamaño y separación (P). |
| Tenoumer, Pinacate, Pingualuit, Cananea, Jabal Bayda, Parangueo | los mismos | **los mismos números** (no hay fuente para más), pero visibles | — |

**Que se vean.** Los bloques de los destacados se dibujaban a ×1–2 del arte (diminutos) y las rocas recortadas a 2 px de arte; el arte
de roca de Marte y la Luna tiene casi el color del suelo y solo se veía el contorno. Ahora: arte a ×3 (como todo el juego), mínimo
**3 px de arte** visibles, contorno oscuro a los lados, **borde de luz arriba** y sombra; las rocas de Marte y la Luna llevan un velo
claro (las rocas frescas se ven más claras que el polvo). Los parches llevan una franja clara arriba que sigue el terreno, banda oscura
debajo, bordes marcados y hoyuelos en arena blanda, nieve, lodo, lapilli y talud. Los cráteres lunares, borde iluminado y fondo en
sombra. La colisión no cambió: el dibujo puede asomar hasta 1 px de arte más que el cuerpo (mínimo visible).

**Avisos** (`fisica/avisos.js`): la primera vez que un tipo de obstáculo queda a ≤ 9 m delante del robot sale un cartel corto arriba
al centro, bajo el HUD (fuente pixel 16 px, triángulo dibujado porque la fuente no trae «⚠», 2.6 s): «Arena blanda», «Bloques de toba»,
«Campo de rocas: el robot frena solo» (misiones), «Rocas: pásalas despacio», «Cráter pequeño», «Eyecta: bloques del cráter», «Lava aa:
frena», «Bombas volcánicas», «Lapilli suelto», «Talud suelto», «Nieve: las ruedas se hunden», «Hielo: patina», «Costra de sal: patina»,
«Lodo blando», y para eventos: «¡Piedras rodando!» (desprendimiento de Cananea) y «Remolino de polvo: tapa el sol» (solo donde el
remolino sí baja la luz: Tenoumer y Jezero). En inglés con `tr()`. Uno por tipo y por partida; si llegan dos, van en cola.

**Dinámicos (ya existían; se revisaron):** piedras que ruedan desde un banco en Cananea y quedan como obstáculo (`desprendimiento`, P),
remolinos que cruzan la pista en Tenoumer y Jezero (y solo visuales en Samalayuca), ráfagas visibles con partículas (arena en
Samalayuca, nieve en Pingualuit, ceniza en Jabal Bayda) y polvo que sale en arco balístico en la Luna (`efectos.js`, sin aire).
Todos con semilla por nivel y declarados como recreación en el panel de datos (tecla I).

**Camino dorado tras el cambio** (simulador por pasos, física 2, 5 inicios distintos: 0, 3, 7, 13 y 20 pasos sin acelerar;
diseño base chasis ligero + motor eficiente + batería chica + soporte básico): ver la tabla en FISICA_V2.md §5.3.

## Misiones finales (viento, eventos y, desde la v2 de obstáculos, rocas de Golombek y cráteres lunares)

- **Jezero (Marte):** viento de ráfagas de 10 m/s con ρ = 0.017 (casi no empuja; se explica en el panel), partículas de polvo,
  remolinos de polvo (~1 % menos luz al panel al pasar; 15 % los fuertes, MR-083) y Fobos cruzando el cielo (acelerado: el tránsito real dura horas).
- **Polo sur lunar:** sin viento; la Tierra baja sobre el horizonte y destellos de micrometeorito (visuales).

## Tabla de balance (física 2, simulación sin tiempo real, 60 Hz, acelerador a fondo)

Diseño base: chasis ligero, motor eficiente, batería chica, soporte básico, ruedas estándar (730 cr). Se cambia lo indicado.

| Nivel | Diseño | Costo | Resultado |
|---|---|---|---|
| g00266 | estándar | 730 | atascado a 37 m |
| g00266 | tacos | 970 | atascado a 56 m |
| g00266 | Nitinol | 970 | atascado a 55 m |
| g00266 | **ancha** | 890 | **meta**, 57 s, E 39 % |
| g00266 | **malla** | 810 | **meta**, 55 s, E 45 % |
| tenoumer | estándar | 730 | atascado a 18 m |
| tenoumer | tacos | 970 | atascado a 19 m |
| tenoumer | ancha | 890 | **meta 3/3, carga 77 %** (playtest de Leo, 15 nov (simulación por pasos); antes: carga 72 %, con correas se atascó a 74 m) |
| tenoumer | **malla** | 810 | **meta**, carga 86 % |
| tenoumer | **malla + correas** | 845 | **meta**, carga 91 % |
| mx0023 | estándar | 730 | atascado a 33 m |
| mx0023 | tacos | 970 | atascado a 32 m |
| mx0023 | Nitinol | 970 | atascado a 34 m |
| mx0023 | **ancha** | 890 | **meta**, 55 s, E 42 % |
| mx0023 | **malla** | 810 | **meta**, 54 s, E 47 % |
| pinacate | estándar (ligero) | 730 | chasis destruido a 158 m |
| pinacate | tacos (ligero) | 970 | chasis destruido a 158 m |
| pinacate | **reforzado** | 840 | **meta**, resistencia 32/80 |
| pinacate | **titanio** | 880 | **meta**, resistencia 67/120 |
| pinacate | ancha + reforzado | 1000 | meta, resistencia 38/80 |
| pingualuit | estándar | 730 | atascado a 30 m |
| pingualuit | tacos | 970 | atascado a 29 m |
| pingualuit | **ancha** | 890 | **meta**, E 42 % |
| pingualuit | **malla** | 810 | **meta**, E 47 % |
| pingualuit | ancha + calentador | 930 | meta, E 43 % (sin pérdida por frío) |
| samalayuca | estándar | 730 | atascado a 12–13 m (igual que sin el ambiente nuevo) |
| samalayuca | **ancha** | 890 | **meta**, 53 s, E 43 % (igual que sin el ambiente nuevo) |
| mx0261 | estándar | 730 | sin energía a 538 m |
| mx0261 | ancha | 890 | sin energía a 511 m |
| mx0261 | tacos | 970 | sin energía a 514 m |
| mx0261 | malla | 810 | **sin energía a ~536 m** (playtest de Leo, 15 nov (simulación por pasos); antes: meta con E 0 %, al límite) |
| mx0261 | **estándar + batería mediana** | 770 | **meta**, 103 s, E 34 % |
| mx0261 | **estándar + batería grande** | 810 | **meta**, 104 s, E 50 % |
| mx0261 | ancha + batería mediana | 930 | meta, E 30 % |
| mx0261 | malla + batería mediana | 850 | meta, E 35 % |

**Re-medición del 15 nov (tarde)**, tras los valores de suelo verificados por Leo (roca μ ≈ 0.7, suelo compacto 38°) y el tope de 30°
de las caras de duna: 5 arranques por diseño en el simulador por pasos. Tabla completa en `FISICA_V2.md` §5.2. Cambios: Cananea con
ancha 2/5 (antes meta) y Pingualuit con ancha 4/5; los demás diseños de la tabla siguen igual (malla, reforzado: 5/5; estándar: 0/5).

## Lo que la física no permite hoy (y por qué no se forzó)

- **Rueda de tacos para el talud o la lava:** en la física 2 la fricción en roca no limita la subida (Matter no aplica Coulomb exacto;
  ver `FRICCION_ESTATICA`), así que un parche de «roca con menos agarre» no cambia nada, ni con −88 %. Para que los tacos importen haría
  falta un modelo de esfuerzo en roca con fuente. No se inventó un número para forzarlo.
- **Batería para el Ártico:** el frío de Pingualuit quita solo 1 % (la regla del frío tiene piso de 97 %) y la nieve no gasta más que la
  arena. El calentador se recomienda, pero no decide el resultado.
- Por eso tres niveles piden flotación (ancha o malla; en Cananea y Pingualuit, malla: ver la re-medición). Lo distinto entre ellos es el suelo (toba, talud, nieve), el viento y los eventos.
- Rincón de Parangueo pide **energía** (batería), no rueda: es lo que justifica el lugar (un cráter ancho que hay que cruzar y subir).
  La costra de sal no tiene dato de fricción con fuente; con −30 % de agarre en suelo plano no detiene a ninguna rueda.

## Arte que falta (para Mauricio)

- **Obstáculos v2** (ver docs/arte/SPRITES_PENDIENTES.md §10): matorral seco, rizaduras, bloque de toba, cráter lunar pequeño y roca
  de Marte/Luna más clara que el suelo. Hoy se dibujan o se tiñen.

- Fondo ártico / tundra (Pingualuit usa `desierto`).
- Tiles de parche **en pendiente** (toba, talud, nieve, hielo): los tiles planos quedan en escalones; en pendiente se dibuja una franja.
- Bomba volcánica propia (hoy usa `obstaculo_roca_*`) y piedra de desprendimiento.
- Nieve en el suelo (hoy `obstaculo_arena_blanda` teñido) y partículas de nieve/ceniza como sprite (hoy se dibujan).
- Rincón de Parangueo: `fondo_salar_1/2/3` (hoy usa `maar`), postal `sitio_mx0261` y lodo de lago (hoy `obstaculo_arena_blanda` teñido).
