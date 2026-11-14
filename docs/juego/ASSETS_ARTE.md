# Assets que necesita el juego (para arte · Mauricio)

> Dueño de este documento: frente juego (Edmundo). Dueño del arte y de `/assets`: frente arte (Mauricio).
> Las medidas salen de la física (`game/src/fisica/`). Si el arte necesita otras medidas, se cambia la constante y no el dibujo.
> Mientras no haya sprites, el juego dibuja figuras provisionales con estas mismas medidas.

## 1. Estilo acordado

- **Referencia de estilo: Dead Cells.** Solo como inspiración visual: **todo el arte es propio** (AGENTS.md §3.8), sin copiar sprites, personajes, paletas exactas ni composiciones.
  Lo que se toma del estilo:
  - fondos oscuros y profundos con acentos saturados;
  - luz de borde (rim light) en el robot y el astronauta para separarlos del fondo;
  - fuentes de luz que brillan (faros del robot, baliza de la base);
  - muchas partículas (polvo, chispas), que pixelfx cubre bien.
- **Contorno oscuro de 1 px** en robot, carga, astronauta y piezas.
- **Ruedas:** animación de **4 cuadros** sin rotar el sprite. El juego elige el cuadro según el giro real de la rueda (también cuando patina).
- **Fondos:** **3 capas con paralaje** (cielo fijo, lejana y cercana), cada una de 320 × 180 y repetible a lo ancho.
- **Cada mundo se reconoce por el color:** Tierra cálida y arenosa, Marte óxido, Luna gris de alto contraste con cielo negro y luz rasante (polo sur).

### Paleta base (sacada del título de MARSCEPTION)
- Espacio morado oscuro: `#0d051c` `#180630` `#240d43` `#2e0d6b`.
- Marte naranja óxido: `#a8593e` `#bc6240` `#af5a3a`.
- Acentos: cian para la Tierra, rojo para Marte, lavanda para la UI; blanco para el texto.
- Luna: grises fríos con cielo negro (por definir con Mauricio).
- El título usa 225 colores en total; los sprites del juego conviene que usen la paleta corta de arriba por mundo.

## 2. Escala

- Resolución base **320 × 180**, escalada **× 3** a 960 × 540. Todo se dibuja a 1 px de arte; el juego lo escala.
- **8 px de arte = 1 m.**
- **Medido en el GIF de título de MARSCEPTION** (Mauricio): está dibujado a **400 × 225** y el HD es × 3 exacto (1200 × 675). El **tamaño de píxel
  coincide con el juego** (1 px de arte = 3 px de pantalla); solo cambia el cuadro. Como 400 × 225 no entra entero en 960 × 540 (sería × 2.4,
  píxeles desiguales), **las pantallas del juego se dibujan en 320 × 180**. El GIF de 400 × 225 queda para tráiler, pitch y página
  (`docs/media/` en la rama `feat/arte-marsception-ligero`; no va en `assets/` porque el Boot precarga todo `assets/**/*.gif`).
- Escala decidida: se queda **8 px = 1 m** (el robot de 24 px mide como 5 letras de la tipografía chica del título). No hace falta recalibrar la física.
- Si hiciera falta más detalle: **480 × 270 × 2 con 12 px = 1 m** sin tocar la física (dos constantes en `game/src/fisica/escala.js`).

## 3. Lista de assets (medidas en px de arte a 8 px/m)

Prioridad: **A** = camino dorado (primero) · **B** = segunda pasada · **C** = si da tiempo.

