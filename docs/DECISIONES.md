# Decisiones del equipo

> Solo lo edita el integrador. Formato: fecha · decisión · por qué · quién la tomó.

- 14 nov · Concepto: buscador de análogos con datos NASA (núcleo) + juego web 2D de construir y probar robots · reunión del equipo.
- ~~14 nov · Modelo = comparador transparente de variables v0 (no "IA entrenada") · validez ante jueces.~~
  **REEMPLAZADA** por "El detector de cráteres de Mario es el núcleo del modelo" (abajo).
- 14 nov · MVP: Marte (Jezero); el modelo también calcula para el polo sur lunar · cubrir ambas mitades del reto.
  **REEMPLAZADA** por "Destinos finales: Luna y Marte; el jugador elige" (abajo).
- 14 nov · Fuente única de contexto: AGENTS.md (CLAUDE.md lo importa) · Claude Code y Codex leen lo mismo.
- 14 nov · El detector de cráteres de Mario es el núcleo del modelo; forma = dimensión principal · datos reales y validados.
- 14 nov · web/ = página pública del proyecto en inglés; el juego no duplica mapa ni fichas · evitar trabajo duplicado.
- 14 nov · Alcance global (zonas áridas del mundo); México como caso destacado · el reto pide buscar en cualquier lugar de la Tierra.
- 14 nov · Destinos finales: Luna (polo sur, Artemis) y Marte (Jezero); el jugador elige · cubrir las dos mitades del reto (los datos del detector favorecen la Luna).
- 14 nov · Arte en pixel art 2D, vista lateral, todo propio (ver assets/README.md) · lo definen los frentes de arte y juego.

- 14 nov · Integración confirma puntuación: máximo 1,000; sin entrega 0 puntos/estrellas; entrega 1 estrella, 2 desde 750 y 3 desde 900. Valores de juego.
- 14 nov · Publicación acordada: VPS del usuario, web en raíz y juego en /game/; acceso SSH, dominio y directorio pendientes. VITE_GAME_URL=/game/ y build del juego con --base=/game/.
- 14 nov · Expediente usa sitios con perfil de al menos dos muestras o estado distinto de candidato_modelo; el catálogo científico completo se mantiene en TODOS_LOS_SITIOS.
- 14 nov · Nombre del juego: MARSCEPTION; arte de Mauricio hecho con apoyo de IA (Claude), se declara en la entrega · decisión del equipo (juego y arte).

- 14 nov · Integración: límite real de 60 fps (target y limit) con runner fijo de Matter, para evitar doble velocidad en monitores de alta frecuencia. Prueba con reloj sintético a 60/120/144/240 Hz.
- 14 nov · Marte conserva 3.71 m/s², gravedad ecuatorial de NASA JPL (https://ssd.jpl.nasa.gov/planets/phys_par.html, consultada 2026-11-14). La Mars Fact Sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) usa 3.73 como gravedad media. Son convenciones distintas; la demo usa 3.71 uniformemente, no una medición local de Jezero.

- 14 nov · Precio por pieza para el MVP (presupuesto 1,000, robot mínimo 730); el precio por kilo del libro de datos de taller queda como mejora posterior · el camino dorado está calibrado con este modelo.

## 15 nov 2026 · Física 2 por defecto y camino dorado lunar en Al Hutaymah (Edmundo)
- **Física 2 por defecto** (`game/src/fisica/version.js`, `?fisica=1` vuelve a la anterior): tracción por Mohr–Coulomb (H = A·c + W·tan φ) y hundimiento de Bekker–Wong; ver `docs/juego/FISICA_V2.md`. Parámetros con fuente donde existen; kc, kφ, n del regolito y la calibración con Matter son (P). El drift de Marte usa el simulante M90 (preprint, S63): reemplaza la decisión del 14 nov de no simular hundimiento en Marte.
- **Camino dorado lunar:** de maar Al Wahbah (g00281) a **maar Al Hutaymah (g00263, 54 % de parecido)**. Motivo: con la regla de superficies v2 de Mario (paredes > 15° = roca, más realista), en g00281 la rueda estándar pasa y la ancha se queda sin energía. En g00263 con física 2 la estándar se hunde y se atasca y la ancha pasa (E 38 %); la misión lunar entrega con la ancha.
- **Orden de sitios en el Expediente:** se respeta el orden del modelo por similitud (opción A); el camino dorado de Marte (Samalayuca) queda en la página 2.
- **5 niveles destacados** (todos distintos): Jabal Bayda (toba), Tenoumer (impacto en desierto), Cananea (mina), Pinacate (lava), Pingualuit (impacto helado). Ver `docs/juego/NIVELES_DESTACADOS.md`.

## 15 nov 2026 (madrugada) · Integración nocturna (Edmundo dormido; integración a cargo del agente de Edmundo)
- **Física 2 robusta:** las caras de duna recreadas se limitan a 30° de pendiente total (límite inferior del ángulo de reposo, Pelletier 2015); antes llegaban a 36–39° y el camino dorado quedaba al límite. Valores verificados por Leo (docs/taller/FUENTES_FISICA.md): Luna c 0.52 kPa, φ 42°; drift de Marte c 1.6 kPa (Moore); ceniza c 0; suelo compacto φ 38°; roca de la Tierra μ 0.7 (P). En misiones el robot frena solo sobre rocas recreadas (v ≤ 1.5·√(2gH)/sin α, P), como la navegación autónoma de los rovers. Camino dorado 5/5 en simulador y en tiempo real.
- **Niveles destacados (7):** Jabal Bayda, Tenoumer, Cananea, Pinacate, Pingualuit, Samalayuca (solo ambiente, es el camino dorado) y Rincón de Parangueo. En Cananea y Pingualuit la pieza clave pasa a la rueda de malla (con roca μ 0.7 la ancha queda al límite).
- **Música** (#98 Leo, #103 Diego): por escena, fundido cruzado, control propio (tecla U), separado del silencio de efectos (M).
- **ANA, la tutora de análogos** (#102 Mario): reglas sin red + /tutor con IA en el servidor (sin llave responde con reglas). Es un extra (AGENTS §15).
- **Presupuesto:** sigue fijo en 1000 hasta que Edmundo decida (propuesta en docs/juego/PRESUPUESTO.md).
- **15 nov, 9:05 · Presupuesto (Edmundo): se queda fijo en 1,000 créditos** para todos los niveles (todos pasan con algún diseño ≤ 1,000). La fórmula por nivel de docs/juego/PRESUPUESTO.md queda como mejora futura.
