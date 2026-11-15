# Física 2: terramecánica de Bekker–Wong (por defecto)

Estado: **por defecto** desde el 15 nov (`FISICA_POR_DEFECTO = 2` en `game/src/fisica/version.js`, decisión de Edmundo;
`?fisica=1` vuelve a la anterior). Código: `game/src/fisica/suelo_v2.js` (funciones puras, pruebas en `suelo_v2.test.mjs`) y la rama
`this.v2` de `game/src/fisica/robot.js`. Feedback: `game/src/feedback/reglas.js` y `analogia.js`.

Valores marcados **(P)** son valores de juego, no datos. Las fuentes `S..` y `BM-..` son filas del libro de datos del frente taller
(`docs/taller/Space_Apps_Game_Data.xlsx`, hojas Sources y Biomes). Veredicto de cada fuente: `docs/taller/FUENTES_FISICA.md` (Leo, 15 nov).

## 1. Qué cambia respecto a la física 1

| | Física 1 | Física 2 |
|---|---|---|
| Agarre | (agarre de la pieza)² × tan φ del suelo; Tierra sin dato = 1 (P) | k × banda × **H/W** de Mohr–Coulomb, con el área de contacto real de la rueda |
| Ancho y radio de la rueda | Solo el radio (geometría) | Ancho `ancho_m` (P) y radio `radio_m` (P) entran en el hundimiento, el área y la resistencia |
| Suelo blando | No hay hundimiento | Hundimiento de Bekker; patinar excava; la compactación frena al robot |
| Telemetría | patinaje, sin_fuerza… | + `hundimiento` (cm, kPa) y `empuje_insuficiente` (H contra resistencia + pendiente) |
| Velocidad máxima | 0.12 m/s por unidad de fuerza (eficiente 6 m/s) | 0.145 (eficiente 7.25 m/s) (P) |

## 2. Ecuaciones

Por rueda (cada eje del juego son 2 ruedas):

1. **Peso sobre la rueda:** `W = m·g / ruedas` (EQ-023). `g` es la gravedad real del mundo (9.81, 3.71, 1.62 m/s²).
2. **Hundimiento estático (Bekker, rueda rígida, forma cerrada de Wong):**
   `z0 = [ 3W / ((3 − n)·(k_c + b·k_φ)·√D) ]^(2/(2n+1))`, con `p = (k_c/b + k_φ)·zⁿ` (EQ-016, S44, S59). `b` = ancho, `D` = 2r.
3. **Patinar excava:** `z = z0·(1 + K·s)`, `s` = deslizamiento 0..1, `K = 2` **(P)**. El efecto es real (Spirit en «Troy», S72;
   Opportunity en «Purgatory», PIEZAS.md H4); la forma lineal y la constante son de juego. El surco se forma con una constante de
   tiempo de 0.35 s y se cierra en 0.8 s **(P)**.
4. **Contacto:** `l = r·acos(1 − z/r)` (arco de la entrada al fondo), `A = b·l`; en suelo rígido `l` mínimo 3 cm **(P)**.
   **Presión media:** `p = W/A`.
5. **Empuje máximo (Mohr–Coulomb):** `H = A·c + W·tan φ` (EQ-017 sin el término de deformación `K`, que es Gap).
6. **Resistencia por compactación (Bekker):** `R_c = b·(k_c/b + k_φ)·z^(n+1)/(n+1)`. Se aplica como fuerza contra el sentido en
   que gira la rueda. Gasta energía porque frena: el motor entrega la misma potencia y recorre menos metros
   (`energiaPorResistencia = 0`, sin cargo extra) **(P)**.
7. **Fricción para Matter:** `μ = k × banda^1.5 × H/W`, con `k = 1.7` y exponente 1.5 **(P)**. La **banda** es el `agarre` de la
   pieza para esa superficie (parts.json), reinterpretado como la fracción del esfuerzo del suelo que aprovechan la banda y los
   tacos **(P)**. El exponente 1.5 está entre la forma lineal y la curva² de la física 1: con la forma lineal la rueda estándar
   pasaba g00281 (ver §5). `k` es una calibración porque
   Matter.js no aplica fricción de Coulomb exacta (ver `FRICCION_ESTATICA` en robot.js) **(P)**. Ver §5.
8. **Empuje insuficiente (EQ-018, drawbar pull):** se registra si `Σ banda·H < Σ R_c + m·g·sen θ` durante 1 s acelerando **(P)**.

