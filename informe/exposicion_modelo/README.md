# Carpeta para exponer el modelo de análogos

Para quien presenta el frente modelo (Mario). Aquí está lo necesario para estudiar y defender el modelo: el documento de estudio
y los cuadernos que vuelven a calcular sus cifras, por si alguien pide verlas.

| Archivo | Para qué sirve |
|---|---|
| `guia_exposicion_modelo.pdf` | **Documento de estudio.** Qué decir en 30 segundos, la figura del borde, 12 preguntas de jueces con respuesta y respaldo, y lo que no hay que decir. |
| `01_borde_levantado.ipynb` | Respalda la página 1 de la guía: cómo se mide el borde levantado y por qué separa un cráter de un valle o una mina. |
| `02_cifras_de_la_guia.ipynb` | Respalda las preguntas de las páginas 2 y 3: vuelve a calcular cada cifra que se puede calcular con los datos del repo. |
| `guia_exposicion_modelo.html` | La misma guía, antes de pasarla a PDF. |

## Si te piden ver de dónde sale algo

| Pregunta o cifra | Dónde enseñarlo |
|---|---|
| 10 de 11 cráteres conocidos tienen borde; 3 de 26 valles; 4 de 38 tajos | `01_borde_levantado.ipynb`, sección 3 |
| La figura del borde | `01_borde_levantado.ipynb`, sección 3 (y sección 1 para ver un perfil completo) |
| Los 11 cráteres uno por uno, y en qué puesto quedan | `01_borde_levantado.ipynb`, sección 4 |
| ¿Y si la zona del borde fuera otra? | `01_borde_levantado.ipynb`, sección 6 |
| Ningún tajo de nuestro catálogo tiene borde | `01_borde_levantado.ipynb`, sección 7 |
| 4,288 cráteres lunares, 573 marcianos, 78 % | `02_cifras_de_la_guia.ipynb`, sección 1 |
| 77.6 % con cráteres de 2 km o más (la objeción del instrumento) | `02_cifras_de_la_guia.ipynb`, secciones 1 y 2 |
| El puntaje no separa un cráter de un valle | `02_cifras_de_la_guia.ipynb`, sección 3 |
| El detector encuentra el 40 % del catálogo; 9 % son cráteres naturales | `02_cifras_de_la_guia.ipynb`, sección 4 |
| 29 de 33 etiquetas contrastadas | `02_cifras_de_la_guia.ipynb`, sección 5 |
| 176 K y 55 K; lo que la Tierra no reproduce | `02_cifras_de_la_guia.ipynb`, sección 6 |
| 3 de 3 controles negativos y 9 de 21 análogos conocidos | `model/VALIDATION.md`, sección A (necesita Earth Engine; el cuaderno 02 solo lo cita) |
| 9 de 11 cráteres mexicanos conocidos | `informe/validacion_detector.pdf` |
| La Luna emborronada (0.058 → 0.043) | `model/NIVEL2.md`, sección B |
| El modelo Luna contra Marte paso a paso | `ciencia_datos/06_modelo_luna_marte.ipynb` |
| Qué tiene que ver el borde con los análogos | `model/NIVEL2.md`, sección D |

## Cómo abrir los cuadernos

Ya están ejecutados: en GitHub o en cualquier visor se ven con sus tablas y figuras, sin correr nada.

Para volver a correrlos, desde la raíz del repo y con las versiones fijadas (con otras versiones de scikit-learn, el puntaje de
forma cambia en el tercer decimal):

```
uv run --with scikit-learn==1.5.2 --with pandas==2.2.3 --with numpy==2.1.3 --with jupyter \
  jupyter lab informe/exposicion_modelo/01_borde_levantado.ipynb
```

No descargan nada: usan los datos de `ciencia_datos/` y el código de `model/`. La última celda de cada cuaderno comprueba que sus
resultados sean los mismos que están escritos en `model/VALIDATION.md`, y falla si ya no coinciden.

## Cómo regenerar la guía

```
uv run --with pandas==2.2.3 --with numpy==2.1.3 python informe/generar_guia_exposicion.py
google-chrome-stable --headless --no-pdf-header-footer \
  --print-to-pdf=informe/exposicion_modelo/guia_exposicion_modelo.pdf informe/exposicion_modelo/guia_exposicion_modelo.html
```

El generador se detiene si alguna cifra copiada ya no aparece en `model/VALIDATION.md`.

## Lo que hay que tener presente

- El borde levantado dice «esto es un cráter», no «esto se parece a la Luna».
- Son 11 cráteres con fuente externa y uno solo es de impacto: es evidencia, no prueba.
- La zona del borde que usamos se eligió después de ver los datos; el cuaderno 01 muestra las otras opciones.
- El puntaje de similitud del juego no usa el borde.
- El guion oficial del pitch es `docs/GUION_PITCH.md`. El de la guía es una propuesta para el bloque del modelo.