### Robot
| Asset | Medida | Cuadros | Prioridad | Notas |
|---|---|---|---|---|
| `chasis_ligero` | 24 × 6 | 1 (+1 dañado) | A | 3.0 × 0.7 m. Origen: centro de la caja. Antena o detalles pueden sobresalir |
| `chasis_reforzado` | 24 × 7 | 1 (+1 dañado) | B | 3.0 × 0.9 m, con placas |
| `rueda_estandar` | 7 × 7 | 4 (giro) | A | radio 0.45 m (`radio_m` de parts.json, PR de taller) |
| `rueda_ancha` | 8 × 8 | 4 | A | radio 0.5 m; llanta gruesa que se note "para arena" |
| `rueda_tacos` | 7 × 7 | 4 | B | radio 0.45 m; tacos visibles en el borde |
| `soporte_basico` | 10 × 2 | 1 | A | paredes de 0.25 m a los lados de la carga |
| `soporte_amortiguado` | 10 × 4 | 1 | B | paredes de 0.45 m y resortes |
| `carga` (suministro) | 7 × 5 | 3 estados | A | 0.9 × 0.6 m: entera, dañada, crítica |
| Motor, batería y panel visibles en el chasis | ~4 × 3 c/u | 1 | C | calcomanías encima del chasis |

Si cambian los radios en `parts.json`, la rueda se dibuja con el diámetro = 2 × radio_m × 8.

### Personajes y escenario
| Asset | Medida | Cuadros | Prioridad | Notas |
|---|---|---|---|---|
| `astronauta` | ~8 × 15 | reposo 4, saluda 4, celebra 6 | A | 1.8 m. Origen: pies. El mismo traje para Luna y Marte |
| `base` (hábitat) | 40 × 24 | 1 | B | 5 × 3 m, detrás de la zona de entrega |
| `baliza` | 4 × 8 | 4 | B | luz que parpadea y brilla |
| `meta` (bandera de la prueba) | 8 × 16 | 4 | A | ondea |
| `zona_entrega` | 16 × 4 (repetible) | 1 | A | marca en el suelo |

### Terreno (tiles)
Relleno **16 × 16 repetible** + borde superior **16 × 4** por cada combinación:

| Mundo | arena | roca | compacto |
|---|---|---|---|
| Tierra | A | B | B |
| Marte | B | B | B |
| Luna | B (regolito) | B | — |

El terreno es un polígono con pendientes: el relleno se repite como textura y el borde sigue la línea del suelo.

### Fondos (3 capas cada uno, 320 × 180, repetibles a lo ancho)
| Fondo | Prioridad |
|---|---|
| Dunas (Samalayuca) | A |
| Campo de lava (Pinacate) | B |
| Desierto genérico (para candidatos sin fondo propio) | B |
| Marte (Jezero) | A |
| Luna (polo sur, cielo negro, luz rasante) | A |

### Efectos (pixelfx o a mano; se integran después de la lógica)
| Efecto | Cuándo lo dispara el juego | Prioridad |
|---|---|---|
| Polvo de ruedas (color según superficie) | rueda en el suelo con velocidad | A |
| **Arena que salta al patinar** | evento `patinaje`: comunica el problema del camino dorado | A |
| Chispas de impacto | `golpe_chasis` en roca | B |
| Destello en la carga | `golpe_carga` | B |
| Explosión o desarme | `chasis_destruido` | B |
| Humo y apagado del motor | `energia_agotada` | C |
| Celebración de entrega | `entrega` | B |

#### Efectos: nombre de archivo → evento

El juego (`game/src/fisica/efectos.js`) busca al compilar archivos `fx_*.png` (y su `.json` del mismo nombre, opcional) en cualquier carpeta de `assets/`.
Si existe la hoja, la reproduce en lugar del efecto provisional de partículas; si no existe, no pide nada (sin 404).

| Archivo | Evento del juego | Dónde aparece |
|---|---|---|
| `fx_polvo_<superficie>` (`fx_polvo_arena`, `fx_polvo_roca`, `fx_polvo_compacto`) | `polvo`: rueda en el suelo con velocidad (frecuencia ∝ velocidad) | punto de contacto de cada rueda |
| `fx_patinaje` | `patinaje`: rueda que patina (chorro continuo de arena) | borde trasero de la rueda que patina |
| `fx_golpe_chasis` | `golpe_chasis` (chispas si la superficie es roca) | punto más bajo del chasis |
| `fx_golpe_carga` | `golpe_carga` (destello) | centro de la carga |
| `fx_carga_perdida` | `carga_perdida` | centro de la carga |
| `fx_chasis_destruido` | `chasis_destruido` (explosión o desarme) | punto más bajo del chasis |
| `fx_energia_agotada` | `energia_agotada` (humo) | centro del chasis |
| `fx_entrega` | `entrega` (celebración) | sobre la carga |
| `fx_meta` | `meta` (prueba superada) | punta de la bandera |