## 3. Suelos y parámetros

Valores verificados por Leo el 15 nov (`docs/taller/FUENTES_FISICA.md` §1) aplicados en `suelo_v2.js`; cada uno lleva su fuente en
el código (constantes `FUENTE_*`).

| Suelo (mundo · superficie · lugar) | φ (°) | c (kPa) | n | k_c | k_φ | Fuente |
|---|---|---|---|---|---|---|
| Arena de duna, Tierra · arena (BM-004) | 28 | 1.04 | 1.1 | 0.99 | 1528.43 | Wong (2001) arena seca vía NASA/TM-20250006958 tabla 1 (S59). **Genérica, no medida en Samalayuca** |
| Ceniza y escoria, Tierra · compacto en sitio volcánico (BM-003) | 28.5 | 0 | — | — | — | c = 0 **verificado** (escoria seca sin cohesión, Agustian y Goto 2008, S103). φ = ángulo de reposo 25–32° (NPS, S61) ≈ φ suelto, **conservador**: el φ pico de tefra seca a 3–35 kPa es 35.8–36.5° (S104). Sin Bekker: no se hunde (P) |
| Suelo compacto o talud de mina, Tierra (BM-023) | 38 | 0 | — | — | — | Suelos compactados de arena y grava: φ 37–38°, c 0 (NAVFAC DM-7.02, S105, tabla 1 p. 7.2-39). Antes 40 (P). Sin hundimiento (P) |
| Roca, Tierra (BM-024) | 35 (P) | 0 (P) | — | — | — | En roca la tracción ≈ μ·W (S59 pp. 19–21); μ ≈ 0.7 = tan 35°, cota alta de roca–roca 0.55–0.70 (S105 p. 7.2-63). μ llanta–roca medido: **Gap** → (P). c 0 es simplificación. Antes 45 (P, sin fuente) |
| Regolito lunar · arena y compacto (BM-008) | 42 | 0.52 | 1 | 1.4 | 820 | c y φ del suelo en los primeros 15 cm (*Lunar Sourcebook*, Carrier et al. 1991, S79, tabla 9.12 p. 510). Bekker: tabla 9.14 p. 529, de Costes et al. 1972 (NASA TR R-401, S80): **valores de diseño del LRV, no mediciones** (S59). Antes c 0.17, que es c_b suelo–rueda, y φ 40 |
| Roca lunar (sin dato) | 45 (P) | 0 (P) | — | — | — | Sin fuente |
| Drift marciano · arena (BM-013) | 18 | 1.6 | 1.3 | 572.1 | 4915.3 | c y φ: Viking, 1.6 ± 1.2 kPa y 18 ± 2.4° (Moore 1991, S82; Moore et al. 1987 da 1–3 kPa de diseño, S81). Antes 1.85, que no es un valor publicado. Bekker: **simulante M90** suelto (Oravec et al. 2020, S20 tabla 3), no drift real |
| Costra marciana · compacto (BM-015) | 34.5 | 1.6 | — | — | — | Viking (S20): puntos medios de 29.8–39.2° y 0–3.2 kPa; no se hunde (P) |
| Roca marciana · roca (BM-016) | 50 | 0 (P) | — | — | — | Viking (S20), cota superior 40–60° |

**M90 completo** (constante `M90` en `suelo_v2.js`, S20 tabla 3, MR-094/095): n 1.3, k_c 572.1, k_φ 4915.3, c_b 0.27 kPa, φ_b 32°,
K 25.4 mm. El drift usa solo su Bekker: la cohesión y la fricción son las de Viking, porque el φ de M90 (29–37°) es mayor que el del
drift estimado (15.6–25°) y daría una tracción optimista. Ojo (Leo): la tabla 3 puede traer las unidades de k_c y k_φ invertidas.

**Módulo de deformación cortante K** (Janosi–Hanamoto): ahora hay fuente (Luna 1.8 cm, S79 tabla 9.14; M90 25.4 mm, S20), pero no se
usa: en este modelo el deslizamiento lo resuelve Matter y el empuje H es la cota de Mohr–Coulomb (§7).

**Efecto medido de los valores nuevos:** la fricción del suelo en Matter es 1 y Matter usa el mínimo, así que donde μ = k·banda^1.5·H/W
pasa de 1 (Luna y Marte con la rueda ancha) los valores nuevos no cambian la partida; sí la cambian en la Tierra (roca μ 0.7 y suelo
compacto 38°, ver §5.2: Cananea).

