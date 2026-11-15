# Sprites pendientes de MARSCEPTION (actualizado 14 nov, 18:10)

> Lista original de Leo (rama `docs/sprites-pendientes`), cruzada por juego (Edmundo) con lo que ya trae el **PR #37 de Mauricio**
> (prioridad B). Aquí solo queda **lo que de verdad falta**. Nombres y medidas: `docs/juego/ASSETS_ARTE.md` §3 y §5.

## ✅ Ya hecho (PR #26 + PR #37) — no rehacer

- **Robot:** chasis ligero y reforzado (normal + dañado), ruedas estándar, ancha y con tacos (4 cuadros), soportes básico y amortiguado, carga.
- **Escenario:** astronauta, meta, zona de entrega, base, baliza.
- **Terreno (relleno + borde):** tierra arena/roca/compacto, marte arena/roca/compacto, luna arena/roca.
- **Fondos (3 capas):** dunas, desierto, lava, marte, luna.
- **Efectos:** polvo (arena, marte, luna), patinaje (+ marte, luna), golpe al chasis, golpe a la carga, chasis destruido,
  energía agotada (+ versión clara para la Luna), entrega, meta.
- **UI:** botones, barras e íconos de energía/carga/chasis; íconos 16 × 16 de las 12 piezas; pantalla de título (`titulo/titulo.png`, `titulo/titulo_fondo.png`).

## ❌ Falta, por prioridad

### 1. Distinguir rueda estándar y rueda ancha (ALTA: el camino dorado depende de esto)
En la prueba táctil de Leo, los íconos 16 × 16 de `rueda_estandar` y `rueda_ancha` solo difieren en 44 de 256 píxeles: misma forma y colores.
El jugador tiene que ver de un vistazo cuál es cuál, en el taller **y** en el robot.
- `iconos/rueda_ancha.png`: llanta claramente más gruesa (o perfil ancho visto de 3/4) y/o un tono distinto.
- `entidades/rueda_ancha.png` (8 × 8, 4 cuadros): banda de rodadura más gruesa y visible en vista lateral.

### 2. Polvo en roca y suelo compacto de la Tierra (media)
Hoy Pinacate, la mina (mx0207) y el maar Al Wahbah (g00281) usan el polvo provisional del juego.
- `fx/fx_polvo_roca.png` y `fx/fx_polvo_compacto.png` (+ JSON si es de pixelfx). Más grises/pardos que `fx_polvo_arena`.
- El juego busca, del más específico al más general: `fx_<evento>_<mundo>_<superficie>`, `fx_<evento>_<superficie>`, `fx_<evento>_<mundo>`, `fx_<evento>`.

### 3. Carga perdida (baja)
- `fx/fx_carga_perdida.png`: la caja cae y suelta polvo. Origen al centro.

### 4. UI de resultados (baja; avisar a juego para conectarla)
Hoy las estrellas son texto (★☆). Si se dibujan, juego las conecta en `Resultados.js`:
- `ui/ui_estrella_llena.png` y `ui/ui_estrella_vacia.png` (16 × 16).
- `ui/ui_panel.png` (9-slice, ~16 × 16) para el fondo de la pantalla de resultados.

### 5. Calcomanías de piezas sobre el robot (media; el código ya está listo)
El robot se ve distinto según las piezas elegidas. Archivos en `assets/entidades/` (o cualquier subcarpeta, salvo `iconos/`):

| Archivo | Medida (px de arte) | Dónde aparece (respecto al centro del chasis de 24 × 6) |
|---|---|---|
| `deco_motor_eficiente.png`, `deco_motor_potente.png` | ~4 × 3 | atrás, en el costado (x −8) |
| `deco_bateria_chica.png`, `deco_bateria_grande.png` | ~4 × 3 | adelante, en el costado (x +6) |
| `deco_panel_solar.png` | ~8 × 2 | encima, adelante (x +5, y −4) |

Origen al centro, 1 cuadro, contorno de 1 px. Giran con el chasis. Si falta un archivo, simplemente no se dibuja.

## Fuera del MVP (no hacer ahora)
- `luna_compacto`: ningún nivel lunar usa suelo compacto.
- Robots de la hoja Robot Types (orugas, patas, rapel, rotor, serpiente) y biomas subterráneos: no hay mecánica que los use (AGENTS.md §15).

