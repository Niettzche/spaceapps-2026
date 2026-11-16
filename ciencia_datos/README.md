# Ciencia de datos

Notebooks de modelado sobre los cráteres que detecta `analisis/07_buscador_crateres.py`.

| Notebook | Qué hace |
|---|---|
| `01_modelos_explicables.ipynb` | Preprocesamiento, visualización y modelos explicables (árbol de decisión, regresión logística) que separan cráteres de Luna, Marte y Tierra; puntaje de análogo fuera de pliegue para México. [Abrir en Colab](https://colab.research.google.com/github/Niettzche/spaceapps-2026/blob/main/ciencia_datos/01_modelos_explicables.ipynb) |
| `02_diagnostico_y_mejoras.ipynb` | Revisa por qué el `01` no da más: desbalance (atendido), etiquetas de la Tierra (el cuello de botella), cráteres demasiado chicos, anillo lunar. Propone un puntaje nuevo: modelo Luna contra Marte y distancia a la nube planetaria, sin depender de etiquetas terrestres. [Abrir en Colab](https://colab.research.google.com/github/Niettzche/spaceapps-2026/blob/main/ciencia_datos/02_diagnostico_y_mejoras.ipynb) |
| `03_etiquetas_por_fuentes.ipynb` | Etiquetas de la Tierra desde fuentes citables: catálogo de 70 cráteres volcánicos (`datos/crateres_conocidos_mx.csv`) y minas de OpenStreetMap. Mide cuántos cráteres conocidos encuentra el detector y calcula el puntaje Luna contra Marte para las 668 detecciones (`salidas/puntaje_luna_marte_mexico.csv`). [Abrir en Colab](https://colab.research.google.com/github/Niettzche/spaceapps-2026/blob/main/ciencia_datos/03_etiquetas_por_fuentes.ipynb) |
| `04_fichas_explicables.ipynb` | Ficha explicable por sitio de `data/sites`: aporte exacto de cada variable al modelo de forma (coeficiente × z), 3 gemelos lunares y 3 marcianos (kNN en el mismo espacio) y puntaje por dimensión (forma, terreno, superficie, clima) frente a la Luna y Marte. Salida: `salidas/fichas_explicables.json`. [Abrir en Colab](https://colab.research.google.com/github/Niettzche/spaceapps-2026/blob/main/ciencia_datos/04_fichas_explicables.ipynb) |
| `05_fichas_integradas.py` | Une por candidato árido todo lo medido (forma, perfil por zona contra su gemelo lunar, sombra polar, geología ASTER, clima NASA POWER, etiqueta de IA y P(Luna)) y propone la lista corta con reglas declaradas. Salidas: `salidas/fichas_integradas.csv`, `lista_corta.{csv,md}`, `naturales_nuevos.csv`. Uso: `python3 ciencia_datos/05_fichas_integradas.py` |
| `06_modelo_luna_marte.ipynb` | Notebook de estudio del modelo Luna contra Marte (el del 78 %): atributos, validación por grupos con 20 repeticiones, matrices de confusión, coeficientes, árbol equivalente, sitios de Marte nunca vistos y la Tierra como invitada. |
| `etiquetado_ia/` | Etiquetado de los candidatos con Claude Code CLI (`claude -p`) sobre Sentinel-2 y relieve (`etiquetar.py`) y su validación contra fuentes externas (`validar.py`, `validacion.txt`: 29 de 33, IC 95 % 71.8–96.6 %). Resultado en `datos/etiquetas_ia.csv`. |

- `datos/`: copia de `respaldo/web_data/crateres_mexico.csv` y `hoyas_referencia.csv` (`respaldo/` no está en git). Si se regeneran, volver a copiarlos.
- `salidas/`: gráficas, `arbol.json` (reglas del árbol para la web) y `puntaje_analogo_mexico.csv`. Las regenera el notebook.

En Colab: la primera celda clona con un token de GitHub guardado en los secretos de Colab como `GITHUB_TOKEN` (solo lectura basta). El repo es público desde el 15 nov, así que el token ya no hace falta para leerlo.

Local: `uv run --with scikit-learn --with jupyter jupyter lab ciencia_datos/01_modelos_explicables.ipynb`
