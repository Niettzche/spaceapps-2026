"""Genera informe/guia_exposicion_modelo.html: guía para exponer el modelo de análogos (pitch y preguntas de jueces).

Las cifras del borde levantado se calculan aquí con model/borde.py (mismas definiciones que model/validate.py, parte_borde).
Las demás cifras se copian de model/VALIDATION.md y el script se detiene si ya no aparecen ahí, para que la guía no
contradiga a la validación.

Uso:  uv run --with pandas --with numpy python informe/generar_guia_exposicion.py
PDF:  google-chrome-stable --headless --no-pdf-header-footer \\
        --print-to-pdf=informe/guia_exposicion_modelo.pdf informe/guia_exposicion_modelo.html
"""
import html
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from model import borde  # noqa: E402

e = html.escape
VAL = (RAIZ / "model" / "VALIDATION.md").read_text(encoding="utf-8")

# --- Cifras que se copian de model/VALIDATION.md: si alguna cambia allá, hay que corregir el texto de esta guía ---
CITAS = [
    "Exactitud balanceada fuera de pliegue con grupos espaciales: 78 %",
    "4,288 cráteres lunares y 573 marcianos",
    "| D ≥ 2 km | 3 variables | 788 | 125 | 77.6%",
    "### Controles negativos: 3 de 3 pasan",
    "### Análogos conocidos: 9 de 21 pasan",
    "puntaje de forma 0.42",
    "7 de los 11 cráteres con fuente quedan entre los 20 primeros",
    "con el puntaje de forma, 2 y 3",
    "encuentra el 40% y el 32% pasa el filtro",
    "la IA etiqueta 27 como cráteres naturales (9%)",
    "29 aciertos",
    "el d/D lunar baja de 0.058 a 0.043",
]
faltan = [c for c in CITAS if c not in VAL]
if faltan:
    raise SystemExit("model/VALIDATION.md ya no dice esto; revisa la guía antes de regenerarla:\n- " + "\n- ".join(faltan))

# --- Borde levantado: grupos (mismas definiciones que model/validate.py, parte_borde) ---
t = borde.tabla_candidatos().dropna(subset=["h"]).reset_index(drop=True)
r, sitios = borde.perfiles()
P = np.array([sitios[i]["tierra"] for i in t.id], float)
lev = (t.h > borde.UMBRAL).to_numpy()
fuente = t.con_fuente.notna().to_numpy()
alta = (t.conf_ia >= 0.7).to_numpy()
valle = alta & t.etiqueta_ia.isin(["presa_o_lago", "valle_o_canada", "hondonada_eolica_o_duna"]).to_numpy()
tajo = (t.km_mina <= 2.0).to_numpy() & ~fuente
a_v, b_v, lejos = borde.limites_ventana()
ref = {c: np.array([borde.altura(list(p), r) for p in borde.perfiles_referencia(c)]) > borde.UMBRAL for c in ("luna", "marte")}


def de(m):
    return f"{int(lev[m].sum())} de {int(m.sum())}"


# --- Figura: perfil mediano de cada grupo en la zona del borde (SVG, para que salga nítido en el PDF) ---
SERIES = [("Cráteres conocidos", fuente, "#2a78d6"), ("Valles, presas y dunas", valle, "#eb6834"), ("Tajos mineros", tajo, "#1baf7a")]
X0, X1, Y0, Y1 = 0.67, 2.0, -80.0, 20.0           # radios; metros por km de diámetro
W, H, ML, MR, MT, MB = 720, 226, 62, 14, 32, 42


def px(x):
    return ML + (x - X0) / (X1 - X0) * (W - ML - MR)


def py(y):
    return MT + (Y1 - y) / (Y1 - Y0) * (H - MT - MB)


