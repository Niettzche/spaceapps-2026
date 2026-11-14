"""Genera informe/validacion.html (y luego PDF) a partir de informe/datos/informe.json y sus imágenes.

Uso:  uv run python informe/generar.py
"""
import json, html
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

AQUI = Path(__file__).parent
D = json.load(open(AQUI / "datos/informe.json"))
REF = json.load(open(AQUI.parent / "web/public/data/referencia.json"))
IMG = "datos/jpg"
e = html.escape

# Lectura preliminar (a ojo, sobre relieve + satélite). Solo para la muestra al azar; el equipo debe confirmarla.
LECTURA = {
    "MX0008": ("si", "Cráter El Elegante, inconfundible"),
    "MX0019": ("si", "Tajo minero visible"), "MX0020": ("dudoso", "Instalaciones mineras; hoyo pequeño"),
    "MX0025": ("si", "Tajo minero visible"), "MX0207": ("si", "Tajo minero visible"), "MX0085": ("si", "Tajo minero visible"),
    "MX0584": ("no", "Selva; no se ve mina ni cráter"), "MX0544": ("no", "Vegetación; no se ve mina ni cráter"),
    "MX0518": ("no", "Selva; no se ve mina ni cráter"),
}
DEF_NO = ("no", "Terreno montañoso o selva; no se ve un cráter")

TIPO = {"con_borde": "Con borde (volcánico probable)", "sin_borde": "Sin borde (dolina o cuenca probable)", "mina": "Mina a cielo abierto"}


def grafica_dd():
    fig, ax = plt.subplots(figsize=(7.2, 4.2), dpi=200)
    luna = REF["luna_polo"]; mx = REF["mexico"]
    ax.scatter([p[0] for p in luna], [p[1] for p in luna], s=4, c="#9a9da3", alpha=.5, lw=0, label="Luna, polo sur")
    for s, pts in REF["marte"].items():
        ax.scatter([p[0] for p in pts], [p[1] for p in pts], s=6, c="#a0432a", alpha=.6, lw=0, label="Marte" if s.endswith("Jezero") else None)
    ax.scatter([p[0] for p in mx], [p[1] for p in mx], s=7, c="#1f6f78", alpha=.75, lw=0, label="México (todas las detecciones)")
    ar = D.get("aridas", [])
    ax.scatter([a["diam_km"] for a in ar], [a["prof_m"] for a in ar], s=26, facecolors="none", edgecolors="#c7921a", lw=1.2, label="México, zonas áridas")
    ax.set_xscale("log"); ax.set_yscale("log"); ax.set_xlabel("Diámetro (km)"); ax.set_ylabel("Profundidad (m)")
    ax.set_xticks([0.6, 1, 2, 5, 10]); ax.set_xticklabels(["0.6", "1", "2", "5", "10"])
    ax.set_yticks([20, 50, 100, 200, 300]); ax.set_yticklabels(["20", "50", "100", "200", "300"])
    ax.grid(alpha=.25, lw=.5); ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, fontsize=8, loc="upper left")
    fig.tight_layout(); fig.savefig(AQUI / "datos/dd.png"); plt.close(fig)


def grafica_ndvi():
    b = D["ndvi_bandas"]; etiquetas = ["0–0.20", "0.20–0.35", "0.35–0.50", "0.50–0.70", "0.70–1"]
    vals = list(b.values())
    fig, ax = plt.subplots(figsize=(7.2, 2.4), dpi=200)
    cols = ["#c7921a", "#c7921a", "#9a9da3", "#5b7d5a", "#2f5b35"]
    ax.barh(etiquetas[::-1], vals[::-1], color=cols[::-1])
    for i, v in enumerate(vals[::-1]):
        ax.text(v + 6, i, str(v), va="center", fontsize=9)
    ax.set_xlabel("Detecciones (de 668)"); ax.set_title("Vegetación (NDVI máximo de temporada) donde cae cada detección", fontsize=9, loc="left")
    ax.spines[["top", "right"]].set_visible(False); ax.set_xlim(0, max(vals) * 1.12)
    fig.tight_layout(); fig.savefig(AQUI / "datos/ndvi.png"); plt.close(fig)


def par(it, pie, extra=""):
    return f"""<figure class="par">
  <div class="imgs"><img src="{IMG}/{it['id']}_rel.jpg"><img src="{IMG}/{it['id']}_sat.jpg"></div>
  <figcaption>{pie}{extra}</figcaption></figure>"""


