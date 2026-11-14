# Especificación del frente juego (v1)

> Dueño: frente juego (Edmundo) · Rama: `feat/juego` · 14 nov 2026, 13:56.
> Acordado con el responsable del frente. Todo número de balance es **valor de juego** (P), no dato científico.
> Lo que toca archivos de otros frentes o compartidos está en "Propuestas" y lo aplica su dueño.

## 1. Estructura de código

| Ruta | Contenido |
|---|---|
| `game/src/fisica/robot.js` | Construye el robot (chasis, ruedas, ejes, carga) a partir de `partida.diseno` |
| `game/src/fisica/terreno.js` | Convierte un perfil (m) en cuerpos estáticos; generador procedural de respaldo |
| `game/src/fisica/telemetria.js` | Eventos de la partida y armado del `Result` (`data/schema/result.schema.json`) |
| `game/src/fisica/danio.js` | Daño por impacto al chasis y a la carga |
| `game/src/fisica/energia.js` | Consumo de la batería |
| `game/src/feedback/` | Reglas de recomendación a partir de los eventos |
| `game/src/scenes/Prueba.js`, `Mision.js`, `Resultados.js` | Escenas del frente |

`game/src/fisica/` es carpeta nueva del frente juego (se propone agregarla a la tabla del §9 de AGENTS.md).

## 2. Escala y pantalla

- Resolución base del arte: **320 × 180**, escalada **× 3** al lienzo de 960 × 540 (escalado entero).
- **8 px de arte = 1 m** → 24 px de pantalla por metro. Robot de 3 m = 24 px de arte. Se ven ~40 m de terreno.
- La cámara sigue al robot; los límites del mundo miden lo que mida el nivel.
- Constante única en `fisica/` (`PX_POR_M`); nada de números mágicos en las escenas.
- Efectos de **pixelfx**: se integran después de la lógica, junto con arte (Mauricio).

## 3. Robot

- Vista lateral con **2 ruedas visibles**; cada una representa **un eje con 2 ruedas** (4 en total).
- Ranuras (contrato con taller):

| Ranura | Sistema de la pieza | Obligatoria |
|---|---|---|
| `chasis` | estructura | sí |
| `rueda_del` | movilidad | sí |
| `rueda_tras` | movilidad | sí |
| `motor` | potencia | sí |
| `bateria` | energia | sí |
| `carga` | carga | sí |
| `modulo` | modulo | no |

- **Fuente única:** ranuras, sistemas, obligatorias, multiplicador × 2, diseño por defecto y cálculo de costo/masa viven en
  `scenes/Taller/diseno.js` (frente taller). `fisica/diseno.js` los reutiliza y solo agrega lo de la física: completar ranuras
  obligatorias vacías con el diseño por defecto (`completadas`), reportar `invalidas` y `MASA_CARGA_KG` = 10 (valor de juego).
- `partida.diseno = [{ ranura, pieza }]` (formato de `result.schema.json`).
- Cada ranura de rueda cobra **2 × costo y 2 × masa** de la pieza.
- Robot mínimo con ruedas estándar ≈ 730 de 1,000 créditos (chasis ligero 150 + 2×2×80 + batería chica 90 + motor eficiente 110 + soporte básico 60).
- Si `partida.diseno` está vacío (pruebas), se usa un diseño por defecto con `rueda_estandar`.
- Radio de rueda: `radio_m` de `parts.json` (0.45 / 0.5 / 0.45 m); la tabla de `fisica/robot.js` es solo respaldo y tiene los mismos valores.
- Masa total para física y energía = masa de piezas (ruedas × 2) + `MASA_CARGA_KG` (la carga es un cuerpo aparte).
- Atributos que lee la física por pieza: rueda `agarre[arena|roca|compacto]`, `radio_m`, `masa`; chasis `resistencia`;
  motor `fuerza`, `consumo`; batería `capacidad`; soporte `proteccion`. `capacidad` del panel solar no se usa (fuera del MVP, §6).
- Agarre: cada eje usa el **suyo** según la superficie bajo esa rueda (no se toma el mínimo de los dos ejes).
- **La carga es un cuerpo suelto** sobre el soporte: puede caerse. Un fragmento suelto nunca activa la victoria.

