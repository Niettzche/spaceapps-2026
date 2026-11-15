# Marsception · landing del juego con divulgación científica

Página aparte del juego que funciona como **landing de Marsception**: arriba vende el juego (qué es, cómo se juega, los dos
destinos y el botón para jugar) y abajo explica **la ciencia detrás**, en tono de divulgación, con escenas 3D hechas con los
mismos datos que usa el modelo. Bilingüe (español por defecto, inglés con `?lang=en`), con tema oscuro y claro.

| Sección | Qué cuenta | Material |
|---|---|---|
| Portada | Qué es el juego y botón para jugar | Inspirada en la pantalla de inicio del juego: su fondo en píxeles, el logotipo pixelado, estrellas que titilan, estrellas fugaces, paralaje y el rover del juego (chasis, ruedas, soporte y carga) manejando sobre arena de Marte; acelera al pasar sobre «Jugar ahora». Todo se apaga con «reducir movimiento» |
| Cómo se juega | Los 4 pasos: destino y análogo, taller, prueba en la Tierra, misión | Capturas reales del juego (camino dorado de Marte) |
| Destinos | Luna (polo sur) y Marte (Jezero), con su gravedad y su oscilación térmica | Fondos del juego (pixel art) |
| La ciencia detrás del juego | Por qué los lugares no son inventados | El Elegante en 3D (Copernicus DEM a 80 m, relieve medido) |
| ¿Cómo se compara un cráter de Sonora con uno de la Luna? | Mismo código y misma resolución en los tres mundos; se compara forma, no tamaño | El Elegante y sus gemelos lunar y marciano (relieves medidos) |
| ¿Por qué medir todo a 200 m? | La resolución del instrumento más grueso; la objeción de MOLA (463 m) | El Elegante en píxeles de 80, 200 y 463 m |
| ¿Por qué los cráteres de Marte son más planos? | La regla d/D y el relleno | Cráter en corte (**ilustración**, marcada así) + histograma real de 4,288 cráteres lunares y 573 marcianos |
| ¿Cómo decide el modelo…? | La regresión logística es un plano que se puede leer | Nube 3D real con el plano P(Luna) = 0.5 de `model/forma.py` |
| ¿Cráter o mina? | El borde levantado | El Elegante y Peñasquito (relieves medidos) + perfiles radiales reales |
| ¿Por qué solo en desiertos? | El veto por vegetación y los controles | Cifras |
| ¿Qué no se puede ensayar en la Tierra? | Gravedad, presión, radiación y temperatura | Caída libre de la carga del juego con las tres gravedades + oscilación térmica |

**La ciencia es una infografía de museo** (`#ciencia`, `src/infografia.js`), de lado a lado y en el pixel art del juego:
① Medimos (un satélite recorre el perfil real de El Elegante; 5,208 → 47), ② Comparamos (cráter lunar hondo contra uno marciano
que se rellena de arena, a la escala de su d/D mediana; 0.060 · 0.027; 78 %), ③ Revisamos el borde (cortes reales de El Elegante
y Peñasquito; 7 / 8; 14 minas contra 1) y «Lo que la Tierra no puede imitar» (gravedad con la carga del juego, temperatura, aire,
radiación). Cada ilustración se dibuja a 1 px de arte en un canvas chico y se anima al aparecer. «Imprimir cartel» imprime solo el
panel en A3 horizontal. Debajo, «Detalles técnicos» (plegable) tiene las tablas, la ecuación, los perfiles, la figura de cráter
contra mina y los límites. `src/escenas.js` (three.js) y `src/pelicula.js` quedan en el repo pero la página ya no los usa:
three.js solo se descarga si hay algún `[data-escena]`.

**Lo que encontramos y lo que aportamos** (`#aportes`): otra pantalla del mismo cartel. Encontramos: 14 de 25 por forma son
minas; el borde las delata (10 de 11, 7 de 8, solo 4 de 38 tajos); Marte es más plano también con D ≥ 2 km; El Elegante se parece
más al polo sur lunar (forma 0.97). Aportamos: una sola regla a 200 m, un modelo que se lee (78 %), un catálogo abierto (57 sitios
con cráter medido) y el juego con el explorador libre. No presenta ningún sitio como descubrimiento. `preparar_datos.py` comprueba
estas cifras (también el destino y la forma de `data/sites/pinacate.json`).