def figura() -> str:
    ver = r >= 0.7
    s = [f'<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label="Perfil mediano de cada grupo en la zona del borde: '
         'solo los cráteres conocidos suben por encima del terreno lejano">',
         f'<rect x="{px(a_v):.1f}" y="{MT}" width="{px(b_v) - px(a_v):.1f}" height="{H - MT - MB}" fill="#f1efe9"/>']
    for y in range(-80, 21, 20):
        s.append(f'<line x1="{ML}" x2="{W - MR}" y1="{py(y):.1f}" y2="{py(y):.1f}" stroke="{"#8a8780" if y == 0 else "#e4e2dc"}" stroke-width="1"/>')
        s.append(f'<text x="{ML - 8}" y="{py(y) + 3.5:.1f}" font-size="10" fill="#52514e" text-anchor="end">{y:+d}</text>'.replace("+0", "0"))
    for x in (0.75, 1.0, 1.25, 1.5, 1.75, 2.0):
        s.append(f'<text x="{px(x):.1f}" y="{H - MB + 16}" font-size="10" fill="#52514e" text-anchor="middle">{x:g}</text>')
    s.append(f'<text x="{(ML + W - MR) / 2:.1f}" y="{H - 8}" font-size="10.5" fill="#52514e" text-anchor="middle">'
             'Distancia al centro, en radios del cráter</text>')
    s.append(f'<text transform="translate(14,{(MT + H - MB) / 2:.1f}) rotate(-90)" font-size="10.5" fill="#52514e" text-anchor="middle">'
             'Altura (m por km de diámetro)</text>')
    s.append(f'<text x="{(px(a_v) + px(b_v)) / 2:.1f}" y="{H - MB - 7}" font-size="10" fill="#52514e" text-anchor="middle">'
             'Zona del borde: aquí medimos</text>')
    s.append(f'<text x="{(px(b_v) + W - MR) / 2:.1f}" y="{H - MB - 7}" font-size="10" fill="#52514e" text-anchor="middle">Terreno lejano</text>')
    lx = ML
    for nombre, m, color in SERIES:                      # leyenda (siempre presente con 2 o más series)
        s.append(f'<line x1="{lx}" x2="{lx + 18}" y1="16" y2="16" stroke="{color}" stroke-width="2.5" stroke-linecap="round"/>')
        etiqueta = f"{nombre} ({int(m.sum())})"
        s.append(f'<text x="{lx + 24}" y="19.5" font-size="10.5" fill="#1d2024">{e(etiqueta)}</text>')
        lx += 24 + 6.1 * len(etiqueta) + 22
    for nombre, m, color in SERIES:
        med = np.median(P[m], axis=0) * 1000
        pts = " ".join(f"{px(x):.1f},{py(max(y, Y0)):.1f}" for x, y in zip(r[ver], med[ver]))
        s.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')
    med = np.median(P[fuente], axis=0) * 1000              # una sola etiqueta directa: de eso trata la figura
    k = int(np.argmax(np.where(ver, med, -np.inf)))
    s.append(f'<circle cx="{px(r[k]):.1f}" cy="{py(med[k]):.1f}" r="4.5" fill="#2a78d6" stroke="#ffffff" stroke-width="2"/>')
    s.append(f'<text x="{px(r[k]) + 9:.1f}" y="{py(med[k]) - 8:.1f}" font-size="10.5" font-weight="600" fill="#1d2024">'
             f'Borde: +{med[k]:.0f} m por km</text>')
    s.append("</svg>")
    return "\n".join(s)


CSS = """
@page { size: Letter; margin: 15mm 15mm 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: "IBM Plex Sans", "Inter", "Helvetica Neue", Arial, sans-serif; color: #1d2024; font-size: 10pt; line-height: 1.45; margin: 0; }
h1 { font-size: 23pt; line-height: 1.1; margin: 0 0 3mm; letter-spacing: -.01em; }
h2 { font-size: 14pt; margin: 5.5mm 0 2.2mm; padding-top: 2mm; border-top: 1.5px solid #1d2024; break-after: avoid; }
p, li { max-width: 180mm; }
ul { margin: 1.5mm 0; padding-left: 5mm; } li { margin: .8mm 0; }
.sub { color: #555; font-size: 10.5pt; margin-bottom: 4mm; }
.caja { background: #f1efe9; border-left: 4px solid #1f6f78; padding: 3mm 4mm; margin: 3.5mm 0; break-inside: avoid; }
.caja.alerta { border-left-color: #b4432a; } .caja.oro { border-left-color: #c7921a; }
.caja p { margin: 1.2mm 0; }
table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 2mm 0 3mm; break-inside: avoid; }
th, td { text-align: left; padding: 1.2mm 2mm; border-bottom: .6px solid #ccc; vertical-align: top; }
th { border-bottom: 1.2px solid #1d2024; font-weight: 600; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
figure { margin: 2mm 0; break-inside: avoid; }
figcaption { font-size: 8.5pt; color: #444; margin-top: 1mm; max-width: 180mm; }
.nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin: 3mm 0 1mm; break-inside: avoid; }
.num { font-size: 19pt; font-weight: 700; line-height: 1; }
.nums span { display: block; font-size: 8.5pt; color: #555; margin-top: 1mm; }
.guion { display: grid; grid-template-columns: 26mm 1fr; gap: 1.5mm 4mm; margin: 2mm 0; break-inside: avoid; }
.guion b { font-size: 9pt; color: #555; font-weight: 600; padding-top: .4mm; }
.guion p { margin: 0; font-size: 11pt; line-height: 1.4; }
.qa { break-inside: avoid; margin: 0 0 3mm; padding-bottom: 2.2mm; border-bottom: .6px solid #ccc; }
.qa h3 { font-size: 10.5pt; margin: 0 0 .8mm; }
.qa p { margin: .6mm 0; }
.qa .resp { color: #555; font-size: 8.5pt; }
.salto { break-before: page; }
code { font-size: 8.8pt; }
"""

