// Niveles destacados: los 5 sitios de mayor similitud, todos distintos, más Samalayuca (camino dorado de Marte, solo ambiente)
// y la Hoya Rincón de Parangueo (maar con lago seco salino) (docs/juego/NIVELES_DESTACADOS.md).
// Dueño: frente juego. Cada nivel declara qué agrega al perfil real del DEM: bloques (cuerpos físicos), parches de superficie
// (agarre o hundimiento), viento con su partícula y eventos de fondo. Todo lo agregado es RECREACIÓN (`recreacion: true` al
// generarse) y todo número que no trae fuente es valor de juego (P). Los datos del clima salen de content/clima_niveles.js.
//
// Parches: `superficie` = superficie equivalente que ve la física (arena | roca | compacto: lo único que acepta el esquema y
// suelo_v2.js) y `agarre` = factor sobre la fricción de la rueda en el parche (P). Bloques: radio, cuánto asoma (fracción del
// radio) y separación en metros (P). `danio` = puntos de resistencia del chasis por m/s de golpe sobre `umbral_ms` (P).
// `soloSobre` = el parche solo se pone donde el perfil del DEM tiene esa superficie (p. ej. el piso «compacto» de un lago seco).
// `solo_visual: true` = el nivel solo agrega ambiente: sin cuerpos ni parches, el viento no empuja (`viento.empuja: false`) y
// los eventos no tocan la física (el remolino no baja la luz del panel). Es el caso del camino dorado (Samalayuca).