Unidades de Bekker: `k_c` en kN/m^(n+1), `k_φ` en kN/m^(n+2), `p` en kPa, `z` y `b` en m.
**Nieve o hielo no se agregó:** el libro de datos no tiene c, φ ni Bekker de nieve con fuente.

El tipo de lugar sale del campo `proceso` del sitio (`lugarDeSitio`): dunas → `duna`, volcánico/lava → `volcanico`,
tajo/mina/cantera → `mina`. El esquema de sitios solo permite `arena | roca | compacto` en `nivel.superficies`; para tipos nuevos
(sal, toba, talud) haría falta que el integrador amplíe `data/schema/site.schema.json`.

## 4. Ruedas (parts.json, todo P)

| Rueda | radio_m | ancho_m | banda en arena / roca / compacto |
|---|---|---|---|
| estándar | 0.45 | 0.20 | 0.4 / 0.6 / 0.8 |
| ancha | 0.50 | 0.40 | 0.9 / 0.5 / 0.7 |
| tacos | 0.45 | 0.25 | 0.6 / 0.9 / 0.7 |
| malla | 0.55 | 0.30 | 0.75 / 0.45 / 0.75 |
| Nitinol | 0.45 | 0.25 | 0.55 / 0.85 / 0.85 |

Radios y anchos son de la escala del robot del juego (3 m de largo), no de ruedas reales. Referencias reales en `docs/taller/PIEZAS.md`
(LRV: 81.8 cm de diámetro, 23 cm de ancho).

### Ejemplo con el robot del camino dorado (≈ 69 kg, 4 ruedas, arena de duna, sin patinar)

| | W (N) | z0 (cm) | A (cm²) | p = W/A (kPa) | H/W | R_c/W |
|---|---|---|---|---|---|---|
| Rueda estándar (20 cm) | 169 | 1.3 | 217 | 7.8 | 0.66 | 0.09 |
| Rueda ancha (40 cm) | 169 | 0.8 | 358 | 4.7 | 0.75 | 0.07 |

La ancha presiona 40 % menos, se hunde menos y empuja más porque tiene más área (`A·c`). En la Luna (W ≈ 28 N) la cohesión pesa más:
H/W ≈ 0.96 con la ancha, aunque el empuje total en newtons es mucho menor.

## 5. Calibración y resultados

Simulación sin tiempo real (Matter a 60 Hz, acelerador a fondo, chasis ligero + motor eficiente + batería chica + soporte básico),
15 nov. `E` = energía al final; `vmax` en m/s. Script: patrón `matrizdorada.mjs` con `?fisica=1` y `?fisica=2`.

| Caso | Física 1 | Física 2 |
|---|---|---|
| Samalayuca, estándar | atascado a 41 m (E 74 %, vmax 6.0) | **atascado** a 13 m (E 81 %, vmax 6.4); hundimiento 2 cm, 7.9 kPa (ancha 4.7) |
| Samalayuca, ancha | meta, 56 s (E 40 %) | **meta**, 54 s (E 43 %, vmax 7.0) |
| g00281, estándar | sin energía a 242 m | **atascado** a 58 m (empuje insuficiente 23 veces) |
| g00281, ancha | meta, 58 s (E 38 %) | **meta**, 54 s (E 43 %) |
| Pinacate, tacos | meta, 59 s (E 36 %) | meta, 53 s (E 43 %) |
| mx0207, tacos | meta, 50 s (E 45 %) | meta, 46 s (E 50 %) |
| Misión Jezero, ancha | entrega, E 8 % | **entrega, E 42 %** |
| Misión Luna, ancha | entrega, E 9 % | **entrega, E 12 %** |

Extras con física 2: Samalayuca con estándar + motor potente → atascado; Samalayuca con malla → meta; Pinacate con estándar → meta;
Jezero con estándar → entrega (E 29 %).

Ajuste elegido (todo P): `k = 1.7`, exponente de banda 1.5, `K` de hundimiento por deslizamiento 2, velocidad 0.14 m/s por unidad
de fuerza. Barrido: con banda lineal (`k` 1.55–1.8) la estándar pasa g00281 o la ancha no sube la duna de Samalayuca; con 0.145 m/s
(7.25 m/s) el motor se sobrecalienta en el vacío lunar y la misión lunar llega con 3 %.

