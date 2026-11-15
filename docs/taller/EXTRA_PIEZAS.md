# Propuesta: más tipos de piezas para armar el robot (MARSCEPTION)

> Documento de trabajo fuera del repo (no hay ningún archivo del repo modificado). Fecha de la revisión: sáb 14 nov 2026.
> Revisé: `game/src/content/parts.json`, `scenes/Taller.js`, `scenes/Taller/diseno.js`, `fisica/robot.js`, `fisica/ambiente.js`,
> `fisica/energia.js`, `fisica/danio.js`, `fisica/aspecto.js`, `feedback/reglas.js`, `data/schema/part.schema.json`,
> `docs/taller/PIEZAS.md` y el libro `Space_Apps_Game_Data.xlsx` (Parts, Materials, Robot Types, Abilities, Equations, Weather).
> Todos los números nuevos de este documento son **valores de juego (P)**: propuestas para probar, no datos de ingeniería.
> Lo que dice "dato" tiene hoja y ID del libro; lo que no tiene fuente se marca **sin fuente**.

---

## 1. Resumen

- Hoy hay **12 piezas en 7 ranuras**. Dos ranuras no dan para más sin tocar la pantalla: **ruedas** (3 opciones, el máximo que cabe) y **módulo** (1 sola opción, y es opcional).
- El Excel ya trae material para ampliar: 6 filas de piezas de referencia (PT-013 a PT-018), 12 materiales con densidad y límite elástico, 11 habilidades con base real (AB-001 a AB-011) y 6 tipos de robot.
- **Lo más barato y con mejor retorno** (solo datos, cero código): batería media, panel solar grande, un chasis nuevo (titanio) y un motor intermedio. Son 4 piezas, caben en las listas sin cambiar el Taller y no tocan el robot mínimo del camino dorado (730 / 890 créditos).
- **Lo que más juego da** (código chico en `robot.js`, frente Juego): dos módulos que usan reglas que ya existen: un **radiador del motor** (regla de calor, importa en la Luna) y un **aislamiento de batería** (regla del frío). Hoy el módulo solo tiene el panel solar.
- **Hallazgo que conviene saber ya:** `parts.json`, `PIEZAS.md` y el Excel (PT-012, PT-018) dicen que el panel solar "no tiene efecto en el MVP". **Ya tiene efecto**: `robot.js` llama a `recargaPanel()` y `ambiente.js` tiene la regla (c). Hay que corregir esas notas.
- **Falta de tiempo:** AGENTS.md §10 congela funciones el domingo a las 12:00. Recomiendo solo el nivel A antes del congelamiento y dejar el B como PR aparte, solo si Edmundo lo acepta.

---

## 2. Qué hay hoy en el juego

| Ranura (`id`) | Sistema | Obligatoria | Piezas actuales | Qué leen la física y el Taller de ella |
|---|---|---|---|---|
| `chasis` | estructura | sí | `chasis_ligero` (150 cr, 20 kg, resistencia 40) · `chasis_reforzado` (260, 35, 80) | `resistencia` = vida del chasis; tamaño en `DIM.chasis` (`robot.js`) |
| `rueda_del`, `rueda_tras` | movilidad | sí (×2 cada una) | `rueda_estandar` (80, 6 kg, r 0.45) · `rueda_ancha` (120, 8, r 0.5) · `rueda_tacos` (140, 9, r 0.45) | `agarre{arena,roca,compacto}`, `radio_m`, `masa`; fricción = agarre² × suelo |
| `motor` | potencia | sí | `motor_eficiente` (110, 7 kg, fuerza 50, consumo 0.6) · `motor_potente` (180, 10, 90, 1.2) | `fuerza` (velocidad máx. = 0.12 × fuerza m/s, torque), `consumo` (energía y calor) |
| `bateria` | energía | sí | `bateria_chica` (90, 5 kg, 100) · `bateria_grande` (170, 11, 220) | `capacidad` |
| `carga` | carga | sí | `soporte_basico` (60, 3 kg, protección 0.4) · `soporte_amortiguado` (130, 6, 0.8) | `proteccion`; altura de paredes en `DIM.paredSoporte` |
| `modulo` | modulo | **no** | `panel_solar` (150, 4 kg, capacidad 40) | `capacidad` × 0.0025 × luz del lugar = recarga por segundo (`ambiente.js`, regla c) |