## 4. Controles

- **Acelerar / frenar**: teclado → / ← (o D / A); táctil: dos botones en pantalla.
- Sin control de inclinación en el aire.

## 5. Física (Matter.js)

- Gravedad: `GRAVEDAD[mundo] × ESCALA_GRAVEDAD` (`config/world.js`). Prueba = Tierra; Misión = destino elegido.
- **Fricción:** Matter combina con el mínimo (`pair.friction = min(A, B)`) y no es de Coulomb (umbral estático = fricción × frictionStatic × 5).
  Suelo = 1; rueda = **`agarre[superficie]²`** (curva de juego que separa las ruedas: 0.4 → 0.16, 0.9 → 0.81). Calibrado en pruebas sin interfaz:
  en las dunas, la rueda estándar patina 37 veces y se queda sin energía; la ancha llega a la meta en ~60 s.
- Terreno: un **cuadrilátero convexo por tramo** del perfil (punto i → i+1, cerrado hacia abajo), grueso para evitar que el robot lo atraviese.
- Vehículo: ruedas circulares unidas al chasis con `constraint` (suspensión con rigidez 0.2–0.5); el chasis no colisiona con sus ruedas (`collisionFilter.group` negativo).
- Motor: en cada `update`, velocidad angular objetivo de las ruedas proporcional al acelerador, con tope según `fuerza`.
- **Agarre real del suelo** (`fisica/suelos.js`): fricción de la rueda = curva(agarre de la pieza) × tan(φ medio del suelo), con tope 1.
  Datos del libro de taller (Space_Apps_Game_Data.xlsx, hoja Biomes): Luna regolito φ 30–50° (Connolly y Carrier, NASA NTRS 20220014634);
  Marte drift 15.6–20.4°, costra 29.8–39.2°, roca 40–60° (Viking, NASA NTRS 20200003046, tabla 1). Tierra: sin dato (Gap) → el suelo no limita.
  Medido (batería chica, motor eficiente, perfiles reales de data/): Luna ancha entrega (79 s, 21 %), estándar sin energía;
  Marte ancha entrega (63 s, 37 %), estándar también entrega (71 s, 32 %) porque Jezero es casi plano (≤4.3°): el hundimiento
  en suelo blando (Bekker) haría la diferencia, pero es Gap en el libro de datos. Samalayuca: estándar sin energía; ancha llega (59 s).
- **Patinaje:** `|ω_rueda × r| − |v_chasis|` mayor que un umbral durante más de ~0.3 s → evento `patinaje` con la superficie del tramo.

## 6. Energía

- Por segundo: `consumo × acelerador × (1 + masa_total / 100)`. Detenido no gasta.
- Capacidad = `capacidad` de la batería. Al llegar a 0: motor apagado → derrota por energía.
- Panel solar: **fuera del MVP** (no hay regla de iluminación explicable todavía).

## 7. Daño

- En cada choque (`collisionStart`): `daño = max(0, v_relativa − umbral) × factor`.
- Chasis: vida = `resistencia` de la pieza; en 0 → derrota por destrucción.
- Carga: recibe `daño × (1 − proteccion)` del soporte; integridad de 1.0 a 0.

- **Sacudidas (daño principal a la carga):** la suspensión absorbe los choques y la carga nunca deja de tocar el soporte, así que
  la carga se daña por la aceleración brusca del chasis: sacudida suavizada > 4 g → pierde (g − 4) × 0.25 por segundo × (1 − protección). (P)
  Medido: Samalayuca con rueda ancha → carga 82 % con soporte básico, 94 % con amortiguado; Pinacate con tacos 96 % / 99 %; misiones 98 %.

## 8. Terreno y superficie

