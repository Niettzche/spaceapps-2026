"""Genera informe/exposicion_modelo/guia_exposicion_modelo.html: guía para exponer el modelo de análogos (pitch y preguntas).

La carpeta informe/exposicion_modelo/ reúne lo necesario para exponer: esta guía y los cuadernos que respaldan sus cifras.

Las cifras del borde levantado y los puestos por forma se calculan aquí con model/borde.py y model/forma.py (mismas
definiciones que model/validate.py, parte_borde). Las demás cifras se copian de model/VALIDATION.md y el script se detiene si
ya no aparecen ahí, para que la guía no contradiga a la validación.

También escribe la figura «¿cráter o mina?» suelta, en español y en inglés, para diapositivas y para la página del proyecto:
informe/exposicion_modelo/figura_crater_o_mina_{es,en}.svg (y .png si está instalado rsvg-convert).

Uso:  uv run --with scikit-learn==1.5.2 --with pandas==2.2.3 --with numpy==2.1.3 python informe/generar_guia_exposicion.py
PDF:  google-chrome-stable --headless --no-pdf-header-footer \\
        --print-to-pdf=informe/exposicion_modelo/guia_exposicion_modelo.pdf informe/exposicion_modelo/guia_exposicion_modelo.html
"""
import datetime
import html
import shutil
import subprocess
import sys
import warnings
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from model import borde, forma  # noqa: E402

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
    "Entre los 25 primeros por borde hay 11 cráteres naturales según la IA y 1 mina",
    "entre los 25 primeros por forma, 3 cráteres naturales y 14 minas",
    "percentiles 10–90: 0.32–0.51",
]
faltan = [c for c in CITAS if c not in VAL]
if faltan:
    raise SystemExit("model/VALIDATION.md ya no dice esto; revisa la guía antes de regenerarla:\n- " + "\n- ".join(faltan))

# --- Borde levantado: grupos (mismas definiciones que model/validate.py, parte_borde) ---
t = borde.tabla_candidatos().dropna(subset=["h", "diam_km", "prof_m", "borde_m"]).reset_index(drop=True)
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


# --- Prueba fuera de muestra: cráteres de impacto que no intervinieron al fijar la regla (model/VALIDATION.md) ---
TI = borde.tabla_impactos()
NUEVOS = TI[~TI.visto]
N_IMP, K_IMP = len(NUEVOS), int((NUEVOS.h > borde.UMBRAL).sum())
FRASE_IMP = f"**De los {N_IMP} que la regla no había visto, {K_IMP} tienen borde levantado.**"
if FRASE_IMP not in VAL:
    raise SystemExit("La prueba fuera de muestra ya no coincide con model/VALIDATION.md: regenera la validación o revisa la guía.")
K_ESTRECHA = int(sum(borde.altura(pp, None, (0.9, 1.3)) > borde.UMBRAL for pp in NUEVOS.perfil))
K_UMBRAL = int((NUEVOS.h > 0.002).sum())
NO_PASAN = ", ".join(NUEVOS.nombre[~(NUEVOS.h > borde.UMBRAL)])

# --- Puestos con cada criterio (misma cuenta que model/validate.py) y los dos ejemplos de la figura «¿cráter o mina?» ---
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    pf = forma.puntuar(t.diam_km, t.prof_m, t.borde_m)
t["forma_mejor"] = np.maximum(pf.forma_polo_sur_lunar, pf.forma_jezero).values
t["p_forma"] = t.forma_mejor.rank(ascending=False, method="min").astype(int)
mina_ia = ((t.etiqueta_ia == "mina_o_cantera") & (t.conf_ia >= 0.7)).to_numpy()
# Regla para elegir los ejemplos (no a ojo): el mejor puesto por el puntaje de forma dentro de cada clase
EJ_C = t[fuente].sort_values("p_forma").iloc[0]          # cráter con fuente externa
EJ_M = t[mina_ia].sort_values("p_forma").iloc[0]         # tajo: etiqueta de IA «mina o cantera» con confianza de 0.7 o más
if not EJ_M.p_forma < EJ_C.p_forma:
    raise SystemExit("El tajo ya no queda por encima del cráter en el puntaje de forma: revisa el texto de la figura de los cortes.")
