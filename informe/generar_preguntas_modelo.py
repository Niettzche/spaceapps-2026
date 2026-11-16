"""Genera informe/exposicion_modelo/preguntas_modelo.html: banco de preguntas que pueden hacer sobre el modelo, con respuesta.

Complementa a la guía (informe/generar_guia_exposicion.py), que trae solo las preguntas más probables. Cada pregunta lleva:
qué decir, qué añadir si insisten y dónde está el respaldo.

Las cifras del borde levantado se calculan aquí con model/borde.py. Las demás se copian de los documentos del repo, y el script
se detiene si alguna frase citada ya no aparece en su documento (lista CITAS), para que las respuestas no los contradigan.

Uso:  uv run --with pandas==2.2.3 --with numpy==2.1.3 python informe/generar_preguntas_modelo.py
PDF:  google-chrome-stable --headless --no-pdf-header-footer \\
        --print-to-pdf=informe/exposicion_modelo/preguntas_modelo.pdf informe/exposicion_modelo/preguntas_modelo.html
"""
import datetime
import html
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from model import borde  # noqa: E402

e = html.escape

# --- Frases que deben seguir apareciendo en su documento: si una cambia, hay que revisar la respuesta que la usa ---
CITAS = {
    "model/VALIDATION.md": [
        "Exactitud balanceada fuera de pliegue con grupos espaciales: 78 %",
        "4,288 cráteres lunares y 573 marcianos",
        "entre 70 % (Gale) y 92 % (Meridiani)",
        "grupos espaciales de 250 × 250 píxeles (50 × 50 km)",
        "el d/D lunar baja de 0.058 a 0.043",
        "(Marte: 0.027 y 0.019)",
        "| D ≥ 2 km | 3 variables | 788 | 125 | 77.6%",
        "el 84% cae dentro del 95 % de la nube",
        "### Controles negativos: 3 de 3 pasan",
        "### Análogos conocidos: 9 de 21 pasan",
        "percentiles 10–90: 0.32–0.52",
        "vale entre 0.20 y 0.33 en todos los sitios",
        "puntaje de forma 0.42",
        "encuentra el 40% y el 32% pasa el filtro",
        "15 con lago (el DEM ve el espejo de agua), 3 menores de 0.6 km y 22 por otras razones",
        "la IA etiqueta 27 como cráteres naturales (9%) y 53 como minas o canteras (18%)",
        "29 aciertos",
        "Entre los 25 primeros por borde hay 11 cráteres naturales según la IA y 1 mina",
        "entre los 25 primeros por forma, 3 cráteres naturales y 14 minas",
        "altura del borde 0.91 (p < 0.001), puntaje de forma 0.36",
        "detector mide ~0.75 km y la fuente da ~1.1 km",
        "El total más alto de un análogo conocido es 0.556",
        "| tajo minero | 22 | 0 |",
    ],
    "AGENTS.md": ["9 de 11", "668 detecciones", "71 %", "solo las reduce 15 %", "47 candidatos", "76 % solo con profundidad/diámetro"],
    "model/score.py": ['"forma":              {"peso": 0.40', '"oscilacion_termica": {"escala": 20.0, "peso": 0.20',
                       '"precipitacion":      {"escala": 1.0,  "peso": 0.15', '"ndvi":               {"escala": 0.15, "peso": 0.10',
                       '"pendiente":          {"escala": 5.0,  "peso": 0.15'],
    "analisis/07_buscador_crateres.py": ["(d.diam_km >= 0.6) & (d.diam_km <= 10) & (d.prof_m >= PROF_C) & (d.circ >= 0.6)"],
    "ciencia_datos/etiquetado_ia/README.md": ["Por qué 298 y no 310 ni 296"],
    "model/NIVEL2.md": ["Harrat Hutaymah sí está", "entrenamiento del Apolo 15"],
    "model/curados.py": ["tripulación del Apolo 14"],
    "api/tutor.py": ["Use ONLY the facts in the CONTEXT blocks", 'os.getenv("OPENAI_MODEL"',
                     '_entero("TUTOR_POR_IP", 15), _entero("TUTOR_VENTANA_S", 300)',
                     "la tutora NO tiene herramientas ni secretos en su contexto"],
    "game/src/tutor/panel.js": ["puede equivocarse, revisa la fuente", "lo dice y sigue con reglas"],
    "game/src/tutor/conocimiento.js": ["POR REGLAS (sin IA ni red)"],
}
faltan = [f"{doc}: {c}" for doc, frases in CITAS.items() for c in frases if c not in (RAIZ / doc).read_text(encoding="utf-8")]
if faltan:
    raise SystemExit("Estas frases ya no están en su documento; revisa las respuestas antes de regenerar:\n- " + "\n- ".join(faltan))