- Si el sitio tiene `nivel.perfil_elevacion_m`, se usa ese perfil con su `exageracion_vertical` y la compresión horizontal declarada.
- Si no, **generador procedural con semilla fija** por tipo (dunas, lava, pendiente, cráter), con aviso en pantalla **"terreno ilustrativo"**.
- **Perfil real largo (3–10 km):** se usa un **tramo real de 250 m sin deformar** (la ventana de mayor pendiente media con pendiente máxima ≤ 30°); en pantalla se declara "tramo real de 250 m (desde el m X) de un transecto de Y km".
- **Caras de duna recreadas:** en tramos de arena de sitios terrestres se agregan caras de duna de ~32° (ángulo de reposo de la arena), porque el modelo de 30 m no las resuelve. Se declaran en pantalla y en `perfil.recreacion`. Verificado con el perfil real de Samalayuca: la rueda estándar patina y se queda sin energía; la ancha llega a la meta en ~64 s.
- Acepta `superficies [{desde, hasta}]` y `superficie_tramos [{desde_m, hasta_m}]` (formato de `ciencia_datos/datos/niveles.json`).
- Superficie **por tramo**: `nivel.superficies = [{ desde, hasta, tipo }]` en metros, `tipo` ∈ `arena | roca | compacto` (propuesta de esquema).
- **Bloques de roca recreados:** en tramos de roca de sitios terrestres, bloques de ~0.2–0.4 m cada 6 m (el modelo de 30 m no resuelve rocas
  sueltas), declarados en pantalla y en `perfil.recreacion`. Resultado: en Pinacate la rueda ancha (agarre en roca 0.5) se atasca y la de tacos o
  la estándar pasan: la rueda buena para arena es mala en roca.
- Obstáculos agregados para jugar llevan `recreacion: true`.

## 9. Prueba terrestre

- Gravedad de la Tierra siempre (el análogo no simula la gravedad del destino).
- **Pasa** si el robot llega al **final del recorrido** con chasis y carga vivos.
- Genera telemetría (eventos) para el feedback.

## 10. Misión

- Gravedad del destino elegido: Luna (`polo_sur_lunar`, 1.62 m/s²) o Marte (`jezero`, 3.71 m/s²).
- Zona de entrega al final del terreno, con el astronauta como marcador.
- **Victoria:** carga en la zona con integridad ≥ 60 % y robot detenido 2 s.
- **Derrota:** destrucción, pérdida de la carga o energía agotada (al detenerse sin energía, o a los 5 s sin energía si queda atascado contra el borde del nivel) (P).
- Llegar a fondo sin frenar no gana: el robot pasa la zona, choca con el borde y pierde la carga o se queda sin energía.
- **Tiempo de juego = tiempo de física:** energía, patinaje y entrega usan el paso fijo de Matter (`runner.delta`), no el delta del cuadro. Así el balance no cambia con los fps (antes, a 30 fps la batería se gastaba al doble por metro).
- **Terreno real** (`destino.nivel`, formato de `ciencia_datos/datos/niveles.json`): tramo real de 250 m sin deformar, elegido como la ventana cuya **pendiente media se parece más a la pendiente típica medida del destino** (`variables.pendiente`: Luna 8.63°, Marte 3.56°), no la más empinada; se declara en pantalla (desde qué metro, de qué transecto y con qué pendiente media). Polo sur lunar: m 1920 de 4.0 km, media 8.2°, sube 37 m. Jezero: m 2600 de 10.0 km, media 3.4°, baja 15 m. Sin `variables.pendiente`, se usa la regla de la prueba (la más empinada ≤ 30°).
- **Terreno ilustrativo** (sin `nivel`, aviso "terreno ilustrativo"): todo arena salvo un afloramiento de roca en Marte, como los perfiles reales (98–100 % arena por la regla de pendiente). Luna: 240 m jugables, ladera con cráteres pequeños (≤ 1.2 m de hondo). Marte: 170 m, ondulaciones y dunas bajas. A los dos se les suma una inclinación media igual a la pendiente típica medida del destino, declarada en la nota. Sin paredes de más de ~18° (con gravedad baja, las de 25–30° tiraban la carga). (P)
- Resultados medidos sin interfaz (paso fijo 60 Hz, acelerador a fondo y frenar al entrar 3 m en la zona; batería chica, motor eficiente, chasis ligero y soporte básico salvo donde se indica):