PC, PM = (np.array(sitios[i]["tierra"], float) * 1000 for i in (EJ_C.id, EJ_M.id))       # metros por km de diámetro
en_zona = (r >= borde.VENTANA[0]) & (r < borde.VENTANA[1])
K_BORDE = int(np.argmax(np.where(en_zona, PC, -np.inf)))                                  # anillo donde el cráter sube más
if not (PC[K_BORDE] > 0 and PM[en_zona].max() <= 0):
    raise SystemExit("Los ejemplos ya no muestran «cráter con borde, tajo sin borde»: revisa la figura de los cortes.")
REGION = {"es": {"México": "México"}, "en": {"México": "Mexico", "Arabia occidental": "western Arabia"}}
NOMBRE_C = EJ_C.id if str(EJ_C.nombre) == "nan" else str(EJ_C.nombre).split(" (")[0]


def lugar(f, lang):
    base = str(f.region).split(" (")[0]
    return REGION[lang].get(base, base)


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


# --- Figura «¿cráter o mina?»: el corte de los dos ejemplos, del centro hacia los dos lados ---
TXT = {
    "es": {"crater": "{n}, cráter en {l}", "mina": "Tajo minero en {l}", "mina_n": "{n}, tajo minero", "puesto": "puesto {p} por forma",
           "x": "Distancia al centro, en radios del cráter", "y": "Altura (m por km de diámetro)", "centro": "centro",
           "zona": "Zona del borde", "borde": "Borde: +{v:.0f} m por km", "sin": "Tajo: sin borde",
           "titulo": "El puntaje de forma pone al tajo por encima del cráter. El corte muestra cuál tiene borde.",
           "pie": "Copernicus DEM a 80 m · perfil radial promedio, reflejado · cero = terreno lejano · exageración vertical ×{x:.1f}",
           "aria": "Corte de un cráter y de un tajo minero: solo el cráter sube por encima del terreno lejano en la zona del borde"},
    "en": {"crater": "{n}, crater in {l}", "mina": "Open-pit mine in {l}", "mina_n": "{n}, open-pit mine", "puesto": "shape-score rank {p}",
           "x": "Distance from the centre, in crater radii", "y": "Height (m per km of diameter)", "centro": "centre",
           "zona": "Rim zone", "borde": "Rim: +{v:.0f} m per km", "sin": "Mine: no rim",
           "titulo": "The shape score ranks the mine above the crater. The cross-section shows which one has a rim.",
           "pie": "Copernicus DEM at 80 m · mean radial profile, mirrored · zero = distant terrain · vertical exaggeration ×{x:.1f}",
           "aria": "Cross-section of a crater and an open-pit mine: only the crater rises above the distant terrain in the rim zone"},
}
AZUL, VERDE = "#2a78d6", "#1baf7a"                       # mismos colores que en la otra figura: cráteres en azul, tajos en verde


def rotulo(f, clase, lang):
    T = TXT[lang]
    nombre = None if str(f.nombre) == "nan" else str(f.nombre).split(" (")[0]
    if clase == "crater":
        base = T["crater"].format(n=nombre or f.id, l=lugar(f, lang))
    else:
        base = T["mina_n"].format(n=nombre) if nombre else T["mina"].format(l=lugar(f, lang))
    return f"{base} · {T['puesto'].format(p=int(f.p_forma))}"


def exageracion(suelta=False):
    return figura_cortes("es", suelta, solo_exageracion=True)