PREGUNTAS = [
    ("¿Qué modelo es? ¿Es inteligencia artificial?",
     "Es un modelo estadístico explicable: una regresión logística y un árbol poco profundo con tres medidas de cada cráter "
     "(diámetro, profundidad entre diámetro y borde). No es una red neuronal. Lo entrenamos con 4,288 cráteres de la Luna y 573 de "
     "Marte, y los separa con 78 % de exactitud balanceada, validando por zonas para no hacer trampa con cráteres vecinos.",
     "model/forma.py · model/VALIDATION.md, sección B"),
    ("¿De dónde salen los números?",
     "Del relieve de los tres mundos, medido con el mismo código y a la misma resolución (200 m): LOLA de la sonda LRO de la NASA "
     "para la Luna, HRSC+MOLA (ESA y NASA) para Marte y Copernicus (ESA) para la Tierra. La vegetación es de MODIS y el clima de "
     "NASA POWER. Cada variable de cada ficha trae su fuente.",
     "docs/METODOLOGIA.md"),
    ("¿Su puntaje pone un análogo real por encima de un hoyo cualquiera?",
     "Por sí solo, no, y lo publicamos: en nuestra prueba la forma a 200 m no separó un cráter de un valle mejor que el azar. Por eso el puntaje no "
     "decide qué es cada sitio. Lo deciden la etiqueta contrastada con fuentes y, como segunda evidencia, el borde levantado que "
     f"medimos: lo tienen {de(fuente)} cráteres conocidos. El puntaje solo dice qué tan lunar o marciano es un cráter ya identificado.",
     "model/VALIDATION.md, «¿La forma distingue un cráter…?» y «Borde levantado»"),
    ("¿Qué tiene que ver el borde con los análogos?",
     "El polo sur lunar y Jezero son terreno de cráteres. El borde levantado es evidencia de que un hoyo se formó por una explosión o "
     "un impacto, como los cráteres de la Luna y de Marte, y no por el agua o por una excavadora. Con eso nuestra lista queda hecha de "
     "cráteres. Ojo: dice «esto es un cráter», no «esto se parece a la Luna».",
     "model/NIVEL2.md, sección D"),
    ("¿Encontraron algo que nadie conociera?",
     "No lo presentamos como descubrimiento. El método encontró por su cuenta sitios ya usados: El Pinacate (Apolo 14) y Colton "
     "(Apolo 15), lo que respalda el método. Además propone dos cráteres volcánicos de Arabia Saudita, Al Hutaymah y Jabal Bayda, "
     "que no encontramos como análogos en la literatura que revisamos; falta revisar una base de datos de 2024 antes de llamarlos nuevos.",
     "model/NIVEL2.md, sección A"),
    ("¿Y las minas?",
     "El detector encuentra muchos tajos mineros porque tienen forma de cráter. No son cráteres: ninguno de los 22 de nuestro "
     "catálogo tiene borde levantado. Los dejamos como análogo operativo (paredes empinadas, excavación, sombra en el fondo), no "
     "geológico, y decimos dónde se rompe: son más hondos que casi cualquier cráter lunar de su tamaño.",
     "data/sites (nota de cada tajo) · ciencia_datos/salidas/lista_corta.md"),
    ("¿Marte sale más plano solo porque su mapa es más borroso?",
     "En parte sí en cráteres de menos de 1 km. Lo probamos emborronando la Luna a la resolución de Marte: su profundidad relativa "
     "baja de 0.058 a 0.043. Pero con cráteres de 2 km o más, donde la resolución ya no importa, el modelo mantiene 77.6 %.",
     "model/NIVEL2.md, sección B · model/VALIDATION.md"),
    ("¿Escanearon todo el planeta?",
     "No. México es el caso validado, y repetimos la búsqueda en Atacama, Arizona y Arabia: tres de las diez regiones áridas que "
     f"priorizamos. De ahí salen {len(t)} candidatos áridos.",
     "PROYECTO.md, paso 4"),
    ("¿Qué tan bueno es el detector?",
     "Detecta depresiones cerradas con forma de cráter, no cráteres. Encuentra 9 de 11 cráteres mexicanos conocidos, pero solo el "
     "40 % de un catálogo más amplio de 62 (los que tienen lago o son someros se le escapan), y de sus candidatos áridos apenas el "
     "9 % son cráteres naturales según las etiquetas. Por eso hace falta el paso de verificación.",
     "model/VALIDATION.md, sección B"),
    ("¿Por qué no miran si hay vida?",
     "Buscamos análogos de terreno, porque es lo que un rover necesita probar y lo que se puede medir igual en los tres mundos. La "
     "vida no se mide desde órbita: se comprueba con muestras en campo. Para Marte, el siguiente paso es comparar los minerales que "
     "deja el agua. Varios análogos famosos por su biología están en nuestra lista de conocidos, y decimos que el modelo no los ve.",
     "model/VALIDATION.md, sección A (lectura de los análogos conocidos)"),
    ("¿Qué no puede probar la Tierra?",
     "La gravedad, el vacío, la radiación y el ciclo térmico: la oscilación de temperatura es de 176 K en el polo sur lunar y 55 K "
     "en Jezero, frente a un máximo terrestre que fijamos en 40 K. Por eso la misión del juego usa la gravedad real del destino y la "
     "prueba terrestre no.",
     "data/targets · model/VALIDATION.md"),
    ("¿Cómo usaron la IA?",
     "El modelo de forma no es IA generativa. Usamos Claude para sugerir qué es cada candidato a partir de la imagen de satélite y el "
     "relieve, y contrastamos 33 casos con fuentes externas: 29 aciertos. No son verdad geológica y lo decimos. Claude Code y Codex "
     "ayudaron con el código y los documentos.",
     "ciencia_datos/etiquetado_ia · docs/USO_IA.md"),
]