- Variantes opcionales, de la más específica a la general: `fx_<evento>_<mundo>_<superficie>`, `fx_<evento>_<superficie>`, `fx_<evento>_<mundo>`, `fx_<evento>` (mundo: `tierra`, `marte`, `luna`).
- Con JSON (pixelfx `--sheet` o Aseprite): los cuadros se reproducen en orden natural de nombre, a 1000 / `duration` del primer cuadro (15 fps si no hay). Sin JSON: tira horizontal de cuadros cuadrados (alto = ancho de cada cuadro).
- Se dibujan a 1 px de arte (× 3 en pantalla). `polvo` y `patinaje`: origen abajo al centro y dibujados con el polvo saliendo **hacia la izquierda** (robot avanzando a la derecha); el juego los voltea si va en reversa. El resto: origen al centro.

### Interfaz
| Asset | Medida | Prioridad |
|---|---|---|
| Íconos de barra: energía, carga, chasis | 8 × 8 | A |
| Marco de barra (9-slice) | ~ 6 × 6 | A |
| Botones táctiles ◀ ▶ (normal y presionado) | 24 × 24 | A |
| Botón genérico (9-slice) | ~ 12 × 12 | A |
| Estrellas llena y vacía | 16 × 16 | B |
| Panel de resultados (9-slice) | ~ 16 × 16 | B |
| Íconos de las 12 piezas para el taller | 16 × 16 | A (lo usa taller) |
| Aviso "terreno ilustrativo" | libre | B |

Fuente pixel: debe ser propia o con licencia libre. La fuente "Patch Pixel" de pixelfx **no** es MIT: no usarla sin revisar su licencia.

## 4. Formato de entrega

- PNG con transparencia, en `assets/` (carpeta de arte).
- Animaciones como **tira horizontal** con cuadros del mismo tamaño, o exportadas de Aseprite con su JSON (Phaser las carga con `load.aseprite`).
- Nombres en `snake_case` iguales a la tabla (`rueda_ancha.png`, `astronauta.png`, ...).
- Origen: centro para robot, ruedas y carga; pies para el astronauta; esquina inferior izquierda para los tiles.
- Paletas por mundo en un archivo (`assets/paletas.json` o una imagen de paleta) para que los efectos de pixelfx usen los mismos colores.

## 5. Cómo entra el arte al juego

> Código: `game/src/fisica/aspecto.js` (frente juego). Nada que configurar: **basta con guardar el PNG con el nombre acordado** en `assets/`.

- **Detección automática.** Al compilar, Vite busca `assets/**/*.png` y `assets/**/*.json` (cualquier subcarpeta) y los indexa por nombre
  sin extensión. Las escenas Prueba y Misión cargan solo los que existen: si falta un archivo no se pide nada (sin 404) y se dibuja la figura provisional.
  Los nombres deben ser **únicos en todo `assets/`** (si se repiten, gana el primero y sale un aviso en la consola).
- **En `npm run dev`, después de agregar un archivo nuevo, reinicia el servidor** (Vite no siempre vuelve a buscar archivos nuevos). Cambiar un PNG que ya existía solo pide recargar.
- **Escala:** todo a 1 px de arte; el juego lo multiplica × 3 (`ZOOM_ARTE`). No se rota nada a mano: el chasis y la carga giran con su cuerpo físico; las ruedas no giran (cambian de cuadro).
- **Mezcla:** cada pieza se reemplaza por separado. Puede haber ruedas con arte y chasis provisional, o un mundo con tiles y otro sin ellos.

### Dos formatos de animación