Reglas del armado: presupuesto 1,000; robot mínimo 730 (ruedas estándar), 890 con ruedas anchas; las ruedas cobran ×2 en costo y masa; la masa de la carga (10 kg) la pone la física.

---

## 3. Qué hay en el Excel que se pueda convertir en pieza

### 3.1 Hoja Parts (referencias ya investigadas, no están en el juego)

| ID | Pieza | Estado | Se puede usar para |
|---|---|---|---|
| PT-013 | Rueda de malla del LRV (Apolo), 81.8 × 23 cm | Verified (S64) | Ya inspira `rueda_ancha`; no aporta pieza nueva |
| PT-014 | Rueda rígida con garras, Curiosity/Perseverance | Verified (S14, S68, S70) | Ya inspira `rueda_tacos`/`rueda_estandar` |
| PT-015 | Calentador / aislamiento de batería | **Gap** (no confirmado) | Módulo de aislamiento (ver B2), declarando el límite |
| PT-016 | Radiador / disipación de calor | Verified para la electrónica; **Gap para el motor** | Módulo radiador (ver B1), declarando el límite |
| PT-017 | Batería mediana, par de Li-ion de ~42 Ah (MSL) | Verified (S76) | `bateria_media` (A1) |
| PT-018 | Panel solar grande, 1.3 m², 140 W (MER) | Verified (S77) | `panel_solar_grande` (A2) |

### 3.2 Materiales (hoja Materials)

Precio base 25 créditos/kg × nivel de costo; "factor de masa" = densidad ÷ 2700 (aluminio = 1).

| ID | Material | Densidad kg/m³ | Límite elástico MPa | Nivel de costo | Factor de masa vs Al | Estado | Uso posible |
|---|---|---|---|---|---|---|---|
| MT-001 | Aluminio 6061-T6 | 2700 | 276 | 1 | 1.00 | Verified | Base de los chasis y ruedas actuales |
| MT-002 | Titanio Ti-6Al-4V | 4430 | 828 | 4 | 1.64 | Verified | Chasis de titanio (A3) |
| MT-003 | Acero inox 304 | 7900 | 205 | 2 | 2.93 | Verified | Poco útil: más pesado y menos resistente que el aluminio |
| MT-004 | Fibra de carbono / epoxi | 1590 | n/d | 3 | 0.59 | **Draft** (sin uso real en rover) | Chasis compuesto, solo como concepto (A4) |
| MT-005 | Nitinol (llanta superelástica) | n/d | n/d | 5 | n/d | Draft | Rueda de Nitinol (B3) |
| MT-006 | Kapton | 1420 | n/d | 2 | 0.53 | Verified | Capa del aislamiento (B2) |
| MT-007 | Sello de PTFE | 1980 | n/d | 2 | 0.73 | Draft | Sin mecánica de desgaste en el juego |
| MT-008 | Aerogel de sílice | 100 | n/d | 4 | 0.04 | Draft | Aislamiento de batería (B2) |
| MT-009 | HDPE (blindaje de radiación) | n/d | n/d | 1 | n/d | **Gap** | Sin regla de radiación en el juego |
| MT-010 / MT-011 | Celdas solares / Li-ion | n/d | n/d | 5 / 3 | n/d | Gap | Respaldo del panel y de la batería |
| MT-012 | Elastómero (llanta) | n/d | n/d | 1 | n/d | Gap, sin fuente | Rueda "solo para la prueba terrestre" (D) |

### 3.3 Habilidades (hoja Abilities) que podrían ser un módulo