VAL = (RAIZ / "model" / "VALIDATION.md").read_text(encoding="utf-8")

# --- Cifras del borde levantado (mismas definiciones que model/validate.py, parte_borde) ---
t = borde.tabla_candidatos().dropna(subset=["h", "diam_km", "prof_m", "borde_m"]).reset_index(drop=True)
r, _ = borde.perfiles()
lev = (t.h > borde.UMBRAL).to_numpy()
fuente = t.con_fuente.notna().to_numpy()
alta = (t.conf_ia >= 0.7).to_numpy()
valle = alta & t.etiqueta_ia.isin(["presa_o_lago", "valle_o_canada", "hondonada_eolica_o_duna"]).to_numpy()
tajo = (t.km_mina <= 2.0).to_numpy() & ~fuente
ref = {c: np.array([borde.altura(list(p), r) for p in borde.perfiles_referencia(c)]) > borde.UMBRAL for c in ("luna", "marte")}
TI = borde.tabla_impactos()
NUEVOS = TI[~TI.visto]
N_IMP, K_IMP = len(NUEVOS), int((NUEVOS.h > borde.UMBRAL).sum())
if f"**De los {N_IMP} que la regla no había visto, {K_IMP} tienen borde levantado.**" not in VAL:
    raise SystemExit("La prueba fuera de muestra ya no coincide con model/VALIDATION.md.")
K_ESTRECHA = int(sum(borde.altura(pp, None, (0.9, 1.3)) > borde.UMBRAL for pp in NUEVOS.perfil))
NO_PASAN = ", ".join(NUEVOS.nombre[~(NUEVOS.h > borde.UMBRAL)])
N_CAND = len(t)


def de(m):
    return f"{int(lev[m].sum())} de {int(m.sum())}"


LUNA, MARTE = f"{int(ref['luna'].sum())} de {len(ref['luna'])}", f"{int(ref['marte'].sum())} de {len(ref['marte'])}"

