# Guion del pitch · 2 minutos + 1 minuto de preguntas

Abrir el mapa y una partida antes de presentar. Las cifras describen componentes distintos. No presentar como verificado un recorrido de UI que no se haya probado en la máquina del pitch.

## 0:00–0:15 · El reto

¿Dónde entrenaríamos un rover antes de enviarlo a la Luna o Marte? Parecerse en una foto no basta. Necesitamos saber qué terreno es comparable, qué operación permite probar y dónde deja de funcionar la analogía.

## 0:15–0:45 · La solución

Construimos MARSCEPTION: un explorador de análogos y un juego de rover. El explorador compara formas del terreno usando datos de NASA y ESA. Sus fichas muestran variables, fuentes y límites. México es nuestro caso validado; extendimos la búsqueda a Atacama, Arizona y Arabia: tres de diez regiones priorizadas. No afirmamos haber escaneado todo el planeta.

## 0:45–1:10 · Video de 25 segundos

Reproducir el video explicativo de 25 s sin hablar encima. Si se sustituye por captura real, conservar el mismo tiempo. El recorrido completo en vivo se reserva para preguntas: no cabe en este segmento. El video actual es explicativo, no una partida grabada.

## 1:10–1:45 · Evidencia y límites

El modelo de forma clasifica Luna y Marte con alrededor de 78 % de exactitud balanceada, con separación espacial: seis sitios marcianos y 573 cráteres. Recupera análogos conocidos: Colton, de entrenamiento del Apolo 15, y Al Wahbah, publicado para Encélado, que proponemos para la Luna. No son descubrimientos nuevos. La Tierra no reproduce gravedad, vacío ni radiación del destino. El juego muestra esos límites al comparar la prueba terrestre con la misión.

## 1:45–2:00 · Cierre

Conectamos evidencia con experimentación: elegir un terreno, explicar sus límites y probar decisiones de diseño. Un catálogo abierto y revisable puede servir para educación y para priorizar sitios que después necesitan evaluación científica y permisos de campo.

## Preguntas

- **¿Qué modelo es?** Modelo explicable de forma: árbol y regresión logística sobre cráteres reales de Luna y Marte. Separa los cuerpos, no certifica la utilidad de cualquier sitio terrestre. El comparador ambiental complementario filtra clima/vegetación/pendiente: pasa 3/3 negativos y 9/21 análogos conocidos, según `model/VALIDATION.md`.
- **¿De dónde salen los números?** Cada ficha conserva fuente, unidad y límite: LOLA, HRSC+MOLA, Copernicus, MODIS y POWER. Las cifras de validación corresponden a componentes distintos. Precios, velocidad, umbrales de daño y puntuación son valores del juego (P), separados de las mediciones.
- **¿Qué no puede probar la Tierra?** La gravedad lunar/marciana, el vacío, la radiación y condiciones propias del destino. Mostrar los resultados de la misión y «Dónde se rompe la analogía», con batería/patinaje de esa partida. El juego tampoco modela hundimiento de ruedas en suelo blando; pasar una prueba no certifica un rover real.
- **Taller · hoja Judges:** Perseverance: 152 m/h ≈ 0.042 m/s; VIPER: velocidad de diseño, no experiencia de una misión. Los 6 m/s del motor eficiente del juego son (P), unas 60 veces la referencia de diseño de 0.1 m/s de VIPER. Spirit se atascó en suelo blando en Troy; no afirmar que unas ruedas anchas lo habrían salvado. Regolito lunar φ 30–50° (Apollo) y drift marciano φ 15.6–20.4° (Viking): son rangos de materiales/contextos específicos, no un valor universal. Fuentes y separación dato/juego en `docs/taller/Space_Apps_Game_Data.xlsx`, hoja Judges, y `docs/taller/PIEZAS.md` (NASA/JPL; NTRS 20220014634 y 20200003046).
- **IA:** modelo estadístico explicable para forma; Claude para sugerir etiquetas visuales. Claude Code/Codex apoyaron código, documentación y arte. Se declaran por separado.
- **Novedad:** estar fuera de nuestra lista de análogos conocidos no prueba novedad en la literatura. La lista corta es provisional.
- **NASA:** MODIS, POWER, LOLA/LRO, MOLA y GIBS; Copernicus y HRSC son de ESA.
- **Marte:** JPL publica 3.71 como gravedad ecuatorial; la ficha media publica 3.73. Elegimos 3.71 uniformemente, con un factor común de escala del juego.
- **Pendientes:** demo publicada en https://v1.marsception.us/; verificar inglés, UI y envío oficial. El video explicativo no es una grabación de una partida.

## Ensayo por segmentos

Sin reparto por personas. Leer solo los párrafos hablados y reproducir los 25 s de video en silencio. Los tiempos son objetivos de ensayo; no se ha cronometrado una presentación humana. Si la lectura supera el límite de un segmento, acortar antes de acelerar. Reservar el recorrido completo y la hoja Judges para el minuto de preguntas.