| ID | Habilidad | Base real | Estado | ¿Hay regla en el juego? |
|---|---|---|---|---|
| AB-002 | Auto-rescate "caminando" con las ruedas | VIPER, Spirit (S34, S20) | Verified | **No** (hay evento `sin_fuerza`, pero no mecánica de escape) |
| AB-005 | Calentadores + aislamiento | VIPER (S34, S40) | Verified | **Sí, parcial**: la regla del frío (a); el calentador "no implementado" |
| AB-003 | Ruedas selladas contra el polvo | VIPER (S34) | Verified | No (no hay desgaste por polvo) |
| AB-004 | Llanta de Nitinol | NASA Glenn (S18) | Draft | Solo como agarre, no hay desgaste de rueda |
| AB-009 | Ruta que persigue la luz | LRO (S33) | Verified | No (no se elige ruta) |
| AB-010 | Hibernar en tormenta de polvo | Opportunity (S51, S52, S26) | Draft | No (no hay tormentas) |
| AB-011 | Blindaje de radiación | S40, S11, S10 | Draft | No (AGENTS §6.3: la radiación se declara como límite) |
| AB-001, 006–008 | Dirección independiente, cable, salto, serpiente | VIPER, Axel, Ingenuity, EELS | Verified / Draft | No (tipos de robot distintos) |

### 3.4 Tipos de robot (hoja Robot Types)
Solo RT-001 (rover de ruedas) es lo que el juego modela. RT-002 (orugas) y RT-003 (patas) están en **Gap** ("sin referencia espacial real"); RT-004 a RT-006 (cable, rotor, serpiente) son otro tipo de misión. AGENTS.md §15 manda dejarlos como extras.

---

## 4. Restricciones del código que condicionan qué se puede agregar

1. **Una pieza nueva de un sistema existente funciona sola con solo agregarla a `parts.json`.** Las ranuras filtran por `sistema` (`piezasPara`), la física lee `agarre`, `radio_m`, `masa`, `resistencia`, `fuerza`, `consumo`, `capacidad` y `proteccion` directamente de la pieza, y el costo y la masa salen de `resumen()`.
2. **La lista del Taller solo muestra 3 piezas.** Las filas están a 52 px desde y=195 y la caja de validación empieza en y=352 (`VALIDACION_Y`); una cuarta fila se encimaría. Hoy ruedas = 3 (lleno), chasis 2, motor 2, batería 2, carga 2, módulo 1. **Sin tocar la pantalla caben 6 piezas más**: 1 chasis, 1 motor, 1 batería, 1 soporte y 2 módulos. Para más hace falta paginar o hacer scroll en `refrescarCatalogo()` (archivo mío, de Taller).
3. **Chasis y soportes nuevos usan el tamaño de los actuales si no se agregan a `DIM`** (`robot.js`: `DIM.chasis[id] ?? DIM.chasis.chasis_ligero`, `DIM.paredSoporte[id] ?? 0.25`). Funciona, pero se vería igual; para que se vea distinto hay que agregar el ID a `DIM` (frente Juego).
4. **El arte tampoco bloquea:** `aspecto.js` dibuja figuras provisionales si falta el sprite. El ícono 16 × 16 de `assets/iconos/<id>.png` es opcional (Taller no muestra ícono si no existe). Para el sprite propio de la pieza, la tabla `TABLA` de `aspecto.js` solo conoce chasis, ruedas y soportes. Las calcomanías `deco_<id>` ya existen para motor, batería y módulo.
5. **Las recomendaciones de `feedback/reglas.js` usan IDs fijos.** Una pieza nueva existe en el Taller, pero el feedback nunca la sugiere hasta que alguien agregue una regla (frente Juego).
6. **El camino dorado no se toca.** Robot mínimo 730, con ruedas anchas 890, masa 59 kg; `diseno.test.mjs` lo comprueba. Nada de lo propuesto cambia piezas existentes.
7. **Cambiar la física o los valores de piezas existentes obliga a repetir las corridas 1–6 de `docs/estado/taller.md`.** Agregar piezas nuevas no. Un módulo nuevo con efecto en `robot.js` sí merece una corrida.
8. **`part.schema.json` (solo el integrador) no prohíbe campos extra**, así que un campo nuevo como `radiacion` pasa `validate_data.py`. Conviene pedir al integrador que lo declare como opcional.
9. **Valor real del panel solar:** con `capacidad 40`, la recarga es 40 × 0.0025 = **0.1 unidades/s** en la Tierra (0.043 en Marte, 0.02 en el polo lunar). El motor eficiente gasta ≈ 1.0 unidades/s con la carga. El panel hoy suma ~10 % de autonomía en la Tierra y casi nada en la Luna. Si se agrega el panel grande, conviene que se note.

