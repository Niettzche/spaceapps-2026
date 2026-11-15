# Física 2: terramecánica de Bekker–Wong (bandera `?fisica=2`)

Estado: **experimental, apagada por defecto** (`FISICA_POR_DEFECTO = 1` en `game/src/fisica/version.js`). Se activa con
`?fisica=2` en la URL. Con la física 1 nada cambia. Código: `game/src/fisica/suelo_v2.js` (funciones puras, pruebas en
`suelo_v2.test.mjs`) y la rama `this.v2` de `game/src/fisica/robot.js`. Feedback: `game/src/feedback/reglas.js` y `analogia.js`.

Valores marcados **(P)** son valores de juego, no datos. Las fuentes `S..` y `BM-..` son filas del libro de datos del frente taller
(`docs/taller/Space_Apps_Game_Data.xlsx`, hojas Sources y Biomes).

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

| Suelo (mundo · superficie · lugar) | φ (°) | c (kPa) | n | k_c | k_φ | Fuente |
|---|---|---|---|---|---|---|
| Arena de duna, Tierra · arena (BM-004) | 28 | 1.04 | 1.1 | 0.99 | 1528.43 | Wong (2001) arena seca vía NASA/TM-20250006958 tabla 1 (S59). **Genérica, no medida en Samalayuca** |
| Ceniza y escoria, Tierra · compacto en sitio volcánico (BM-003) | 28.5 | 0 (P) | — | — | — | φ = punto medio del ángulo de reposo 25–32° (NPS, S61), como aproximación; c y Bekker sin dato (no se hunde) |
| Suelo compacto o talud de mina, Tierra (sin dato) | 40 (P) | 0 (P) | — | — | — | Sin fuente |
| Roca, Tierra (sin dato) | 45 (P) | 0 (P) | — | — | — | Sin fuente |
| Regolito lunar · arena y compacto (BM-008) | 40 | 0.17 | 1 | 1.4 | 820 | φ: Apolo 30–50° (S19, Verified). c y Bekker: valores canónicos, apuntes UMD (S62, **Draft**). S59: no existen parámetros de Bekker reales del regolito |
| Roca lunar (sin dato) | 45 (P) | 0 (P) | — | — | — | Sin fuente |
| Drift marciano · arena (BM-013) | 18 | 1.85 | 1.3 | 572.1 | 4915.3 | φ y c: puntos medios de Viking (15.6–20.4°, 0–3.7 kPa; S20). Bekker: **simulante M90** (S63, Oravec et al. 2021), no drift real |
| Costra marciana · compacto (BM-015) | 34.5 | 1.6 | — | — | — | Viking (S20): puntos medios de 29.8–39.2° y 0–3.2 kPa; no se hunde (P) |
| Roca marciana · roca (BM-016) | 50 | 0 (P) | — | — | — | Viking (S20), cota superior 40–60° |

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

## 6. Qué falta para activarla por defecto

0. Resolver el camino dorado de g00281 (ver §5.1) y el riesgo de carga perdida en Jezero.
1. Que Leo revise las fuentes de §3 (sobre todo S62 Draft y el uso del simulante M90 para Marte, que contradice la decisión del
   14 nov de no simular hundimiento en Marte) y lo registre en `docs/DECISIONES.md`.
2. Correr la e2e completa con `FISICA_POR_DEFECTO = 2` (no se corrió aquí) y revisar el feedback en pantalla de Resultados.
3. Rebalancear Jezero: con el drift (c 1.85 kPa) la misión de Marte queda mucho más fácil (E 42 % contra 8 %).
4. Actualizar `docs/METHODOLOGY_EN.md` (hoy dice que el hundimiento de Bekker no se modela).
5. Que el integrador agregue `ancho_m` a `data/schema/part.schema.json` (hoy se acepta porque el esquema no cierra propiedades).
6. Cambiar `FISICA_POR_DEFECTO` a 2 en `game/src/fisica/version.js`.

## 7. Límites (se declaran)

- No hay parámetros de Bekker reales del regolito lunar (S59) ni del drift marciano: se usan valores canónicos (Draft) y un simulante.
- La arena de la Tierra es arena seca genérica (Wong 2001), no medida en Samalayuca.
- Se omite el módulo de deformación cortante `K` (Janosi–Hanamoto, EQ-017): Gap. Sin él, el empuje no depende del deslizamiento;
  el deslizamiento solo aumenta el hundimiento (P).
- No se modela el «bulldozing» ni la resistencia por gravedad sobre el surco, ni la carga dinámica entre ejes (peso repartido igual).
- La fricción de Matter.js no es Coulomb exacta: `k` es una calibración del motor de física, declarada.
- El drift marciano usa la cohesión media de Viking (1.85 kPa): con poco peso, el término `A·c` domina y Marte resulta más fácil
  que la arena de la Tierra. Es lo que dan las ecuaciones con esos datos, pero el rango medido va de 0 a 3.7 kPa.
- Los parámetros de suelo de la Tierra son genéricos: la prueba no mide el suelo real del sitio.