NO_DECIR = [
    ("«La IA descubrió…», «red neuronal», «deep learning»", "No lo es. Es un modelo estadístico explicable."),
    ("«Escaneamos todo el planeta»", "Fueron México y tres de diez regiones áridas."),
    ("«Encontramos análogos nuevos»", "Los candidatos nuevos son propuestas a revisar; los «novedosos» del catálogo son minas."),
    ("«El puntaje mide qué tan buen análogo es»", "Describe la forma. No ordena análogos reales por encima de otros hoyos."),
    ("«El borde hace que se parezca a la Luna»",
     f"Con la misma medida solo tienen borde {int(ref['luna'].sum())} de {len(ref['luna'])} cráteres lunares de referencia."),
    ("«Dos evidencias independientes»", "La etiqueta de IA también vio el relieve. Decir: «la etiqueta sobre la imagen y el borde medido»."),
    ("«El detector de cráteres»", "Es un detector de depresiones con forma de cráter."),
    ("Que las regiones de Artemis están en bordes de cráteres", "No está en nuestras fuentes. Confirmarlo en la página de la NASA antes de usarlo."),
]

FUENTES = [
    (f"{de(fuente)}, {de(valle)} y {de(tajo)} con borde levantado", "model/VALIDATION.md, «Borde levantado» (medida: model/borde.py)"),
    ("78 % y 77.6 % (cráteres de 2 km o más)", "model/VALIDATION.md, sección B"),
    ("9 de 11 cráteres mexicanos; 40 % del catálogo de 62", "informe/validacion_detector.pdf · model/VALIDATION.md"),
    ("3 de 3 controles negativos y 9 de 21 análogos conocidos (prefiltro ambiental)", "model/VALIDATION.md, sección A"),
    ("29 de 33 etiquetas contrastadas", "ciencia_datos/etiquetado_ia/validacion.txt"),
    ("Apolo 14 en El Pinacate; Apolo 15 en Colton", "NASA SP-2015-626 (Phinney 2015); USGS OFR 2005-1190"),
]

qa = "\n".join(f'<div class="qa"><h3>{e(p)}</h3><p>{e(resp)}</p><p class="resp">Respaldo: {e(src)}</p></div>' for p, resp, src in PREGUNTAS)
no = "\n".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in NO_DECIR)
fu = "\n".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in FUENTES)