| Destino · terreno | Rueda ancha (camino dorado) | Rueda estándar | Motor potente + rueda ancha | Estándar + batería grande |
|---|---|---|---|---|
| Luna · ilustrativo | entrega, 71 s, 29 % energía | sin energía a 243 de 288 m | sin energía a 240 m | entrega, 109 s, 50 % |
| Luna · real (LOLA) | entrega, 74 s, 26 % | sin energía a 246 de 298 m | sin energía a 225 m | entrega, 115 s, 47 % |
| Marte · ilustrativo | entrega, 43 s, 58 % | entrega, 55 s, 48 % | entrega, 32 s, 41 % | entrega, 56 s, 75 % |
| Marte · real (HRSC+MOLA) | entrega, 53 s, 47 % | entrega, 71 s, 32 % | entrega, 38 s, 27 % | entrega, 71 s, 68 % |

  Integridad de la carga 100 % en todos. A fondo sin frenar: derrota en los cuatro terrenos. La Luna es la que separa ruedas
  (con gravedad baja, Matter da menos agarre y la rueda estándar patina todo el recorrido); Marte separa por energía y tiempo.
  Rueda con tacos en la Luna: sin energía a ~185 m (más lenta que la estándar en regolito; por revisar con taller).

## 11. Puntuación (valor de juego)

- `500 (si entrega) + integridad × 3 + energía_restante × 1 + ahorro × 1`, con integridad, energía y ahorro en % (0–100). Máximo 1,000.
- Estrellas: 1 ★ si entrega · 2 ★ ≥ 750 · 3 ★ ≥ 900. A confirmar con integración.
- La puntuación no es evidencia científica.

## 12. Feedback por reglas

Cada recomendación sale de un evento real de la partida:

| Evento | Recomendación |
|---|---|
| `patinaje` en arena con rueda estándar | Cambiar a rueda ancha |
| No sube una pendiente (se detiene acelerando) | Motor potente o rueda con tacos |
| Daño a la carga (integridad final < 90 %) o carga perdida | Soporte amortiguado |
| Energía agotada | Batería grande o motor eficiente |
| Chasis destruido | Chasis reforzado |

## 12b. Dónde se rompe la analogía (pantalla de resultados de la misión)

`game/src/feedback/analogia.js` compara la última prueba terrestre con la misión, con la telemetría real de ambas:
gravedad (Tierra vs destino), momentos de patinaje, batería por cada 100 m, suelo medido del destino (suelos.js) y lo que
la Tierra no puede reproducir (`no_reproducible_en_tierra` del target). Es la respuesta en vivo a "dónde se rompe la analogía".

## Teclado en resultados

Botones numerados 1–3 y Enter = siguiente paso sugerido (prueba fallida → taller; prueba superada → misión; misión cumplida → menú).

## 13. Transiciones y reinicio

- Transición común `irA(escena, destino)` con fundido; todos los frentes la usan en lugar de `scene.start` (propuesta para `ui.js`).
- Reiniciar partida restaura presupuesto, tickets y diseño sin duplicar recursos (propuesta para `main.js`).

## 14. Propuestas a otros frentes

| Para | Propuesta |
|---|---|
| Integración (Alan) | `nivel.superficies` en `data/schema/site.schema.json` · `irA()` en `game/src/scenes/ui.js` · `runner: { isFixed: true }` en la config de Matter (`main.js`) para comportamiento determinista · `reiniciarPartida()` en `main.js` · agregar `game/src/fisica/` al frente juego en §9 · confirmar puntuación y estrellas |
| Taller (Leo) | Usar las 7 ranuras de §3 y `partida.diseno = [{ ranura, pieza }]`; cobrar ruedas × 2 |
| Expediente (Diego) | El menú guarda `partida.destino` (`'jezero'` o `'polo_sur_lunar'`) y usa `irA()` |
| Modelo (Mario) | `perfil_elevacion_m` y superficies por tramo de los sitios; un perfil para el polo sur lunar y otro para Jezero |
| Arte (Mauricio) | Sprites a 8 px/m sobre base 320 × 180: chasis, rueda (radio según pieza), carga, astronauta; efectos de pixelfx después de la lógica |