# --- El banco: (pregunta, qué decir, si insisten o None, respaldo, ¿de las más probables?) ---
SECCIONES = [
    ("Qué es el modelo", [
        ("¿Qué hace su modelo, en una frase?",
         "Busca en la Tierra hoyos con forma de cráter, comprueba cuáles son cráteres de verdad, y dice qué tanto se parecen a los de "
         "la Luna o a los de Marte y dónde deja de servir la comparación.",
         None, "PROYECTO.md · model/VALIDATION.md", False),
        ("¿Es inteligencia artificial? ¿Qué tipo de modelo es?",
         "Es estadística explicable: una regresión logística con tres medidas de cada cráter. No es una red neuronal. La entrenamos "
         "con 4,288 cráteres de la Luna y 573 de Marte.",
         "Su variable más influyente se puede leer: profundidad entre diámetro. Los cráteres lunares son más hondos para su tamaño "
         "(mediana 0.060 en los 4,288 cráteres de 80.5–90° S) que los de Marte (mediana 0.027).",
         "model/forma.py · model/VALIDATION.md, sección B", True),
        ("¿Por qué un modelo tan simple y no una red neuronal?",
         "Porque con tres medidas por cráter una red no tiene nada más que aprender, y un modelo simple se puede explicar y revisar. "
         "Con una sola variable, profundidad entre diámetro, ya llega a 76 %; con las tres, a 78 %.",
         None, "AGENTS.md §6.1 · ciencia_datos/03_etiquetas_por_fuentes.ipynb", False),
        ("¿Qué tres medidas usa y por qué esas?",
         "El diámetro, la profundidad entre el diámetro y la altura del borde entre el diámetro. Son las que podemos medir igual en "
         "los tres mundos, con mapas de relieve y a la misma resolución.",
         None, "model/forma.py", False),
        ("¿Qué significa 78 % de exactitud balanceada? ¿Es mucho?",
         "Que ante un cráter que no había visto, el modelo acierta de qué mundo es casi 8 de cada 10 veces, contando igual a la Luna y "
         "a Marte aunque haya muchos más cráteres lunares. Al azar sería 50 %.",
         "No es altísimo, y por eso no lo usamos para decidir qué es un análogo: solo para decir a cuál de los dos mundos se parece "
         "más un cráter que ya identificamos.",
         "model/VALIDATION.md, sección B", False),
        ("¿Cómo evitaron que el modelo se aprendiera los datos de memoria?",
         "Validando por zonas: partimos cada mapa en bloques de 50 por 50 km y el modelo nunca se prueba con cráteres del mismo "
         "bloque con el que se entrenó, porque los cráteres vecinos se parecen.",
         "Además lo probamos dejando fuera un sitio de Marte completo: acierta entre 70 % (Gale) y 92 % (Meridiani).",
         "model/VALIDATION.md, sección B · cuaderno 02, sección 1", False),
        ("¿Qué es eso de la «nube» de la Luna y Marte?",
         "Es el conjunto de formas que tienen los cráteres reales de la Luna y de Marte. Si un hoyo de la Tierra cae fuera del 95 % de "
         "esa nube, decimos que la analogía de forma se rompe; pasa con los tajos demasiado hondos.",
         "Estar dentro no prueba que algo sea un cráter: el 84 % de todas las depresiones de México cae dentro.",
         "model/forma.py · model/VALIDATION.md, «Tasa base de la nube»", False),
    ]),
    ("Los datos", [
        ("¿De dónde salen los números? ¿Qué datos de la NASA usan?",
         "Para la Luna, el relieve de LOLA, de la sonda LRO. Para Marte, el mosaico HRSC+MOLA. Para la Tierra, la vegetación de MODIS "
         "y el clima de NASA POWER. Los valores de los destinos salen de Diviner, de LRO, y de MEDA, del Perseverance.",
         "Lo que no es de la NASA también lo decimos: el relieve de la Tierra es Copernicus, de la ESA, y HRSC es de la ESA.",
         "docs/METODOLOGIA.md · data/targets", True),
        ("¿Por qué miden todo a 200 metros?",
         "Porque es la resolución del mapa más grueso que usamos, el de Marte. Para comparar formas entre mundos hay que medirlas con "
         "la misma regla, así que bajamos la Luna y la Tierra a 200 m.",
         None, "AGENTS.md §6.1 · docs/METODOLOGIA.md", False),
        ("¿Marte sale más plano solo porque su mapa es más borroso?",
         "En parte sí, en los cráteres chicos. Lo probamos emborronando la Luna a la resolución de Marte: su profundidad relativa baja "
         "de 0.058 a 0.043, pero sigue por encima de la de Marte, 0.027.",
         "Con cráteres de 2 km o más, donde la resolución pesa menos, el modelo mantiene 77.6 %.",
         "model/NIVEL2.md, sección B · model/VALIDATION.md", False),
        ("¿Por qué buscan solo en desiertos?",
         "Porque donde hay vegetación el detector encuentra dolinas y cañadas: de 668 detecciones en México, el 71 % cae en sierras "
         "húmedas. Y un lugar cubierto de plantas no se parece a la Luna ni a Marte, así que la vegetación es un veto.",
         "No son copas de árboles: con un relieve sin árboles esas detecciones solo bajan 15 %.",
         "AGENTS.md §6.3 · informe/validacion_detector.pdf", False),
        ("¿Con qué valores de la Luna y de Marte comparan?",
         "Polo sur lunar: 176 K de oscilación térmica (Diviner) y 8.6 grados de pendiente media (LOLA). Jezero: 55 K (MEDA) y 3.6 grados "
         "(HRSC+MOLA). Precipitación y vegetación, cero en los dos.",
         None, "data/targets/polo_sur_lunar.json y jezero.json", False),
    ]),
    ("El porcentaje de similitud", [
        ("¿Cómo se calcula el porcentaje de similitud?",
         "Cada dimensión da un número entre 0 y 1 que baja conforme la Tierra se aleja del destino, y se combinan con una media "
         "geométrica ponderada. La forma pesa 40 %; la oscilación térmica, 20 %; la precipitación y la pendiente, 15 % cada una; la "
         "vegetación, 10 %.",
         "Media geométrica, para que una dimensión muy mala no se tape con otra muy buena. Y la vegetación es veto: si es densa, el "
         "total es cero.",
         "model/score.py", False),
        ("¿Qué significa ese porcentaje? ¿Un 55 % es un buen análogo?",
         "Es un filtro, no una calificación. Descarta lo que no puede ser análogo: selvas, cultivos y nieve quedan cerca de cero. Entre "
         "sitios áridos casi no ordena: sin contar la forma, 8 de cada 10 sitios de nuestro catálogo quedan entre 0.32 y 0.52.",
         "Qué es cada sitio lo dicen la etiqueta contrastada con fuentes y el borde medido, no el número.",
         "model/VALIDATION.md, sección A («Tasa del prefiltro»)", True),
        ("¿Por qué todos los sitios salen con porcentajes bajos?",
         "Porque hay una dimensión que la Tierra no alcanza. La temperatura oscila 176 K en el polo sur lunar y 55 K en Jezero, y el "
         "máximo terrestre que usamos es 40 K. Esa dimensión vale entre 0.20 y 0.33 en todos los sitios y baja todos los totales casi "
         "por igual.",
         "Es un límite real de la Tierra, no un error: lo registramos en cada ficha.",
         "model/VALIDATION.md (nota inicial) · model/NIVEL2.md, sección C", False),
        ("¿Por qué esos pesos?",
         "Son provisionales y están marcados así en el código. Decidimos no moverlos antes de la entrega, para no acomodar el puntaje "
         "a los resultados.",
         None, "model/score.py · model/NIVEL2.md, sección C", False),
        ("¿Validaron ese comparador?",
         "Con controles. Tres lugares que no deben parecerse (la selva amazónica, la cuenca del Congo y un arrozal del Mekong) dan "
         "cero: 3 de 3. Y de 21 análogos conocidos, pasan 9.",
         "Pasan los que son análogos por ser desiertos secos. No pasan los que lo son por algo que estas variables no ven: frío polar, "
         "lava en clima húmedo, química del agua o cuevas. Eso marca hasta dónde llega el filtro.",
         "model/VALIDATION.md, sección A", False),
        ("¿Qué pasa si escribo una coordenada cualquiera en el explorador?",
         "Se mide el clima, la vegetación y la pendiente de ese punto y se calcula la similitud sin la forma, porque ahí no hay un "
         "cráter medido; por eso baja la confianza. Si pasa de 0.4 se puede proponer, y queda como propuesta pendiente de revisión.",
         "El umbral es 0.4 porque con 0.6 ningún análogo conocido pasaba: el más alto da 0.556. Ojo: revisa qué umbral muestra hoy "
         "el juego en pantalla.",
         "api/main.py · model/VALIDATION.md, «Umbral del explorador libre»", False),
    ]),
    ("El detector", [
        ("¿Cómo encuentra los cráteres?",
         "Como si lloviera: rellena el relieve con agua imaginaria y se queda con los hoyos cerrados que miden entre 0.6 y 10 km, "
         "tienen al menos 20 m de profundidad y son más o menos circulares. Es el mismo código en la Tierra, la Luna y Marte.",
         None, "PROYECTO.md · analisis/07_buscador_crateres.py", False),
        ("¿Qué tan bueno es el detector?",
         "Detecta hoyos con forma de cráter, no cráteres. Encuentra 9 de 11 cráteres mexicanos conocidos, pero solo el 40 % de un "
         f"catálogo más amplio de 62. Y de sus {N_CAND} candidatos áridos, apenas el 9 % son cráteres naturales según las etiquetas.",
         "Por eso hace falta el paso de verificación: la etiqueta y el borde.",
         "model/VALIDATION.md, sección B · informe/validacion_detector.pdf", False),
        ("¿Qué se le escapa?",
         "Los cráteres con lago, porque el mapa ve el espejo de agua y no el fondo: son 15. Los de menos de 0.6 km: 3. Y otros 22 por "
         "ser someros, estar en islas o tener la coordenada desplazada.",
         None, "model/VALIDATION.md, sección B", False),
        ("¿Escanearon todo el planeta?",
         "No. México completo, y tres de las diez regiones áridas que priorizamos: Atacama, Arizona y Arabia. De ahí salen "
         f"{N_CAND} candidatos áridos.",
         None, "PROYECTO.md, paso 4 · AGENTS.md §6.4", False),
        ("¿Por qué encuentra tantas minas?",
         "Porque un tajo a cielo abierto es un hoyo cerrado, hondo y más o menos redondo: cumple la forma. Según las etiquetas, 53 de "
         f"los {N_CAND} candidatos son minas o canteras. Por eso medimos el borde.",
         None, "model/VALIDATION.md, «Precisión del detector según la IA»", False),
    ]),
    ("El borde levantado", [
        ("¿Qué es el borde levantado y cómo lo miden?",
         "Un impacto o una explosión volcánica apilan material alrededor del hoyo, así que el terreno pegado al cráter queda más alto "
         "que el terreno lejano. Lo medimos con el perfil promedio del relieve a 80 m: si cerca del borde sube por encima del terreno "
         "lejano, hay borde levantado.",
         None, "model/borde.py · cuaderno 01, secciones 1 y 2", False),
        ("¿Y funciona?",
         f"Lo tienen {de(fuente)} cráteres conocidos, {de(valle)} valles, presas y dunas, y {de(tajo)} tajos mineros. Ordenando por "
         "borde, entre los 25 primeros hay 11 cráteres y 1 mina; ordenando por forma, 3 cráteres y 14 minas.",
         "En esa cuenta, qué es mina y qué es cráter lo dice la etiqueta de IA.",
         "model/VALIDATION.md, «Borde levantado» · cuaderno 01, secciones 3 y 4", False),
        ("¿No ajustaron la regla del borde a sus propios datos?",
         f"Al principio sí, y lo decimos: la zona del borde se eligió viendo {int(fuente.sum())} cráteres conocidos. Por eso después la "
         f"probamos, sin cambiar nada, en {N_IMP} cráteres de impacto de otros países que la regla nunca había visto: {K_IMP} tienen "
         "borde levantado.",
         f"El que falla es {NO_PASAN}. Con una zona más estrecha pasan {K_ESTRECHA}. Y no es una muestra al azar: son cráteres conocidos.",
         "model/VALIDATION.md, «Prueba fuera de muestra» · cuaderno 01, sección 9", False),
        ("¿Por qué no meten el borde al porcentaje?",
         "Porque contesta otra pregunta: «¿es un cráter?», no «¿se parece a la Luna?». Meterlo premiaría algo que no mide parecido. Va "
         "junto a cada sitio, como evidencia de qué es.",
         None, "model/borde.py · model/NIVEL2.md, sección D", False),
        ("¿Los cráteres de la Luna tienen ese borde en sus datos?",
         f"Pocos. Con la misma medida lo muestran {LUNA} cráteres lunares de referencia y {MARTE} marcianos. No comprobamos por qué; "
         "una explicación posible es que son viejos y están encimados.",
         "Por eso usamos el borde solo para decidir qué es un cráter en la Tierra.",
         "model/VALIDATION.md, «Borde levantado» (tabla y límites)", False),
        ("¿Por qué fallan Colton y Xiuyan, si son cráteres?",
         "En los dos el detector midió un diámetro menor que el real: Colton, unos 0.75 km contra 1.1; Xiuyan, 0.81 contra 1.8. El "
         "borde verdadero queda probablemente fuera de la zona que medimos.",
         "Es un límite de cómo el detector mide el tamaño, no del borde.",
         "model/VALIDATION.md, «Borde levantado» · model/NIVEL2.md, sección A", False),
        ("¿Puede dar positivo algo que no sea un cráter?",
         f"Sí. Un hoyo en lo alto de una loma también lo da, y lo dieron {de(valle)} valles, presas y dunas y {de(tajo)} tajos. Es "
         "evidencia, no prueba; por eso va junto con la etiqueta.",
         None, "model/VALIDATION.md, «Borde levantado» (límites)", False),
        ("¿Qué tiene que ver el borde con los análogos?",
         "El polo sur lunar y Jezero son terreno de cráteres. El borde levantado es evidencia de que un hoyo se formó por una explosión "
         "o un impacto, como los cráteres de allá, y no por el agua o por una excavadora. Con eso la lista queda hecha de cráteres.",
         None, "model/NIVEL2.md, sección D", False),
    ]),
    ("El uso de IA", [
        ("¿Cómo usaron la IA?",
         "En el modelo, en un solo lugar y declarado: Claude propuso qué es cada uno de los 298 candidatos mirando la imagen de "
         "satélite y el relieve, sin ver nombres ni distancias a minas. Contrastamos 33 con fuentes externas: 29 aciertos.",
         "No extendemos ese resultado a todos: los 33 no se eligieron al azar y son minas, volcanes y Meteor Crater. Los valles, "
         "presas y dunas no tienen casos contrastados.",
         "docs/USO_IA.md · ciencia_datos/etiquetado_ia", False),
        ("¿Por qué a veces dicen 298 candidatos y a veces 296?",
         "Se etiquetaron 298. El análisis usa 296 porque quita dos detecciones de Sonora (G00232 y G00239) que repetían depresiones "
         "mexicanas que no pasaron el filtro de cráter.",
         None, "ciencia_datos/etiquetado_ia/README.md", False),
        ("¿La etiqueta de IA y el borde son dos pruebas independientes?",
         "No del todo: la IA también vio el relieve. La comparación independiente es la de cráteres con fuente externa contra canteras "
         "de OpenStreetMap, donde la IA no interviene.",
         "Ahí el borde separa con un AUC de 0.91, donde 0.5 es no separar nada y 1 es separar perfecto; el puntaje de forma da 0.36.",
         "model/VALIDATION.md, «Borde levantado» (separación)", False),
        ("¿Por qué no usan un modelo de lenguaje para calcular la similitud?",
         "Porque un modelo de lenguaje no mide: opina, y no responde igual dos veces. Cada cifra nuestra se vuelve a calcular con el "
         "repositorio.",
         "Sí hay un modelo de lenguaje en el juego, la tutora ANA, pero solo explica nuestros datos: no calcula ninguna similitud.",
         "docs/USO_IA.md · cuadernos de informe/exposicion_modelo", False),
        ("En el juego hay una tutora, ANA. ¿Es un modelo de lenguaje?",
         "Solo en parte, y es una función aparte del modelo de análogos. Las preguntas sugeridas se responden con reglas, sin IA. "
         "La pregunta libre sí va a un modelo de lenguaje pequeño de OpenAI, que recibe nuestra documentación y la ficha del sitio, "
         "con la instrucción de usar solo eso.",
         "ANA explica, no calcula: ninguna similitud, etiqueta ni cifra del modelo sale de ella. Si falla o no hay conexión, el juego "
         "sigue igual con las respuestas por reglas. Qué modelo es se fija en el servidor, y cada respuesta de la API lo dice.",
         "api/tutor.py · game/src/tutor/conocimiento.js", True),
        ("¿Cómo evitan que ANA invente datos?",
         "No podemos garantizarlo, y el panel lo avisa: «puede equivocarse, revisa la fuente». Lo que hacemos es acotarla: el servidor "
         "arma su contexto con nuestros documentos y la ficha del sitio, y sus reglas le piden decir que no tiene el dato cuando no "
         "está ahí.",
         "No hemos medido cada cuánto se equivoca. Por eso las cifras que defendemos son las de los documentos, no las que diga ANA.",
         "api/tutor.py (REGLAS) · game/src/tutor/panel.js", False),
        ("¿Y si alguien intenta manipular a ANA?",
         "No tiene herramientas ni secretos en su contexto, así que lo peor que logra un ataque es que diga algo fuera de tema. "
         "Además se filtran la entrada y la salida, y hay un límite de 15 preguntas cada 5 minutos por dirección.",
         None, "api/tutor.py · api/tests/test_tutor.py", False),
    ]),
    ("Lo que encontraron", [
        ("¿Encontraron algo que nadie conociera?",
         "No lo presentamos como descubrimiento. El método dio por su cuenta con sitios ya usados: El Pinacate, donde entrenó la "
         "tripulación del Apolo 14, y Colton, del Apolo 15. Eso respalda el método.",
         "De los cráteres de Arabia: el campo volcánico de Al Hutaymah (Harrat Hutaymah) ya está en una base global de 2024 para Marte, y Al Wahbah está publicado como "
         "análogo de Encélado. Jabal Bayda no lo encontramos como análogo en lo que revisamos: lo proponemos, sin llamarlo nuevo.",
         "model/NIVEL2.md, sección A", True),
        ("¿De verdad los encontró solo?",
         "Las regiones las elegimos nosotros; los sitios dentro de cada región, no. El detector recorre todo el relieve de la región y "
         "esos cráteres salieron entre sus candidatos.",
         None, "analisis/16_busqueda_global.py · model/NIVEL2.md, sección A", False),
        ("¿Para qué sirven las minas que encontraron?",
         "Como análogo operativo, no geológico: paredes empinadas, excavación y sombra en el fondo. Y decimos dónde se rompe la "
         "comparación: son huecos artificiales escalonados, y las más hondas superan a casi cualquier cráter lunar de su tamaño. Ninguno "
         "de los 22 tajos del catálogo tiene borde "
         "levantado.",
         None, "data/sites (nota de cada tajo) · model/VALIDATION.md", False),
        ("¿Por qué México?",
         "Porque ahí la validación está completa: 9 de 11 cráteres conocidos y 47 candidatos en zonas áridas. No es el límite del "
         "alcance: repetimos la búsqueda en otras tres regiones.",
         None, "AGENTS.md §6.4", False),
    ]),
    ("Los límites", [
        ("¿Qué no puede probar la Tierra?",
         "La gravedad, el vacío, la radiación y el ciclo térmico del destino. Por eso la misión del juego usa la gravedad real del "
         "destino y la prueba terrestre no.",
         None, "data/targets · AGENTS.md §5", True),
        ("¿Por qué no miran si hay vida, agua o minerales?",
         "Buscamos análogos de terreno, que es lo que un rover necesita probar y lo que se puede medir igual en los tres mundos. La "
         "vida no se mide desde órbita: se comprueba con muestras en campo.",
         "Varios análogos famosos por su biología están en nuestra lista de conocidos, y decimos que el modelo no los ve.",
         "model/VALIDATION.md, sección A (lectura de los análogos conocidos)", False),
        ("¿Cuál es la mayor debilidad de su modelo?",
         "Que el porcentaje no ordena análogos: la forma a 200 m no distingue un cráter de un valle, y el resto del puntaje casi solo "
         "dice «es árido». Qué es cada sitio lo deciden la etiqueta y el borde, y eso descansa en pocos casos contrastados.",
         "El dato: al separar cráteres de valles, el puntaje de forma da un AUC de 0.42 (p = 0.43): no se distingue del azar.",
         "model/VALIDATION.md, «¿La forma distingue un cráter…?»", False),
        ("¿Qué harían con más tiempo?",
         "Probar el borde en más cráteres de impacto, incluidos los erosionados; averiguar por qué los cráteres lunares de referencia "
         "casi no lo muestran; cubrir las seis regiones áridas que faltan (Sahara, interior de Australia, Gobi, Kalahari, meseta iraní y Thar); y añadir composición, que es lo que pide Marte.",
         None, "docs/estado/modelo.md («Siguiente») · model/VALIDATION.md (límites del borde)", False),
    ]),
    ("El modelo dentro del juego", [
        ("¿Cómo entra el modelo al juego?",
         "Cada nivel es un corte real del relieve del sitio, y la ficha muestra sus variables medidas junto a las del destino, con la "
         "misma unidad. La gravedad del destino solo se usa en la misión, porque es justo lo que la Tierra no puede probar.",
         None, "data/sites (campo nivel) · AGENTS.md §4 y §5", False),
        ("¿El terreno de los niveles es real?",
         "El perfil sí: sale del relieve de Copernicus a 30 m. El tipo de suelo (arena, roca o compacto) es una clasificación por "
         "reglas a partir de datos medidos, no una medición directa. Las rocas y obstáculos son recreaciones, marcadas como tales.",
         None, "data/sites (nivel.superficies_nota) · AGENTS.md §6.5", False),
        ("¿La puntuación del juego dice qué robot sirve en Marte?",
         "No. Es una puntuación de juego, no evidencia científica, y los valores de las piezas son valores de juego.",
         None, "AGENTS.md §7", False),
    ]),
    ("Cómo comprobarlo", [
        ("¿Puedo comprobar sus números?",
         "Sí. El repositorio trae cuadernos ya ejecutados que vuelven a calcular las cifras sin descargar nada, y que fallan si un "
         "resultado deja de coincidir con el documento de validación. También hay pruebas automáticas.",
         None, "informe/exposicion_modelo · model/tests", False),
        ("¿Hay cifras que no puedan recalcular aquí mismo?",
         "Tres, porque necesitan Earth Engine o Colab: los 9 de 21 análogos conocidos, los 9 de 11 cráteres mexicanos y el experimento "
         "de la Luna emborronada. Están en sus documentos, con el script que las produjo.",
         None, "model/VALIDATION.md · informe/validacion_detector.pdf · model/NIVEL2.md, sección B", False),
    ]),
]

