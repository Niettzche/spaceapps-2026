# Niveles destacados: 5 lugares distintos, con clima real, viento, obstáculos y eventos

> Dueño: frente juego. Código: `game/src/content/niveles_destacados.js` (configuración), `game/src/content/clima_niveles.js`
> (NASA POWER), `game/src/fisica/viento.js`, `elementos_nivel.js`, `eventos_fondo.js`, `nivel_destacado.js` (enlace con
> `recorrido.js`). Pruebas: `node --test game/src/fisica/niveles_destacados.test.mjs`.
> Regla (AGENTS.md §3): nada inventado. Lo agregado al perfil del DEM es **recreación** (`recreacion: true`, se declara en el panel
> de datos, tecla I) y todo número sin fuente es **valor de juego (P)**. Balance medido con la **física 2** (modo por defecto).

## Cómo se eligieron

Los 5 sitios de mayor similitud de `data/sites` con nivel jugable, uno por tipo de lugar: volcán de toba, impacto en desierto,
mina a cielo abierto, campo de lava e impacto helado. Tres entrenan para Marte (Jezero) y dos para la Luna (polo sur).

## Lo que es igual en los 5

- **Clima real de NASA POWER** (API de climatología por punto, sin llave, consultada el 15 nov 2026; el mismo servicio de
  `model/features.py`). Temperaturas típicas con el método de `docs/taller/AMBIENTE.md` (datos diarios 2015–2024; Pinacate
  reproduce 7.1 / 39.7 °C de la tabla), extremos, media, presión `PS`, viento a 10 m `WS10M` (media) y `WS10M_MAX`, nieve `SNODP`.
  La densidad del aire es **derivada** (gas ideal). Son valores de la celda de la malla (MERRA-2, ~0.5° × 0.625°), no de una estación.
- **Viento con física:** `F = ½ · ρ · v · |v| · Cd · A` (EQ-021 del libro de datos), con ρ del lugar. El viento de 10 m se baja a la
  altura del robot (1 m) con el perfil logarítmico, `z0 = 0.03 m` (P). `Cd = 1.0`, `A = 1.5 m²` (P). Ráfagas de 2–4 s cada 8–16 s
  (P, con semilla), con pico entre la media (`WS10M`) y el máximo (`WS10M_MAX`); 60 % de frente (P). La fuerza se aplica al chasis
  (`Matter.Body.applyForce`, sin tocar `robot.js`) con la misma escala del juego que la gravedad (× 1.5), así se conserva la
  proporción real viento / peso. Partículas de polvo, ceniza o nieve vuelan con la ráfaga.