def medidas(it):
    if it.get("diam_km") is None:
        return "<span class='m'>sin detección a menos de 2.5 km</span>"
    s = f"<span class='m'>{it['diam_km']} km · {it['prof_m']} m · circ {it['circ']} · borde {it['borde_m']} m"
    if it.get("ndvi") is not None:
        s += f" · NDVI {it['ndvi']}"
    return s + "</span>"


def casilla():
    return "<span class='check'>☐ cráter/mina &nbsp; ☐ no &nbsp; ☐ dudoso</span>"


def construir():
    grafica_dd(); grafica_ndvi()
    items = D["items"]; R = D["resumen"]
    conocidos = [i for i in items if i["grupo"] == "conocido"]
    muestra = {g: [i for i in items if i["grupo"] == g] for g in ("con_borde", "sin_borde", "mina")}
    aridas = D.get("aridas", [])

    # Conteo de la lectura preliminar
    conteo = {}
    for g, lst in muestra.items():
        si = sum(1 for i in lst if LECTURA.get(i["id"], DEF_NO)[0] == "si")
        du = sum(1 for i in lst if LECTURA.get(i["id"], DEF_NO)[0] == "dudoso")
        conteo[g] = (si, du, len(lst))

    filas_k = "".join(
        f"<tr><td>{e(i['nombre'])}</td><td>{'Sí' if i['detectado'] else 'No'}</td><td>{'Sí' if i['pasa_filtro'] else ('—' if not i['detectado'] else 'No')}</td>"
        f"<td>{i['diam_km'] or '—'}</td><td>{i['prof_m'] or '—'}</td><td>{i['circ'] or '—'}</td><td>{i['borde_m'] if i['borde_m'] is not None else '—'}</td></tr>"
        for i in conocidos)

    figs_k = "".join(par(i, f"<b>{e(i['nombre'])}</b><br>", medidas(i)) for i in conocidos)

    def bloque_muestra(g):
        out = []
        for i in muestra[g]:
            v, nota = LECTURA.get(i["id"], DEF_NO)
            etiqueta = {"si": "Sí parece", "no": "No parece", "dudoso": "Dudoso"}[v]
            nombre = f" · {e(i['nombre'])}" if i.get("nombre") else ""
            out.append(par(i, f"<b>{i['id']}</b>{nombre} <span class='coord'>{i['lat']}, {i['lon']}</span><br>", medidas(i) +
                           f"<br><span class='lect {v}'>Lectura preliminar: {etiqueta}</span> <span class='nota'>{e(nota)}</span><br>{casilla()}"))
        return "".join(out)

    figs_a = "".join(par(i, f"<b>{i['cid']}</b>{(' · ' + e(i['nombre'])) if i.get('nombre') else ''} <span class='coord'>{i['lat']}, {i['lon']}</span><br>",
                         medidas(i) + f" · {TIPO[i['tipo']].split(' (')[0].lower()}<br>{casilla()}") for i in aridas)

    figs_l = "".join(f"<figure class='luna'><img src='{IMG}/{l['id']}_rel.jpg'><figcaption>{l['lat']}°, {l['lon']}° · {l['diam_km']} km · {l['prof_m']} m</figcaption></figure>"
                     for l in D["luna"])

    n_arid = len(aridas); b = D["ndvi_bandas"]; n_veg = list(b.values())[-1]
    tipos_a = {}
    for a in aridas:
        tipos_a[a["tipo"]] = tipos_a.get(a["tipo"], 0) + 1

    cb, sb, mn = conteo["con_borde"], conteo["sin_borde"], conteo["mina"]

    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Validación del detector de cráteres</title>