export const NIVELES_DESTACADOS = {
  g00266: {
    lugar: { es: 'Anillo de toba Jabal Bayda', en: 'Jabal Bayda tuff ring' },
    tipo: 'volcan_toba',
    destino: 'jezero',
    fondo: 'toba', // arte de Mauricio (#94): cono de toba sobre lava
    entrena: {
      es: 'Cruzar lapilli y bombas volcánicas con viento, como el suelo suelto de Marte',
      en: 'Cross lapilli and volcanic bombs in the wind, like the loose soil of Mars',
    },
    // Versión corta solo para la cabecera del Expediente (≤ ~34 caracteres; la frase completa sale en la tarjeta).
    entrena_corto: { es: 'Lapilli, bombas y viento', en: 'Lapilli, volcanic bombs and wind' },
    analogia: {
      es: 'Anillo de toba de comendita (una riolita) en Harrat Khaybar, con depósitos ricos en lapilli y bombas en coliflor (S106, S108). En Marte el viento mueve polvo y arena, pero empuja mucho menos: su aire tiene apenas ~1.4 % de la densidad del aire terrestre.',
      en: 'Comendite (a rhyolite) tuff ring in Harrat Khaybar, with lapilli-rich deposits and cauliflower bombs (S106, S108). On Mars wind moves dust and sand, but it pushes far less: the air is only ~1.4 % as dense as Earth\'s.',
    },
    parches: [
      // Lapilli de toba sueltos (S108; antes decía «ceniza blanda», que ninguna fuente dice). Material granular sin consolidar:
      // arena para la física (se hunde, Bekker de arena seca genérica, P) y −40 % de agarre (P), igual que en el balance medido
      // (no hay Bekker de lapilli con fuente). Ángulo de reposo de ceniza y escoria 25–32° (NPS, S61): solo en tramos de ≤ 18°.
      // La clase interna sigue siendo 'toba' para no mover los parches (su semilla usa la clase).
      { clase: 'toba', arte: 'obstaculo_toba', cada: [18, 24], largo: [9, 13], pendienteMax: 18, superficie: 'arena', agarre: 0.6 },
    ],
    bloques: [
      // Bombas y bloques volcánicos sueltos (0.3–0.6 m), arte de roca (P).
      { clase: 'bomba', arte: ['obstaculo_roca_1', 'obstaculo_roca_2', 'obstaculo_roca_3'], cada: [26, 40], radio: [0.15, 0.3], asoma: 0.7, pendienteMax: 14 },
    ],
    viento: { particula: 'ceniza' },
    eventos: ['rafaga_polvo'],
    pieza_clave: ['rueda_ancha', 'rueda_malla'],
  },

  tenoumer: {
    lugar: { es: 'Cráter de impacto Tenoumer', en: 'Tenoumer impact crater' },
    tipo: 'impacto_desierto',
    destino: 'jezero',
    fondo: 'sahara', // arte de Mauricio (#94): mesetas y llanura de grava del Sáhara
    entrena: {
      es: 'Cruzar arena y subir el borde de un cráter entre bloques de eyecta: ruedas grandes y la carga bien sujeta',
      en: 'Cross sand and climb a crater rim among ejecta blocks: big wheels and a well-strapped payload',
    },
    entrena_corto: { es: 'Arena, borde y eyecta', en: 'Sand, rim and ejecta blocks' },
    analogia: {
      es: 'Cráter de impacto real de 1.9 km y 1.57 millones de años (S125–S127) en el desierto: borde levantado, eyecta muy erosionada y arena, como los cráteres de Marte. Jezero tiene más remolinos de polvo que cualquier otro sitio visitado (S21).',
      en: 'Real 1.9 km impact crater, 1.57 million years old (S125–S127), in a desert: raised rim, heavily eroded ejecta and sand, like craters on Mars. Jezero has more dust devils than any other site visited (S21).',
    },
    parches: [],
    bloques: [
      // Bloques de eyecta (0.6–1 m), más altos que una roca suelta. Una rueda más grande (malla, 0.55 m de radio) los pasa
      // mejor; las correas (paredes de 0.35 m) retienen la carga en los saltos (probado con la física 2). Gap para Tenoumer (solo
      // hay bloques de brecha de cm a dm, docs/taller/FUENTES_NIVELES.md): separación y tamaño son (P). Regla general disponible:
      // Golombek y Rapp 1997, reformulado en Golombek et al. 2012 (S86, S129; MR-071).
      { clase: 'eyecta', arte: ['obstaculo_eyecta_1', 'obstaculo_eyecta_2', 'obstaculo_eyecta_3'], cada: [12, 18], radio: [0.3, 0.5], asoma: 0.8, pendienteMax: 22 },
    ],
    viento: { particula: 'polvo' },
    eventos: ['remolino'],
    pieza_clave: ['rueda_malla', 'soporte_correas'], // ancha: a veces pasa y a veces no (Matter es caótico con los bloques)
  },

  mx0023: {
    lugar: { es: 'Tajo de Cananea', en: 'Cananea open pit' },
    tipo: 'mina',
    destino: 'polo_sur_lunar',
    fondo: 'mina',
    entrena: {
      es: 'Subir las rampas de un tajo con talud suelto que se hunde y piedras que ruedan, como una futura mina lunar (ISRU)',
      en: 'Climb the ramps of an open pit with loose talus that sinks and rolling stones, like a future lunar mine (ISRU)',
    },
    entrena_corto: { es: 'Rampas con talud suelto', en: 'Pit ramps with loose talus' },
    analogia: {
      es: 'Análogo operativo, no geológico, y la comparación es nuestra: un tajo escalonado como los que podría excavar la futura minería de recursos en la Luna (la NASA dice que lo aprendido en la minería se transfiere, pero no nombra ningún tajo como análogo, S140). El recorrido sigue el DEM de 30 m, que suaviza el tajo: las paredes reales tienen 40–50° (S138). En la Luna no hay viento.',
      en: 'Operational, not geological, analog, and the comparison is ours: a stepped pit like the ones future resource mining could dig on the Moon (NASA says mining lessons transfer, but names no pit as an analog, S140). The route follows the 30 m DEM, which smooths the pit: the real walls are 40–50° (S138). There is no wind on the Moon.',
    },
    parches: [
      // Talud de roca suelta en las paredes de los bancos: material granular sin cohesión. Sin parámetros de Bekker de talud con
      // fuente, se trata como arena suelta que se hunde (P) con −30 % de agarre (los fragmentos ruedan bajo la rueda) (P).
      // Probado (física 2): como «roca» con menos agarre no cambia nada, porque en roca la fricción de Matter no limita la subida.
      // Solo en tramos con algo de 12–30°: por debajo del ángulo de reposo de la roca suelta, 34–41° (típico 37°; Call 1985, S138).
      { clase: 'talud', arte: 'obstaculo_talud', cada: [16, 24], largo: [6, 10], pendienteMin: 12, pendienteMax: 30, superficie: 'arena', agarre: 0.7 },
    ],
    bloques: [],
    viento: { particula: 'polvo' },
    eventos: ['desprendimiento'],
    pieza_clave: ['rueda_malla'], // ancha: 2 de 5 desde roca μ ≈ 0.7 (pared de roca de 23.6°; FISICA_V2.md §5.2)
  },

  pinacate: {
    lugar: { es: 'Campo volcánico El Pinacate', en: 'El Pinacate volcanic field' },
    tipo: 'lava',
    destino: 'polo_sur_lunar',
    fondo: 'lava',
    entrena: {
      es: 'Pasar bloques de lava aa donde la NASA entrenó a la tripulación del Apolo 14 (1970): frena o blinda el robot',
      en: 'Cross aa lava blocks where NASA trained the Apollo 14 crew (1970): slow down or armor the robot',
    },
    entrena_corto: { es: 'Lava aa filosa: frena o blinda', en: 'Sharp aa lava: slow down or armor' },
    analogia: {
      es: 'Campo basáltico donde la NASA entrenó a la tripulación del Apolo 14 (feb. 1970) en cráteres y coladas (S115); la mayoría de sus flujos son aa (S110, S111). Los mares lunares son de basalto, pero cubierto de regolito; la Tierra no reproduce el vacío ni la gravedad.',
      en: 'Basalt field where NASA trained the Apollo 14 crew (Feb. 1970) on craters and lava flows (S115); most of its flows are aa (S110, S111). The lunar maria are basalt, but covered in regolith; Earth does not reproduce the vacuum or the gravity.',
    },
    parches: [],
    bloques: [
      // Bloques de lava aa (escoria áspera y cortante). Tamaño (P): Gap para Pinacate; en aa en general la mayoría mide < 0.3 m
      // y el máximo 0.1–0.6 m (S113, S114): los de 0.5–0.8 m del juego son grandes a propósito. Golpearlos a más de 3.5 m/s (el mismo umbral del daño del chasis, danio.js)
      // quita 2 puntos de resistencia por m/s extra, también con las ruedas (P). Despacio no hay daño.
      { clase: 'lava_aa', arte: ['obstaculo_lava_aa_1', 'obstaculo_lava_aa_2'], cada: [16, 24], radio: [0.25, 0.4], asoma: 0.75, pendienteMax: 26, danio: { umbral_ms: 3.5, por_ms: 2 } },
    ],
    viento: { particula: 'ceniza' },
    eventos: [],
    pieza_clave: ['chasis_reforzado', 'chasis_titanio'],
  },

  pingualuit: {
    lugar: { es: 'Cráter de impacto Pingualuit', en: 'Pingualuit impact crater' },
    tipo: 'impacto_helado',
    destino: 'jezero',
    fondo: 'artico', // arte de Mauricio (#94): tundra nevada y lago helado
    entrena: {
      es: 'Cruzar nieve profunda y hielo (P) con frío ártico y el viento más fuerte de todos los niveles',
      en: 'Cross deep snow and ice (P) in Arctic cold and the strongest wind of all the levels',
    },
    entrena_corto: { es: 'Nieve, hielo y viento ártico', en: 'Deep snow, ice and Arctic wind' },
    analogia: {
      es: 'Cráter de impacto real de 3.4 km en el Ártico (S131), con nieve la mayor parte del año (en julio y agosto, 2–3 cm; NASA POWER). Marte tiene hielo y frío, pero su aire, con apenas ~1.4 % de la densidad del terrestre, casi no empuja. La nieve como análogo de Marte es una abstracción del juego (P): ningún rover se probó en nieve para Marte (Gap).',
      en: 'Real 3.4 km impact crater in the Arctic (S131), with snow most of the year (2–3 cm in July and August; NASA POWER). Mars has ice and cold, but its air, only ~1.4 % as dense as Earth\'s, barely pushes. Snow as a Mars analog is a game abstraction (P): no rover was tested on snow for Mars (Gap).',
    },
    parches: [
      // Nieve: sin parámetros de nieve con fuente (FISICA_V2.md §3), se trata como arena suelta que se hunde (P).
      // Casi continua: SNODP medio 38.5 cm (2.5–70 cm de media mensual; julio y agosto solo 2–3 cm, NASA POWER). −50 % de agarre (P).
      { clase: 'nieve', arte: 'obstaculo_arena_blanda', tinte: 0xf2f6ff, cada: [11, 12], largo: [10, 11], pendienteMax: 30, superficie: 'arena', agarre: 0.5 },
      // Hielo: compacto con −65 % de agarre (P; ningún dato de fricción de hielo en el libro de datos).
      { clase: 'hielo', arte: 'obstaculo_hielo', cada: [34, 46], largo: [5, 8], pendienteMax: 8, superficie: 'compacto', agarre: 0.35 },
    ],
    bloques: [],
    viento: { particula: 'nieve' },
    eventos: ['nieve_sopla'],
    pieza_clave: ['rueda_malla'], // ancha: 4 de 5 (pared de roca de 30° con μ ≈ 0.7); el calentador quita la pérdida por frío (1 %), no decide
  },

  // 6. Camino dorado de Marte (AGENTS.md §11): la estándar se hunde en las dunas y la ancha pasa. Está calibrado con la física 2
  // (FISICA_V2.md §5), así que aquí SOLO se agrega ambiente: nada de parches, bloques ni fuerza del viento sobre el robot.
  samalayuca: {
    lugar: { es: 'Médanos de Samalayuca', en: 'Samalayuca dunes' },
    tipo: 'dunas',
    destino: 'jezero',
    fondo: 'dunas',
    solo_visual: true,
    entrena: {
      es: 'Subir y bajar dunas de arena suelta sin hundirse, como en la arena que mueve el viento en Marte',
      en: 'Climb up and down loose-sand dunes without sinking, like the wind-blown sand on Mars',
    },
    entrena_corto: { es: 'Dunas de arena suelta', en: 'Loose-sand dunes without sinking' },
    analogia: {
      es: 'Dunas formadas por el viento: las de la Tierra y las de Marte tienen la misma forma y los mismos procesos (Curiosity en las dunas Bagnold, S143, S144); ningún artículo usa Samalayuca por nombre (Gap). Aquí la arena es de cuarzo (S141); la de Marte es basáltica y necesita ~7 veces más viento para moverse (S145, S146). El viento que se ve es el real del sitio (NASA POWER), pero en este nivel no empuja al robot: la prueba está calibrada sin él.',
      en: 'Wind-built dunes: Earth and Mars dunes share the same shapes and processes (Curiosity at the Bagnold dunes, S143, S144); no paper uses Samalayuca by name (Gap). The sand here is quartz (S141); Mars sand is basaltic and needs ~7 times more wind to move (S145, S146). The wind you see is the site\'s real wind (NASA POWER), but in this level it does not push the robot: the test is calibrated without it.',
    },
    parches: [],
    bloques: [],
    viento: { particula: 'arena', empuja: false },
    // Remolinos solo visuales (no bajan la luz del panel aquí) y arena que se vuela de las crestas de duna con las ráfagas.
    eventos: ['remolino', 'cresta_humea'],
    pieza_clave: ['rueda_ancha'],
  },

  // 7. Maar con lago desecado. Su gemelo de forma es un cráter del polo sur lunar (data/sites/mx0261.json: destino_ref).
  // Fuentes del lago: Aranda-Gómez et al. 2013 (Bol. Soc. Geol. Mex. 65(1): lago perenne hasta los años ochenta, desecado por
  // la sobreexplotación del acuífero, hoy lago-playa con evaporitas abundantes —trona, termonatrita, eitelita, halita, silvita—;
  // el más salino de la región) y Sánchez-Sánchez et al. 2021 (RMCG 38(3): capa de lodo saturado y móvil bajo el piso seco).
  mx0261: {
    lugar: { es: 'Hoya Rincón de Parangueo', en: 'Rincón de Parangueo maar' },
    tipo: 'maar_salino',
    destino: 'polo_sur_lunar',
    fondo: 'salar', // arte de Mauricio (#111): pared del maar, antigua orilla, estromatolitos y lago seco con sal cuarteada
    entrena: {
      es: 'Cruzar costra de sal y lodo blando en el fondo de un cráter y subir su pared, en un recorrido largo que exige energía',
      en: 'Cross salt crust and soft mud on a crater floor and climb its wall, on a long route that takes a lot of energy',
    },
    entrena_corto: { es: 'Sal, lodo y un recorrido largo', en: 'Salt crust, mud and a long route' },
    analogia: {
      es: 'Maar real (cráter volcánico) con un lago desecado desde los años ochenta: hoy es un lecho seco con costra de sales (Aranda-Gómez et al. 2013) y lodo bajo la costra (Sánchez-Sánchez et al. 2021). El parecido con el polo sur lunar es la forma del cráter (1.4 km y 104 m de hondo, medidos por el detector); en la Luna no hay sal, agua ni aire. Comparación nuestra (ningún artículo usa Rincón como análogo): Marte también tiene sales de lagos que se evaporaron (sulfatos en Gale; cloruros, sulfatos y percloratos en Jezero; S121–S124), pero distintas de los carbonatos de sodio de aquí.',
      en: 'Real maar (volcanic crater) with a lake dried up since the 1980s: today it is a playa with a salt crust (Aranda-Gómez et al. 2013) and mud under the crust (Sánchez-Sánchez et al. 2021). The likeness to the lunar south pole is the crater shape (1.4 km and 104 m deep, measured by the detector); the Moon has no salt, water or air. Our own comparison (no paper uses Rincón as an analog): Mars also has salts from evaporated lakes (sulfates at Gale; chlorides, sulfates and perchlorates at Jezero; S121–S124), but they differ from the sodium carbonates here.',
    },
    parches: [
      // Lodo del lago donde la costra se rompe: sin parámetros de Bekker de lodo lacustre con fuente, se trata como arena suelta
      // que se hunde (P) con −40 % de agarre (P).
      { clase: 'lodo', arte: 'obstaculo_lodo', cada: [18, 22], largo: [4, 6], pendienteMax: 6, soloSobre: 'compacto', superficie: 'arena', agarre: 0.6 },
      // Costra de evaporitas sobre el piso del lago seco (solo donde el DEM tiene el piso «compacto»): dura, no se hunde; −30 %
      // de agarre (P; sin dato de fricción de costra salina en el libro de datos).
      { clase: 'sal', arte: 'obstaculo_sal', cada: [5, 6], largo: [3, 5], pendienteMax: 6, soloSobre: 'compacto', superficie: 'compacto', agarre: 0.7 },
    ],
    bloques: [],
    viento: { particula: 'sal' },
    // Espejismo sobre la playa caliente y polvo salino con las ráfagas: visuales (el empuje lo hace el viento).
    eventos: ['espejismo', 'polvo_salino'],
    // El cráter es ancho (546 m de recorrido, sube 96 m): con la batería chica ninguna rueda llega (física 2); pide batería.
    pieza_clave: ['bateria_mediana', 'bateria_grande'],
  },
};

/** Misiones finales: solo viento (si hay aire) y eventos de fondo; no se agregan obstáculos (camino dorado calibrado). */
export const MISIONES_DESTACADAS = {
  jezero: { viento: { particula: 'polvo' }, eventos: ['remolino', 'fobos'] },
  polo_sur_lunar: { viento: null, eventos: ['tierra', 'micrometeorito'] },
};

/** Configuración del nivel en curso o null: prueba → sitio destacado; misión → destino. */
export function configDeNivel({ modo, sitioId, destinoId }) {
  if (modo === 'prueba') return NIVELES_DESTACADOS[sitioId] ?? null;
  return MISIONES_DESTACADAS[destinoId] ?? null;
}

export const ES_DESTACADO = (id) => Object.hasOwn(NIVELES_DESTACADOS, id);