---

## 5. Propuestas

### Nivel A: solo datos (`parts.json` + fila en el Excel; cero código)

| # | Pieza (`id`) | Ranura | Basis real (dato) | Valores (P) | Qué enseña / compromiso |
|---|---|---|---|---|---|
| A1 | `bateria_media` · Batería media | bateria | PT-017: par de Li-ion de ~42 Ah de Curiosity (S76, Verified). El Ah no se compara con las unidades del juego | costo 130, masa 8, capacidad 150 | Punto medio entre chica (100) y grande (220): no siempre hace falta la grande |
| A2 | `panel_solar_grande` · Panel solar grande | modulo | PT-018: 1.3 m², 140 W en Marte, ~900 Wh/sol, baja a ~600 por el polvo (S77, Verified) | costo 230, masa 7, capacidad 80 | Recarga 0.2/s en la Tierra: se nota; en la Luna (luz rasante) sigue siendo poco |
| A3 | `chasis_titanio` · Chasis de titanio | chasis | MT-002: Ti-6Al-4V, 4430 kg/m³ (×1.64 de masa), límite 828 MPa (×3.0 que el aluminio) (S36, Verified) | costo 380, masa 33, resistencia 110 | Más fuerte que el reforzado (80) y 2 kg más ligero, pero deja solo 40 créditos libres con ruedas estándar (960): no cabe ni la rueda ancha. Obliga a elegir |
| A4 | `motor_medio` · Motor intermedio | motor | **Sin fuente**: mecánica de juego (cada rueda de Perseverance tiene motor propio, S14, solo contexto) | costo 145, masa 8.5, fuerza 70, consumo 0.9 | Entre el eficiente (50) y el potente (90). Velocidad máx. 8.4 m/s |

Opcionales de relleno (poca información nueva):
- `chasis_compuesto` (MT-004, **Draft**, sin uso real en rover): masa 12 (×0.59 de 20), resistencia 35 (P, sin límite elástico en el libro), costo 300. Se ve atractivo por la energía (menos masa, menos gasto), pero **no tiene referencia de uso real**: presentarlo como concepto.
- `soporte_rigido` (sin fuente): protección 0.6, masa 4, costo 95. Punto medio entre los soportes actuales.

**Cuenta de caber en el Taller (sin scroll):** A1 + A3 + A4 + A2 = batería 3, chasis 3, motor 3, módulo 2. `soporte_rigido` llenaría `carga` a 3. Las ruedas ya están llenas.

**Costos de comprobación (presupuesto 1,000):** robot mínimo con `bateria_media` = 770; con ruedas anchas = 930. Con `chasis_titanio` y ruedas estándar = 960. Con `motor_medio` en lugar del eficiente = +35.

### Nivel B: módulos con efecto (código chico en `robot.js`; frente Juego)

El slot `modulo` es opcional y hoy tiene una opción: es donde más se gana. Dos efectos usan reglas que **ya existen** en `ambiente.js` y aceptan parámetros, así que el cambio es de pocas líneas.

