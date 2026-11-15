# Plan: tutorial guiado, Taller accesible, 15 niveles y remake del manejo (15 nov 2026)

> Retro de Edmundo tras probar el rediseño. Objetivo: que el juego **se entienda solo**, que **manejar se sienta bien** y que
> cada nivel **enseñe una analogía real**, siempre fiel a los datos y a la física (AGENTS.md §3 regla 3: nunca inventar datos;
> valores de juego marcados (P)). Este plan se aprueba antes de ejecutarlo.

## 0. Lo que tenemos hoy (base)
- Manejo lateral en Matter.js: robot de 2 ejes, agarre = (agarre de la pieza)² × tan φ del suelo, masa, fuerza/consumo del motor,
  daño por sacudidas a la carga, energía por tiempo de acelerador, clima por nivel (frío, calor del motor, luz), rocas y arena blanda
  recreadas, tramo crítico real de 250 m del DEM.
- Velocidad máx. 6 m/s (eficiente). Subirla sola rompió el camino dorado (la estándar pasaba las dunas): hay que rebalancear con
  un modelo de suelo mejor, no con un número.
- 4 niveles terrestres jugables + 2 misiones. **PR #90 de Mario: 15 niveles con relieve real** (10 Luna, 5 Marte): 4 cráteres con
  fuente (Jabal Bayda, Al Hutaymah, Colton, Rincón de Parangueo), 4 cráteres de impacto nuevos (Meteor, Tenoumer, Roter Kamm,
  Talemzane) y 3 tajos mineros (Cananea, La Herradura, Peñasquito). Sin obstáculos todavía.
- Auditoría de accesibilidad de Leo (PR #91): teclado completo ✓; faltan zonas táctiles ≥ 64×44 (16 controles, flechas del
  catálogo del Taller), contraste de la pausa (3.6:1), textos de 12 px en el terreno («META», «ZONA DE ENTREGA»).

## 1. Tutorial guiado desde que eliges planeta (Fase 1)
La astronauta guía (arte de Mauricio, ya usada en el Expediente) acompaña la primera partida:
1. **Al elegir Luna o Marte:** resumen de 4 viñetas de 10 s («Elige un lugar de la Tierra parecido → arma tu robot → pruébalo
   aquí → llévalo a Marte»), con las viñetas del tutorial de Mauricio. Saltable, se recuerda.
2. **Expediente:** el tutorial de 6 pasos que ya existe.
3. **Taller:** 4 pasos sobre el propio Taller: «arrastra una rueda a su eje» (espera a que lo hagas), «mira el presupuesto», «el
   agarre cambia según el suelo», «prueba el robot».
4. **Primera prueba:** controles con el dedo/teclado resaltados y «tu meta está aquí» señalando la bandera.
5. **Primera misión:** «aquí pesas menos: frena antes» y la zona de entrega resaltada.
Todo con `?` para repetir y Esc para saltar; la e2e lo marca como visto.

## 2. Taller: tamaños y accesibilidad (Fase 1)
- Zonas táctiles ≥ 64×44 en todo (flechas del catálogo, pestañas, sockets, botones de pintura).
- Tarjetas de la bandeja más grandes (ícono 32 px ×2, nombre y costo a 16 px), 4 por página en teléfono.
- Foco de teclado muy visible (marco amarillo grueso) y orden lógico: pestañas → bandeja → sockets → acciones.
- Barras con número **y** patrón (no solo color) para daltonismo.
- «Leer en voz alta» opcional del panel de stats (Web Speech API) y resumen textual del diseño para lector de pantalla
  (un `aria-live` en HTML sobre el lienzo).
- Correcciones de la auditoría de Leo: pausa con botones opacos, textos del terreno a 16 px, filas del Expediente a 44 px.

## 3. Los 15 niveles de Mario, más analógicos (Fase 2)
Cada nivel enseña **un proceso real** y su obstáculo sale de **la geología del lugar**, no de un dado:

| Tipo de lugar | Analogía con el destino | Obstáculos (fuente) |
|---|---|---|
| Cráter de impacto (Meteor, Tenoumer, Roter Kamm, Talemzane, Colton…) | Borde de cráter lunar/marciano: subir el borde levantado y bajar al piso | Bloques de eyecta cerca del borde, tamaño según distribución de rocas (Golombek & Rapp 1997 para Marte; densidad de bloques junto a cráteres lunares: **Leo verifica fuente**); pared con la pendiente real del DEM |
| Maar (Al Wahbah, Jabal Bayda, Al Hutaymah, Rincón de Parangueo) | Cráter volcánico / depresión con piso plano | Toba suelta en la pared, piso de sal o sedimento compacto |
| Tajo minero (Cananea, La Herradura, Peñasquito, Real de Ángeles) | Terrazas y taludes = paredes escalonadas (operación minera lunar ISRU) | Bancos escalonados reales del DEM, talud de roca suelta (ángulo de reposo) |
| Dunas (Samalayuca) | Procesos eólicos de Marte | Caras de avalancha a ~32° (Pelletier 2015, ya citado) |
| Lava (Pinacate) | Campos de lava | Bloques de lava aa, escalones de colada |

- La ventana crítica (ya automática) elige el tramo más difícil y transitable de cada transecto.
- Cada nivel muestra en el Expediente **qué entrena** («subir un borde de cráter con eyecta») y en Resultados **dónde se rompe la
  analogía** (ya existe).
- Revisar los 3 riesgos que declara Mario: tajos de 34–37° (Cananea), «arena 100 %» de OpenLandMap en paredes (corregir a roca con
  pendiente > umbral), Talemzane de relieve bajo.

