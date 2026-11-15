// Niveles destacados: los 5 sitios de mayor similitud, todos distintos (docs/juego/NIVELES_DESTACADOS.md).
// Dueño: frente juego. Cada nivel declara qué agrega al perfil real del DEM: bloques (cuerpos físicos), parches de superficie
// (agarre o hundimiento), viento con su partícula y eventos de fondo. Todo lo agregado es RECREACIÓN (`recreacion: true` al
// generarse) y todo número que no trae fuente es valor de juego (P). Los datos del clima salen de content/clima_niveles.js.
//
// Parches: `superficie` = superficie equivalente que ve la física (arena | roca | compacto: lo único que acepta el esquema y
// suelo_v2.js) y `agarre` = factor sobre la fricción de la rueda en el parche (P). Bloques: radio, cuánto asoma (fracción del
// radio) y separación en metros (P). `danio` = puntos de resistencia del chasis por m/s de golpe sobre `umbral_ms` (P).

export const NIVELES_DESTACADOS = {
  g00266: {
    lugar: { es: 'Cono de toba Jabal Bayda', en: 'Jabal Bayda tuff cone' },
    tipo: 'volcan_toba',
    destino: 'jezero',
    fondo: 'maar',
    entrena: {
      es: 'Cruzar toba y ceniza blanda con viento y bombas volcánicas, como en el suelo suelto de Marte',
      en: 'Cross soft tuff and ash with wind and volcanic bombs, like loose soil on Mars',
    },
    analogia: {
      es: 'Depresión tipo cráter en un campo volcánico (Harrat Khaybar). En Marte el viento mueve polvo y arena, pero con aire 1 % de denso empuja mucho menos.',
      en: 'Crater-like depression in a volcanic field (Harrat Khaybar). On Mars wind moves dust and sand, but with 1 % of the air density it pushes far less.',
    },
    parches: [
      // Toba y ceniza sin consolidar: arena para la física (se hunde, Bekker de arena seca genérica) y −40 % de agarre (P).
      // Ángulo de reposo de ceniza y escoria 25–32° (NPS, S61): solo en tramos de ≤ 18° (más empinado, la ceniza no se queda).
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
    fondo: 'desierto',
    entrena: {
      es: 'Cruzar arena y subir el borde de un cráter entre bloques de eyecta: rueda grande y carga bien sujeta',
      en: 'Cross sand and climb a crater rim among ejecta blocks: big wheels and a well-strapped payload',
    },
    analogia: {
      es: 'Cráter de impacto real (Earth Impact Database) en desierto: borde levantado, eyecta y arena, como los cráteres de Marte. Jezero tiene más remolinos de polvo que cualquier otro sitio visitado (S21).',
      en: 'Real impact crater (Earth Impact Database) in a desert: raised rim, ejecta and sand, like craters on Mars. Jezero has more dust devils than any other site visited (S21).',
    },
    parches: [],
    bloques: [
      // Bloques de eyecta (0.6–1 m), más altos que una roca suelta. Una rueda más grande (malla, 0.55 m de radio) los pasa
      // mejor; las correas (paredes de 0.35 m) retienen la carga en los saltos (probado con la física 2). La densidad de bloques junto a cráteres no
      // tiene fuente en el libro de datos (Golombek y Rapp 1997 no está cargado): separación y tamaño son (P).
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
      es: 'Subir paredes de 25° con talud suelto que se hunde y piedras que ruedan, como una mina lunar (ISRU)',
      en: 'Climb 25° walls with loose talus that sinks and rolling stones, like a lunar mine (ISRU)',
    },
    analogia: {
      es: 'Análogo operativo, no geológico: un tajo escalonado como los que excavaría la minería de recursos en la Luna. En la Luna no hay viento.',
      en: 'Operational, not geological, analog: a stepped pit like the ones resource mining would dig on the Moon. There is no wind on the Moon.',
    },
    parches: [
      // Talud de roca suelta en las paredes de los bancos: material granular sin cohesión. Sin parámetros de Bekker de talud con
      // fuente, se trata como arena suelta que se hunde (P) con −30 % de agarre (los fragmentos ruedan bajo la rueda) (P).
      // Probado (física 2): como «roca» con menos agarre no cambia nada, porque en roca la fricción de Matter no limita la subida.
      // Solo en tramos con algo de 12–30°: el talud reposa por debajo de su ángulo de reposo (25–32° para material suelto, S61).
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
      es: 'Pasar bloques de lava aa que cortan el chasis: frena o blinda el robot',
      en: 'Cross aa lava blocks that cut the chassis: slow down or armor the robot',
    },
    analogia: {
      es: 'Basalto y cráteres volcánicos (maar El Elegante). Los mares lunares son basalto; la Tierra no reproduce el vacío ni la gravedad.',
      en: 'Basalt and volcanic craters (El Elegante maar). The lunar maria are basalt; Earth does not reproduce the vacuum or the gravity.',
    },
    parches: [],
    bloques: [
      // Bloques de lava aa (escoria áspera y cortante): golpearlos a más de 3.5 m/s (el mismo umbral del daño del chasis, danio.js)
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
    fondo: 'desierto',
    entrena: {
      es: 'Cruzar nieve profunda y hielo con frío ártico y el viento más fuerte de los cinco',
      en: 'Cross deep snow and ice in Arctic cold and the strongest wind of the five',
    },
    analogia: {
      es: 'Cráter de impacto real en el Ártico, con nieve en el suelo los 12 meses (NASA POWER). Marte tiene hielo y frío, pero su aire 1 % de denso casi no empuja.',
      en: 'Real impact crater in the Arctic, with snow on the ground all 12 months (NASA POWER). Mars has ice and cold, but its 1 %-dense air barely pushes.',
    },
    parches: [
      // Nieve: sin parámetros de nieve con fuente (FISICA_V2.md §3), se trata como arena suelta que se hunde (P).
      // Casi continua: SNODP medio 38.5 cm, con nieve los 12 meses (2.5–70 cm de media mensual, NASA POWER). −50 % de agarre (P).
      { clase: 'nieve', arte: 'obstaculo_arena_blanda', tinte: 0xf2f6ff, cada: [11, 12], largo: [10, 11], pendienteMax: 30, superficie: 'arena', agarre: 0.5 },
      // Hielo: compacto con −65 % de agarre (P; ningún dato de fricción de hielo en el libro de datos).
      { clase: 'hielo', arte: 'obstaculo_hielo', cada: [34, 46], largo: [5, 8], pendienteMax: 8, superficie: 'compacto', agarre: 0.35 },
    ],
    bloques: [],
    viento: { particula: 'nieve' },
    eventos: ['nieve_sopla'],
    pieza_clave: ['rueda_malla'], // ancha: 4 de 5 (pared de roca de 30° con μ ≈ 0.7); el calentador quita la pérdida por frío (1 %), no decide
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