**B1 · Radiador del motor (`radiador_motor`)**
- Dato: PT-016: radiadores externos disipan el calor de desecho hacia el ambiente (S78, S76), verificado para la electrónica, **Gap para el motor**. Declarar ese límite en la tarjeta.
- Regla: `pasoTemperaturaMotor()` y `potenciaPermitida()` ya reciben `reglas`; el módulo sumaría su aporte al coeficiente `radiacion` (0.004). En el vacío (Luna) solo se enfría por radiación, así que ahí importa: sin radiador, a fondo, el motor potente llega a 100 °C en ~30 s y el eficiente en ~60 s (cálculo con las constantes de `ambiente.js`, desde −53 °C).
- Valores sugeridos (P): costo 140, masa 5, `radiacion` +0.016. **Probar con `temperaturaEquilibrio()`** antes de fijarlos: con +0.016 (coeficiente total 0.02), el motor eficiente a fondo se estabiliza en ≈ 67 °C en la Luna (debajo del límite de 100 °C) y el potente se estabilizaría en ≈ 187 °C, así que sigue sobrecalentando, pero más tarde.
- Código: ~3 líneas en `Robot._termica()` (pasar `reglas` con la suma). Tabla de efectos de `datoClave()` en Taller.js (mío).

**B2 · Aislamiento de batería (`aislamiento_bateria`)**
- Dato: MT-008 (aerogel, k ≈ 0.02 W/m·K, Draft) y MT-006 (Kapton, Verified); AB-005 (VIPER, Verified); PT-015 está en **Gap**: no confirmado que un rover use calentador de batería. Presentarlo como "aislamiento", no como calentador.
- Regla: `factorFrio(tMin, reglas)` ya acepta `reglas`; el módulo reduciría `perdida_por_C` (por ejemplo a la mitad).
- **Poco efecto real:** la regla tiene piso de 85 % de batería útil. El módulo salvaría como máximo 7.5 puntos porcentuales en Marte (−83 °C) y casi nada en Samalayuca (0.3 °C). Se justifica como pedagogía ("el frío cuesta batería"), no como ventaja grande.
- Valores sugeridos (P): costo 110, masa 3, `aislamiento` 0.5.

Con A2, B1 y B2 el módulo tendría 4 opciones (panel, panel grande, radiador, aislamiento) → hay que paginar la lista (ver §4.2). Elegir cuál se pone: es un compromiso real (energía solar contra calor contra frío).

**B3 · Rueda de Nitinol (`rueda_nitinol`)**
- Dato: AB-004 / MT-005: llanta superelástica NASA Glenn, deformación 10–12 % contra 0.3 % de materiales anteriores, probada a −130 °C (S18, **Draft**); nivel de costo 5. Densidad y límite elástico **no están** (Gap).
- Valores sugeridos (P): costo 140 (ver el cálculo de abajo), masa 7, radio 0.45, agarre arena 0.55 · roca 0.85 · compacto 0.85. En el juego no hay desgaste de rueda, así que solo sería agarre.
- Requiere paginar la lista de ruedas (4.ª opción). Impacto en el balance: las ruedas se compran ×2 por eje, así que un eje cuesta 380 y los dos 760; con el resto del robot mínimo (730 − 320 + 760 = 1,170) **no cabe en 1,000**. Para que quepa hay que bajar el costo a ≈ 140 por rueda (4 ruedas = 560, total 970). Probar antes.

### Nivel C: con mecánica nueva (medio; Juego y Arte)

- **Suspensión activa / auto-rescate (AB-002, Verified):** VIPER y Spirit. Mecánica: si el robot detecta `sin_fuerza` o patinaje largo, gasta energía y tiempo para zafarse (por ejemplo +50 % de agarre por 2 s). Conecta con el camino dorado (patina en dunas), pero obliga a escribir lógica en `robot.js`, un evento nuevo, texto de feedback y arte. Es la mejor idea de gameplay, pero **no es de datos**.
- **Calentador de batería con consumo:** completar B2 con gasto de energía. Falta definir el consumo; el libro no trae potencia del calentador (Gap).
- **Selladores antipolvo (AB-003):** necesita una mecánica de desgaste que hoy no existe.