TOTAL = sum(len(p) for _, p in SECCIONES)
PROBABLES = [q[0] for _, ps in SECCIONES for q in ps if q[4]]
PROBABLES.sort(key=lambda q: 0 if ("tipo de modelo" in q or "salen los números" in q or "probar la Tierra" in q) else 1)

CSS = """
@page { size: Letter; margin: 15mm 15mm 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: "IBM Plex Sans", "Inter", "Helvetica Neue", Arial, sans-serif; color: #1d2024; font-size: 10pt; line-height: 1.45; margin: 0; }
h1 { font-size: 22pt; line-height: 1.1; margin: 0 0 3mm; letter-spacing: -.01em; }
h2 { font-size: 13.5pt; margin: 6mm 0 2.5mm; padding-top: 2mm; border-top: 1.5px solid #1d2024; break-after: avoid; }
p, li { max-width: 180mm; }
ol, ul { margin: 1.5mm 0; padding-left: 5.5mm; } li { margin: .8mm 0; }
.sub { color: #555; font-size: 10.5pt; margin-bottom: 4mm; }
.caja { background: #f1efe9; border-left: 4px solid #1f6f78; padding: 3mm 4mm; margin: 3.5mm 0; break-inside: avoid; }
.caja.oro { border-left-color: #c7921a; }
.caja p { margin: 1.2mm 0; }
.qa { break-inside: avoid; margin: 0 0 3mm; padding-bottom: 2.2mm; border-bottom: .6px solid #ccc; }
.qa h3 { font-size: 10.5pt; margin: 0 0 .8mm; }
.qa h3 .n { color: #555; font-weight: 600; margin-right: 1.5mm; }
.qa h3 .marca { font-size: 8pt; font-weight: 600; color: #1d2024; background: #f1efe9; border: .6px solid #b9b6ae; border-radius: 2mm; padding: .2mm 1.6mm; margin-left: 2mm; white-space: nowrap; }
.qa p { margin: .6mm 0; }
.qa .mas b { font-weight: 600; }
.qa .resp { color: #555; font-size: 8.5pt; }
code { font-size: 8.8pt; }
"""