## Lo que hace juego (no arte)
- Ver todo el arte con el juego corriendo (posición de efectos y polvo, alineación de sprites con la física) al mergear #26 + #37.
- Conectar la pantalla de título en el Menú.
- Ignorar `iconos/` y `titulo/` en el cargador de sprites (hecho: `game/src/fisica/aspecto.js`, commit 4693cad).

## Cómo verificar
`cd game && npm run dev` (reiniciar Vite al agregar archivos nuevos) y jugar el camino dorado en Marte y Luna; `npm run build`.

## 6. Piezas nuevas del taller (15 nov, frente taller)
Ids finales de `game/src/content/parts.json` (`docs/taller/PIEZAS.md` §6). **Ya entregado en #72** y conectado: íconos y
sprites de `rueda_malla`, `bateria_mediana`, `panel_solar_grande`, `calentador_bateria`, `radiador` (ícono + `deco_*`) y la
pintura `chasis_<ligero|reforzado>_<rojo|azul|verde|amarillo|morado>` (gris = sin variante). `rueda_grousers` está registrada
en `fisica/aspecto.js`, pero **ninguna pieza usa ese id** (la rueda con garras es `rueda_tacos`, que ya tiene arte).

Falta (sin arte el juego ya funciona: figura en la prueba y solo texto en el Taller):

| Archivo | Medida (px de arte) | Descripción |
|---|---|---|
| `iconos/motor_equilibrado.png`, `iconos/soporte_correas.png` | 16 × 16 | Íconos del taller |
| `entidades/soporte_correas.png` | 10 de ancho, 1 cuadro | Soporte con paredes medianas (0.35 m, entre el básico y el amortiguado) y correas cruzadas |
| `entidades/deco_motor_equilibrado.png` | ~4 × 3 | Calcomanía como las de los otros motores (x −8 del chasis) |

## 7. Taller por arrastre: piezas del libro y bloqueadas (15 nov, frente taller)
Las 19 piezas de antes ya tienen `piezas/<id>.png` (32 × 32, #85) y el Taller los usa en la bandeja, en los sockets y en la
pieza que se arrastra. Faltan estas, con **nombre exacto** (mientras no existan, el juego usa el respaldo indicado):

| Archivo | Medida | Respaldo de hoy | Descripción |
|---|---|---|---|
| `piezas/chasis_titanio.png` | 32 × 32 | `piezas/chasis_ligero` teñido gris titanio | Chasis de titanio (MT-002): gris metálico frío |
| `piezas/chasis_carbono.png` | 32 × 32 | `piezas/chasis_ligero` teñido gris carbón | Chasis de fibra de carbono (MT-004): negro con trama tejida |
| `piezas/rueda_nitinol.png` | 32 × 32 | `piezas/rueda_malla` teñida plateada | Rueda de Nitinol (AB-004): llanta de resortes/malla metálica superelástica |
| `piezas/auto_rescate.png` | 32 × 32 | `iconos/ico_subida` ×2 | Módulo auto-rescate (AB-002, VIPER): pata/rueda que "camina" o flecha de salida de un hoyo |
| `entidades/chasis_titanio.png`, `entidades/chasis_carbono.png` | 24 de ancho, 2 cuadros (normal + dañado) | `chasis_ligero` teñido | Mismo tamaño que el chasis ligero; variantes de pintura opcionales `chasis_titanio_<color>` |
| `entidades/rueda_nitinol.png` | 7 × 7, 4 cuadros | `rueda_malla` teñida | Llanta metálica de malla, más clara que la del LRV |
| `entidades/deco_auto_rescate.png` | ~5 × 4 | ícono encima del chasis (solo en el Taller) | Calcomanía del módulo (x +5, y −4 del chasis) |
| `ui/ui_candado.png` | 8 × 8 | candado dibujado con figuras | Candado de las piezas bloqueadas (pestaña «Bloqueadas») |

Bloqueadas (opcional, hoy usan un ícono genérico atenuado + candado): `piezas/orugas.png`, `piezas/patas.png`,
`piezas/rappel.png`, `piezas/rotor.png`, `piezas/serpiente.png`, `piezas/direccion_independiente.png`,
`piezas/sellos_polvo.png`, `piezas/sensor_sol.png`, `piezas/hibernacion.png`, `piezas/blindaje.png`, `piezas/rueda_goma.png`
(32 × 32; el Taller aún no los busca: avisar a taller si se dibujan).
