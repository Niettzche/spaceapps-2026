"""Etiquetado asistido por IA de los candidatos: Claude CLI (claude -p) mira la foto de satélite y el relieve de cada uno.

No se le dan ni el nombre ni la distancia a minas de OpenStreetMap, para poder medir su acierto contra esa "verdad".
Uso:  python3 etiquetar.py [ids...]      (sin ids: todos los que tienen imágenes y aún no están en etiquetas_ia.jsonl)
"""
import json, re, subprocess, sys, concurrent.futures as cf
from pathlib import Path

AQUI = Path(__file__).parent
VIS = AQUI.parent / "visor_img"
SAL = AQUI / "etiquetas_ia.jsonl"
SITIOS = {s["id"]: s for s in json.loads((AQUI.parent / "visor.html").read_text().split("const DATOS = ", 1)[1].split(";\nconst S", 1)[0])["sitios"]}

TIPOS = ["crater_volcanico", "crater_impacto", "mina_o_cantera", "dolina_karst", "hondonada_eolica_o_duna",
         "presa_o_lago", "valle_o_canada", "otro", "no_se_puede_decir"]

PROMPT = """Eres un geólogo que clasifica depresiones del terreno a partir de imágenes. Lee estas dos imágenes con la herramienta Read:
1. {sat}  — foto de satélite Sentinel-2 en color real, 12.8 km por lado, centrada en la depresión.
2. {rel}  — relieve sombreado del mismo lugar (luz desde el noroeste), 12.8 km por lado, 200 m por píxel.

La depresión está en el CENTRO de ambas imágenes. Medidas del detector: diámetro {d} km, profundidad {p} m,
profundidad/diámetro {dD}, altura del borde {borde} m (positivo = borde levantado), vegetación NDVI {ndvi}. Región: {region}.

Clasifica qué es la depresión del centro en UNA de estas categorías:
{tipos}

Pistas: un tajo minero suele verse gris/claro, escalonado, con caminos, terreros o instalaciones; un cráter volcánico (maar, cono)
suele estar en un campo de lava oscura o conos y tener borde; una presa o lago muestra agua; una hondonada eólica está entre dunas
claras y lisas; una dolina está en terreno de caliza, a veces con vegetación; un valle o cañada es alargado y sigue el drenaje.
Si las imágenes no alcanzan para decidir, usa no_se_puede_decir. No inventes: si dudas, baja la confianza.

Responde SOLO con un JSON en una línea, sin texto antes ni después:
{{"tipo": "<categoría>", "confianza": <0 a 1>, "razon": "<una frase con lo que ves en las imágenes>"}}"""


def etiquetar(cid):
    s = SITIOS[cid]
    sat, rel = VIS / f"{cid}_sat.jpg", VIS / f"{cid}_tierra.png"
    if not (sat.exists() and rel.exists()):
        return {"id": cid, "error": "sin imágenes"}
    prompt = PROMPT.format(sat=sat, rel=rel, d=s["d"], p=s["p"], dD=s["dD"], borde=s["borde"], ndvi=s["ndvi"],
                           region=s["region"], tipos=", ".join(TIPOS))
    for intento in range(2):
        try:
            r = subprocess.run(["claude", "-p", prompt, "--output-format", "json", "--allowedTools", "Read",
                                "--add-dir", str(VIS), "--max-turns", "6"],
                               capture_output=True, text=True, timeout=240, cwd=str(AQUI))
            texto = json.loads(r.stdout).get("result", "")
            m = re.search(r"\{.*\}", texto, re.S)
            res = json.loads(m.group(0))
            if res.get("tipo") not in TIPOS:
                raise ValueError(f"tipo fuera de lista: {res.get('tipo')}")
            return {"id": cid, **res}
        except Exception as e:
            err = str(e)[:160]
    return {"id": cid, "error": err}


if __name__ == "__main__":
    hechos = set()
    if SAL.exists():
        hechos = {json.loads(l)["id"] for l in SAL.read_text().splitlines() if l.strip() and "error" not in json.loads(l)}
    ids = sys.argv[1:] or [i for i in SITIOS if i not in hechos]
    with cf.ThreadPoolExecutor(6) as ex, open(SAL, "a") as f:
        for k, res in enumerate(ex.map(etiquetar, ids), 1):
            f.write(json.dumps(res, ensure_ascii=False) + "\n"); f.flush()
            print(f"[{k}/{len(ids)}] {res.get('id')}: {res.get('tipo', res.get('error'))} {res.get('confianza', '')}", flush=True)