### 5.1 Tras fusionar `origin/main` (15 nov, niveles de Mario #90 y g00281 con paredes de roca)

**Ojo, camino dorado:** el nuevo `data/sites/g00281.json` (paredes del cráter pasan de arena a roca) hace que la rueda estándar
**pase** g00281 también con la física 1 (meta, E 33 %, dos corridas). No lo causa la física 2: cambió el nivel. Hay que decidir con
el frente modelo si se ajusta la ventana o el camino dorado lunar.

**Regla de paredes (P, solo física 2, solo pruebas en la Tierra):** un tramo marcado como arena con pendiente media > 20° en
±10 m (ventana más larga que una cara de duna recreada) se trata como roca, salvo en sitios de dunas. Se declara en el panel I
(«regla (P): N m de pared marcados como arena (OpenLandMap) con más de 20° se tratan como roca»). Afecta a talemzane (27 m) y
tenoumer (1 m); samalayuca y g00281 no cambian (`suelo_v2.js: paredesDeArena`).

Niveles con física 2 (motor eficiente, batería chica salvo que se diga, presupuesto 1,000):

| Nivel | Ancha (890 cr) | Tacos (970 cr) | Diseño que pasa |
|---|---|---|---|
| g00176 | meta (E 38 %) | meta (E 40 %) | ambos |
| g00263 Al Hutaymah | meta (E 38 %) | atascado 12 m | ancha |
| g00266 | meta (E 41 %) | meta (E 38 %) | ambos |
| meteor_crater | meta (E 48 %) | meta (E 47 %) | ambos |
| mx0019 | meta (E 40 %) | meta (E 41 %) | ambos |
| mx0023 Cananea | meta (E 45 %) | meta (E 46 %) | ambos |
| mx0155 | meta (E 34 %) | meta (E 37 %) | ambos |
| mx0261 | meta (E 41 %) | meta (E 42 %) | ambos |
| pingualuit | meta (E 45 %) | meta (E 45 %) | ambos |
| roter_kamm | meta (E 50 %) | meta (E 45 %) | ambos |
| talemzane | atascado 69 m | atascado 12 m | **malla + batería grande (890 cr): meta, E 72 %**; ancha + motor equilibrado (925 cr): meta, carga 65 % |
| tenoumer | meta (E 37 %) | atascado 12 m | ancha |
| pinacate | meta (E 42 %) | meta (E 43 %) | ambos |
| mx0207 | meta (E 48 %) | meta (E 50 %) | ambos |

Con física 1 (corrida del integrador) g00263 y tenoumer no pasaban con ninguna de las dos: con la física 2 la ancha los pasa porque
el hundimiento y la cohesión de la arena reparten mejor el empuje. Con motor potente, talemzane termina en carga perdida (va a 11 m/s).

**Riesgo en Jezero:** tras la fusión, 1 de 4 corridas de Jezero con ancha a fondo perdió la carga (a 169 m, 6.5 m/s); las otras
entregan con E 42 %. Con la física 1 el robot va a 4–5 m/s en Marte y no la pierde. Antes de activarla por defecto hay que revisar
ese golpe (velocidad en Marte o la e2e con un piloto que frene).

### 5.2 Robustez del camino dorado (15 nov, tarde)

**Problema medido:** el camino dorado salía a veces sí y a veces no (Samalayuca con ancha: la e2e se atascó 2 de 2 veces a 48.7 m;
g00263: atascos a 47 y 74 m; Jezero: carga perdida).

**Causa 1: no es la tasa de cuadros.** Con `runner.isFixed` (main.js) Phaser llama a `Engine.update(1000/60)` una vez por cuadro y
después a `Recorrido.actualizar` con `runner.delta`: el mismo orden que el simulador por pasos (`world.step(1000/60)` y luego
`actualizar(…, 1000/60)`). Nada de la física 2 se integra con el delta del cuadro (solo la decoración). Comprobado:
- con el mismo piloto determinista (acelerador fijado dentro de `actualizar`), el bucle real a 25 fps y el simulador dan **la misma
  trayectoria bit a bit** (x idéntica cada 60 pasos, mismo final: meta, E 43 %, 3,224 pasos);
- la e2e real (teclado real, 8 fps) grabada paso a paso y **reproducida** en el simulador (los mismos 17 pasos sin acelerar y luego a
  fondo) da la misma trayectoria (|Δx| máx. = 0 m);