<style>
@page {{ size: Letter; margin: 16mm 15mm 16mm 15mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: "IBM Plex Sans", "Inter", "Helvetica Neue", Arial, sans-serif; color: #1d2024; font-size: 10pt; line-height: 1.45; margin: 0; }}
h1 {{ font-size: 24pt; line-height: 1.1; margin: 0 0 4mm; letter-spacing: -.01em; }}
h2 {{ font-size: 14pt; margin: 7mm 0 2.5mm; padding-top: 2mm; border-top: 1.5px solid #1d2024; }}
h3 {{ font-size: 11pt; margin: 5mm 0 2mm; }}
p, li {{ max-width: 175mm; }}
.sub {{ color: #555; font-size: 10.5pt; margin-bottom: 6mm; }}
.caja {{ background: #f1efe9; border-left: 4px solid #1f6f78; padding: 3mm 4mm; margin: 4mm 0; }}
.caja.alerta {{ border-left-color: #b4432a; }}
.caja p {{ margin: 1.5mm 0; }}
table {{ border-collapse: collapse; width: 100%; font-size: 9pt; margin: 2mm 0 3mm; }}
th, td {{ text-align: left; padding: 1.3mm 2mm; border-bottom: .6px solid #ccc; }}
th {{ border-bottom: 1.2px solid #1d2024; font-weight: 600; }}
.grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 5mm; }}
.par {{ margin: 0; break-inside: avoid; }}
.par .imgs {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1mm; }}
.par img {{ width: 100%; display: block; }}
figcaption {{ font-size: 8pt; line-height: 1.35; margin-top: 1mm; }}
.m {{ color: #444; font-variant-numeric: tabular-nums; }}
.coord {{ color: #777; font-variant-numeric: tabular-nums; }}
.lect {{ font-weight: 600; }} .lect.si {{ color: #1f6f78; }} .lect.no {{ color: #b4432a; }} .lect.dudoso {{ color: #9a6b00; }}
.nota {{ color: #555; }}
.check {{ color: #333; letter-spacing: .02em; }}
.lunas {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }}
.luna {{ margin: 0; break-inside: avoid; }} .luna img {{ width: 100%; display: block; }}
.leyenda {{ display: grid; grid-template-columns: 52mm 1fr; gap: 4mm; align-items: center; margin: 3mm 0; }}
.leyenda img {{ width: 100%; }}
img.ancha {{ width: 100%; max-width: 175mm; display: block; margin: 2mm 0; }}
.salto {{ break-before: page; }}
.num {{ font-size: 20pt; font-weight: 700; line-height: 1; }}
.nums {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin: 4mm 0; }}
.nums div span {{ display: block; font-size: 8.5pt; color: #555; margin-top: 1mm; }}
</style></head><body>

<h1>¿Funciona nuestro detector de cráteres?</h1>
<div class="sub">Space Apps 2026 · Análogos terrestres de la Luna y Marte · Informe de validación, 14 de noviembre de 2026</div>

<div class="caja alerta">
<p><b>En corto.</b> El detector <b>sí encuentra los cráteres que ya conocemos</b>: 9 de 11 cráteres mexicanos documentados, sin decirle dónde estaban. Pero en una muestra al azar de sus detecciones nuevas, <b>casi ninguna parece un cráter real</b>.</p>
<p>La razón principal está en los datos: el <b>{round(n_veg / R['n_mexico'] * 100)} % de las {R['n_mexico']} detecciones cae en vegetación densa</b>. El modelo de elevación que usamos mide la superficie, con todo y copas de árboles, y en sierras con selva eso produce hoyos que no existen. Solo {n_arid} detecciones caen en zonas áridas, y ahí están todos los cráteres y minas reales.</p>
<p><b>Qué hacer:</b> quedarnos con las detecciones en zonas áridas (o validarlas a mano), cambiar las cifras de la página y presentar el resultado con honestidad. El detalle está en la sección 5.</p>
</div>

<div class="nums">
<div><div class="num">9 de 11</div><span>cráteres conocidos encontrados</span></div>
<div><div class="num">{cb[0]} de {cb[2]}</div><span>“con borde” al azar que parecen cráter (lectura preliminar)</span></div>
<div><div class="num">{sb[0]} de {sb[2]}</div><span>“sin borde” al azar que parecen cráter (lectura preliminar)</span></div>
<div><div class="num">{mn[0]} de {mn[2]}</div><span>“minas” al azar que se ven como mina (lectura preliminar)</span></div>
</div>

<h2>1. Qué hace el modelo</h2>
<p>No es aprendizaje automático: es un <b>detector con reglas fijas</b>, el mismo para la Tierra, la Luna y Marte. No se “entrena”, así que no puede sobreajustarse, pero sus reglas pueden estar mal calibradas, y eso es lo que mide este informe.</p>
<ol>
<li><b>Relieve a la misma escala.</b> México (Copernicus DEM GLO-30, ESA), el polo sur lunar (LOLA, NASA) y Marte (HRSC + MOLA) se llevan a 200 m por píxel.</li>
<li><b>Buscar hoyos cerrados.</b> En ventanas de 12 km se “rellena” el terreno como si lloviera; lo que quedaría bajo el agua es una depresión cerrada.</li>
<li><b>Quedarse con los que tienen forma de cráter:</b> de 0.6 a 10 km de diámetro, al menos 20 m de profundidad y redondez de 0.6 o más.</li>
<li><b>Clasificar:</b> “mina” si hay una cantera de OpenStreetMap a menos de 2 km; “con borde” si el borde se levanta 10 m o más sobre el entorno; si no, “sin borde”.</li>
<li><b>Comparar con la Luna:</b> gemelo lunar más parecido en diámetro y profundidad, y percentil de su proporción profundidad/diámetro.</li>
</ol>
<p>Importante: la búsqueda de cráteres (paso 2) se corrió en <b>todo el país</b>, no solo en las zonas áridas. El filtro de vegetación (NDVI) se calculó, pero no se aplicó para descartar detecciones.</p>

<h3>Cómo leer las imágenes</h3>
<p>Cada sitio va en par. <b>Izquierda:</b> relieve sombreado con la misma luz para todos (lo que “ve” el detector, a 200 m por píxel). <b>Derecha:</b> imagen de satélite Sentinel-2 en color real (mediana 2023–2025, sin nubes). Las dos cubren <b>12.8 km</b> de lado y el círculo marca el <b>tamaño y lugar de la detección</b>. Debajo: diámetro · profundidad · redondez (1 = círculo) · altura del borde · NDVI (vegetación; más de 0.5 es vegetación densa).</p>

<h2>2. Prueba 1: ¿encuentra los cráteres que ya conocemos?</h2>
<p>Le dimos 11 cráteres mexicanos documentados. Una detección cuenta si cae a menos de 2.5 km del lugar del catálogo. Las coordenadas de referencia las pusimos nosotros y <b>hay que verificarlas contra fuentes publicadas</b>.</p>
<table><tr><th>Cráter</th><th>Detectado</th><th>Pasa filtro</th><th>Diám. (km)</th><th>Prof. (m)</th><th>Redondez</th><th>Borde (m)</th></tr>{filas_k}</table>
<div class="caja"><p><b>Lectura:</b> 9 de 11 detectados; 6 pasan el filtro de forma. Los dos que faltan (Alchichica y La Alberca) tienen lago: el modelo de elevación ve el espejo de agua, no el fondo. Tres se detectan pero quedan fuera por poco redondos o por un borde irregular. <b>Esta prueba solo mide si encuentra lo que existe; no dice cuántas detecciones son falsas.</b></p></div>
<div class="grid">{figs_k}</div>

<h2 class="salto">3. Prueba 2: ¿qué tan seguido acierta? Muestra al azar</h2>
<p>Tomamos al azar (semilla fija) {cb[2]} detecciones “con borde”, {sb[2]} “sin borde” y {mn[2]} “minas”. Debajo de cada par va una <b>lectura preliminar mía, hecha a ojo</b>, y casillas para que el equipo marque su propia lectura. <b>La lectura preliminar no sustituye la revisión del equipo.</b></p>
<table><tr><th>Tipo</th><th>Muestra</th><th>Sí parece</th><th>Dudoso</th><th>No parece</th></tr>
<tr><td>Con borde</td><td>{cb[2]}</td><td>{cb[0]}</td><td>{cb[1]}</td><td>{cb[2]-cb[0]-cb[1]}</td></tr>
<tr><td>Sin borde</td><td>{sb[2]}</td><td>{sb[0]}</td><td>{sb[1]}</td><td>{sb[2]-sb[0]-sb[1]}</td></tr>
<tr><td>Minas</td><td>{mn[2]}</td><td>{mn[0]}</td><td>{mn[1]}</td><td>{mn[2]-mn[0]-mn[1]}</td></tr></table>
<div class="caja alerta"><p><b>Patrón:</b> las detecciones que fallan son pequeñas (cerca del mínimo de 0.6 km), poco profundas (20 a 60 m) y están en sierras con selva o bosque (NDVI de 0.7 a 0.9). Las que aciertan son grandes, profundas y en desierto. Las “minas” que fallan son canteras pequeñas de OpenStreetMap en selva, cerca de un hoyo falso.</p></div>

<h3>Con borde</h3><div class="grid">{bloque_muestra("con_borde")}</div>
<h3 class="salto">Sin borde</h3><div class="grid">{bloque_muestra("sin_borde")}</div>
<h3 class="salto">Minas</h3><div class="grid">{bloque_muestra("mina")}</div>

<h2 class="salto">4. Dónde caen las detecciones</h2>
<img class="ancha" src="datos/ndvi.png">
<p>{n_veg} de {R['n_mexico']} detecciones están en vegetación densa (NDVI mayor a 0.7), sobre todo en Chiapas, Oaxaca, la Huasteca y la Sierra Madre. Por franja de latitud: {', '.join(f"{k.replace('(', '').replace(']', '').replace(', ', '–')}°N: {v}" for k, v in R['lat_bandas'].items())}.</p>
<p><b>Por qué pasa:</b> Copernicus GLO-30 es un modelo de <i>superficie</i> hecho con radar. Sobre bosque mide la altura de las copas, y los claros, cañadas y huecos del dosel parecen hoyos cerrados. Además, en sierra muy quebrada, promediar a 200 m crea “cuencas” que no existen. En desierto, donde no hay árboles, la superficie es el suelo y el detector funciona.</p>
<img class="ancha" src="datos/dd.png">
<p>Profundidad contra diámetro. Los puntos grises son la Luna; los rojos, Marte; los azules, todas las detecciones de México. Los círculos ocres son las {n_arid} detecciones en zonas áridas: ahí están los cráteres del Pinacate y las minas, que son las más profundas.</p>

<h2>5. Qué significa y qué proponemos</h2>
<div class="caja">
<p><b>Lo que sí podemos afirmar:</b> el detector encuentra los cráteres conocidos del país, funciona igual en la Tierra, la Luna y Marte, y en zonas áridas sus detecciones más profundas son reales (cráteres del Pinacate y tajos mineros).</p>
<p><b>Lo que no podemos afirmar:</b> que México tenga 668 formas tipo cráter. Esa cifra está inflada por hoyos falsos en zonas con vegetación.</p>
</div>
<ol>
<li><b>Aplicar el filtro de zonas áridas a la búsqueda</b> (NDVI menor a 0.35, como ya se definió en la celda 01). Quedan {n_arid} detecciones: {', '.join(f"{v} {TIPO[k].split(' (')[0].lower()}" for k, v in tipos_a.items())}. Están todas en la sección 6 para revisarlas una por una.</li>
<li><b>Revisar a mano esas {n_arid}</b> y marcar cuáles son cráteres, minas o falsos. Con eso la página muestra solo lo validado y la cifra se puede defender.</li>
<li><b>Cambiar los textos de la página</b>: “668 formas tipo cráter” pasa a “N formas tipo cráter validadas en zonas áridas”, y se cuenta esta lección en “Método” (un juez la valora: muestra que medimos nuestro propio error).</li>
<li><b>Validar el detector en la Luna</b> contra el catálogo publicado de Robbins (cráteres lunares de 1 km o más). Ahí no hay vegetación, así que es una prueba limpia de precisión y exhaustividad.</li>
<li><b>Opcional:</b> repetir con un modelo de terreno desnudo (por ejemplo FABDEM, que le quita árboles y edificios a Copernicus) para recuperar zonas con vegetación.</li>
</ol>

<h3>Detecciones en el polo sur lunar (muestra al azar)</h3>
<p>El mismo detector en la Luna. Solo relieve; el círculo es la detección. Aquí no hay vegetación que engañe, pero falta compararlas con un catálogo publicado (punto 4).</p>
<div class="lunas">{figs_l}</div>

<h2 class="salto">6. Todas las detecciones en zonas áridas ({n_arid})</h2>
<p>Ordenadas de la más profunda a la menos profunda. Esta es la lista que proponemos revisar a mano y dejar en la página.</p>
<div class="caja"><p><b>Lectura preliminar de la lista:</b> las más profundas (de unos 60 m hacia arriba) son casi todas reales: tajos mineros (Peñasquito, Real de Ángeles, La Herradura, Hércules, Cananea) y cráteres del Pinacate (El Elegante, Sykes, MacDougal) y de Guanajuato (Rincón de Parangueo). De ahí para abajo aparecen otras cosas: <b>hondonadas entre dunas</b> del Gran Desierto de Altar (la imagen de satélite se ve amarillo pálido y lisa), <b>presas y lagos</b> (el círculo grande rodea agua) y cuencas amplias. Son depresiones reales, pero no cráteres; conviene marcarlas como “no”.</p></div>
<div class="grid">{figs_a}</div>

<h2>Datos y reproducibilidad</h2>
<p>Relieve: Copernicus DEM GLO-30 (ESA), LOLA <code>ldem_80s_80m</code> (NASA PDS), HRSC + MOLA blend (ESA/NASA, USGS). Vegetación: MODIS MOD13Q1 (NASA). Imágenes de satélite: Sentinel-2 L2A (ESA/Copernicus), vía Google Earth Engine. Minas: OpenStreetMap. Código: <code>analisis/</code> en el repositorio (celdas 00 a 11). La muestra al azar usa semilla 42.</p>
</body></html>"""


if __name__ == "__main__":
    out = AQUI / "validacion.html"
    out.write_text(construir(), encoding="utf-8")
    print("escrito", out)
