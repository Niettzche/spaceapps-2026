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

## Decisiones

| Fecha | Decisión | Por qué |
|---|---|---|
| — | Comparar los tres cuerpos a 200 m con el mismo detector | Una comparación justa y reproducible |

## Bitácora

- **2026-11-14:** se revisó la transcripción del video del autor. Se definió el reto principal y las mejoras propuestas (arriba).
