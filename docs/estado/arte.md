# Estado — Arte

> Lo actualiza SOLO este frente. Ramas: `feat/arte` (#26) y `feat/arte-b` (#37), `feat/arte-c` (#49), `feat/arte-d` (#58), `feat/arte-e` (#64), `feat/arte-f` (#67), `feat/arte-g` (#72), `feat/arte-h` (#77), `feat/arte-i` (#79), `feat/arte-j` (#80), `feat/arte-k` (#84), mergeadas; `feat/arte-m` (nave del menú, piezas de 32 px y Marte grande). `feat/arte-l`: diapositivas, íconos y fuente para la web (va encima de `feat/arte-m`).

**Responsable:** Mauricio  ·  **Agente:** Claude Code / Codex
**Última actualización:** 15 nov 2026, 10:00

## Hecho
- **Prioridad A y B completas** (#26 y #37, en `main`):
  - Robot: chasis ligero y reforzado; ruedas estándar, ancha y con tacos; soportes; carga.
  - Escenario: astronauta, meta, zona de entrega, base y baliza.
  - Tiles: arena, roca y compacto para la Tierra y Marte; arena y roca para la Luna.
  - Fondos: `dunas`, `desierto` (BM-001), `lava`, `marte` y `luna`.
  - Efectos: polvo, patinaje, golpes, carga perdida, destrucción, energía agotada, entrega y meta.
  - UI: barras, botones, íconos de las 12 piezas, estrellas, panel de resultados y aviso de terreno ilustrativo.
  - Pantalla de título y paletas por mundo, incluida la gris de la Luna.
- **Ronda de revisión del frente juego (`feat/arte-c`):**
  1. **Rueda ancha y estándar se distinguen de un vistazo** (prioridad alta del camino dorado):
     - **Robot:**
       - Estándar: plateada, llanta delgada y rin brillante (7 × 7).
       - Ancha: goma negra gruesa con surcos y cubo amarillo arena (8 × 8).
     - **Ícono del taller:**
       - Estándar: plateada con rayos.
       - Ancha: vista de 3/4, con la banda de rodadura y sus tacos visibles y el mismo cubo amarillo.
       - Los dos íconos ahora difieren en 156 de 256 píxeles (antes 44).
  2. **Video de 30 s:** entrada (`docs/media/video_entrada_1280x720.png`, logotipo) y cierre (`docs/media/video_cierre_1280x720.png`, logotipo + lema) con la pantalla de título, a 1280 × 720 como el video. Los monta Alan.
  3. **El polvo ya no flota:** el suelo de las hojas de polvo y patinaje es ahora la última fila del cuadro.
     - Antes quedaba 1–2 px arriba (3–6 px en pantalla).
     - Lo comprobé midiendo la fila más baja dibujada de cada hoja.
  4. **Sin bandas que se repiten en la arena** (`tierra_arena`, `marte_arena`, `luna_arena`): el tono sale de ruido fino, sin manchas grandes.
  5. **Polvo:** `fx_polvo_roca`, `fx_polvo_compacto` y `fx_carga_perdida` ya estaban en `main` (#37).
     - El polvo de arena de la Tierra se llama `fx_polvo_tierra_arena`, como lo renombró integración.
     - Además hay `fx_polvo_marte_<arena|roca|compacto>` y `fx_polvo_luna_<arena|roca>`.
  6. **Calcomanías de piezas** (`docs/arte/SPRITES_PENDIENTES.md` §5), en `assets/entidades/`, cada una con el acento de color de su ícono:
     `deco_motor_eficiente`, `deco_motor_potente`, `deco_bateria_chica`, `deco_bateria_grande` y `deco_panel_solar`.
  7. **Crédito de pixelfx (MIT)** en el README raíz.
  8. **Revisado en `main` lo que conectó juego** (revisión de código, no visual):
     - Portada: `titulo.png` × 3 a pantalla completa.
     - Fondo del menú: `titulo_fondo.png`.
     - Estrellas: `ui_estrella_*` × 3.
     - Marco 9-slice: `ui_panel` con cortes de 5 px. El borde mide 3 px, así que no se deforma.
- **Video de 25 s** (#54, en `main`): 5 tramos de 5 s (entrada, tres diapositivas y cierre); quedan 5 s para el clip del juego.
- **Niveles parecidos al lugar real (`feat/arte-d`):**
  1. **`fondo_mina_1/2/3`:** Real de Ángeles, Zacatecas.
     - Cielo de altiplano.
     - Tajo a cielo abierto con 10 bancos escalonados (pared y piso de cada banco), tramos de roca oxidada y una rampa de acarreo.
     - Terreros de cima plana, sierra lejana y llano semidesértico.
     - En la capa cercana: escalones de roca cortada, nopales y gobernadora.
  2. **`fondo_maar_1/2/3`:** Al Wahbah, Arabia Saudita.
     - Cielo pálido de calor.
     - Cráter hundido bajo el llano: borde de basalto oscuro, paredes de toba en capas con coladas intercaladas y surcos de erosión, y fondo de costra blanca de sal.
     - En la capa cercana: harrat con piedras y bloques de basalto.
  3. **Obstáculos** en `assets/obstaculos/` (recreación de juego):
     - `obstaculo_roca_<1|2|3>` (Tierra), `obstaculo_roca_marte_<n>` y `obstaculo_roca_luna_<n>`, de 3, 4 y 5 px de alto con contorno (0.4–0.6 m). La fila de abajo toca el suelo.
     - `obstaculo_arena_blanda` (tile de 16 × 4 que se repite a lo ancho), más `_marte` y `_luna` por si sirven.
  4. **`fx_sobrecalentamiento`:** bucle de 1.2 s centrado en el motor: brillo rojo que late, cintas de reverbero que suben ondulando y bocanadas de vapor tramado.
  5. **`ui_icono_temperatura`** (8 × 8): termómetro con columna roja, del mismo estilo que los otros íconos de la HUD.
  - `assets/paletas.json` regenerado desde `paletas.mjs` (le faltaban las paletas del desierto, la lava y el título).
- **Tutorial y web (`feat/arte-e`):**
  - `assets/tutorial/tutorial_1..4.png` (96 × 64, con marco, sin texto) para la pantalla "Cómo jugar" de Diego:
    1. Elige un análogo.
    2. Arma tu robot.
    3. Pruébalo en la Tierra.
    4. Misión.
  - `docs/media/web_portada_960x960.png`: imagen principal de la web. El robot llega con la carga a la base en Marte, con el astronauta y la zona de entrega (escena de 120 × 120 × 8). La coloca Alan en `web/`.
  - Las dos cosas salen de `assets/fuente/escenas.mjs`, que compone sprites, fondos, tiles y efectos ya generados (`node assets/fuente/generar.mjs escenas`).
- **Imágenes para compartir y favicons (`feat/arte-f`):**
  - `docs/media/og_1200x630.png`: el robot llega a la base en Marte, con el título y el lema.
  - `docs/media/proyecto_space_apps.png`, de 1920 × 1080 (320 × 180 × 6):
    - Con el título, el lema completo y la marca "AI-assisted pixel art".
    - La guía de la plataforma no da medidas. Acepta JPG, PNG o GIF de hasta 10 MB y pide marcar lo generado con IA.
  - `assets/ui/favicon_32.png`, `favicon_180.png` y `favicon.svg`: el robot con la carga sobre suelo de Marte; se reconoce a 32 px.
  - Sin logo de NASA.
- **Revisión en el juego** (Samalayuca, Pinacate, Marte y la Luna, con capturas en Edge):
  - Los 4 íconos del HUD aparecen en los 4 niveles al entrar por el menú. No reproduje la corrida sin íconos.
  - Rocas chicas: es del código. `crearObstaculos` recorta el sprite a lo que asoma del suelo: `alto_m × 8` px de arte, o sea 1–2 px con los radios de `REGLAS_OBSTACULOS`. De la roca solo se ve el contorno de arriba.
  - Ver la nota del PR.
- **Piezas nuevas del Taller (`feat/arte-g`, ids provisionales):**
  - Íconos de 16 × 16 en `assets/iconos/`: `rueda_malla`, `rueda_grousers`, `bateria_mediana`, `panel_solar_grande`, `calentador_bateria` y `radiador`.
  - Sprites en `assets/entidades/`:
    - `rueda_malla` (8 × 8 × 4): malla de acero abierta tipo LRV, con un chevrón turquesa como marca de giro.
    - `rueda_grousers` (7 × 7 × 4): aro de aluminio con garras tipo Curiosity y una garra naranja como marca.
    - Calcomanías `deco_bateria_mediana`, `deco_panel_solar_grande`, `deco_calentador_bateria` y `deco_radiador`.
  - Referencias de forma: `docs/taller/PIEZAS.md` (filas H5, S64, S14 y S76).
- **Pintura del chasis:** `chasis_<ligero|reforzado>_<rojo|azul|verde|amarillo|morado>`, con 2 cuadros (normal y dañado) como el original. Solo cambia la carrocería; faro, franja, borde turquesa y daños quedan igual.
- **Ronda `feat/arte-h`:**
  - **Piezas que faltaban** (`SPRITES_PENDIENTES.md` §6):
    - `motor_equilibrado`: ícono con un círculo mitad turquesa y mitad naranja, y `deco_motor_equilibrado`.
    - `soporte_correas`: ícono con correas cruzadas y sprite de 10 × 3 con paredes de 0.35 m y correas amarillas.
  - Quité `rueda_grousers` (ícono y sprite): ninguna pieza la usa.
  - **`pantallas/menu_fondo.png`:** la Tierra abajo a la izquierda y la Luna y Marte a la derecha, con trayectorias punteadas; el centro queda libre para los botones.
  - **`pantallas/taller_fondo.png`:** pared de placas oscuras, tableros con herramientas, ventana con Marte, banco y piso con franja de seguridad.
  - **`pantallas/resultado_<motivo>.png`:** 10 viñetas de 96 × 64, una por motivo de `Resultados.js`.
- **Rediseño (`docs/juego/DISENO.md`, `feat/arte-i`):**
  - **Íconos de keywords** (16 × 16, en `assets/iconos/`): `ico_subida`, `ico_pendiente`, `ico_suelo`, `ico_temperatura`, `ico_aire`, `ico_luz`, `ico_gravedad`, `ico_presion`, `ico_radiacion`, `ico_similitud` y `ico_ticket`.
  - **`ui_boton` en 4 estados** (normal, `_encima`, `_presionado` y `_desactivado`): 12 × 12 con cortes de 4 px y borde visible (lavanda, amarillo, ámbar y gris). El relleno es oscuro para que se lea el texto claro.
  - **Chips** `ui_chip_rojo` (`#ff7a93`, límite) y `ui_chip_cian` (`#80e0dc`, dato): 8 × 8 con cortes de 3 px.
  - **Planetas** `menu/planeta_marte` y `menu/planeta_luna`: 48 cuadros de 48 × 48 (2304 × 48), una vuelta sin costura. Marte trae casquete polar, mares, un cañón y cráteres; la Luna, mares y cráteres de borde claro.
- **Fuente pixel y kit (`feat/arte-j`):**
  - **`assets/fuentes/pixel`** (cuerpo) y **`pixel_titulo`** (estilo del logo), en BMFont XML + PNG para `load.bitmapFont`:
    - 145 caracteres: ASCII, á é í ó ú ü ñ y sus mayúsculas, ¿ ¡ « » … y los símbolos del juego.
    - Celda de 11 filas, con mayúscula de 7 px: a × 2 mide 14 px.
    - Comprobado con un lector de BMFont propio y con el `DOMParser` del navegador.
  - **Kit:** `ui_tarjeta`, `ui_barra_relleno_<amarillo|verde|rojo>` (entra en `ui_marco_barra`), `ui_ayuda` + `ui_ayuda_flecha` y `ui_titulo_placa`.
  - **`pantallas/carga_fondo.png`:** fondo del título con el logo y el marco vacío de la barra. El hueco queda en x 64..255, y 147..150 de arte (× 3: x 192..767, y 441..452).
- **Postales, logo y HUD (`feat/arte-k`):**
  - **Postales del Expediente** (96 × 64, con el marco de las viñetas):
    - `sitio_samalayuca` (dunas), `sitio_pinacate` (cráter El Elegante en el llano de lava), `sitio_mx0207` (tajo de la mina), `sitio_g00281` (maar con sal) y `sitio_generico` (desierto).
    - `destino_jezero` (delta en capas y piso del cráter) y `destino_polo_sur_lunar` (borde iluminado y sombra permanente).
    - Son ilustraciones del tipo de paisaje.
  - **`menu/logo_brillo.png`:** 32 cuadros de 65 × 10, el logo con el estilo de `pixel_titulo` y un brillo que lo cruza.
  - **`ui/ui_hud_panel.png`:** 9-slice para la barra de arriba de la prueba y la misión.
- **Nave, piezas y Marte (`feat/arte-m`):**
  - **`pantallas/menu_nave.png`** (320 × 180): estación en órbita con la Tierra y Marte al fondo.
    - Escotilla en el centro exacto (160, 92), con anillo de franjas de seguridad.
    - 4 ventanas iluminadas, paneles solares y antena.
  - **`menu/nave.png`:** la estación sola, 4 cuadros de 264 × 76 con las luces parpadeando. Se encima en x 28, y 46.
  - **`piezas/<id>.png`:** las 19 piezas a 32 × 32, que son los íconos ampliados × 2.
  - **`menu/marte_grande.png`:** 48 cuadros de 152 × 152 en cuadrícula de 8 × 6 (1216 × 912) para no pasar de 4096 px.
- **Presentación y web (`feat/arte-l`):**
  - **`docs/media/slides/slide_<1..7>_<portada|reto|modelo|juego|mision|limites|cierre>.png`:** 1920 × 1080, dibujadas a 240 × 135 × 8.
    - El mapa del modelo usa las costas de Natural Earth 1:110m (dominio público) y las coordenadas de los 58 sitios de `data/sites`. Los 4 sitios jugables van resaltados.
  - **Fuente web:** `docs/media/fuentes_web/marsception-pixel.otf` y `.woff2`, más `fuentes.css`. Comprobada en Edge con texto real.
  - **Íconos para la web:** `docs/media/iconos/32|48/`.
- `node assets/fuente/fx/exportar.mjs` regenera con pixelfx las 22 hojas de efectos.

## En curso
- Nada.

## Siguiente
- [ ] Piezas nuevas (chasis de titanio, chasis de fibra de carbono, llanta de Nitinol, módulo de auto-rescate, sellos antipolvo) y candado, cuando estén los ids en `SPRITES_PENDIENTES.md`.
- [ ] Meter el clip de 5 s del juego en inglés en el video cuando Alan lo grabe (6 × 5 s = 30 s).
- [ ] Ajustar nombres de obstáculos si juego los cambia al integrarlos (solo renombrar).
- [ ] Ver el arte con el juego corriendo (todavía no lo he revisado en pantalla): ruedas en el taller y en la prueba, calcomanías, posición de efectos y polvo.

## Bloqueos / necesito de otro frente
- **Juego / menú / Taller:** conectar las pantallas nuevas.
  - `Menu.js`: `pantallas/menu_fondo` en vez de `titulo/titulo_fondo`.
  - `Taller.js`: `pantallas/taller_fondo` × 3 al fondo.
  - `Resultados.js`: `pantallas/resultado_${motivo}` × 2 o × 3.
  - Se puede quitar `rueda_grousers` de `TABLA`: ya no hay archivo.
- **Juego:** rocas recortadas a 1–2 px. La nota del PR de `feat/arte-f` trae opciones.
- **Juego:** `game/e2e/camino_dorado.mjs` no pasa del Boot con el menú actual: falla el `waitForFunction` del paso boot.
- **Juego:** en la Misión, a la izquierda del inicio, se ve un hueco sin terreno de unos 48 px de pantalla.
- **Juego:** `FONDO_POR_SITIO` en `game/src/fisica/aspecto.js` (en `main`) solo tiene `samalayuca → dunas` y `pinacate → lava`. Si el mapeo de `mina` y `maar` todavía no está ahí, falta agregarlo.
- **Integración (Alan):**
  - Poner `docs/media/web_portada_960x960.png` como imagen principal de la web: copiarla a `web/src/assets/` o `web/public/`, agregar `image-rendering: pixelated` a `.hero-visual img` y cambiar el pie de foto, que hoy describe el relieve de Rincón de Parangueo.
  - Clip de 5 s del juego en inglés para el video.
  - Agregar el crédito de pixelfx a `docs/ENTREGA_EN.md`. Texto sugerido:
    "Pixel art effects built with pixelfx (MIT License, © 2026 Patch and Hugo Duprez)."

## Cambios que propongo a contratos o AGENTS.md (los aplica el integrador)
- Ninguno.
