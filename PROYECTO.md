# Memoria del proyecto

Notas vivas del equipo: qué pide el reto, qué tenemos, qué falta y qué decidimos. Actualizar conforme avancemos.

## El reto

**Identify Earth locations that analog the permanent Moon base locations and Mars**. NASA Space Apps Challenge 2026.
Página: https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/
Autor: Sid Ahmed Boukabara (NASA Earth Science Division).

En una frase: usar datos de la NASA para encontrar lugares en la Tierra que sirvan de análogo a la Luna (sobre todo a la base permanente de Artemis en el polo sur) o a Marte, justificarlo con criterios científicos y decir hasta dónde funciona la analogía y dónde deja de funcionar.

### Lo que enfatiza el autor (video)

1. **Que no solo "se parezca".** Pide criterios científicos:
   - geología y minerales
   - temperaturas extremas e iluminación inusual
   - hielo y permafrost
   - polvo y tormentas de polvo
   - terreno volcánico, cuevas y tubos de lava
   - terreno útil para probar operaciones: aterrizaje, navegación, movilidad, robótica, construcción, uso de recursos (ISRU) y operación humana
2. **Dónde se rompe la analogía.** Ningún análogo es perfecto: la Tierra no reproduce la gravedad lunar, el vacío, la atmósfera marciana ni la radiación. Hay que decir qué tan bien funciona cada sitio y dónde falla.
3. **"Sorpréndannos".** No quieren repetir los análogos conocidos (Atacama, Antártida, Islandia, Hawái, Mojave, Death Valley, cráter Haughton). Valoran explícitamente:
   - un mapa
   - una métrica de similitud
   - una app interactiva
   - ML o búsqueda sistemática de análogos no reconocidos
4. **Datos sugeridos:**
   - NASA Earthdata y Worldview (Tierra)
   - PDS (Luna y Marte)
   - LRO (topografía, temperatura y propiedades de superficie lunar)
   - datos de otras agencias espaciales

## Nuestro enfoque

Barrido sistemático de México que detecta formas tipo cráter y las mide con **el mismo código y a la misma resolución (200 m)** que los cráteres del polo sur lunar (LOLA) y de Marte (HRSC+MOLA). Después dice qué tan buen análogo es cada sitio y dónde se rompe la analogía.

- `analisis/`: celdas de Colab `00` a `10`, con Earth Engine.
- `web/`: Vite + React + MapLibre, con el juego "¿Tierra, Luna o Marte?", un mapa, fichas y la explicación del método.
- Los datos están en el README.

Qué cubre ya del reto: métrica de similitud, búsqueda sistemática, sitios nuevos (no los análogos clásicos) y app interactiva.

## Pendientes y mejoras propuestas

- [ ] **Más de un eje de similitud.** Hoy el puntaje es sobre todo de forma y relieve (`06_puntaje_forma.py`). Candidatos:
  - [ ] Térmico: MODIS LST (Tierra) contra Diviner/LRO (Luna) o THEMIS (Marte)
  - [ ] Composición: ASTER o EMIT (Tierra) contra M3 (Luna) o CRISM (Marte)
  - [ ] Operaciones: pendiente y rugosidad (aterrizaje y movilidad en el polo sur)
- [ ] **Ficha con puntaje por eje**, no uno solo. Ejemplo: relieve 0.85, térmico 0.30, composición 0.50; gravedad, vacío y radiación no aplican. Así respondemos directamente "dónde se rompe".
- [ ] **Validación con análogos conocidos.** Comprobar que el método da puntaje alto a cráteres o análogos ya reconocidos, para dar credibilidad a los sitios nuevos.
- [ ] **Incertidumbre y sensibilidad.** ¿Cambia el ranking si cambiamos la resolución o los umbrales?
- [ ] **Conexión con Artemis.** Por sitio, decir qué se podría probar ahí: rovers, navegación, construcción, recursos.
- [ ] Revisar en la página del reto los entregables concretos (video, demo, repositorio) y la fecha límite.
- [ ] **Filtrar las detecciones que no son cráteres.** 472 de 668 detecciones de México están en zonas de mucha vegetación (NDVI > 0.7). Se probó FABDEM (Copernicus sin árboles ni edificios) en 6 bloques: en zonas húmedas bajan solo 15 % (181 → 153) y en zonas áridas se conservan los cráteres reales. No son copas de árboles: son **depresiones reales del terreno, no cráteres** (dolinas de sierras kársticas, cañadas cerradas de terreno disectado). El filtro tiene que ser por contexto (NDVI, geología kárstica) o por etiquetas a mano; FABDEM no hace falta.
- [ ] **Etiquetar a mano las 47 detecciones áridas** del informe (`informe/validacion_detector.pdf`). Son la clase "Tierra" de los modelos explicables; hoy tienen ruido (unas 14 son reales).
- [ ] **Modelos explicables** (`ciencia_datos/01_modelos_explicables.ipynb`). Hecha la primera versión; volver a correr cuando haya etiquetas limpias. Exporta `ciencia_datos/salidas/arbol.json` para la capa "método" de la web (falta conectarlo).
- [ ] **Variables del perfil del cráter** (en `analisis/`): pendiente de la pared, forma del fondo (taza o plano), continuidad del borde. A 200 m la forma en planta es casi ruido de cuadrícula (la mitad de los cráteres tiene menos de 20 píxeles).
- [ ] **¿Marte sale plano por el instrumento?** Revisar si HRSC+MOLA suaviza los cráteres frente a LOLA y Copernicus; bajaría el d/D marciano sin que sea geología.
- [ ] **Puntaje de análogo sin etiquetas terrestres** (`ciencia_datos/02`): modelo Luna contra Marte (75–77 %) más distancia a la nube Luna+Marte. Decidir si reemplaza o complementa al de `06_puntaje_forma.py` en la web.
- [ ] *(Opcional, si sobra tiempo)* **DeepMoon** (Silburt et al., 2019): red de detección de cráteres entrenada con LOLA. Pasarla sobre México para preguntar qué ve como cráter una red que solo conoce la Luna. Apuesta para el "sorpréndannos".

