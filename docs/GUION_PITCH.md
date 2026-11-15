# Guion del pitch · 2 minutos + 1 minuto de preguntas

Abrir el mapa y una partida antes de presentar. Las cifras describen componentes distintos. No presentar como verificado un recorrido de UI que no se haya probado en la máquina del pitch.

## 0:00–0:15 · El reto

¿Dónde entrenar un rover antes de enviarlo a la Luna o Marte? Una foto parecida no basta: necesitamos comparar el terreno y saber qué puede probar la Tierra.

## 0:15–0:45 · La solución

Construimos MARSCEPTION: un explorador de análogos y un juego de rover con datos de NASA y ESA. Comparamos depresiones del terreno a la misma resolución en Tierra, Luna y Marte. Cada ficha muestra fuentes y límites. México es el caso validado; la búsqueda cubre también Atacama, Arizona y Arabia: tres de diez regiones priorizadas.

## 0:45–1:15 · Video de 30 segundos

Reproducir el corte final de 30 s sin hablar encima: prueba terrestre, fallo, ajuste del robot, entrega y límites de la analogía. Mientras se prepara ese corte, el video actual dura 25 s; reservar los cinco restantes para la transición. No sustituirlo por un recorrido en vivo completo: no cabe en este segmento.

## 1:15–1:44 · Evidencia y límites

El modelo explicable distingue cráteres lunares y marcianos con un 78 por ciento de exactitud balanceada y validación espacial. Recupera análogos conocidos: Colton, del entrenamiento del Apolo quince, y Al Wahbah, publicado para Encélado, que proponemos para la Luna. No son descubrimientos nuevos. La gravedad, el vacío y la radiación marcan dónde termina la analogía.

## 1:44–2:00 · Cierre

MARSCEPTION conecta datos con decisiones: elegir un terreno, probar un diseño y entender sus límites. Sirve para aprender y priorizar candidatos; una prueba del juego no certifica un rover ni un sitio real.

## Preguntas

- **IA:** modelo estadístico explicable para forma; Claude para sugerir etiquetas visuales. Claude Code/Codex apoyaron código, documentación y arte. Se declaran por separado.
- **Novedad:** estar fuera de nuestra lista de análogos conocidos no prueba novedad en la literatura. La lista corta es provisional.
- **NASA:** MODIS, POWER, LOLA/LRO, MOLA y GIBS; Copernicus y HRSC son de ESA.
- **Marte:** JPL publica 3.71 como gravedad ecuatorial; la ficha media publica 3.73. Elegimos 3.71 uniformemente, con un factor común de escala del juego.
- **Modelo y cifras:** 6 sitios marcianos, 573 cráteres; 76 % usando solo profundidad/diámetro. Prefiltro complementario: 3/3 negativos y 9/21 análogos conocidos (`model/VALIDATION.md`); no confundirlo con el detector (9/11). Fuentes ampliadas en [metodología en inglés](METHODOLOGY_EN.md) y [preguntas de jueces](PITCH_QA_EN.md).
- **Taller:** consultar las hojas Judges y Ambiente de `docs/taller/Space_Apps_Game_Data.xlsx`. Velocidad y precios son valores de juego; el hundimiento del suelo no está modelado. No afirmar que las ruedas anchas habrían salvado a Spirit.
- **Pendientes:** grabar después de la publicación de Mario; verificar UI, enlaces públicos y video final. Edmundo confirma el envío oficial.

## Control de tiempo

Leer solo los cuatro párrafos del reto, solución, evidencia y cierre. Las instrucciones del bloque de video y las preguntas no se leen. El bloque de video reserva 30 s; el reparto es por segmentos, sin asignar personas. Las mediciones por palabras se documentan como estimación: no sustituyen un ensayo humano con pausas y cambios de pantalla.

Revisión del 14 de noviembre: el texto anterior tenía 255 palabras habladas, unas **2:28** con video a 130 palabras/minuto. El ajuste deja **172 palabras** (números normalizados al pronunciarlos):

| Segmento | Palabras | Tiempo estimado a 130 palabras/min |
|---|---:|---:|
| Reto | 28 | 12.9 s |
| Solución | 54 | 24.9 s |
| Video / transición | — | 30 s |
| Evidencia y límites | 57 | 26.3 s |
| Cierre | 33 | 15.2 s |
| Total | 172 | **1:49.4** |

Quedan **10.6 s de margen** para pausas y cambios de pantalla a ese ritmo. A 120 palabras/minuto, el total calculado es 1:56. El ensayo humano cronometrado sigue pendiente; no se presenta este cálculo como una lectura grabada. Durante el ensayo, si una sección supera su corte, omitir una frase secundaria antes de acelerar.
