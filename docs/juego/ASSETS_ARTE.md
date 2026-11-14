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

## 2. Escala

- Resolución base **320 × 180**, escalada **× 3** a 960 × 540. Todo se dibuja a 1 px de arte; el juego lo escala.
- **8 px de arte = 1 m.**
- Si hace falta más detalle (el estilo Dead Cells lo pide): se puede pasar a **480 × 270 × 2 con 12 px = 1 m** sin tocar la física,
  porque el mundo sigue en 24 px de pantalla por metro. Es un cambio de dos constantes en `game/src/fisica/escala.js`. Hay que decidirlo antes de dibujar.

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