bloques, n = [], 0
for titulo, preguntas in SECCIONES:
    bloques.append(f"<h2>{e(titulo)}</h2>")
    for p, resp, mas, src, probable in preguntas:
        n += 1
        marca = '<span class="marca">de las más probables</span>' if probable else ""
        bloques.append(
            f'<div class="qa"><h3><span class="n">{n}.</span>{e(p)}{marca}</h3><p>{e(resp)}</p>'
            + (f'<p class="mas"><b>Si insisten:</b> {e(mas)}</p>' if mas else "")
            + f'<p class="resp">Respaldo: {e(src)}</p></div>')

MESES = "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split()
HOY = datetime.date.today()
FECHA = f"{HOY.day} de {MESES[HOY.month - 1]} de {HOY.year}"
probables = "".join(f"<li>{e(p)}</li>" for p in PROBABLES)

HTML = f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Preguntas sobre el modelo de análogos</title>
<style>{CSS}</style></head><body>

<h1>Preguntas que te pueden hacer sobre el modelo</h1>
<div class="sub">MARSCEPTION · NASA Space Apps 2026 · {TOTAL} preguntas con respuesta, para estudiar antes del pitch · {FECHA}</div>

<div class="caja">
<p><b>Cómo contestar cualquiera.</b> Tres pasos, en este orden: la respuesta en una frase, una cifra que la sostenga y el límite. Decir
el límite antes de que te lo saquen es lo que más credibilidad da. Cada respuesta de abajo está escrita para decirse en voz alta;
«Si insisten» es lo que añades solo si repreguntan.</p>
<p><b>Si te preguntan algo que no está aquí,</b> no improvises una cifra. Di qué sí medimos y qué no: «Eso no lo medimos; lo que sí
tenemos es…». Las preguntas del juego (ruedas, batería, velocidad) las lleva integración en <code>docs/PITCH_QA_EN.md</code>.</p>
</div>

<div class="caja oro">
<p><b>Las que más probablemente lleguen.</b> Las tres primeras son las que <code>AGENTS.md</code> pide llevar preparadas; las otras
son las dos que más exponen al modelo y la de ANA, que está a la vista en el menú del juego:</p>
<ul>{probables}</ul>
</div>

{chr(10).join(bloques)}


</body></html>"""

salida = RAIZ / "informe" / "exposicion_modelo" / "preguntas_modelo.html"
salida.write_text(HTML, encoding="utf-8")
print(f"{salida.relative_to(RAIZ)} · {TOTAL} preguntas en {len(SECCIONES)} secciones · {len(PROBABLES)} marcadas como más probables")