## Decisiones

| Fecha | Decisión | Por qué |
|---|---|---|
| — | Comparar los tres cuerpos a 200 m con el mismo detector | Una comparación justa y reproducible |
| 2026-11-14 | Usar modelos explicables (árbol de decisión poco profundo, regresión logística), no redes neuronales, para separar Luna, Marte y Tierra | Hay pocos cráteres terrestres confiables (decenas) y el reto pide justificar la analogía y decir dónde se rompe |
| 2026-11-14 | Para modelar, Tierra = solo detecciones áridas (NDVI p90 < 0.35) hasta tener etiquetas a mano; no cambiar a FABDEM | Con las 668 el modelo aprende a reconocer dolinas y cañadas de sierras húmedas, no cráteres. FABDEM solo quita 15 % de esas detecciones: la causa es el terreno, no los árboles |
| 2026-11-14 | Validar con grupos espaciales (`StratifiedGroupKFold`, bloques de ~50 km) y exactitud balanceada; puntajes de análogo siempre fuera de pliegue | Evita resultados inflados por cráteres vecinos y por el desbalance (4,288 lunares contra 47 terrestres) |
| 2026-11-14 | Sin `elev_m` como variable | Cada cuerpo tiene su propio nivel de referencia; sería fuga de información |

## Bitácora

- **2026-11-14:** se revisó la transcripción del video del autor. Se definió el reto principal y las mejoras propuestas (arriba).
- **2026-11-14:** primer notebook de modelos explicables (`ciencia_datos/01_modelos_explicables.ipynb`, datos copiados en `ciencia_datos/datos/` porque `respaldo/` no está en git). Con Tierra = 47 detecciones áridas: regresión logística 55 % y árbol de profundidad 3 51 % de exactitud balanceada fuera de pliegue (al azar: 32 %). La regla principal es profundidad / diámetro (Luna 0.060, México árido 0.034, Marte 0.027); la segunda, la altura del borde. Las formas se traslapan mucho: en forma, los cráteres áridos de México son análogos creíbles. Las minas (Real de Ángeles, Peñasquito) y MacDougal salen "lunares". Entrenado con las 668, el modelo llama Tierra al 60 % de las detecciones en zonas húmedas y solo al 28 % de las áridas: aprende esas depresiones, no los cráteres.
- **2026-11-14:** la sesión del Colab probó FABDEM en 6 bloques de 160 km: no elimina las detecciones de zonas húmedas (−15 %). Son dolinas y cañadas reales, no un artefacto de las copas de árboles. Se corrigió el informe (commit 0b01b72) y el texto del notebook.
- **2026-11-14:** diagnóstico de los modelos (`ciencia_datos/02_diagnostico_y_mejoras.ipynb`, 10 repeticiones de CV por grupos). El desbalance ya estaba atendido (sin pesos el modelo solo dice "Luna"; el submuestreo no agrega). El cuello de botella son las etiquetas de la Tierra: con los 15 verificados (10 minas, 5 naturales) sube de 56 % a 70 %. El aspecto no aporta; el relleno solo reconoce hoyas terrestres irregulares. Quitar el anillo lunar no cambia nada. Luna contra Marte separa 75–77 %; con ese modelo, 85 % de los cráteres áridos de México cae dentro de la nube Luna+Marte. Los que quedan fuera son los más hondos (minas, Sykes): más hondos que la Luna, así que la analogía se rompe por exceso.