HTML = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cómo exponer el modelo de análogos</title>
<style>{CSS}</style></head><body>

<h1>Cómo exponer el modelo de análogos</h1>
<div class="sub">MARSCEPTION · NASA Space Apps 2026 · Guía para el bloque «Evidencia y límites» del pitch y para las preguntas · 14 de noviembre de 2026</div>

<div class="caja">
<p><b>La idea en una frase.</b> Encontramos lugares de la Tierra con forma de cráter, comprobamos cuáles son cráteres de verdad,
y decimos qué tan lunares o marcianos son y dónde deja de servir la comparación.</p>
</div>

<h2>Qué decir en 30 segundos</h2>
<div class="guion">
<b>Qué es · 8 s</b><p>«Nuestro modelo es explicable, no una red neuronal: compara la forma de cráteres de la Tierra con la de cráteres reales de la Luna y de Marte, medidos con el mismo código.»</p>
<b>La prueba · 9 s</b><p>«Lo corrimos en México y en tres desiertos más. Sin decirle dónde buscar, encontró El Pinacate y Colton, donde entrenaron astronautas del Apolo.»</p>
<b>El filtro · 8 s</b><p>«Para no confundir un cráter con un valle o una mina medimos el borde levantado: lo tienen {de(fuente)} cráteres conocidos y casi ningún otro hoyo.»</p>
<b>El límite · 5 s</b><p>«Y decimos dónde falla: la Tierra no reproduce la gravedad, el vacío ni la radiación.»</p>
</div>
<p>Si sobran cinco segundos: «Separa la Luna de Marte con 78 % de exactitud». Si falta tiempo, se quita «El filtro».
Es una propuesta: el guion oficial es <code>docs/GUION_PITCH.md</code>; si cambias algo, avísale a quien lo lleva.</p>

<h2>Qué mostrar mientras hablas: el mapa con los sitios o esta figura, no los dos</h2>

<div class="nums">
<div><div class="num">{de(fuente)}</div><span>cráteres conocidos tienen borde levantado</span></div>
<div><div class="num">{de(valle)}</div><span>valles, presas y dunas lo tienen</span></div>
<div><div class="num">{de(tajo)}</div><span>tajos mineros lo tienen</span></div>
<div><div class="num">78 %</div><span>de exactitud al separar cráteres de la Luna y de Marte</span></div>
</div>

<figure>
{figura()}
<figcaption>Perfil mediano de cada grupo cerca del borde, con el relieve de Copernicus a 80 m; el cero es el terreno lejano. Solo los
cráteres conocidos suben por encima. Grupos: cráteres con fuente externa; valles, presas y dunas según la IA (confianza de 0.7 o más);
tajos con cantera de OpenStreetMap a 2 km o menos. La zona del borde va de {a_v:.2f} a {b_v:.2f} radios.</figcaption>
</figure>

<div class="caja alerta">
<p><b>Lo que hay que decir con cuidado.</b> El borde responde «¿es un cráter?», no «¿se parece a la Luna?». Son {int(fuente.sum())} casos conocidos y uno solo
es de impacto: alcanza como evidencia, no como prueba. Y el puntaje de similitud del juego no cambió: el borde va junto a cada sitio, no dentro del número.</p>
</div>

<h2>Preguntas que pueden hacer</h2>
{qa}

<h2>Lo que no hay que decir</h2>
<table><thead><tr><th style="width:42%">No decir</th><th>Por qué, o qué decir en su lugar</th></tr></thead><tbody>
{no}
</tbody></table>

<h2>De dónde sale cada cifra</h2>
<table><thead><tr><th style="width:48%">Cifra</th><th>Dónde está</th></tr></thead><tbody>
{fu}
</tbody></table>

<div class="caja oro">
<p><b>Si te quedas en blanco.</b> Tres pasos: qué es (un modelo explicable que compara formas de cráteres), una prueba (encontró por su
cuenta sitios del Apolo y mide el borde) y un límite (la Tierra no tiene la gravedad, el vacío ni la radiación del destino). Decir
dónde falla el modelo es lo que más credibilidad da.</p>
</div>

</body></html>"""

salida = RAIZ / "informe" / "guia_exposicion_modelo.html"
salida.write_text(HTML, encoding="utf-8")
print(f"{salida.relative_to(RAIZ)} · borde: {de(fuente)} conocidos, {de(valle)} valles/presas/dunas, {de(tajo)} tajos · "
      f"referencia lunar {int(ref['luna'].sum())} de {len(ref['luna'])}")