### Nivel D: no recomendado ahora
- **Orugas (RT-002) y patas (RT-003):** en el libro están en **Gap**, sin referencia espacial real. AGENTS §15 las deja como extras. Faltaría una referencia real y parámetros de contacto con el suelo.
- **Blindaje de radiación (AB-011, MT-009 en Gap), hibernación de tormenta (AB-010), ruta por luz (AB-009):** no hay regla en el juego.
- **Rueda de elastómero (MT-012):** sin fuente.
- **Cable de rapel, rotor, serpiente:** son otros tipos de misión.

---

## 6. Recomendación para hoy

1. **Antes del congelamiento (Dom 12:00): nivel A completo** (A1–A4). Cuatro objetos en `parts.json`, cuatro filas en la hoja Parts del Excel (PT-019 a PT-022), cuatro íconos de arte y, si hace falta, notas en `PIEZAS.md`. Cero riesgo para el camino dorado.
2. **Corregir la nota vieja del panel solar** (parts.json, PIEZAS.md, Excel PT-012 y PT-018): ya tiene efecto. Eso también corrige un error ante los jueces.
3. **B1 y B2 solo con visto bueno de Edmundo** (tocan `robot.js`, de Juego) y con una corrida de verificación; si no, quedan como "visión" en el pitch.
4. **No tocar** nada del nivel C y D antes de entregar.

### Qué decidir tú
- ¿Los 4 de A, o menos? (batería media y panel grande son los más sólidos por la fuente; titanio y motor medio son balance.)
- ¿Paginación en el Taller (B3 y el cuarto módulo) o quedarse en 3 por lista?
- ¿Pido a Edmundo B1/B2, o los dejamos como visión?

### Datos que faltan (para tu otro chat de investigación, una línea cada uno)
- Límite elástico y densidad del Nitinol (MT-005) y de la fibra de carbono para uso estructural de rover.
- Una referencia espacial real de orugas (o rovers de oruga) con presión de contacto o parámetros de Bekker.
- Si algún rover de la NASA usa calentador de batería con consumo (potencia en W).
- Potencia del radiador o capacidad de disipación del motor de rueda (PT-016: Gap para el motor).

---

## 7. Archivos que tocaría cada propuesta (para no chocar con la otra sesión)

| Cambio | Archivos | Frente dueño |
|---|---|---|
| A: piezas nuevas | `game/src/content/parts.json`, `docs/taller/PIEZAS.md`, `docs/taller/Space_Apps_Game_Data.xlsx` (hoja Parts + Review Log + Sources) | Taller (Leo) |
| A: ícono de pieza | `assets/iconos/<id>.png` (16 × 16) | Arte (Mauricio) |
| A: aviso del campo nuevo en el esquema | `data/schema/part.schema.json` (opcional) | Integración (Alan) |
| B: efecto del módulo | `game/src/fisica/robot.js` (≈ 5 líneas) | Juego (Edmundo) |
| B: texto en la tarjeta del Taller | `game/src/scenes/Taller.js` (`datoClave`) | Taller (Leo) |
| B: recomendación nueva en el feedback | `game/src/feedback/reglas.js` | Juego (Edmundo) |
| Tamaño propio del chasis/soporte nuevo | `DIM` de `game/src/fisica/robot.js`, `TABLA` de `aspecto.js` | Juego (Edmundo) |
| Paginación de la lista | `game/src/scenes/Taller.js` (`refrescarCatalogo`) | Taller (Leo) |

## 8. Cómo verificar al implementar

1. `node game/src/scenes/Taller/diseno.test.mjs` (730, 890 y masa 59 no deben cambiar).
2. `python model/validate_data.py` (valida `parts.json` contra `part.schema.json`).
3. `cd game && npm run build`.
4. Prueba manual: cada pieza nueva en su ranura; el robot mínimo sigue en 730; la autonomía del Taller cambia con la batería media; con el panel grande sube la recarga mostrada.
5. Excel: filas con estado, fuente (S-ID), fecha y unidad; valores (P) marcados; recalcular con LibreOffice (0 errores); copia idéntica en `docs/taller/` y en `nov 14\Data\`.
6. Si se agrega B: repetir las corridas 1–6 de `docs/estado/taller.md` y avisar a Edmundo.