## 4. Remake del manejo (Fase 2–3) — la parte grande
### 4.1 Modelo de suelo real (lo que hace que las piezas importen de verdad)
Pasar de «agarre² × tan φ» a **terramecánica simplificada**, con datos con fuente donde existen:
- **Tracción por Mohr–Coulomb (Bekker):** empuje máximo = A·c + W·tan φ (A = área de contacto de la rueda, c = cohesión,
  φ = ángulo de fricción interna, W = peso sobre la rueda). φ ya está con fuente (Apolo 30–50°, Viking 15.6–39.2°); c del regolito
  lunar ~0.1–1 kPa (Lunar Sourcebook; **Leo verifica**). Así una rueda ancha agarra más **porque tiene más área**, no por un número.
- **Hundimiento:** presión = W/A; ruedas angostas se hunden en arena suelta y gastan más energía (resistencia a la rodadura). Los
  parámetros de Bekker (kc, kφ, n) **no tienen fuente para el regolito** (lo dijo Leo): se usan como (P) declarados.
- **Gravedad real** reduce W → menos tracción en Marte/Luna (ya se explica en la llegada).
- **Materiales con impacto real:** densidad y resistencia de la hoja Materials (aluminio, titanio, acero, fibra de carbono) para
  chasis y rines; Nitinol amortigua; aerogel/Kapton aíslan del frío (hoja Materials, con fuente).

### 4.2 Sensación de manejo
- Un poco más rápido (meta 7–7.5 m/s con el motor eficiente) **rebalanceado** con el modelo de suelo para que el camino dorado siga
  igual (estándar se hunde/patina en dunas; ancha pasa).
- Cámara con anticipación (mira hacia adelante), sacudidas de cámara en impactos, polvo según suelo, sonido del motor por carga.
- Suspensión visible (los resortes ya existen): opción de **suspensión** en el Taller (blanda/dura) y, si da tiempo, **rocker-bogie
  de 6 ruedas** (Curiosity/Perseverance, con fuente) como chasis especial.

### 4.3 Más personalizable
- Ranura de **suspensión** y de **sensor/faro** (faro útil en sombras del polo sur lunar; cámara que muestra obstáculos adelante).
- Diámetro/ancho de rueda como variantes (el área de contacto ya importa en 4.1).
- Pintura y nombre (ya existen).

### 4.4 Eventos aleatorios de fondo (con semilla por nivel, declarados como recreación)
| Destino | Evento | ¿Afecta la física? |
|---|---|---|
| Marte | Remolinos de polvo (observados por Perseverance/Spirit) | Sí, leve: −luz solar unos segundos (P) |
| Marte | Tormenta de polvo lejana | Solo luz (P) |
| Marte | Tránsito de Fobos | No (visual) |
| Luna | Salida de la Tierra en el horizonte, sombras largas del Sol rasante | No |
| Luna | Destello de micrometeorito | No (visual) |
| Tierra | Viento, aves, calor (espejismo) | Viento: leve en dunas (P) |

### 4.5 Niveles finales
- **Misión final de Marte:** frente del delta de Jezero (perfil real del destino) con bloques y arena.
- **Misión final de la Luna:** borde iluminado cerca de Shackleton con cráteres pequeños (profundidad/diámetro del detector propio)
  y sombra permanente que exige faro.
- Combinan los obstáculos de los niveles terrestres que los entrenan.

## 5. Orden y riesgos (entrega: domingo 21:00, congelar funciones a las 12:00 según AGENTS §10)
| Fase | Qué | Cuándo | Quién |
|---|---|---|---|
| 1 | Tutorial guiado completo · Taller accesible · arreglos de la auditoría · integrar los 15 niveles (#90) | ahora → 06:00 | 2 agentes + revisión mía |
| 2 | Obstáculos geológicos por tipo de lugar · modelo de suelo (Mohr–Coulomb + hundimiento) detrás de una bandera `?fisica=2` · velocidad | 06:00 → 10:00 | 1–2 agentes; Leo verifica fuentes (c, φ, rocas) |
| 3 | Eventos de fondo · suspensión/sensor · misiones finales · activar fisica 2 si pasa la e2e | 10:00 → 12:00 | agentes; Mauricio arte de obstáculos y eventos |
| — | Congelar · pulido · e2e completa · publicar | 12:00 → 21:00 | todos |

**Riesgos:** cada e2e completa tarda ~40 min; el modelo de suelo puede romper el camino dorado (por eso va detrás de una bandera
hasta pasar la e2e); sin fuente para Bekker kc/kφ/n → se declaran (P).

## 6. Lo que necesitamos del equipo
- **Leo:** fuentes para cohesión c del regolito (Lunar Sourcebook), distribución de tamaño de rocas (Golombek & Rapp 1997 para
  Marte; bloques junto a cráteres lunares), remolinos de polvo de Perseverance (frecuencia/efecto en la luz), rocker-bogie
  (Curiosity/Perseverance). Una fila por dato en el Excel con ✓/Gap.
- **Mauricio:** obstáculos por tipo (bloques de eyecta, talud de mina, lava aa, toba), eventos (remolino de polvo, Fobos, salida de
  la Tierra, destello), piezas nuevas (suspensión, faro, rocker-bogie), viñetas del resumen al elegir planeta.
- **Mario:** confirmar superficies de las paredes (roca vs arena) en los 15 niveles; perfiles reales de las misiones finales
  (delta de Jezero, borde de Shackleton).
- **Diego/Alan:** prueba de 3 segundos y playtest con el tutorial nuevo; capturas para la entrega.