**Pantallas completas y scroll suave.** La portada, el cartel y «aportes» ocupan una pantalla en escritorio (si no cabe, el cartel
achica sus ilustraciones con `--encaje` y, en pantallas muy chicas, se lee bajando). El scroll usa Lenis (inercia suave; se apaga
con «reducir movimiento») y los enlaces internos viajan suave a cada sección.

**Marsception for Business** (`#business`): planes Gratis (B2C, con anuncios y premium opcional), licencia para universidades y
licencia de datos y modelo (B2B), anuncios y patrocinio, y «Contactar a ventas». Es un modelo de negocio propuesto y la página lo
dice. «Contactar a ventas» abre un correo a **hola@marsception.us** (`data-correo` del botón `#boton-ventas` en `index.html`) con el
tipo de licencia en el asunto.

## Cómo verla

```
cd informe/divulgacion
npm ci
npm run dev        # desarrollo
npm run build      # genera dist/ (base relativa: sirve en la raíz o en una subcarpeta)
npm run preview    # sirve dist/
```

No necesita API ni red: los datos van en `public/datos/`.

## De dónde salen los datos

`public/datos/*.json` lo genera `preparar_datos.py`. **No se edita a mano.**

```
uv run --with scikit-learn==1.5.2 --with pandas==2.2.3 --with numpy==2.1.3 \
    python informe/divulgacion/preparar_datos.py [--vista3d ~/spaceapps-visor/vista3d]
```

- `nube.json`: `ciencia_datos/datos/hoyas_referencia.csv` filtrado como `model/forma.py`, los 296 candidatos de
  `ciencia_datos/salidas/fichas_integradas.csv`, los 8 impactos de `ciencia_datos/datos/impactos_tierra.csv` y el plano de la
  regresión logística de `model/forma.py`.
- `relieves.json`: rejillas de 48 × 48 de `analisis/20_vista3d.py` (corrida en Colab; el zip `vista3d.zip` no está en el repo).
  Si no está la carpeta `--vista3d`, el script conserva el `relieves.json` que ya existe.
- `perfiles.json`: `ciencia_datos/datos/perfiles_radiales.json` y `h/D` medido con `model/borde.py`.

El script se detiene si alguna cifra que la página copia ya no aparece en `model/VALIDATION.md`, `model/NIVEL2.md` o
`docs/METODOLOGIA.md`. Si cambias una cifra en esos archivos, actualiza el texto en `index.html` (español) y `src/textos.js`
(inglés) y vuelve a correr el script.

## Estilo

- Misma línea visual que la landing (https://marsception.us): fondo `#07060a`, texto `#f4efe9`, naranja `#d4572a` / `#f08a4b`,
  Inter (títulos apretados con degradado) y JetBrains Mono (etiquetas), estrellas y el resplandor de Marte. Las fuentes van
  dentro del build (`@fontsource`), así que no dependen de Google Fonts.
- Del juego toma los colores de los mundos de su pantalla de título (Tierra turquesa, Luna lavanda, Marte naranja), los tonos de
  las superficies (`assets/paletas.json`) y dos piezas de arte en píxeles, copiadas sin cambios en `public/arte/`:
  `titulo.png` (portada y tarjeta final), `carga.png` (el objeto que cae en la caída libre) y `fondo_luna.png` / `fondo_marte.png`
  (las tres capas de `assets/fondos/fondo_<mundo>_<1|2|3>.png` juntas). Si el frente arte las cambia, hay que volver a copiarlas.
- `src/arte/rover.png`, `polvo.png` y `suelo_marte.png` están compuestos con los sprites del juego (`assets/entidades/`, `assets/fx/fx_polvo_marte_arena`, `assets/terreno/marte_arena*`), sin redibujar nada; `public/arte/logo.png` es el logotipo recortado de `titulo.png`.
- Las capturas `juego-*.webp` son del juego real: salen de `game/e2e/camino_dorado.mjs` (camino de Marte) contra el servidor de
  desarrollo, convertidas a WebP. Si el juego cambia mucho, conviene volver a sacarlas.

## Lo que hay que tener presente

- El cráter del capítulo 03 es una ilustración geométrica y lo dice en pantalla. Todo lo demás en 3D es relieve medido.
- El color de las superficies es ilustrativo (no es reflectancia). La identidad de cada mundo la dan los rótulos; los colores
  de los datos (Tierra, Luna, Marte) se validaron para daltonismo en los dos temas.
- La exageración vertical (2×) se declara en cada figura.
- Pesos, umbrales y la ventana del borde son provisionales (P), igual que en el modelo.
- No está publicada. Para publicarla junto al juego hay que decidir la ruta (por ejemplo `/ciencia/`).
