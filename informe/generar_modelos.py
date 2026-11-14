"""Genera informe/modelos_explicables.html (y su PDF con .qa/pdf_modelos.mjs).

Fuentes: ciencia_datos/salidas/ (figuras, arbol.json, mexico_luna_vs_marte.csv) y las cifras de los notebooks 01 y 02.
Uso:  uv run python informe/generar_modelos.py
"""
import json, html
from pathlib import Path
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
SAL = "../ciencia_datos/salidas"
IMG = "../web/public/data/img"
e = html.escape

arbol = json.load(open(RAIZ / "ciencia_datos/salidas/arbol.json"))
lm = pd.read_csv(RAIZ / "ciencia_datos/salidas/mexico_luna_vs_marte.csv")
dentro = round(lm.dentro_95.mean() * 100)
fuera = lm[~lm.dentro_95].sort_values("dist", ascending=False)


def fila_fuera(r):
    nombre = r.nombre if isinstance(r.nombre, str) else f"{r.cid} (sin nombre)"
    por = "más hondo que la nube" if r.prof_diam > 0.1 else "cuenca grande y plana"
    return f"<tr><td>{e(nombre)}</td><td>{r.tipo.replace('_', ' ')}</td><td>{r.diam_km:.2f}</td><td>{r.prof_diam:.3f}</td><td>{r.P_Luna:.2f}</td><td>{por}</td></tr>"


ver = lm[lm.grupo_val != "sin verificar"].sort_values("P_Luna", ascending=False)


def fila_ver(r):
    return (f"<tr><td>{e(r.nombre if isinstance(r.nombre, str) else r.cid)}</td><td>{r.grupo_val.replace(' verificad', ' verificad')}</td>"
            f"<td>{r.diam_km:.2f}</td><td>{r.prof_diam:.3f}</td><td>{r.P_Luna:.2f}</td><td>{'sí' if r.dentro_95 else 'no'}</td></tr>")


ESQUEMA = """
<svg viewBox="0 0 720 230" width="100%" role="img" aria-label="Esquema de las medidas de un cráter">
  <defs><marker id="f" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#1d2024"/></marker>
        <marker id="g" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#1d2024"/></marker></defs>
  <text x="10" y="18" font-size="12" font-weight="700">Corte (de lado)</text>
  <path d="M10,90 L70,90 Q95,90 110,78 Q125,70 140,80 Q180,160 210,165 Q240,160 280,80 Q295,70 310,78 Q325,90 350,90 L380,90" fill="none" stroke="#1d2024" stroke-width="2.2"/>
  <line x1="10" y1="96" x2="380" y2="96" stroke="#999" stroke-dasharray="4 3"/>
  <text x="300" y="112" font-size="10" fill="#666">nivel del terreno alrededor</text>
  <line x1="125" y1="58" x2="295" y2="58" stroke="#1d2024" marker-start="url(#g)" marker-end="url(#f)"/>
  <text x="185" y="52" font-size="12" font-weight="700">D = diámetro</text>
  <line x1="210" y1="72" x2="210" y2="163" stroke="#b4432a" marker-start="url(#g)" marker-end="url(#f)"/>
  <text x="216" y="125" font-size="12" font-weight="700" fill="#b4432a">d = profundidad</text>
  <line x1="320" y1="96" x2="320" y2="76" stroke="#1f6f78" marker-start="url(#g)" marker-end="url(#f)"/>
  <text x="326" y="74" font-size="11" fill="#1f6f78" font-weight="700">borde</text>
  <text x="10" y="200" font-size="11.5"><tspan font-weight="700">d/D</tspan> = qué tan hondo es para su tamaño · <tspan font-weight="700">borde/D</tspan> = qué tanto sobresale el borde</text>
  <text x="430" y="18" font-size="12" font-weight="700">Planta (desde arriba)</text>
  <rect x="440" y="40" width="170" height="130" fill="none" stroke="#999" stroke-dasharray="4 3"/>
  <path d="M470,70 Q520,35 580,70 Q615,110 570,155 Q520,175 475,150 Q445,110 470,70 z" fill="#d9d4c7" stroke="#1d2024" stroke-width="1.6"/>
  <text x="440" y="190" font-size="11"><tspan font-weight="700">relleno</tspan> = qué tanto de la caja ocupa la hoya</text>
  <text x="440" y="205" font-size="11"><tspan font-weight="700">aspecto</tspan> = lado corto / lado largo</text>
  <text x="440" y="220" font-size="11">(1 = círculo perfecto en ambos)</text>
</svg>"""

H = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Modelos explicables y nuevo enfoque</title>
<style>
@page {{ size: Letter; margin: 16mm 15mm 18mm 15mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "IBM Plex Sans", "Inter", "Helvetica Neue", Arial, sans-serif; color: #1d2024; font-size: 10pt; line-height: 1.45; margin: 0; }}
h1 {{ font-size: 23pt; line-height: 1.1; margin: 0 0 3mm; letter-spacing: -.01em; }}
h2 {{ font-size: 14pt; margin: 7mm 0 2.5mm; padding-top: 2mm; border-top: 1.5px solid #1d2024; }}
h3 {{ font-size: 11pt; margin: 5mm 0 2mm; }}
p, li {{ max-width: 178mm; }}
.sub {{ color: #555; font-size: 10.5pt; margin-bottom: 5mm; }}
.caja {{ background: #f1efe9; border-left: 4px solid #1f6f78; padding: 3mm 4mm; margin: 4mm 0; break-inside: avoid; }}
.caja.alerta {{ border-left-color: #b4432a; }} .caja.oro {{ border-left-color: #c7921a; }}
.caja p {{ margin: 1.5mm 0; }}
table {{ border-collapse: collapse; width: 100%; font-size: 9pt; margin: 2mm 0 3mm; break-inside: avoid; }}
th, td {{ text-align: left; padding: 1.2mm 2mm; border-bottom: .6px solid #ccc; vertical-align: top; }}
th {{ border-bottom: 1.2px solid #1d2024; font-weight: 600; }}
td.n, th.n {{ text-align: right; font-variant-numeric: tabular-nums; }}
img.ancha {{ width: 100%; display: block; margin: 2mm 0; }}
img.media {{ width: 75%; display: block; margin: 2mm auto; }}
figure {{ margin: 0; break-inside: avoid; }}
figcaption {{ font-size: 8.5pt; color: #444; margin-top: 1mm; }}
.trio {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }}
.trio .par {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1mm; }}
.trio img {{ width: 100%; display: block; }}
.salto {{ break-before: page; }}
.regla {{ display: grid; grid-template-columns: 9mm 1fr; gap: 2mm; margin: 2mm 0; break-inside: avoid; }}
.regla b.num {{ display: inline-flex; width: 7mm; height: 7mm; border-radius: 50%; background: #1d2024; color: #fff; align-items: center; justify-content: center; font-size: 9pt; }}
.nums {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin: 3mm 0; }}
.num {{ font-size: 19pt; font-weight: 700; line-height: 1; }}
.nums span {{ display: block; font-size: 8.5pt; color: #555; margin-top: 1mm; }}
</style></head><body>

<h1>Qué separa un cráter de la Luna, de Marte y de México</h1>
<div class="sub">Space Apps 2026 · Modelos explicables y nuevo enfoque del proyecto · 14 de noviembre de 2026</div>

<div class="caja oro">
<p><b>Nuevo enfoque (decidido el 14 de noviembre).</b> El modelo de clasificación <b>deja de ser el producto y pasa a ser evidencia</b>. El producto es una <b>lista corta de 5 a 8 sitios</b> de México, cada uno con su gemelo lunar o marciano, su puntaje, para qué le sirve a Artemis y dónde se rompe la analogía.</p>
<p><b>Hallazgo principal propuesto:</b> los <b>tajos mineros de zonas áridas</b> (identificados por coordenadas como Peñasquito, Real de Ángeles y Hércules; <b>nombres por verificar</b>) como análogo <i>operativo</i> del polo sur lunar: son más hondos para su tamaño que casi cualquier cráter lunar medido a 200 m, y ya tienen caminos, permisos y maquinaria para probar rovers y extracción de recursos (ISRU).</p>
<p><b>Segundo hallazgo, por verificar en la literatura:</b> maars del catálogo que caen dentro del rango lunar o marciano y que nadie ha propuesto como análogos.</p>
<p><b>Entrega:</b> cierre domingo 15 a las 23:59; meta interna, enviar a las 18:00. Detalle en <code>PROYECTO.md</code>.</p>
</div>

<div class="nums">
<div><div class="num">0.060</div><span>d/D típico del polo sur lunar</span></div>
<div><div class="num">0.034</div><span>d/D típico de México árido</span></div>
<div><div class="num">0.027</div><span>d/D típico de Marte (Jezero, Gale, Oxia)</span></div>
<div><div class="num">{dentro} %</div><span>de los cráteres áridos de México cae dentro de la nube Luna + Marte</span></div>
</div>

<h2>1. El problema en una página</h2>
<p><b>La pregunta.</b> Si medimos cráteres de la Luna, de Marte y de México con la misma regla, ¿qué tan parecidos son? ¿Y qué rasgo los distingue? Si un cráter mexicano no se distingue de uno lunar, en <i>forma</i> es un buen análogo.</p>
<p><b>Por qué el mismo detector a 200 m.</b> Los tres relieves vienen de instrumentos distintos (Copernicus en la Tierra, LOLA en la Luna, HRSC + MOLA en Marte). Si los midiéramos cada uno a su resolución, las diferencias saldrían del instrumento y no del terreno. Por eso los tres se llevan a 200 m por píxel y pasan por el mismo código. El costo: solo vemos cráteres de 0.6 a 10 km.</p>
<h3>Qué medimos de cada cráter</h3>
{ESQUEMA}
<table><tr><th>Medida</th><th>Qué dice</th><th>Por qué importa</th></tr>
<tr><td><b>Diámetro</b> (en logaritmo)</td><td>Tamaño</td><td>Los cráteres cambian de forma con el tamaño; se usa en log porque va de 0.6 a 10 km.</td></tr>
<tr><td><b>d/D</b> profundidad / diámetro</td><td>Qué tan hondo es para su tamaño</td><td>El rasgo clásico: un cráter fresco es hondo; uno viejo, relleno de polvo o erosionado, es plano.</td></tr>
<tr><td><b>borde / D</b></td><td>Qué tanto sobresale el borde</td><td>Los cráteres de impacto levantan borde; las dolinas y los tajos casi no.</td></tr>
<tr><td><b>relleno</b></td><td>Qué tanto ocupa la hoya de su caja</td><td>Alto = contorno lleno y regular; bajo = irregular.</td></tr>
<tr><td><b>aspecto</b></td><td>Lado corto / lado largo</td><td>Alargado o redondo.</td></tr></table>
<p>No usamos la elevación absoluta (cada mundo tiene su propio “nivel del mar”: el modelo separaría por ahí sin aprender nada) ni la vegetación (solo existe en la Tierra).</p>

<h3>Cómo se ven, a la misma escala y con la misma luz</h3>
<div class="trio">
<figure><div class="par"><img src="{IMG}/MX0008.png"><img src="{IMG}/MX0008_luna.png"></div><figcaption><b>El Elegante</b> (Pinacate, Sonora), cráter volcánico, y su gemelo lunar. 12.8 km por lado.</figcaption></figure>
<figure><div class="par"><img src="{IMG}/MX0207.png"><img src="{IMG}/MX0207_luna.png"></div><figcaption><b>Real de Ángeles</b> (Zacatecas; nombre por verificar), tajo minero, y su gemelo lunar.</figcaption></figure>
<figure><div class="par"><img src="{IMG}/MX0155.png"><img src="{IMG}/j_marte_Crá0.png"></div><figcaption><b>Peñasquito</b> (Zacatecas; nombre por verificar), tajo minero, y un cráter de Marte (Gale).</figcaption></figure>
</div>
<p>Lo que el modelo ve es sólo la forma del relieve, sin color ni textura. A esta escala los tres mundos se confunden con facilidad, y de eso trata este documento.</p>

<h2 class="salto">2. El árbol de decisión, regla por regla</h2>
<p>Un árbol de decisión es una serie de preguntas de sí o no sobre las medidas. Lo limitamos a <b>3 niveles</b> para que se pueda leer. Se entrenó con <b>4,288 cráteres lunares</b> (polo sur y anillo de 80–85° S), <b>284 marcianos</b> y <b>47 de México árido</b>, dando más peso a las clases chicas para que la Tierra cuente.</p>
<img class="ancha" src="{SAL}/arbol.png">
<p style="font-size:8.5pt;color:#555">Cómo leer cada caja: la pregunta arriba; <i>samples</i> = porcentaje de cráteres que llegan ahí; <i>value</i> = proporción (ponderada) de Luna, Marte y Tierra; <i>class</i> = la respuesta del árbol. A la izquierda va el “sí”.</p>
<div class="regla"><b class="num">1</b><div><b>¿d/D ≤ 0.039?</b> Es la primera pregunta y la más importante. Si el cráter es <b>poco hondo</b> para su tamaño, el árbol se va hacia Marte o la Tierra; si es <b>hondo</b>, hacia la Luna. Cuadra con las medianas: Luna 0.060, México árido 0.034, Marte 0.027. Los cráteres marcianos que medimos (Jezero, Gale, Oxia) están rellenos de sedimento y polvo; los del polo sur lunar, más frescos.</div></div>
<div class="regla"><b class="num">2</b><div><b>¿Qué tanto sobresale el borde (borde/D)?</b> Es la segunda pregunta en las dos ramas. En México los bordes <b>casi no sobresalen</b> (mediana −0.005, contra −0.018 en la Luna), como se espera de maars, dolinas y tajos mineros. Un borde casi plano empuja hacia “Tierra”.</div></div>
<div class="regla"><b class="num">3</b><div><b>Relleno y otra vez d/D.</b> El tercer nivel afina: con <b>relleno bajo</b> (contorno irregular) dice “Tierra”, y con <b>d/D mayor a 0.188</b> también dice “Tierra”. Esa última hoja (0.7 % de los cráteres) son casi solo <b>minas</b>: más hondas que cualquier cosa en la Luna o Marte.</div></div>
<div class="caja"><p><b>Qué tan seguro es:</b> poco. Las hojas tienen mezclas (por ejemplo 45 % Luna, 20 % Marte, 35 % Tierra). El árbol acierta, en promedio por clase, el <b>{round(arbol['exactitud_balanceada_cv'] * 100)} %</b> de las veces fuera de la muestra de entrenamiento (adivinar daría 33 %). El árbol sirve para <b>explicar</b> qué rasgos separan los mundos, no para clasificar con confianza.</p></div>
<img class="ancha" src="{SAL}/importancias.png">
<p><b>Qué variable pesa más.</b> Si revolvemos al azar una variable y el modelo empeora mucho, esa variable importaba (importancia por permutación). <b>d/D</b> pesa más (0.26), luego el <b>borde</b> (0.10). El diámetro, el relleno y el aspecto casi no aportan. Esto es material directo para “dónde funciona y dónde se rompe la analogía”.</p>

<h2 class="salto">3. Qué tan bien funciona y por qué no más</h2>
<p>Todas las cifras son de <b>validación cruzada por bloques espaciales</b> de ~50 km: un bloque entero va a prueba o a entrenamiento, nunca partido, para que el modelo no “vea” vecinos casi idénticos. Se mide con <b>exactitud balanceada</b> (promedio del acierto por clase), porque decir “Luna” siempre daría 92 % de exactitud normal y 33 % balanceada.</p>
<table><tr><th>Modelo</th><th class="n">Exactitud balanceada</th><th class="n">Luna</th><th class="n">Marte</th><th class="n">Tierra</th></tr>
<tr><td>Línea base (adivinar en proporción)</td><td class="n">32 %</td><td class="n">92 %</td><td class="n">5 %</td><td class="n">0 %</td></tr>
<tr><td>Árbol, 2 niveles</td><td class="n">49 %</td><td class="n">50 %</td><td class="n">52 %</td><td class="n">45 %</td></tr>
<tr><td><b>Árbol, 3 niveles</b> (el del dibujo)</td><td class="n"><b>51 %</b></td><td class="n">63 %</td><td class="n">57 %</td><td class="n">32 %</td></tr>
<tr><td>Árbol, 5 niveles</td><td class="n">52 %</td><td class="n">70 %</td><td class="n">65 %</td><td class="n">21 %</td></tr>
<tr><td>Regresión logística</td><td class="n">55 %</td><td class="n">52 %</td><td class="n">67 %</td><td class="n">47 %</td></tr></table>
<p>Más niveles no ayudan: el árbol de 5 niveles memoriza la Luna y acierta menos en la Tierra.</p>

<h3>¿Por qué no da más? Tres sospechosos</h3>
<table><tr><th>Sospechoso</th><th>Prueba</th><th>Resultado</th></tr>
<tr><td><b>Desbalance</b> (4,288 / 284 / 47)</td><td>Sin pesos, con pesos y con submuestreo</td><td>Sin pesos el modelo solo dice “Luna” (33 %). Con pesos queda resuelto (56 %); el submuestreo no agrega. <b>No es lo que limita.</b></td></tr>
<tr><td><b>Etiquetas de la Tierra</b></td><td>Usar solo los 15 cráteres y minas verificados en vez de las 47 áridas</td><td>Sube de <b>~55 % a ~70 %</b>. <b>Es el cuello de botella.</b> Ojo: 10 de los 15 son minas, así que en parte aprende “mina”.</td></tr>
<tr><td><b>Cráteres demasiado chicos</b></td><td>Contar píxeles por cráter</td><td>La <b>mitad</b> mide menos de 20 píxeles (Luna 50 %, Marte 38 %, Tierra 60 %). Su aspecto es ruido de cuadrícula. Quitar el aspecto no cambia nada.</td></tr>
<tr><td><b>El anillo lunar</b> de 80–85° S</td><td>Usar solo el polo sur (1,056)</td><td>Igual: 56 %. No estorba.</td></tr></table>
<img class="media" src="{SAL}/cuantizacion_aspecto.png">
<p><b>El efecto de la cuadrícula.</b> Izquierda: el aspecto de los cráteres lunares de menos de 20 píxeles solo puede valer unos cuantos números (0.75, 0.8, 1…), porque con tan pocos píxeles no hay más combinaciones. Derecha: con 20 o más píxeles ya se reparte. Para medir la forma en planta en serio habría que bajar a 100 m o menos.</p>

<h2 class="salto">4. El puntaje Luna contra Marte, con México como invitado</h2>
<p>Como las etiquetas de la Tierra son pocas y ruidosas, cambiamos la pregunta: entrenamos <b>solo con Luna y Marte</b> (datos limpios) y a cada cráter de México le preguntamos dos cosas.</p>
<ol>
<li><b>¿Más lunar o más marciano?</b> La probabilidad <code>P_Luna</code> del modelo Luna-contra-Marte, que separa los dos mundos el <b>75–77 %</b> de las veces con 3 sitios marcianos (<b>78 %</b> con 8 sitios; ver sección 6).</li>
<li><b>¿Cae dentro del rango planetario?</b> Distancia de Mahalanobis robusta a la nube de cráteres de Luna y Marte. Si queda dentro del 95 %, en forma es un análogo plausible.</li>
</ol>
<img class="media" src="{SAL}/mexico_sobre_luna_marte.png">
<div class="caja"><p><b>{dentro} % de los cráteres áridos de México ({int(lm.dentro_95.sum())} de {len(lm)}) cae dentro de la nube</b>: en forma, son análogos creíbles. Este puntaje no depende de cuántos cráteres terrestres hayamos etiquetado.</p></div>
<h3>Los que quedan fuera ({len(fuera)})</h3>
<table><tr><th>Sitio</th><th>Tipo</th><th class="n">D (km)</th><th class="n">d/D</th><th class="n">P_Luna</th><th>Por qué queda fuera</th></tr>{''.join(fila_fuera(r) for r in fuera.itertuples())}</table>
<p style="font-size:8.5pt;color:#555">Los nombres de las minas se asignaron por coordenadas y están por verificar.</p>
<p>Cinco quedan fuera <b>por exceso</b>: son más hondos que casi cualquier cráter lunar de su tamaño (las minas y Sykes). Dos, por lo contrario: son <b>cuencas grandes y casi planas</b> (una de ellas es una presa con agua), sin equivalente en la nube.</p>
<h3>Los verificados</h3>
<table><tr><th>Sitio</th><th>Grupo</th><th class="n">D (km)</th><th class="n">d/D</th><th class="n">P_Luna</th><th>Dentro de la nube</th></tr>{''.join(fila_ver(r) for r in ver.itertuples())}</table>
<p>Los cráteres naturales verificados salen <b>más lunares que marcianos</b> (El Elegante 0.94, Sykes 0.99, Rincón de Parangueo 0.65); MacDougal y Cerro Colorado quedan a medio camino. Las minas salen casi 100 % “lunares”, porque lo que el modelo usa para decir Luna es d/D alto.</p>

<h2 class="salto">5. Dónde se rompe la analogía</h2>
<h3>En forma (lo que sí medimos)</h3>
<ul>
<li><b>Los tajos mineros son demasiado hondos.</b> La mina identificada como Real de Ángeles (nombre por verificar) tiene d/D de 0.29; casi ningún cráter lunar de su tamaño pasa de 0.2 a esta resolución. Sirven para probar <i>operación en pendientes extremas</i>, no para imitar un cráter lunar típico. Además son escalonados (bancos de mina), no tazones.</li>
<li><b>El borde no sirve como criterio de parecido con la Luna.</b> Medido a 200 m, el “borde” de los cráteres lunares sale <b>negativo</b> (mediana −23 m; Marte −15 m): el promedio del anillo alrededor queda por debajo del terreno lejano, porque a esta resolución el borde real, angosto, se pierde. Dentro de la Tierra el borde sí separa orígenes: los impactos terrestres tienen borde levantado (+8 a +34 m) y los maars, dolinas y tajos casi no. Pero comparar el borde de México con el de la Luna sería comparar cosas medidas distinto.</li>
<li><b>Los cráteres marcianos de referencia son someros</b> (rellenos de sedimento). Los cráteres mexicanos áridos se parecen más a ellos en d/D, pero no en origen.</li>
<li><b>A 200 m todo lo menor a 0.6 km es invisible</b>, y la mitad de los cráteres tiene tan pocos píxeles que su forma en planta es ruido.</li>
<li><b>Instrumentos distintos.</b> Parte de la diferencia entre la Luna y Marte puede venir de LOLA frente a HRSC + MOLA, no del terreno.</li>
</ul>
<h3>Lo que no medimos (y ningún sitio de la Tierra imita)</h3>
<table><tr><th>Factor</th><th>Luna (polo sur)</th><th>Marte</th><th>México</th><th>Consecuencia para las pruebas</th></tr>
<tr><td>Gravedad</td><td>1/6 de la Tierra</td><td>~3/8</td><td>1</td><td>Las ruedas agarran y se hunden distinto; el polvo cae distinto. Compensar con lastre o modelos.</td></tr>
<tr><td>Atmósfera</td><td>Vacío</td><td>Muy tenue (CO₂)</td><td>Densa</td><td>Sin enfriamiento por aire ni arrastre de polvo por viento en la Luna.</td></tr>
<tr><td>Radiación</td><td>Sin campo magnético ni atmósfera</td><td>Alta</td><td>Protegidos</td><td>La electrónica no se pone a prueba.</td></tr>
<tr><td>Temperatura y luz</td><td>Sol rasante; sombra permanente cerca de 40 K</td><td>Fría</td><td>Desierto caliente</td><td>Probar de noche con luz rasante artificial; el frío extremo no se replica.</td></tr>
<tr><td>Suelo</td><td>Regolito fino, filoso, sin agua</td><td>Polvo con óxidos y percloratos</td><td>Basalto (Pinacate), roca de mina</td><td>Pinacate se parece en basalto; la mina, en material excavado y suelto.</td></tr></table>

<h2 class="salto">6. El detector frente a cráteres conocidos</h2>
<p>Para no depender de coordenadas de memoria, se armó un <b>catálogo de 70 cráteres volcánicos de México</b> con fuente citable (Global Volcanism Program y artículos); 66 tienen coordenadas, y cada una se comprobó contra el relieve SRTM de 30 m (<code>ciencia_datos/03_etiquetas_por_fuentes.ipynb</code>). Se cotejó contra <b>las 5,208 depresiones</b> que encontró el detector, incluidas las que no pasan el filtro.</p>
<table><tr><th>Resultado (66 cráteres del catálogo con coordenadas)</th><th class="n">Cráteres</th></tr>
<tr><td>Detectado y pasa el filtro “tipo cráter”</td><td class="n">20</td></tr>
<tr><td>Detectado, pero no pasa el filtro</td><td class="n">6</td></tr>
<tr><td>No detectado: tiene lago (el relieve ve el agua, no el fondo)</td><td class="n">15</td></tr>
<tr><td>No detectado: otras razones (islas fuera del barrido, coordenadas desplazadas 1–2 km entre fuentes, menos de 20 m de profundidad aparente)</td><td class="n">22</td></tr>
<tr><td>No detectado: más chico que 0.6 km (invisible a 200 m)</td><td class="n">3</td></tr></table>
<p>Contando solo los <b>62 que están en el rango del detector</b> (0.6–10 km, o sin diámetro reportado), encuentra el <b>40 %</b> y el <b>32 %</b> pasa el filtro. Las fallas tienen causas claras y casi todas son límites del método (agua, tamaño, profundidad), no del cráter.</p>
<h3>Cráteres de impacto de la Tierra</h3>
<p>El mismo detector, sobre Copernicus a 200 m, alrededor de 10 cráteres de impacto conocidos (coordenadas aproximadas, por verificar contra el Earth Impact Database): encuentra <b>9 de 10</b>, todos a menos de 0.35 km del centro; de esos 9 quedan <b>8 válidos</b>. Brent (Canadá, erosionado, con bosque y lagos) no aparece, y en Xiuyan (China) la depresión hallada no coincide en tamaño, así que se excluyó.</p>
<img class="media" src="{SAL}/impactos_y_minas.png">
<div class="caja"><p><b>Los 8 impactos válidos caen dentro de la nube Luna + Marte</b>, y Meteor Crater (Arizona) sale muy “lunar” (P_Luna 0.96). <b>Las 4 minas más hondas de México (d/D de 0.19 a 0.29) son más hondas que Meteor Crater (0.126)</b>, el cráter de impacto fresco más famoso de la Tierra: por eso quedan fuera de la nube por exceso.</p></div>
<h3>Los volcánicos sobre la nube</h3>
<img class="media" src="{SAL}/fuentes_sobre_luna_marte.png">
<ul>
<li><b>90 % de los volcánicos detectados cae dentro de la nube</b> Luna + Marte: en forma, son análogos plausibles.</li>
<li>Quedan fuera <b>Sykes</b> y <b>El Chichón</b>, por ser más hondos que casi cualquier cráter lunar de su tamaño.</li>
<li><b>Santa María del Oro, Tepetiltic y el Xalapazco de Los Humeros</b> salen “marcianos”: anchos y planos, como los cráteres rellenos de Marte.</li>
<li>Como etiquetas para el modelo de tres clases, los 20 volcánicos <b>no lo mejoran</b> (59–60 %, frente a 54–58 % con las 47 áridas sin revisar). Confirma la decisión: el modelo es evidencia, no el producto.</li>
</ul>
<h3>Marte con más sitios</h3>
<p>Se añadieron 5 sitios de aterrizaje (Meridiani, Gusev, Chryse, Elysium y Utopia) con el mismo recorte; Elysium y Utopia se dejaron fuera por tener muy pocos cráteres y relieve muy liso (posible zona solo MOLA). Con <b>8 sitios</b> marcianos, el modelo Luna contra Marte acierta el <b>78 %</b>. Probado en un sitio marciano que nunca vio, acierta entre <b>70 % (Gale) y 92 % (Meridiani)</b>: la diferencia Luna–Marte no depende de un solo sitio.</p>

<h2>7. Siguientes pasos</h2>
<ol>
<li><b>Elegir la lista corta de 5 a 8 sitios</b> (minas áridas, Pinacate, maars del catálogo) con su gemelo, puntaje, uso para Artemis y dónde se rompe.</li>
<li><b>Verificar en la literatura</b> que los maars elegidos no se hayan propuesto antes como análogos, y confirmar los nombres de las minas.</li>
<li><b>Ajustar la página web</b>: la lista corta como producto, el árbol y el puntaje como evidencia, y las cifras corregidas.</li>
<li><b>Después del hackathon:</b> perfiles radiales del cráter (pendiente de pared, fondo plano o en taza), más resolución, detección con redes (DeepMoon) y mapa geológico de dolinas.</li>
</ol>

<h2>Fuentes de este documento</h2>
<p>Figuras y cifras: <code>ciencia_datos/01_modelos_explicables.ipynb</code>, <code>02_diagnostico_y_mejoras.ipynb</code> y <code>ciencia_datos/salidas/</code>. Datos: <code>ciencia_datos/datos/</code>, que salen del cuaderno <code>analisis/analogos_mexico.ipynb</code>. Relieve: Copernicus DEM GLO-30 (ESA), LOLA (NASA), HRSC + MOLA (ESA/NASA, USGS). Vegetación: MODIS (NASA). Minas: OpenStreetMap.</p>
</body></html>"""

if __name__ == "__main__":
    out = RAIZ / "informe/modelos_explicables.html"
    out.write_text(H, encoding="utf-8")
    print("escrito", out)
