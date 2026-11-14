# 99 · Descargar al equipo los resultados (si no baja, ejecuta esta celda tú con el botón de play)
from google.colab import files
for z in ("/content/web_data.zip", "/content/informe.zip"):
    if os.path.exists(z):
        files.download(z)