- cambiar los ids de los cuerpos de Matter o correr antes otra prueba en la misma página no cambia nada.
Lo único que cambia entre corridas es **en qué paso empieza a acelerar el jugador**, y con eso Matter (caótico) diverge. Script de
comparación: `scratchpad/fis/det.mjs` (modo `real` | `sim`); el simulador por pasos sí reproduce el bucle real, siempre que el
acelerador se fije por paso y no por tiempo de pared.

**Causa 2: el tramo crítico estaba en el filo.** Las caras de duna recreadas tenían 3.6–4.4 m de alto sobre 6.2 m, más la pendiente
medida de la base: daban **28–39°** (Samalayuca 28, 38 y 33°; g00263 34, 36 y 39°), por encima del ángulo de reposo de la arena
(30–34°; ninguna duna real tiene una cara de 38°). La rueda ancha subía 36–38° solo con suerte de arranque.
**Arreglo (recreación, P):** la pendiente total de la cara (base + cara) se topa en **30°**, el borde inferior del ángulo de reposo
(Pelletier et al. 2015, JGR: reposo medio 32°, crítico 34°; ya citado en PIEZAS.md y AUDITORIA_DATOS.md) — `perfil.js`, `DUNA.anguloMax`.
La estándar sigue sin subir (se atasca en la primera cara, de 28–30°, a 18–19 m) y la ancha sube con margen.

**Causa 3: Jezero perdía la carga en 12 de 20 arranques**, no 1 de 4: al subir una roca recreada de 0.23 m a ~6 m/s con 3.71 m/s², el
chasis cabecea, las dos ruedas quedan en el aire ~0.9 s y la carga sube 0.45 m respecto del chasis, más que la pared del soporte básico
(0.25 m); cae sobre la pared y se desliza fuera. Con un tope de velocidad en todo Marte no basta (a 4.3 m/s aún 2 de 10).
**Arreglo (P, con base física): paso seguro sobre rocas en la misión** (`danio.js: velocidadPasoRoca`, aplicado por `recorrido.js`).
En Marte (4–24 min de retraso de señal) y en la Luna el robot no se maneja en vivo: como la navegación autónoma de los rovers, frena
solo al cruzar una roca recreada (desde 6 m antes de la rueda delantera hasta 1 m después de la trasera). La velocidad sale del salto:
una rueda de radio r que sube un escalón h sale con v_y ≈ v·sen α (cos α = (r − h)/r) y sube v_y²/(2g); para que la carga no pase la
pared H: **v ≤ k·√(2·g·H)/sen α**, con g la que simula el juego y **k = 1.5 (P)** porque la suspensión absorbe parte (k 1.5: 10/10
entregas; k 2: 9/10). Marte con ancha y soporte básico: 2.9 m/s; la Luna: 2.6 m/s; un soporte más alto deja ir más rápido. Mientras
frena, el motor no gasta. No cambia stats de piezas ni se aplica en las pruebas en la Tierra (se manejan en vivo).

**Robustez medida** (diseño del camino dorado: chasis ligero, motor eficiente, batería chica, soporte básico).
Simulador por pasos: 5 arranques distintos (0, 3, 7, 13 y 20 pasos sin acelerar). Tiempo real: bucle real de Phaser en Chromium sin
GPU (~10–15 fps), teclado real, página nueva por corrida, 5 esperas distintas antes de pulsar → (0, 0.3, 0.7, 1.1 y 1.6 s).

| Caso | Simulador por pasos (5) | Tiempo real (bucle de Phaser, teclado real) | Esperado |
|---|---|---|---|
| Samalayuca, ancha | **5/5** meta, E 46–47 % | **5/5** meta, E 46–47 % (+ e2e: meta, E 46 %) | pasa |
| Samalayuca, estándar | **0/5** atascado a 18–19 m | e2e: atascado a 18.7 m | falla |
| g00263, ancha | **5/5** meta, E 35–40 % | **5/5** meta, E 35–39 % (+ e2e: meta, E 37 %) | pasa |
| g00263, estándar | **0/5** atascado a 18–19 m | e2e: atascado a 18.6 m | falla |
| Misión Jezero, ancha | **5/5** entrega, E 34–35 %, carga 98–99 % (y 10/10 con otros 10 arranques) | 2/2 entrega, E 34–35 %, carga 98 % (+ e2e: entrega, E 35 %, carga 98 %) | entrega |
| Misión Luna, ancha | **5/5** entrega, E 9–13 %, carga 98–100 % (y 10/10 con otros 10 arranques) | e2e: entrega, E 9 %, carga 100 % | entrega |