def figura_cortes(lang="es", suelta=False, solo_exageracion=False):
    T = TXT[lang]
    w, ml, mr, alto = 720, 62, 14, 138 if not suelta else 176
    mt, mb = (60, 58) if suelta else (34, 40)
    h = mt + alto + mb
    x0, x1 = -2.0, 2.0
    y0, y1 = 50.0 * np.floor(min(PC.min(), PM.min()) / 50), 50.0
    fx = lambda x: ml + (x - x0) / (x1 - x0) * (w - ml - mr)
    fy = lambda y: mt + (y1 - y) / (y1 - y0) * alto
    exag = (alto / (y1 - y0)) / ((w - ml - mr) / ((x1 - x0) * 500))        # un radio = 500 m por km de diámetro
    if solo_exageracion:
        return exag
    raiz = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" '
            f'font-family="Noto Sans, Inter, Helvetica Neue, Arial, sans-serif" aria-label="{e(T["aria"])}">' if suelta else
            f'<svg viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="{e(T["aria"])}">')
    o = [raiz]
    if suelta:
        o.append(f'<rect width="{w}" height="{h}" fill="#ffffff"/>')
        o.append(f'<text x="{ml}" y="20" font-size="13" font-weight="700" fill="#1d2024">{e(T["titulo"])}</text>')
        o.append(f'<text x="{ml}" y="{h - 8}" font-size="9" fill="#52514e">{e(T["pie"].format(x=exag))}</text>')
    for lo, hi in ((a_v, b_v), (-b_v, -a_v)):                               # la zona del borde, a los dos lados
        o.append(f'<rect x="{fx(lo):.1f}" y="{mt}" width="{fx(hi) - fx(lo):.1f}" height="{alto}" fill="#f1efe9"/>')
        o.append(f'<text x="{(fx(lo) + fx(hi)) / 2:.1f}" y="{mt + alto - 7}" font-size="10" fill="#52514e" text-anchor="middle">{e(T["zona"])}</text>')
    for y in range(int(y0), int(y1) + 1, 50):
        o.append(f'<line x1="{ml}" x2="{w - mr}" y1="{fy(y):.1f}" y2="{fy(y):.1f}" stroke="{"#8a8780" if y == 0 else "#e4e2dc"}" stroke-width="1"/>')
        o.append(f'<text x="{ml - 8}" y="{fy(y) + 3.5:.1f}" font-size="10" fill="#52514e" text-anchor="end">{y:+d}</text>'.replace("+0", "0"))
    for x, rot in ((-2, "2"), (-1, "1"), (0, T["centro"]), (1, "1"), (2, "2")):
        o.append(f'<text x="{fx(x):.1f}" y="{mt + alto + 16}" font-size="10" fill="#52514e" text-anchor="middle">{e(rot)}</text>')
    o.append(f'<text x="{(ml + w - mr) / 2:.1f}" y="{mt + alto + 32}" font-size="10.5" fill="#52514e" text-anchor="middle">{e(T["x"])}</text>')
    o.append(f'<text transform="translate(14,{mt + alto / 2:.1f}) rotate(-90)" font-size="10.5" fill="#52514e" text-anchor="middle">{e(T["y"])}</text>')
    series = [(rotulo(EJ_C, "crater", lang), PC, AZUL), (rotulo(EJ_M, "mina", lang), PM, VERDE)]
    lx, ly = ml, mt - 18
    for nombre, _, color in series:                                          # leyenda: siempre presente con 2 series
        o.append(f'<line x1="{lx}" x2="{lx + 18}" y1="{ly}" y2="{ly}" stroke="{color}" stroke-width="2.5" stroke-linecap="round"/>')
        o.append(f'<text x="{lx + 24}" y="{ly + 3.5}" font-size="10.5" fill="#1d2024">{e(nombre)}</text>')
        lx += 24 + 5.9 * len(nombre) + 22
    xs = np.concatenate([-r[::-1], r])
    for _, perfil, color in series:
        pts = " ".join(f"{fx(x):.1f},{fy(y):.1f}" for x, y in zip(xs, np.concatenate([perfil[::-1], perfil])))
        o.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>')
    bx, by = fx(r[K_BORDE]), fy(PC[K_BORDE])                                 # dos etiquetas directas, en tinta
    o.append(f'<circle cx="{bx:.1f}" cy="{by:.1f}" r="4.5" fill="{AZUL}" stroke="#ffffff" stroke-width="2"/>')
    o.append(f'<text x="{bx:.1f}" y="{by - 11:.1f}" font-size="10.5" font-weight="600" fill="#1d2024" text-anchor="middle">'
             f'{e(T["borde"].format(v=PC[K_BORDE]))}</text>')
    k2 = int(np.argmin(np.abs(r - 1.42)))
    o.append(f'<text x="{fx(1.5):.1f}" y="{fy(PM[k2]) + 30:.1f}" font-size="10.5" font-weight="600" fill="#1d2024" text-anchor="middle">'
             f'{e(T["sin"])}</text>')
    o.append("</svg>")
    return "\n".join(o)


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
table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 2mm 0 3mm; }
tr { break-inside: avoid; }
th, td { text-align: left; padding: .9mm 2mm; border-bottom: .6px solid #ccc; vertical-align: top; }
th { border-bottom: 1.2px solid #1d2024; font-weight: 600; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
figure { margin: 2mm 0; break-inside: avoid; }
figcaption { font-size: 8.5pt; color: #444; margin-top: 1mm; max-width: 180mm; }
.nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin: 3mm 0 1mm; break-inside: avoid; }
.num { font-size: 19pt; font-weight: 700; line-height: 1; }
.nums span { display: block; font-size: 8.5pt; color: #555; margin-top: 1mm; }
.nums.dos { grid-template-columns: repeat(2, 1fr); margin-bottom: 0; }
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
    ("¿Qué tiene de distinto su proyecto?",
     "Que revisamos qué ponía arriba nuestro propio puntaje, y eran minas: entre los 25 primeros por forma hay 14 minas y 3 "
     "cráteres. Buscamos una medida que sí los distinguiera, el borde levantado, y con ella entre los 25 primeros hay 11 cráteres y "
     "1 mina. Publicamos las dos cuentas, no solo la que nos favorece.",
     "model/VALIDATION.md, «Borde levantado» · cuaderno 01, secciones 4 y 6"),
    ("¿Su puntaje pone un análogo real por encima de un hoyo cualquiera?",
     "Por sí solo, no, y lo publicamos: en nuestra prueba la forma a 200 m no separó un cráter de un valle mejor que el azar. Por eso el puntaje no "
     "decide qué es cada sitio. Lo deciden la etiqueta contrastada con fuentes y, como segunda evidencia, el borde levantado que "
     f"medimos: lo tienen {de(fuente)} cráteres conocidos. El puntaje solo dice qué tan lunar o marciano es un cráter ya identificado.",
     "model/VALIDATION.md, «¿La forma distingue un cráter…?» y «Borde levantado»"),
    ("¿No ajustaron la regla del borde a sus propios datos?",
     f"Al principio sí, y lo decimos: la zona del borde se eligió viendo {int(fuente.sum())} cráteres conocidos. Por eso después la probamos, sin "
     f"cambiar nada, en {N_IMP} cráteres de impacto de otros países que la regla nunca había visto: {K_IMP} tienen borde levantado. El que falla es "
     f"{NO_PASAN}, al que el detector le mide menos de la mitad de su diámetro. Con una zona más estrecha pasan {K_ESTRECHA}.",
     "model/VALIDATION.md, «Prueba fuera de muestra» · cuaderno 01, sección 9"),
    ("¿Qué significa el porcentaje de similitud?",
     "Es un filtro, no una calificación. Descarta lo que no puede ser análogo: selvas, cultivos y nieve quedan cerca de cero. Entre "
     "sitios áridos casi no ordena: sin contar la forma, 8 de cada 10 sitios de nuestro catálogo quedan entre 0.32 y 0.51. Qué es "
     "cada sitio lo dicen la etiqueta contrastada con fuentes y el borde medido.",
     "model/VALIDATION.md, sección A («Tasa del prefiltro en los sitios del detector»)"),
    ("¿Qué tiene que ver el borde con los análogos?",
     "El polo sur lunar y Jezero son terreno de cráteres. El borde levantado es evidencia de que un hoyo se formó por una explosión o "
     "un impacto, como los cráteres de la Luna y de Marte, y no por el agua o por una excavadora. Con eso nuestra lista queda hecha de "
     "cráteres. Ojo: dice «esto es un cráter», no «esto se parece a la Luna».",
     "model/NIVEL2.md, sección D"),
    ("¿Los cráteres de la Luna tienen ese borde en sus datos?",
     f"Pocos. Con la misma medida lo muestran {int(ref['luna'].sum())} de {len(ref['luna'])} cráteres lunares de referencia y "
     f"{int(ref['marte'].sum())} de {len(ref['marte'])} marcianos. No comprobamos por qué; una explicación posible es que son viejos y "
     "están encimados. Por eso usamos el borde solo para decidir qué es un cráter en la Tierra, no para decir que algo se parece a la Luna.",
     "model/VALIDATION.md, «Borde levantado» (tabla y límites) · cuaderno 01, sección 3"),
    ("¿Encontraron algo que nadie conociera?",
     "No lo presentamos como descubrimiento. El método encontró por su cuenta sitios ya usados: El Pinacate (Apolo 14) y Colton "
     "(Apolo 15), lo que respalda el método. De los cráteres de Arabia Saudita, Al Hutaymah ya está en una base global de sitios "
     "relevantes para Marte (2024) y Al Wahbah está publicado como análogo de Encélado. Jabal Bayda no lo encontramos como análogo "
     "lunar ni marciano en lo que revisamos: lo proponemos, sin llamarlo nuevo.",
     "model/NIVEL2.md, sección A (Ryan et al. 2024, Geosphere, doi:10.1130/GES02712.1)"),
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
    ("¿Por qué no usan un modelo de lenguaje para calcular la similitud?",
     "Porque un modelo de lenguaje no mide: opina, y no responde igual dos veces. Cada cifra nuestra se vuelve a calcular con el "
     "repositorio. La IA generativa la usamos en un solo lugar, declarado: proponer qué es cada candidato a partir de la imagen, y "
     "esas etiquetas las contrastamos con fuentes y con el borde medido.",
     "docs/USO_IA.md · cuadernos de informe/exposicion_modelo"),
]

NO_DECIR = [
    ("«La IA descubrió…», «red neuronal», «deep learning»", "No lo es. Es un modelo estadístico explicable."),
    ("«Escaneamos todo el planeta»", "Fueron México y tres de diez regiones áridas."),
    ("«Encontramos análogos nuevos»",
     "Al Hutaymah ya está en una base global de 2024 para Marte. Jabal Bayda es una propuesta: «no lo encontramos en lo que revisamos». "
     "Los «novedosos» del catálogo son minas."),
    ("«La regla acierta en 9 de 9 cráteres de impacto»",
     f"Son {K_IMP} de {N_IMP} nunca vistos; Meteor Crater ya era un candidato y no cuenta. Y son cráteres conocidos, no una muestra al azar."),
    ("«El puntaje mide qué tan buen análogo es»", "Describe la forma. No ordena análogos reales por encima de otros hoyos."),
    ("«El borde hace que se parezca a la Luna»",
     f"Con la misma medida solo tienen borde {int(ref['luna'].sum())} de {len(ref['luna'])} cráteres lunares de referencia."),
    ("«Dos evidencias independientes»", "La etiqueta de IA también vio el relieve. Decir: «la etiqueta sobre la imagen y el borde medido»."),
    ("«El detector de cráteres»", "Es un detector de depresiones con forma de cráter."),
    ("«Los 25 lugares más parecidos a la Luna son minas»",
     "La cuenta es por puntaje de forma (el mejor entre Luna y Marte) y las etiquetas son de la IA; los otros 8 no son ni "
     "mina ni cráter según la IA. Decir: «entre los 25 primeros por forma hay 14 minas y 3 cráteres»."),
    ("Que las regiones de Artemis están en bordes de cráteres", "No está en nuestras fuentes. Confirmarlo en la página de la NASA antes de usarlo."),
]

FUENTES = [
    (f"{de(fuente)}, {de(valle)} y {de(tajo)} con borde levantado", "model/VALIDATION.md, «Borde levantado» (medida: model/borde.py)"),
    ("14 minas y 3 cráteres entre los 25 primeros por forma; 11 cráteres y 1 mina por borde",
     "model/VALIDATION.md, «Borde levantado» · cuaderno 01, sección 4"),
    (f"Puestos {int(EJ_C.p_forma)} y {int(EJ_M.p_forma)} por forma: {NOMBRE_C} y el tajo {EJ_M.id} (etiqueta de IA {EJ_M.conf_ia:.2f}; cantera de "
     f"OpenStreetMap a {EJ_M.km_mina:.1f} km)", "cuaderno 01, sección 6"),
    ("8 de cada 10 sitios áridos entre 0.32 y 0.51 (sin la forma)", "model/VALIDATION.md, sección A (percentiles 10 y 90)"),
    (f"{K_IMP} de {N_IMP} cráteres de impacto nunca vistos por la regla (zona estrecha: {K_ESTRECHA}; umbral 0.002: {K_UMBRAL})",
     "model/VALIDATION.md, «Prueba fuera de muestra» · cuaderno 01, sección 9"),
    ("78 % y 77.6 % (cráteres de 2 km o más)", "model/VALIDATION.md, sección B"),
    ("9 de 11 cráteres mexicanos; 40 % del catálogo de 62", "informe/validacion_detector.pdf · model/VALIDATION.md"),
    ("3 de 3 controles negativos y 9 de 21 análogos conocidos (prefiltro ambiental)", "model/VALIDATION.md, sección A"),
    ("29 de 33 etiquetas contrastadas", "ciencia_datos/etiquetado_ia/validacion.txt"),
    ("Apolo 14 en El Pinacate; Apolo 15 en Colton", "NASA SP-2015-626 (Phinney 2015); USGS OFR 2005-1190"),
]

MESES = "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()
HOY = datetime.date.today()
FECHA = f"{HOY.day} de {MESES[HOY.month - 1]} de {HOY.year}"

qa = "\n".join(f'<div class="qa"><h3>{e(p)}</h3><p>{e(resp)}</p><p class="resp">Respaldo: {e(src)}</p></div>' for p, resp, src in PREGUNTAS)
no = "\n".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in NO_DECIR)
fu = "\n".join(f"<tr><td>{e(a)}</td><td>{e(b)}</td></tr>" for a, b in FUENTES)

HTML = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cómo exponer el modelo de análogos</title>
<style>{CSS}</style></head><body>

<h1>Cómo exponer el modelo de análogos</h1>
<div class="sub">MARSCEPTION · NASA Space Apps 2026 · Guía para el pitch y las preguntas de los jueces · {FECHA}</div>

<div class="caja">
<p><b>La idea en una frase.</b> Encontramos lugares de la Tierra con forma de cráter, comprobamos cuáles son cráteres de verdad,
y decimos qué tan lunares o marcianos son y dónde deja de servir la comparación.</p>
</div>

<h2>Qué decir en 30 segundos</h2>
<div class="guion">
<b>Qué es</b><p>«Nuestro modelo es explicable, no una red neuronal: compara la forma de cráteres de la Tierra con la de cráteres reales de la Luna y de Marte, medidos con el mismo código.»</p>
<b>La prueba</b><p>«Sin decirle dónde buscar, encontró El Pinacate y Colton, donde entrenaron astronautas del Apolo.»</p>
<b>El hallazgo</b><p>«Ordenados solo por forma, entre los 25 primeros hay 14 minas y 3 cráteres. Ordenados por el borde levantado, 11 cráteres y 1 mina.»</p>
<b>El límite</b><p>«Y decimos dónde falla: la Tierra no reproduce la gravedad, el vacío ni la radiación.»</p>
</div>
<p>Son 87 palabras, sin cronometrar: dilo en voz alta con reloj. Si sobra tiempo: «Fijamos la regla y la probamos en {N_IMP} cráteres de
impacto de otros países que nunca había visto: {K_IMP} la pasan». El guion oficial es <code>docs/GUION_PITCH.md</code>; si cambias algo, avisa.</p>

<h2>Lo que nos distingue: revisamos nuestro propio puntaje</h2>
<p>Casi cualquier equipo puede enseñar un mapa con porcentajes. Nosotros vimos qué ponía arriba el nuestro y lo arreglamos con
una medida. Mientras hablas, muestra el mapa con los sitios o esta figura, no los dos.</p>

<div class="nums dos">
<div><div class="num">14 minas y 3 cráteres</div><span>entre los 25 primeros de {len(t)} candidatos, ordenados por el puntaje de forma</span></div>
<div><div class="num">11 cráteres y 1 mina</div><span>entre los 25 primeros, ordenados por el borde levantado</span></div>
</div>

<figure>
{figura_cortes()}
<figcaption>Corte de {e(NOMBRE_C)} y de un tajo minero de {e(lugar(EJ_M, "es"))} (Copernicus a 80 m; perfil radial promedio, dibujado a
los dos lados del centro; cero = terreno lejano; exageración vertical ×{exageracion():.1f}). Se eligieron con una regla, no a ojo: el
cráter con fuente externa y el tajo mejor puestos por forma. En la cuenta de arriba, qué es mina o cráter lo dice la etiqueta de IA.</figcaption>
</figure>

<h2>Y no es un solo ejemplo: el borde en todos los grupos</h2>

<div class="nums">
<div><div class="num">{de(fuente)}</div><span>cráteres conocidos tienen borde levantado</span></div>
<div><div class="num">{de(valle)}</div><span>valles, presas y dunas lo tienen</span></div>
<div><div class="num">{de(tajo)}</div><span>tajos mineros lo tienen</span></div>
<div><div class="num">{K_IMP} de {N_IMP}</div><span>cráteres de impacto de otros países, que la regla nunca había visto</span></div>
</div>

<figure>
{figura()}
<figcaption>Perfil mediano de cada grupo cerca del borde, con el relieve de Copernicus a 80 m; el cero es el terreno lejano. Solo los
cráteres conocidos suben por encima. Grupos: cráteres con fuente externa; valles, presas y dunas según la IA (confianza de 0.7 o más);
tajos con cantera de OpenStreetMap a 2 km o menos. La zona del borde va de {a_v:.2f} a {b_v:.2f} radios.</figcaption>
</figure>

<div class="caja alerta">
<p><b>Lo que hay que decir con cuidado.</b> El borde responde «¿es un cráter?», no «¿se parece a la Luna?». La regla se fijó con
{int(fuente.sum())} casos conocidos y se probó después en {N_IMP} cráteres de impacto que no había visto: siguen siendo pocos casos, y esos {N_IMP} son
cráteres conocidos, no una muestra al azar. Con la misma medida solo muestran borde {int(ref['luna'].sum())} de {len(ref['luna'])}
cráteres lunares de referencia. Y el puntaje de similitud del juego no cambió: el borde va junto a cada sitio, no dentro del número.</p>
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
<p><b>Si te quedas en blanco.</b> Tres pasos: qué es (un modelo explicable que compara formas de cráteres), una prueba (encontró
sitios del Apolo y, midiendo el borde, separa cráteres de minas) y un límite (la Tierra no tiene la gravedad, el vacío ni la
radiación del destino). Decir dónde falla el modelo es lo que más credibilidad da.</p>
</div>

</body></html>"""

salida = RAIZ / "informe" / "exposicion_modelo" / "guia_exposicion_modelo.html"
salida.write_text(HTML, encoding="utf-8")
for lang in ("es", "en"):                               # la figura suelta, para diapositivas y para la página del proyecto
    svg = salida.with_name(f"figura_crater_o_mina_{lang}.svg")
    svg.write_text(figura_cortes(lang, suelta=True) + "\n", encoding="utf-8")
    if shutil.which("rsvg-convert"):
        subprocess.run(["rsvg-convert", "-z", "3", str(svg), "-o", str(svg.with_suffix(".png"))], check=True)
    else:
        print(f"sin rsvg-convert: {svg.name} queda solo en SVG")
print(f"{salida.relative_to(RAIZ)} · borde: {de(fuente)} conocidos, {de(valle)} valles/presas/dunas, {de(tajo)} tajos · "
      f"referencia lunar {int(ref['luna'].sum())} de {len(ref['luna'])} · cortes: {EJ_C.id} (puesto {int(EJ_C.p_forma)} por forma) "
      f"y {EJ_M.id} (puesto {int(EJ_M.p_forma)})")