- **En Marte el viento casi no empuja:** con ρ = 0.017 kg/m³ (1 % de la Tierra), una ráfaga de 10 m/s (WX-017, primer reporte de
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

Fuente de todas las filas: NASA POWER, climatología mensual 2001–2025 y datos diarios 2015–2024; URL de consulta en
`game/src/content/clima_niveles.js`.

## 1. Cono de toba Jabal Bayda (g00266, Arabia Saudita) → Marte

- **Analogía:** depresión tipo cráter en un campo volcánico (Harrat Khaybar); el modelo la marca como candidata (`candidato_modelo`,
  origen por confirmar). Suelo suelto y viento: lo que tiene Marte, pero allá el aire empuja 100 veces menos.
- **Qué entrena:** cruzar toba y ceniza blanda con viento y bombas volcánicas.
- **Recreado:** parches de toba y ceniza (cada 18–24 m, 9–13 m de largo, solo en tramos ≤ 18°): para la física son arena que se hunde
  (Bekker de arena seca genérica, FISICA_V2.md) con −40 % de agarre (P). El ángulo de reposo de ceniza y escoria es 25–32° (NPS, S61).
  Bombas volcánicas de 0.3–0.6 m (P). Fondo: `maar`.
- **Viento:** ráfagas de hasta 17 m/s a 10 m (≈ 10 m/s a 1 m) → hasta ~80 N, ~12 % del peso (Tierra). Partículas de ceniza.
- **Eventos:** velos de polvo con las ráfagas.
- **Pide:** rueda **ancha o de malla** (flotación). Fallan la estándar, la de tacos y la de Nitinol: se hunden en la toba.

## 2. Cráter de impacto Tenoumer (Mauritania) → Marte

- **Analogía:** cráter de impacto real (Earth Impact Database) en el Sáhara: borde levantado, eyecta y arena, como los cráteres de
  Marte. Jezero tiene más remolinos de polvo que cualquier sitio visitado por una misión (WX-018, S21).
- **Qué entrena:** cruzar arena y subir el borde de un cráter entre bloques de eyecta.
- **Recreado:** bloques de eyecta de 0.6–1 m cada 12–18 m (arte `obstaculo_eyecta_*`; P: la densidad de bloques junto a cráteres no
  tiene fuente cargada, Golombek y Rapp 1997 no está en el libro de datos). Las paredes de arena de más de 20° ya son roca por la
  regla de paredes de la física 2 (suelo_v2.js). Fondo: `desierto`.
- **Viento:** hasta 15 m/s a 10 m. Partículas de polvo.
- **Eventos:** remolinos de polvo (`evento_remolino`): mientras pasan cerca, el panel solar recibe 30 % menos luz (P; WX-018/019:
  «brief power dip», 4 vórtices por sol en Jezero, S24).
- **Pide:** rueda **de malla** (la más grande, 0.55 m de radio: pasa sobre los bloques) y, para la carga, **soporte con correas**.
  Fallan la estándar y la de tacos (se hunden en el piso de arena). La ancha a veces llega y a veces no (Matter es caótico con los
  bloques: llegó con la carga al 72 % y, con correas, se atascó a 74 m).

## 3. Tajo de Cananea (mx0023, Sonora) → Luna

- **Analogía:** análogo **operativo, no geológico**: un tajo escalonado como el que excavaría la minería de recursos (ISRU) en la Luna.
  En la Luna no hay viento.
- **Qué entrena:** subir paredes de 25° con talud suelto y piedras que ruedan.
- **Recreado:** talud de roca suelta en las paredes (cada 16–24 m, en tramos de 12–30°): sin parámetros de talud con fuente, se trata
  como material granular que se hunde (arena, P) con −30 % de agarre (P). Probado: como «roca» con menos agarre no cambia nada, porque
  en roca la fricción no limita la subida. Desprendimientos: al pasar los m 70 y 150, caen 3 piedras de 0.2–0.3 m delante del robot,
  ruedan y se quedan como obstáculo (P). Fondo: `mina`.
- **Viento:** hasta 16 m/s a 10 m (es la prueba en la Tierra). Partículas de polvo.
- **Pide:** rueda **de malla** (5 de 5). La ancha pasa solo a veces (2 de 5) desde que la roca de la Tierra usa μ ≈ 0.7 (15 nov,
  FISICA_V2.md §5.2): la pared de roca de 23.6° (m 79–93) le queda en el límite. Fallan la estándar, la de tacos y la de Nitinol.

## 4. Campo volcánico El Pinacate (Sonora) → Luna

- **Analogía:** basalto y cráteres volcánicos (maar El Elegante); los mares lunares son basalto. La Tierra no reproduce el vacío ni la
  gravedad.
- **Qué entrena:** pasar bloques de lava aa que cortan: frena o blinda el robot.
- **Recreado:** bloques de lava aa de 0.5–0.8 m cada 16–24 m (arte `obstaculo_lava_aa_*`). Golpearlos a más de 3.5 m/s (el mismo umbral
  del daño del chasis, `danio.js`) quita 2 puntos de resistencia por m/s extra, también al pisarlos con las ruedas (P). Despacio no hay
  daño. Fondo: `lava`.
- **Viento:** hasta 18 m/s a 10 m. Partículas de ceniza.
- **Pide:** **chasis reforzado o de titanio**. El chasis ligero se destruye (con rueda estándar o de tacos), salvo que se maneje despacio.

## 5. Cráter de impacto Pingualuit (Nunavik, Quebec) → Marte

- **Analogía:** cráter de impacto real en el Ártico, con nieve en el suelo los 12 meses (SNODP medio 38.5 cm). Marte tiene hielo y frío,
  pero su aire casi no empuja.
- **Qué entrena:** cruzar nieve profunda y hielo con frío ártico y el viento más fuerte de los cinco.
- **Recreado:** nieve casi continua (parches de 10–11 m cada 11–12 m): sin parámetros de nieve con fuente (FISICA_V2.md §3), se trata como
  arena suelta que se hunde (P) con −50 % de agarre (P). Hielo en tramos casi planos con −65 % de agarre (P). Fondo: `desierto`
  (no hay fondo ártico: pedir a Mauricio).
- **Viento:** ráfagas de hasta 21 m/s a 10 m (≈ 12.5 m/s a 1 m) → hasta ~150 N, ~22 % del peso. Partículas de nieve.
- **Frío:** la mínima típica es −34.4 °C: la regla del frío (ambiente.js) deja la batería al 99 %; el calentador quita esa pérdida.
- **Eventos:** nieve que sopla.
- **Pide:** rueda **de malla** (5 de 5); la ancha pasa 4 de 5 (la pared de roca de 30°, m 60–73, con roca μ ≈ 0.7; FISICA_V2.md §5.2).
  Fallan la estándar y la de tacos.

## Misiones finales (sin obstáculos nuevos: el camino dorado está calibrado sin ellos)

- **Jezero (Marte):** viento de ráfagas de 10 m/s con ρ = 0.017 (casi no empuja; se explica en el panel), partículas de polvo,
  remolinos de polvo (−30 % de luz al panel al pasar, P) y Fobos cruzando el cielo (acelerado: el tránsito real dura horas).
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
| tenoumer | ancha | 890 | meta, carga 72 % (inestable: con correas se atascó a 74 m) |
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

## Arte que falta (para Mauricio)

- Fondo ártico / tundra (Pingualuit usa `desierto`).
- Tiles de parche **en pendiente** (toba, talud, nieve, hielo): los tiles planos quedan en escalones; en pendiente se dibuja una franja.
- Bomba volcánica propia (hoy usa `obstaculo_roca_*`) y piedra de desprendimiento.
- Nieve en el suelo (hoy `obstaculo_arena_blanda` teñido) y partículas de nieve/ceniza como sprite (hoy se dibujan).