Tiempo real: las corridas de la misión y de la estándar no se completaron 5 veces por tiempo (cada misión tarda ~5.5 min de pared en
esta máquina); como el bucle real y el simulador dan la misma trayectoria con la misma entrada (arriba), la variación entre corridas
solo viene del paso de arranque, que el simulador barre. **Herramienta:** dos corridas largas se cortaron porque el cliente de HMR de
Vite recarga la página si pierde el websocket (máquina cargada); para corridas largas conviene servir sin ese cliente (en la e2e de esta
medición se reemplazó `/@vite/client` por un stub con `page.route`; el juego es idéntico).

Antes de estos cambios (simulador por pasos, mismo método): Samalayuca ancha 8/8 pero la e2e real 0/2; g00263 ancha 6/8 (atascos a 47 y
74 m); Jezero 8/20 (carga perdida); Luna 8/8.

**e2e completa** (`game/e2e/camino_dorado.mjs ambos`, 15 nov 8:40, tras fusionar `origin/feat/juego` d88ff18): **25/25 pasos OK**
en 1,334 s — Marte: estándar atascada a 18.7 m → ancha meta (E 46 %) → misión entrega (E 35 %, carga 98 %); Luna: estándar atascada a
18.6 m → ancha meta (E 37 %) → misión entrega (E 9 %, carga 100 %). En las dos misiones la flecha real no movió el robot y la e2e usó
`controles.forzado` (respaldo ya conocido de la e2e, no de la física).

**Niveles destacados con los valores nuevos** (simulador por pasos, 5 arranques):

| Nivel | Diseño (pieza_clave) | Pasan | Detalle | Antes (tabla de NIVELES_DESTACADOS.md) |
|---|---|---|---|---|
| g00266 | ancha | 5/5 | meta, E 32–37 % | meta, E 39 % |
| g00266 | malla | 5/5 | meta, E 43–44 % | meta, E 45 % |
| g00266 | estándar | 0/5 | atascado a 33–40 m | atascado a 37 m |
| tenoumer | malla | 5/5 | meta, E 36–37 %, carga 88–91 % | meta, carga 86 % |
| tenoumer | ancha | 5/5 | meta, E 16–25 %, carga 74–77 % | meta, carga 72 % (inestable) |
| tenoumer | estándar | 0/5 | atascado a 18–19 m | atascado a 18 m |
| mx0023 | malla | 5/5 | meta, E 44–46 % | meta, E 47 % |
| mx0023 | **ancha** | **2/5** | 3 atascos a 85–89 m (pared de roca de 23.6°: con roca μ 0.7 queda en el límite) | meta, E 42 % |
| mx0023 | estándar | 0/5 | atascado a 33 m | atascado a 33 m |
| pinacate | estándar + chasis reforzado | 5/5 | meta, E 28 % | meta |
| pinacate | estándar (ligero) | 0/5 | chasis destruido a 160–191 m | chasis destruido a 158 m |
| pingualuit | malla | 5/5 | meta, E 46–47 % | meta, E 47 % |
| pingualuit | **ancha** | **4/5** | 1 atasco a 75 m (pared de roca de 30°, mismo motivo) | meta, E 42 % |
| pingualuit | estándar | 0/5 | atascado a 29–32 m | atascado a 30 m |

Cambio por la roca de la Tierra con μ ≈ 0.7 (antes tan 45° = 1, sin fuente): en las paredes de roca de Cananea (23.6°) y Pingualuit
(30°) la rueda ancha (banda 0.5 en roca) queda en el filo; la de malla sigue pasando 5/5. Por eso en esos dos niveles la pieza clave
recomendada pasa a ser la **malla** (`content/niveles_destacados.js`); la ancha se declara «a veces pasa», como ya pasaba en Tenoumer.
Es coherente con las pruebas de rovers reales: Curiosity subió 22° en roca en pruebas (S100, FUENTES_FISICA.md).

### 5.3 Obstáculos v2 (15 nov, mañana): el camino dorado sigue 5/5

