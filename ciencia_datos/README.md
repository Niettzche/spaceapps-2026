# Ciencia de datos

Notebooks de modelado sobre los cráteres que detecta `analisis/07_buscador_crateres.py`.

| Notebook | Qué hace |
|---|---|
| `01_modelos_explicables.ipynb` | Preprocesamiento, visualización y modelos explicables (árbol de decisión, regresión logística) que separan cráteres de Luna, Marte y Tierra; puntaje de análogo fuera de pliegue para México. [Abrir en Colab](https://colab.research.google.com/github/Niettzche/spaceapps-2026/blob/main/ciencia_datos/01_modelos_explicables.ipynb) |

- `datos/`: copia de `respaldo/web_data/crateres_mexico.csv` y `hoyas_referencia.csv` (`respaldo/` no está en git). Si se regeneran, volver a copiarlos.
- `salidas/`: gráficas, `arbol.json` (reglas del árbol para la web) y `puntaje_analogo_mexico.csv`. Las regenera el notebook.

En Colab: el repo es privado, así que la primera celda clona con un token de GitHub guardado en los secretos de Colab como `GITHUB_TOKEN` (solo lectura basta).

Local: `uv run --with scikit-learn --with jupyter jupyter lab ciencia_datos/01_modelos_explicables.ipynb`