1. **Tira horizontal** (`nombre.png` solo): cuadros del mismo tamaño, uno junto a otro, alto = alto de la imagen.
   El número de cuadros se deduce del ancho: se elige entre los permitidos (tabla de abajo) el que divide exacto y deja el cuadro
   más parecido al ancho nominal. Ej.: `rueda_ancha.png` de 32 × 8 = 4 cuadros de 8 × 8; `chasis_ligero.png` de 28 × 7 (antena que sobresale) = 1 cuadro; de 48 × 6 = 2 cuadros (normal + dañado).
2. **Aseprite** (`nombre.png` + `nombre.json` con el mismo nombre): exportar "Sprite Sheet" con JSON (Hash o Array) y etiquetas (tags).
   Los cuadros salen del JSON; las etiquetas con los nombres de abajo (`reposo`, `saluda`, `celebra`, `ondea`, `parpadea`) se usan como animaciones.
   Útil si los cuadros no son de igual ancho o si se prefiere no depender del ancho.
   Todas las animaciones van a 8 cuadros/s (las duraciones por cuadro de Aseprite se ignoran por ahora).

### Nombres exactos, cuadros y origen

| Archivo | Cuadros permitidos (tira) | Cómo los usa el juego | Origen |
|---|---|---|---|
| `chasis_ligero.png`, `chasis_reforzado.png` | 1 ó 2 de ~24 px | cuadro 2 = dañado (vida < 50 % o destruido) | centro de la caja (sobre el cuerpo base) |
| `rueda_estandar.png`, `rueda_ancha.png`, `rueda_tacos.png` | 1 ó 4 | cuadro = ⌊ángulo ÷ 90°⌋ mod 4; dibujar en orden de giro **horario** (avance a la derecha) | centro |
| `soporte_basico.png`, `soporte_amortiguado.png` | 1 | entre las dos paredes del soporte, gira con el chasis | centro de las paredes |
| `carga.png` | 1 ó 3 de ~7 px | 0 entera (≥ 85 %), 1 dañada, 2 crítica (bajo el umbral de entrega o perdida) | centro |
| `astronauta.png` | 1, 4, 8 ó 14 de ~8 px | `reposo` = 0–3, `saluda` = 4–7, `celebra` = 8–13; en la zona reproduce `reposo` | pies (centro inferior) |
| `meta.png` | 1 ó 4 | animación `ondea` (todos los cuadros) | pie del mástil = esquina inferior izquierda |
| `zona_entrega.png` | 1 (16 × 4) | se repite a lo ancho de la zona, apoyada en el suelo | esquina inferior izquierda |
| `base.png` | 1 (40 × 24) | detrás del astronauta, al final de la zona | centro inferior |
| `baliza.png` | 1 ó 4 de ~4 px | animación `parpadea`, al inicio de la zona | centro inferior |

Sin arte, `base` y `baliza` simplemente no aparecen (no tienen figura provisional).

### Terreno

- Relleno: `<mundo>_<superficie>.png` (ej. `tierra_arena.png`, `marte_roca.png`, `luna_compacto.png`), 16 × 16 repetible.
  Se repite en rejilla bajo el polígono del suelo y se recorta con su forma exacta.
- Borde: `<mundo>_<superficie>_borde.png`, 16 × 4 repetible a lo ancho. Sigue la línea del suelo (también en pendiente) sin estirarse;
  su **lado superior queda sobre la línea del suelo** (donde apoyan las ruedas) y el resto se mete en el suelo.
- `mundo` = `tierra` | `marte` | `luna`; `superficie` = `arena` | `roca` | `compacto`. Relleno y borde son independientes.

### Fondos

- `fondo_<clave>_1.png` (cielo, fijo), `fondo_<clave>_2.png` (lejana, paralaje 0.2), `fondo_<clave>_3.png` (cercana, paralaje 0.5); 320 × 180, repetibles a lo ancho, con transparencia en 2 y 3.
- `clave`: `dunas` (Samalayuca), `lava` (Pinacate), `desierto` (cualquier otro sitio terrestre o si falta el fondo del sitio), `marte`, `luna`.
- Sin ninguna capa, queda el color de fondo actual. Los fondos no se mueven en vertical (cubren la pantalla de 540 px de alto).