Cambios con física (NIVELES_DESTACADOS.md, «Obstáculos v2»): Jezero con 17 rocas de Golombek (antes 8), la Luna con 2 cráteres pequeños
hundidos en el perfil (d/D 0.060 del detector) y 3 rocas, Samalayuca con 3 parches de arena blanda más en los valles entre dunas y
Al Hutaymah con 5 bloques de toba bajos. No se tocaron `suelo_v2.js`, `robot.js` ni las piezas. La misión sigue frenando sola sobre
cada roca (`PASO_ROCA`, v ≤ 1.5·√(2gH)/sin α). El dibujo (contorno, rizaduras, matorral) no crea cuerpos.

Simulador por pasos (`scratchpad/fis/barrido.mjs`), 5 inicios por caso, acelerador a fondo:

| Caso | Inicio 0 | 3 | 7 | 13 | 20 | Resultado |
|---|---|---|---|---|---|---|
| Samalayuca, estándar | atascado 19 m | 18 m | 19 m | 19 m | 18 m | **falla 5/5** |
| Samalayuca, ancha | meta, E 46 % | E 47 % | E 47 % | E 46 % | E 46 % | **pasa 5/5** (carga 89–92 %) |
| Al Hutaymah g00263, estándar | atascado 18 m | 18 m | 19 m | 18 m | 18 m | **falla 5/5** |
| Al Hutaymah g00263, ancha | meta, E 36 % | E 38 % | E 39 % | E 38 % | E 39 % | **pasa 5/5** (carga 94–96 %) |
| Misión Jezero, ancha | entrega, E 26 % | E 26 % | E 26 % | E 26 % | E 26 % | **entrega 5/5** (carga 98–99 %; antes E 34–35 %) |
| Misión Luna, ancha | entrega, E 8 % | E 10 % | E 11 % | E 9 % | E 7 % | **entrega 5/5** (carga 99–100 %; antes E 9–13 %) |

Con cráteres de 3–7 m la Luna bajaba a E 4–12 %: se dejaron en 3–5 m. Salidas: `scratchpad/obstaculos_v2/barrido_final.txt` y la
corrida lunar con 3–5 m.

La energía de la misión lunar baja un poco (los cráteres y el frenado en las rocas): pendiente 2 de §6 sigue valiendo.

## 6. Pendientes

1. Que el integrador agregue `ancho_m` a `data/schema/part.schema.json` (hoy se acepta porque el esquema no cierra propiedades).
2. Margen de energía de la misión lunar: E 9–13 % con la ancha (ya era 9–15 % antes de estos cambios). Si hace falta más margen, la
   palanca es el largo del terreno ilustrativo (`LARGO_MISION_M.luna`, P) o la fricción del suelo de Matter (hoy 1, tapa el H/W > 1
   del regolito con c 0.52 kPa).
3. Remolinos de Jezero: el juego quita 30 % de luz al panel (P); Leo verificó 0.1–1 % típico y > 15 % en los más fuertes (S96).

## 7. Límites (se declaran)

- No hay parámetros de Bekker medidos del regolito lunar (S59): se usan los de diseño del LRV (S79/S80). Del suelo de Marte tampoco:
  se usa el simulante M90 (S20).
- La arena de la Tierra es arena seca genérica (Wong 2001), no medida en Samalayuca.
- Se omite el módulo de deformación cortante `K` (Janosi–Hanamoto, EQ-017). Ya hay fuente (Luna 1.8 cm, S79; M90 25.4 mm, S20), pero
  no se usa: el empuje no depende del deslizamiento; el deslizamiento solo aumenta el hundimiento (P).
- No se modela el «bulldozing» ni la resistencia por gravedad sobre el surco, ni la carga dinámica entre ejes (peso repartido igual).
- La fricción de Matter.js no es Coulomb exacta: `k` es una calibración del motor de física, declarada.
- El drift marciano usa la cohesión de Viking (1.6 ± 1.2 kPa, Moore 1991): con poco peso, el término `A·c` domina y Marte resulta más
  fácil que la arena de la Tierra. Es lo que dan las ecuaciones con esos datos; Moore advierte que la cohesión puede estar sobrestimada.
- La fricción del suelo en Matter es 1 (y Matter usa el mínimo): un H/W mayor que 1 no da más agarre.
- Roca de la Tierra: μ ≈ 0.7 (P); no hay μ medido llanta–roca (Gap).
- Los parámetros de suelo de la Tierra son genéricos: la prueba no mide el suelo real del sitio.
