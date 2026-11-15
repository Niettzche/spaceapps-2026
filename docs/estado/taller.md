# Estado — Taller y piezas

> Lo actualiza SOLO este frente.

**Responsable:** Leo hasta el 14 nov 2026 · **desde ahora: Alan** (Leo se queda sin sesión) · **Agente:** Claude Code / Codex
**Última actualización:** 15 nov 2026, cierre de Leo. Todo lo del taller está en `main` (#7, #16, #23, #28, #31, #38, #39).

## Para quien sigue (Alan)

**Archivos del frente**
| Archivo | Qué es |
|---|---|
| `game/src/scenes/Taller/diseno.js` | Reglas del diseño, sin Phaser: 7 ranuras, ruedas × 2 (costo y masa), `resumen()`, `validar()` |
| `game/src/scenes/Taller/diseno.test.mjs` | Prueba: `node game/src/scenes/Taller/diseno.test.mjs` → **14 casos OK** |
| `game/src/scenes/Taller.js` | La escena: esquema del robot, catálogo, presupuesto, validación, teclado, toque e íconos |
| `game/src/content/parts.json` | Las 12 piezas (valores de juego, P) |
| `docs/taller/Space_Apps_Game_Data.xlsx` | Libro de datos en inglés, 13 hojas, con la hoja **Judges** para el pitch |
| `docs/taller/PIEZAS.md` | Qué hecho real inspira cada pieza, las reglas del armado y el resumen del libro de datos |

**Reglas que no se rompen**
- La física **importa** de `Taller/diseno.js`: `RANURAS`, `DISENO_POR_DEFECTO`, `comoDiseno` y `resumen` (usa `costo` y `masa`).
  No renombres esas exportaciones. `resumen().masa` es **solo el robot**: la física suma aparte los 10 kg de carga.
- Si cambias en `parts.json` el agarre, la fuerza, el consumo, la capacidad, la masa o el radio, **avisa a juego (Edmundo)**:
  el camino dorado está calibrado con esos números y hay que volver a correr las simulaciones.
- Contrato con juego: `partida.diseno = [{ ranura, pieza }]`. Cada ranura de rueda es un eje con 2 ruedas.
  El robot mínimo cuesta 730 de 1,000 créditos; con ruedas anchas, 890.
- Nada de datos inventados: un valor real lleva S-ID en la hoja Sources; un valor de juego se marca (P).

**Cómo verificar que todo sigue bien**
```
node game/src/scenes/Taller/diseno.test.mjs   # 14 casos
node game/src/fisica/fisica.test.mjs          # 22 casos (la física usa las reglas del taller)
python model/validate_data.py                  # valida parts.json contra el esquema
cd game && npm run build
```
Camino dorado completo (pasa por el Taller real): ver la cabecera de `game/e2e/camino_dorado.mjs`.

## Hecho
- **Piezas y reglas.** 12 piezas con inspiración real verificada (NASA/JPL/Smithsonian, `PIEZAS.md`), 7 ranuras, ruedas × 2,
  presupuesto y validación (estructura, movilidad, energía, carga y presupuesto). Se puede quitar y restablecer, y se usa todo con
  teclado y con toque.
- **Agarre.** El taller muestra el **agarre de la rueda** como promedio de los dos ejes (en la física cada rueda aporta) y avisa
  "con las dos anchas es más seguro" si los ejes son distintos. En pantalla dice "En la prueba: agarre² × agarre del suelo (P)",
  que es la fórmula de `fisica/robot.js`.
- **Autonomía.** Incluye los 10 kg de carga (`MASA_CARGA_KG`) con la misma regla de energía que la física
  (`fisica/energia.js`): el robot mínimo da 99 s, igual que la física.
- **Teléfono.** Lo probé en emulación con toques reales en 3 pantallas: todo responde (7/7 ranuras, 15/15 filas, Quitar,
  Restablecer, Probar). Las zonas de toque crecieron de ~10–13 px a ≥ 37 px en horizontal y el dibujo no cambió (`zonaToque()`,
  marcada `customHitArea`). Juego agregó en `game/index.html` `touch-action: manipulation` y el aviso de "gira tu teléfono".
- **Íconos de arte.** Los 12 íconos de 16 × 16 cargan solos desde `assets/iconos/<id>.png` (clave `iconos/<id>`). Sin ícono,
  la pieza se ve solo con texto.
- **Libro de datos** (`docs/taller/Space_Apps_Game_Data.xlsx`):
  - Hoja Parts con las 12 piezas.
  - Ángulo de fricción de la arena de duna (BM-004, 28–34°) y de la escoria de lava (BM-003, 25–32°).
  - Bekker de arena seca; el lunar es aproximado; el del polvo de Marte es Gap y se declara como límite en `docs/METODOLOGIA.md`.
  - Gravedad de Marte 3.71 (JPL, ecuatorial; MR-056).
  - Fuentes S59–S73, Review Log RV-094…RV-149.
- **Hoja Judges** (para el pitch). Cada respuesta trae dato real con fuente, el valor de juego al lado y dónde se rompe la analogía:
  | ID | Pregunta | Respuesta corta |
  |---|---|---|
  | QA-001 | ¿Por qué el robot va a 6 m/s? | Perseverance va a 0.042 m/s (152 m/h) y VIPER a ~0.1 m/s (diseño, no ha volado). El juego va ~60 veces más rápido: 266 m en ~1 min en vez de ~44 min. La velocidad es (P) |
  | QA-002 | ¿Por qué se atascó Spirit? | Las ruedas rompieron una costra y cayeron en arena blanda y resbalosa; además la rueda delantera derecha ya no giraba (NASA/JPL, 2009) |
  | QA-003 | ¿Agarre del regolito lunar? | φ 30–50° (Apolo), tan 0.58–1.19; el juego usa 0.84 |
  | QA-004 | ¿Y el polvo de Marte? | φ 15.6–20.4° (Viking), tan 0.28–0.37; 20–25° en el sitio de Spirit; el juego usa 0.32 |
- **Decisiones cerradas con juego**:
  - Precio por pieza para el MVP; el precio por kilo del Excel queda para después.
  - Gravedad de Marte 3.71.
  - La arena real de la Tierra queda **apagada** en `fisica/suelos.js` (`USAR_SUELO_TIERRA = false`): con ella el camino dorado
    deja de distinguir las ruedas.
  - Sin hundimiento (no hay Bekker real para Marte).
- **Correcciones de datos** que salieron de revisar las fuentes primarias:
  - BM-013 decía "Spirit se hundió 50–90 %", y la fuente no lo dice: se quitó.
  - Opportunity se hundió "más de 10 cm", no "hasta los rines".
  - La afirmación "cada rueda con su propio motor" ahora cita la página correcta de NASA.

- **15 nov (Leo de vuelta):**
  - Hoja **Ambiente** del libro de datos y `docs/taller/AMBIENTE.md`: temperatura típica y extrema, presión y densidad del aire
    de los 4 sitios jugables (NASA POWER) y de los 2 destinos (MEDA, Diviner, fact sheets), con fuente y fecha.
  - `docs/PITCH_QA_EN.md`: 8 preguntas probables de los jueces, en inglés y con fuente.
  - Taller revisado en inglés en computadora y teléfono; 3 textos más claros (#57).

## Lo que queda
1. **Pitch:** usar la hoja `Judges` para las preguntas de velocidad, Spirit y agarre. Decir siempre que el 0.1 m/s de VIPER es
   de diseño y que los valores de Marte son estimaciones de ingeniería (lo dice la tabla de NASA).
2. **Íconos de las ruedas:** a 16 px, la estándar y la ancha solo difieren en 44 de 256 píxeles. Arte (Mauricio) lo tiene como
   prioridad alta en `docs/arte/SPRITES_PENDIENTES.md`. Cuando los cambie, abrir el Taller y revisar que se distingan en el
   catálogo y dentro de las ruedas.
3. **Texto chico en teléfono** (~8 px en pantalla): necesita un diseño propio para móvil. Queda **para después de la entrega**
   (acordado con juego).
4. **`docs/DECISIONES.md`:** anotar "precio por pieza para el MVP (taller + juego, 14 nov)". Está en el libro de datos
   (Index A34), pero no en DECISIONES.
5. **Corridas de verificación:** el camino dorado de Marte y de la Luna está automatizado en `game/e2e/camino_dorado.mjs`. Las
   demás corridas de la tabla de juego (Pinacate con rueda ancha contra tacos, y soporte básico ~82 % contra amortiguado ~94 %)
   las reportó juego, pero no están automatizadas.
6. **Después de la entrega:** precio por kilo de material (hoja Materials), Bekker para Marte si se publica, panel solar con
   regla de iluminación (hoy está marcado "sin efecto en el MVP") y balance fino con telemetría.

## Verificación final (15 nov, sobre `main` 5503a6a)
- `diseno.test.mjs` 14/14 y `fisica.test.mjs` 22/22.
- `game/e2e/camino_dorado.mjs ambos` (Edge sin interfaz). **Todos los pasos del Taller pasan**: Marte con estándar, Marte con
  anchas (890 créditos, "✓ Diseño válido") y Luna con estándar.
  - Marte completo: la estándar se atasca a 153 m y recomienda ruedas anchas; la ancha llega a la meta (266 m, 59 s de juego).
    La misión entrega con 843 puntos y 2 estrellas.
- Lo que falló **no es del taller** (para juego/Edmundo):
  - `resultados_mision`: el script dice "no se ve la puntuación con estrellas", pero la captura sí las muestra (843, 2 de 3
    estrellas de arte). Seguramente el script busca el carácter "★", que 5503a6a cambió por sprites. Además, el "843" queda
    cortado contra el borde de arriba del panel.
  - `luna_prueba_1`: se acabó el tiempo del script (360 s de reloj) a 269 de 272 m, porque esta máquina corrió la Luna a 4 fps.
    No es concluyente; repetir con más `LIMITE_S` o en otra máquina.
  - `boot`: un error 404 de un recurso en la consola (el script no dice cuál).
  - En la misión de Marte la flecha real no movió el robot sin interfaz y el script usó su respaldo (`controles.forzado`).

## Bloqueos / necesito de otro frente
- Ninguno que frene la entrega.

## Uso de IA (para `docs/USO_IA.md`)
La investigación de piezas, la búsqueda y verificación de fuentes del libro de datos, la hoja Judges, el código del taller y
las pruebas en teléfono se hicieron con Claude Code. Cada dato se revisó contra su fuente primaria.

- **15 nov (fuentes de piezas nuevas):** referencias con fuente en `docs/taller/PIEZAS.md` §5 y en Parts PT-013…PT-018 (no están en parts.json). Battery heater: Gap; motor radiator: Gap para el motor. Corregido S40 (batería −40…+40 °C no verificada) y la pregunta 9 de PITCH_QA_EN.md.
- **15 nov (agente del frente taller, rama de feat/juego):** más piezas y personalización.
  - 7 piezas nuevas (P) con efecto físico: `rueda_malla`, `bateria_mediana`, `motor_equilibrado`, `soporte_correas`,
    `panel_solar_grande`, `calentador_bateria` (sin pérdida de batería por frío; con la regla suave de frío el efecto es de ~2 puntos) y `radiador` (enfría el motor sin aire).
    Fuentes de §5 de Leo citadas; calentador y radiador del motor quedan como (P) sin fuente primaria. Tabla: `PIEZAS.md` §6.
  - Pintura (6 colores) y nombre del robot, cosméticos, con Deshacer/Rehacer; se ven en la prueba, la misión y Resultados.
  - Sobre el layout de Diego (#69, 16–17 px): ranuras con 4 piezas se recorren con ▲ / ▼, ↑/↓ o la rueda; línea del efecto
    del módulo en el destino. Revisado a 960 × 540 en es/en.
  - Pruebas nuevas: `node game/src/scenes/Taller/piezas.test.mjs` (13 casos). Sprites pendientes: `docs/arte/SPRITES_PENDIENTES.md` §6.
  - Sigue: arte de las piezas nuevas; decidir si el calentador y el radiador se quedan sin fuente o se cambian.
- **15 nov (agente del frente taller): Taller por arrastre en pixel art.**
  - Robot grande (sprites ×8) con 7 sockets; bandeja por sistema (Movilidad, Estructura, Energía, Protección, Módulo, Bloqueadas)
    con el arte 32 × 32 de `assets/piezas` (#85). Arrastrar, tocar → socket o teclado; quitar arrastrando afuera o clic derecho;
    presupuesto animado y «Probar» deshabilitado si excede o falta algo. Reglas en `Taller/arrastre.js`.
  - Piezas del libro: `chasis_titanio` (MT-002), `chasis_carbono` (MT-004), `rueda_nitinol` (AB-004, amortigua sacudidas) y
    `auto_rescate` (AB-002, +agarre al atascarse). 11 filas bloqueadas con razón (RT-002…RT-006, AB-001, AB-003, AB-009…011, MT-012).
    Tabla: `PIEZAS.md` §7. Arte pendiente: `SPRITES_PENDIENTES.md` §7.
  - Pruebas: `node game/src/scenes/Taller/arrastre.test.mjs` (8 casos). Camino dorado simulado: estándar falla, anchas pasa, misiones entregan.
  - Sigue: conectar la fuente bitmap cuando exista `textoPixel` (hoy el Taller usa un wrapper `texto()` sobre `K.txt`).
