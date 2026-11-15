// Sprites de prioridad A (docs/juego/ASSETS_ARTE.md §3): robot, carga, astronauta, meta y zona de entrega.
// Se dibuja el interior y el contorno de 1 px sale automático (comun.contorno).
import { tira, filas, BASE, hex } from './comun.mjs';
import { PALETAS } from './paletas.mjs';

const BASE_HEX = {};
const hexDe = (c) => hex(c);

// Van en assets/entidades/: los íconos del taller (assets/iconos/<id>.png) usan los mismos nombres
// y el índice del juego toma el primero por orden de ruta ("entidades" < "iconos").
const D = 'entidades/';

export function generar() {
  // ---- chasis_ligero: 24 × 6, 2 cuadros (normal, dañado). Avanza a la derecha: faro a la derecha.
  const chasis = [
    [
      '........................',
      '.hhhhhhhhhhhhhhhhhhhhyY.',
      '.ccllloooooolllllllllyy.',
      '.mmmmmmmmmmdmmmmmmmdmmm.',
      '.ddddmddddddddddmdddddd.',
      '........................',
    ],
    [
      '........................',
      '.hhhhhhh..hhhhhxhhhhhdd.',
      '.ccllkOOOOOxlllllkllldd.',
      '.mmmmmkmmmmdmmxxmmmdmmm.',
      '.ddddmddkdddddddddmdxdd.',
      '........................',
    ],
  ];
  tira(D + 'chasis_ligero.png', 24, 6, 2, (p, i) => filas(p, chasis[i]));
  pinturas('chasis_ligero', chasis, 6);
  // materiales (SPRITES_PENDIENTES §7): mismo dibujo y tamaño que el chasis ligero, con la carrocería del material
  const MATERIALES = {
    chasis_titanio: ['#c8d4ec', '#8c9cc4', '#5a6a94', '#28304c'],      // gris metálico frío, azulado (distinto del ligero)
    chasis_carbono: ['#6a6a78', '#3a3a46', '#22222c', '#0a0a10'],      // negro
  };
  for (const [id, [h, l, m, d]] of Object.entries(MATERIALES)) {
    const pal = { ...BASE, h, l, m, d };
    tira(D + id + '.png', 24, 6, 2, (q, i) => {
      filas(q, chasis[i], 0, 0, pal);
      if (id === 'chasis_carbono') for (let x = 2; x < 22; x++) if ((x >> 1) % 2 === 0 && !/[kxO]/.test(chasis[i][3][x])) q.px(x, 3, hex('#3a3a46'));   // trama tejida
    });
  }

  // ---- rueda_estandar: 7 × 7, 4 cuadros en orden de giro horario (marca naranja que avanza 90° por cuadro).
  // Se distingue de la ancha por el tono: llanta delgada y rin plateado brillante (se lee "metálica").
  const marcas7 = [[3, 2], [4, 3], [3, 4], [2, 3]]; // arriba, derecha, abajo, izquierda
  tira(D + 'rueda_estandar.png', 7, 7, 4, (p, i) => {
    const r = [
      '.......',
      '..TTT..',
      '.ThhlT.',
      '.ThklT.',
      '.tllmt.',
      '..ttt..',
      '.......',
    ].map((s) => [...s]);
    const [mx, my] = marcas7[i];
    r[my][mx] = 'o';
    filas(p, r.map((a) => a.join('')));
  });

  // ---- rueda_ancha: 8 × 8, 4 cuadros. Llanta negra doble (gruesa, "para arena") con surcos y cubo amarillo arena:
  // de un vistazo es "de goma oscura con centro amarillo", frente a la estándar "plateada".
  const marcas8 = [[3, 3], [4, 3], [4, 4], [3, 4]]; // horario en el cubo 2 × 2
  const surcos = [[[3, 1], [6, 3], [4, 6], [1, 4]], [[4, 1], [6, 4], [3, 6], [1, 3]]];
  tira(D + 'rueda_ancha.png', 8, 8, 4, (p, i) => {
    const r = [
      '........',
      '..TTTT..',
      '.TggggT.',
      '.TgYygt.',
      '.TgyOgt.',
      '.tggggt.',
      '..tttt..',
      '........',
    ].map((s) => [...s]);
    for (const [x, y] of surcos[i % 2]) r[y][x] = 'k';
    const [mx, my] = marcas8[i];
    r[my][mx] = 'k';                                                        // marca oscura sobre el cubo amarillo
    filas(p, r.map((a) => a.join('')));
  });

  // ---- soporte_basico: 10 × 2, dos paredes a los lados de la carga.
  tira(D + 'soporte_basico.png', 10, 2, 1, (p) => filas(p, ['ho......oh', 'mmmmmmmmmm']), { contorno: false });

  // ---- carga (suministro): 7 × 5, 3 estados: entera, dañada, crítica.
  const carga = [
    ['.......', '.hhohh.', '.hoooh.', '.llolm.', '.......'],
    ['...k...', '.hhkhh.', '.hoOkh.', '.llOlm.', '.......'],
    ['..k....', '.x.kRh.', '.hrrrk.', '.lkrlm.', '.......'],
  ];
  tira(D + 'carga.png', 7, 5, 3, (p, i) => filas(p, carga[i]));

  // ---- astronauta: cuadros de 10 × 17 (cuerpo de 8 px de ancho; 1 px libre a cada lado para los brazos).
  // reposo 0–3, saluda 4–7, celebra 8–13. Mira a la izquierda (hacia el robot que llega). Origen: pies.
  const casco = ['...hhhh...', '..vVhhhh..', '..vvvhhl..', '..vvvhll..', '...llll...'];
  const torso = ['..hhhhhm..', '..hhohhm..', '..hhhhhm..', '..ddmddd..'];
  const piernas = ['..hh.hh...', '..hh.hh...', '..ll.ll...', '..dd.dd...'];
  const vacia = () => Array.from({ length: 17 }, () => [...'..........']);
  const pega = (g, rows, y) => rows.forEach((r, j) => [...r].forEach((ch, x) => { if (ch !== '.' && g[y + j]) g[y + j][x] = ch; }));
  const pon = (g, pts, ch) => pts.forEach(([x, y]) => { if (g[y]) g[y][x] = ch; });
  // brazo delantero (lado del visor) y trasero (lado de la mochila)
  const brazoReposo = (g, dy) => { pon(g, [[2, 8 + dy], [2, 9 + dy]], 'l'); pon(g, [[2, 10 + dy]], 'o'); };
  function astronauta({ dy = 0, piernasDy = 0, brazos = 'reposo', mano = 0, guino = false }) {
    const g = vacia();
    pega(g, piernas, 12 + piernasDy);
    pega(g, torso, 8 + dy);
    pega(g, casco, 3 + dy);
    if (guino) pon(g, [[3, 4 + dy]], 'v');
    if (brazos === 'reposo') brazoReposo(g, dy);
    if (brazos === 'saluda') {
      brazoReposo(g, dy);
      // la mano se mueve de lado a lado sin salir del cuadro (el contorno necesita la columna 9)
      const { brazo, palma } = [
        { brazo: [[8, 7], [8, 6]], palma: [8, 5] },
        { brazo: [[8, 7], [8, 6], [8, 5]], palma: [8, 4] },
        { brazo: [[8, 7], [8, 6]], palma: [8, 5] },
        { brazo: [[8, 7], [8, 6], [7, 5]], palma: [7, 4] },
      ][mano];
      pon(g, brazo.map(([x, y]) => [x, y + dy]), 'h');
      pon(g, [[palma[0], palma[1] + dy]], 'o');
    }
    if (brazos === 'arriba') {
      pon(g, [[1, 7 + dy], [1, 6 + dy], [1, 5 + dy]], 'l');
      pon(g, [[1, 4 + dy]], 'o');
      pon(g, [[8, 7 + dy], [8, 6 + dy], [8, 5 + dy]], 'h');
      pon(g, [[8, 4 + dy]], 'o');
    }
    return g.map((r) => r.join(''));
  }
  const cuadros = [
    // reposo: respira (el torso baja 1 px a la mitad) y el reflejo del visor parpadea
    astronauta({}), astronauta({ dy: 1 }), astronauta({ dy: 1, guino: true }), astronauta({}),
    // saluda
    astronauta({ brazos: 'saluda', mano: 0 }), astronauta({ brazos: 'saluda', mano: 1 }),
    astronauta({ brazos: 'saluda', mano: 2 }), astronauta({ brazos: 'saluda', mano: 3 }),
    // celebra: se agacha, salta con los brazos arriba y aterriza
    astronauta({ dy: 1 }), astronauta({ dy: -1, piernasDy: -1, brazos: 'arriba' }), astronauta({ dy: -2, piernasDy: -2, brazos: 'arriba' }),
    astronauta({ dy: -1, piernasDy: -1, brazos: 'arriba' }), astronauta({ dy: 1, brazos: 'arriba' }), astronauta({ brazos: 'arriba' }),
  ];
  tira(D + 'astronauta.png', 10, 17, 14, (p, i) => filas(p, cuadros[i]));

  // ---- meta (bandera de la prueba): 8 × 16, 4 cuadros que ondean. Origen: pie del mástil, esquina inferior izquierda.
  tira(D + 'meta.png', 8, 16, 4, (p, i) => {
    const g = Array.from({ length: 16 }, () => [...'........']);
    for (let y = 2; y < 15; y++) g[y][1] = y < 4 ? 'h' : 'l';
    g[1][1] = 'y';
    const ola = [0, 1, 1, 0, 0, -1, -1, 0];
    for (let x = 2; x < 7; x++) {
      const off = Math.round(ola[(x + i * 2) % 8] * 0.6 + (x > 4 ? ola[(x + i * 2 + 1) % 8] * 0.4 : 0));
      for (let y = 0; y < 4; y++) g[2 + y + off][x] = (x + y) % 2 ? 'o' : 'h';
    }
    filas(p, g.map((r) => r.join('')));
  });

  // ---- zona_entrega: 16 × 4, repetible a lo ancho (franjas de peligro sobre una placa).
  generarB();
  generarDeco();
  generarObstaculos();
  generarGeologia();
  generarObstaculosR();
  generarMontados();
  generarPiezasNuevas();

  tira(D + 'zona_entrega.png', 16, 4, 1, (p) => {
    const rows = [0, 1, 2].map((y) => Array.from({ length: 16 }, (_, x) => ((x + y) % 8 < 4 ? 'y' : 'k')).join(''));
    rows.push('dddddddddddddddd');
    filas(p, rows);
  }, { contorno: false });
}

// ---------------------------------------------------------------- prioridad B
export function generarB() {
  // ---- chasis_reforzado: 24 × 7, 2 cuadros (normal, dañado). Placas atornilladas, más alto que el ligero.
  const reforzado = [
    [
      '........................',
      '.hhhhhhhhhhhhhhhhhhhhhY.',
      '.cklllllloooollllllllky.',
      '.mmmmmmdmmmmmmmdmmmmmmy.',
      '.mkmmmmdmmmmmmmdmmmmmkm.',
      '.dddddddddddddddddddddd.',
      '........................',
    ],
    [
      '........................',
      '.hhhhhhhh.hhhhhhxhhhhdd.',
      '.ckllkllOOOxllllllkllkd.',
      '.mmmmmmdmmkmmmxxdmmmmmd.',
      '.mkmmmmdmmmmmmmdmmkmmkm.',
      '.ddddddddddxddddddddddd.',
      '........................',
    ],
  ];
  tira(D + 'chasis_reforzado.png', 24, 7, 2, (p, i) => filas(p, reforzado[i]));
  pinturas('chasis_reforzado', reforzado, 7);

  // ---- rueda_tacos: 7 × 7, 4 cuadros. Tacos alternos en la llanta que avanzan 90° (3 posiciones) por cuadro, horario.
  const borde = [[2, 1], [3, 1], [4, 1], [5, 2], [5, 3], [5, 4], [4, 5], [3, 5], [2, 5], [1, 4], [1, 3], [1, 2]];
  const marcas = [[3, 2], [4, 3], [3, 4], [2, 3]];
  tira(D + 'rueda_tacos.png', 7, 7, 4, (p, i) => {
    const r = ['.......', '.......', '...m...', '..mhm..', '...m...', '.......', '.......'].map((s) => [...s]);
    borde.forEach(([x, y], j) => { r[y][x] = (j + i * 3) % 2 === 0 ? (j < 6 ? 'T' : 't') : 'g'; });
    for (const [x, y] of [[2, 2], [4, 2], [2, 4], [4, 4]]) r[y][x] = 'd';
    const [mx, my] = marcas[i];
    r[my][mx] = 'o';
    filas(p, r.map((a) => a.join('')));
  });

  // ---- soporte_amortiguado: 10 × 4, paredes de 0.45 m y resortes bajo la bandeja.
  tira(D + 'soporte_amortiguado.png', 10, 4, 1, (p) => filas(p, ['hl......lh', 'mO......Om', 'mmmmmmmmmm', 'yOy....yOy']), { contorno: false });

  // ---- soporte_correas: 10 × 3, paredes de 0.35 m (entre el básico y el amortiguado) con las correas amarillas
  // enganchadas arriba de cada pared y hebillas a media altura.
  tira(D + 'soporte_correas.png', 10, 3, 1, (p) => filas(p, ['hy......yh', 'mY......Ym', 'mmmmmmmmmm']), { contorno: false });

  // ---- base (hábitat): 40 × 24, detrás de la zona de entrega. Origen: centro inferior.
  tira(D + 'base.png', 40, 24, 1, (p) => {
    const L = (k) => BASE[k];
    for (let y = 0; y < 24; y++) for (let x = 0; x < 40; x++) {
      let k = null;
      // módulo cilíndrico con cúpula
      const cx = 18, top = 9;
      const enCupula = y >= 4 && y < top && Math.hypot((x + 0.5 - cx) / 13, (y + 0.5 - top) / 5.5) <= 1;
      const enCuerpo = x >= 5 && x <= 31 && y >= top && y <= 20;
      if (enCupula || enCuerpo) {
        k = 'l';
        if (enCupula && (y === 4 || Math.hypot((x - 0.5 - cx) / 13, (y - 0.5 - top) / 5.5) > 1)) k = 'h';   // brillo de la cúpula
        if (enCuerpo && x === 5) k = 'c';                                                                        // luz de borde
        if (enCuerpo && x >= 29) k = 'm';
        if (y === 11 || y === 12) k = 'o';                                                                       // franja naranja
        if (y === 20) k = 'd';
        if (x >= 8 && x <= 12 && y >= 13 && y <= 19) k = x === 8 || y === 13 ? 'm' : 'd';                       // puerta
        if (x === 11 && y === 16) k = 'y';                                                                       // luz de la puerta
        for (const wx of [18, 25]) {                                                                             // ventanas
          const d = Math.hypot(x + 0.5 - wx, y + 0.5 - 16);
          if (d < 2.3) k = d < 1.2 && x < wx ? 'V' : 'v';
        }
      }
      if (x >= 3 && x <= 33 && y >= 21 && y <= 22) k = y === 21 ? 'm' : 'd';                                   // plataforma
      if ((x === 7 || x === 29) && y === 23) k = 'd';                                                            // patas
      if (x === 27 && y >= 0 && y < 6) k = y === 0 ? 'r' : 'l';                                                  // antena con luz roja
      if (x >= 33 && x <= 38 && y >= 10 && y <= 15) {                                                            // panel solar lateral
        const yy = y - 10 + Math.floor((x - 33) / 3);
        if (yy >= 0 && yy < 5) k = (x + yy) % 3 === 0 ? 'v' : yy === 0 ? 'S' : 's';
      }
      if (x === 32 && y >= 14 && y <= 15) k = 'm';                                                               // brazo del panel
      if (k) p.px(x, y, BASE_HEX[k] ?? (BASE_HEX[k] = hexDe(L(k))));
    }
  });

  // ---- baliza: 4 × 8, 4 cuadros (parpadea). Origen: centro inferior.
  const luz = ['Y', 'y', 'O', 'O'];
  tira(D + 'baliza.png', 4, 8, 4, (p, i) => filas(p, ['....', '.' + luz[i] + luz[i] + '.', '.' + (i === 0 ? 'Y' : luz[i]) + (i < 2 ? 'o' : 'O') + '.', '.ml.', '.ml.', '.ml.', '.dd.', '....']));
}

// ---------------------------------------------------------------- calcomanías de piezas sobre el chasis
// docs/arte/SPRITES_PENDIENTES.md §5: deco_<id de pieza>, origen al centro, 1 cuadro, contorno de 1 px. Giran con el chasis.
// Motor atrás (x −8), batería adelante (x +6), panel encima (x +5, y −4). Cada una usa el color de acento de su ícono del taller.
export function generarDeco() {
  const decos = {
    deco_motor_eficiente: ['.....', '.hcl.', '.mCd.', '.....'],   // motor con acento turquesa (eficiente)
    deco_motor_potente: ['.....', '.hyr.', '.mOd.', '.....'],     // motor con rayo naranja y rojo (potente)
    deco_motor_equilibrado: ['.....', '.hcy.', '.mCo.', '.....'], // mitad turquesa y mitad naranja (equilibrado)
    deco_bateria_chica: ['....', '.he.', '.dE.', '....'],          // celda chica verde
    deco_bateria_grande: ['.....', '.hee.', '.dEE.', '.....'],     // bloque más ancho
    deco_panel_solar: ['..........', '.SsSsSsSs.', '..........'],  // panel delgado encima
    // piezas nuevas (ids provisionales)
    deco_bateria_mediana: ['.....', '.hhe.', '.dEE.', '.....'],    // entre la chica y la grande: carga a medias
    deco_panel_solar_grande: ['..............', '.SsSsSsmSsSsS.', '..............'], // dos módulos, más largo
    deco_calentador_bateria: ['.....', '.oOo.', '.OoO.', '.....'],  // resistencia naranja (calor)
    deco_radiador: ['......', '.hdhd.', '.ldld.', '......'],         // aletas de disipación
    deco_auto_rescate: ['.....', '.y.y.', '.lml.', '.....'],       // módulo con dos patas que se levantan
  };
  for (const [nombre, rows] of Object.entries(decos)) tira(D + nombre + '.png', rows[0].length, rows.length, 1, (p) => filas(p, rows));
}

// ---------------------------------------------------------------- obstáculos (recreación de juego, no topografía real)
// Rocas sueltas de 0.3–0.6 m: 3, 4 y 5 px de alto contando el contorno (8 px = 1 m). La fila de abajo toca el suelo (sin contorno).
// obstaculo_roca_<n> (Tierra), obstaculo_roca_luna_<n>, obstaculo_roca_marte_<n>; y el parche de arena blanda (tile 16 × 4).
export function generarObstaculos() {
  const O = 'obstaculos/';
  // 1 oscuro · 2 medio · 3 claro · 4 brillo (luz desde arriba a la izquierda)
  const ROCAS = [
    ['.3432', '32211'],                                   // 1: laja baja (3 px)
    ['.43.', '4321', '3211'],                             // 2: canto rodado (4 px)
    ['..43..', '.44321', '433211', '322111'],             // 3: bloque anguloso (5 px)
  ];
  const tonos = {
    '': PALETAS.tierra.roca.slice(2, 6),
    // Marte y Luna en versión clara (SPRITES_PENDIENTES §10): con los tonos del suelo casi no se distinguían. Marte: basalto
    // polvoriento gris rosado, más claro y menos saturado que la arena óxido; Luna: roca casi blanca con la cara de sombra negra.
    marte_: ['#4a2420', '#9a6a5c', '#cca08a', '#f4dcc4'],
    luna_: [PALETAS.luna.roca[1], PALETAS.luna.roca[4], PALETAS.luna.roca[5], '#ffffff'],
  };
  for (const [mundo, t] of Object.entries(tonos)) {
    const pal = { 1: t[0], 2: t[1], 3: t[2], 4: t[3] };
    ROCAS.forEach((rows, i) => {
      const w = rows[0].length + 2, h = rows.length + 1;
      tira(`${O}obstaculo_roca_${mundo}${i + 1}.png`, w, h, 1, (p) => filas(p, rows, 1, 1, pal));
    });
  }
  // arena blanda: más clara y suelta que el suelo, con crestas de rizos; se repite a lo ancho (periodo 16)
  const blanda = {
    '': PALETAS.tierra.arena, _marte: PALETAS.marte.arena, _luna: PALETAS.luna.arena,
  };
  for (const [sufijo, A] of Object.entries(blanda)) {
    const pal = { a: A[2], b: A[3], c: A[4], d: A[5] };
    const rows = [
      'dc..cdc..dcd..cd'.replace(/./g, 'b'),
      'cbbcbbbcbbbcbbbc',
      'bbabbbbabbbbabbb',
      'babbbabbbabbbabb',
    ];
    tira(`${O}obstaculo_arena_blanda${sufijo}.png`, 16, 4, 1, (p) => filas(p, rows, 0, 0, pal), { contorno: false });
  }
  // lodo del lago seco (Rincón de Parangueo) donde la costra de sal se rompe: placas blancas en las orillas, lodo gris pardo
  // húmedo con brillos; se repite a lo ancho (periodo 16)
  {
    const L = PALETAS.tierra.lodo, S = PALETAS.tierra.sal_costra;
    const pal = { s: S[4], t: S[2], a: L[0], b: L[1], c: L[2], d: L[3], e: L[4] };
    const rows = ['st.dccdccdcdc.ts', 'tbccbcecbccbcbbt', 'bbabbbbcbbabbbcb', 'abbabbabbbbabbab'];
    tira(`${O}obstaculo_lodo.png`, 16, 4, 1, (p) => filas(p, rows, 0, 0, pal), { contorno: false });
  }
}

// ---------------------------------------------------------------- pintura del chasis
// Variantes de color: la carrocería (h, l, m, d) toma una rampa de la paleta; contorno, faro, franja naranja, borde
// turquesa y daños no cambian. chasis_<tipo>_<color>.png, mismos cuadros que el original (normal y dañado).
export const PINTURAS = {
  rojo: ['#ff8a7a', '#e0483a', '#a8301a', '#6a101c'],
  azul: ['#9fd8ff', '#4c8ce8', '#2550d0', '#172a78'],
  verde: ['#a8f0b0', '#3ec466', '#2a8a4a', '#17663e'],
  amarillo: ['#fff08a', '#ffd23c', '#d89a1c', '#8a5a14'],
  morado: ['#e0d4ff', '#b9a6ff', '#7a4cff', '#40188a'],
};
function pinturas(id, cuadros, alto) {
  for (const [color, [h, l, m, d]] of Object.entries(PINTURAS)) {
    const pal = { ...BASE, h, l, m, d };
    tira(`${D}${id}_${color}.png`, 24, alto, cuadros.length, (p, i) => filas(p, cuadros[i], 0, 0, pal));
  }
}

// ---------------------------------------------------------------- piezas nuevas del taller (ids provisionales)
export function generarPiezasNuevas() {
  // ---- rueda_nitinol: 7 × 7, 4 cuadros. Llanta de malla de resortes superelástica, más clara que la del LRV; marca turquesa.
  const borde7 = [[2, 1], [3, 1], [4, 1], [5, 2], [5, 3], [5, 4], [4, 5], [3, 5], [2, 5], [1, 4], [1, 3], [1, 2]];
  tira(D + 'rueda_nitinol.png', 7, 7, 4, (q, i) => {
    const r = ['.......', '.......', '..g.g..', '...l...', '..g.g..', '.......', '.......'].map((x) => [...x]);
    borde7.forEach(([x, y], j) => { r[y][x] = (j + i) % 2 ? 'w' : 'h'; });
    const [mx, my] = borde7[(i * 3) % 12];
    r[my][mx] = 'c';
    filas(q, r.map((a) => a.join('')));
  });

  // ---- rueda_malla: 8 × 8, 4 cuadros. Malla de acero tejida (LRV de Apolo): llanta plateada en cuadrícula abierta,
  // chevrón de titanio oscuro que avanza 90° por cuadro (horario) y cubo de aluminio.
  const anillo8 = [[3, 1], [4, 1], [5, 2], [6, 3], [6, 4], [5, 5], [4, 6], [3, 6], [2, 5], [1, 4], [1, 3], [2, 2]];
  tira(D + 'rueda_malla.png', 8, 8, 4, (p, i) => {
    const r = ['........', '........', '........', '...mm...', '...md...', '........', '........', '........'].map((x) => [...x]);
    anillo8.forEach(([x, y], j) => { r[y][x] = (j + i) % 2 ? 'h' : 'l'; });   // tejido que brilla al girar
    for (const [x, y] of [[2, 3], [5, 3], [2, 4], [5, 4], [3, 2], [4, 2], [3, 5], [4, 5]]) r[y][x] = 'g'; // malla abierta
    const ch = anillo8[(i * 3) % 12];
    r[ch[1]][ch[0]] = 'c';                                                   // chevrón de titanio, turquesa (marca de giro)
    filas(p, r.map((a) => a.join('')));
  });
}

// ---------------------------------------------------------------- obstáculos por geología (recreación de juego)
// Bloques (sprite, la fila de abajo toca el suelo, contorno automático) y tiles de superficie de 16 × 4 (se repiten a lo ancho).
export function generarGeologia() {
  const O = 'obstaculos/';
  const pal = (t) => ({ 1: t[0], 2: t[1], 3: t[2], 4: t[3] });
  // bloques de eyecta (cráteres de impacto): angulosos, con caras planas; 3 tamaños, con variante por mundo
  const EYECTA = [
    ['.44.', '4432', '3321'],                                                 // chico (4 px de alto con contorno)
    ['..443.', '.44432', '443321', '332211'],                                 // mediano (5 px)
    ['...44...', '..4443..', '.444332.', '4433321.', '33322111', '32221111'], // grande (7 px)
  ];
  const tonosEyecta = {
    '': PALETAS.tierra.roca.slice(2, 6), marte_: PALETAS.marte.roca.slice(2, 6),
    luna_: [PALETAS.luna.roca[1], PALETAS.luna.roca[3], PALETAS.luna.roca[5], PALETAS.luna.roca[6]],
  };
  for (const [mundo, t] of Object.entries(tonosEyecta)) EYECTA.forEach((rows, i) => {
    tira(`${O}obstaculo_eyecta_${mundo}${i + 1}.png`, rows[0].length + 2, rows.length + 1, 1, (q) => filas(q, rows, 1, 1, pal(t)));
  });

  // talud de roca suelta (minas): montón en cuña de piedras sueltas de tepetate, 24 × 8
  const B = PALETAS.tierra.banco;
  tira(O + 'obstaculo_talud.png', 24, 8, 1, (q) => {
    for (let y = 1; y < 8; y++) for (let x = 1; x < 23; x++) {
      const alto = 7 - Math.abs(x - 9) * (x < 9 ? 0.75 : 0.42);                // cuña: sube rápido y baja largo
      if (8 - y > alto) continue;
      const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453, r = h - Math.floor(h);   // piedras sueltas al azar
      const piedra = r > 0.86 ? B[5] : r < 0.1 ? B[1] : null;
      q.px(x, y, hex(piedra ?? (y < 4 ? B[4] : x + y < 14 ? B[3] : B[2])));
    }
  });

  // bloques de lava aa: escoria áspera, casi negra con brillos rojizos y cresta dentada; 2 tamaños
  const AA = ['#140e10', '#2a1c1c', '#4a2c26', '#7a3a2a'];
  const lavaAA = [['.4.4..', '434342', '332321'], ['.4..4.4.', '4344343.', '33433322', '32322211']];
  lavaAA.forEach((rows, i) => tira(`${O}obstaculo_lava_aa_${i + 1}.png`, rows[0].length + 2, rows.length + 1, 1, (q) => filas(q, rows, 1, 1, pal(AA))));

  // tiles de superficie (16 × 4, sin contorno, se repiten a lo ancho)
  const tile = (nombre, fn) => tira(O + nombre + '.png', 16, 4, 1, (q) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) { const c = fn(x, y); if (c) q.px(x, y, hex(c)); } }, { contorno: false });
  const TOBA = PALETAS.tierra.toba, SAL = PALETAS.tierra.salar;
  // toba o ceniza (maar): capas finas claras y oscuras, suelta
  tile('obstaculo_toba', (x, y) => (y === 0 ? ((x * 5) % 7 < 2 ? TOBA[5] : TOBA[4]) : y === 1 ? TOBA[3] : y === 2 ? ((x + 3) % 6 === 0 ? TOBA[4] : TOBA[2]) : TOBA[1]));
  // costra de sal: blanca con grietas poligonales
  tile('obstaculo_sal', (x, y) => ((x === 5 || x === 12) && y > 0 ? SAL[1] : y === 0 ? ((x % 7 === 3) ? SAL[2] : SAL[3]) : (x + y) % 9 === 0 ? SAL[1] : SAL[2]));
  // nieve o hielo: blanco azulado con brillos, hielo más azul abajo
  tile('obstaculo_hielo', (x, y) => (y === 0 ? ((x * 3) % 8 === 1 ? '#ffffff' : '#e6f2ff') : y === 1 ? ((x % 5 === 2) ? '#ffffff' : '#c4dcf4') : y === 2 ? '#9cc4ec' : '#6a9ad0'));
}

// ---------------------------------------------------------------- sprites montados en el robot (piezas de la ronda 2)
// suspension_blanda (3 × 6) y suspension_dura (3 × 5): resorte que va entre el chasis y el eje de cada rueda (uno por rueda).
// faro (4 × 3, 2 cuadros: apagado y encendido): va en la punta delantera del chasis; faro_haz (12 × 5) es el cono de luz.
// chasis_rocker_bogie (28 × 10, 2 cuadros: normal y dañado): caja de 24 px con el balancín abajo; las 6 ruedas las pone el
// juego en los extremos de los brazos: x 2, 13 y 25, y 9 (centro de cada rueda, en px de arte desde la esquina del sprite).
export function generarMontados() {
  tira(D + 'suspension_blanda.png', 3, 6, 1, (q) => filas(q, ['lml', '.Y.', 'Y.Y', '.Y.', 'Y.Y', 'lml']));
  tira(D + 'suspension_dura.png', 3, 5, 1, (q) => filas(q, ['lml', 'RhR', 'rhr', 'RhR', 'lml']));
  tira(D + 'faro.png', 4, 3, 2, (q, i) => filas(q, i ? ['mYY.', 'mwY.', 'mYY.'] : ['mll.', 'mhl.', 'mll.']));
  tira(D + 'faro_haz.png', 12, 5, 1, (q) => {
    for (let x = 0; x < 12; x++) for (let y = 0; y < 5; y++) {
      const ancho = 0.5 + x * 0.2;
      if (Math.abs(y - 2) <= ancho && (x + y) % 2 === 0) q.px(x, y, hex(x < 4 ? '#fff6c0' : '#ffd166'));
    }
  }, { contorno: false });
  const cuerpo = [
    ['............................', '..hhhhhhhhhhhhhhhhhhhhhhY...', '..cllloooooolllllllllllyy...', '..mmmmmmmmmmdmmmmmmmdmmmm...'],
    ['............................', '..hhhhhhh..hhhhhxhhhhhhdd...', '..cllkOOOOOxlllllkllllldd...', '..mmmmmkmmmmdmmxxmmmdmmmm...'],
  ];
  tira(D + 'chasis_rocker_bogie.png', 28, 10, 2, (q, i) => {
    filas(q, cuerpo[i], 0, 0);
    // rocker: del pivote bajo la caja (x 9) a la rueda trasera (x 2) y al pivote del bogie (x 18); bogie a las ruedas x 13 y 25
    const linea = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) q.px(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), hex(BASE.m)); };
    linea(9, 4, 2, 9); linea(9, 4, 18, 7); linea(18, 7, 13, 9); linea(18, 7, 25, 9);
    q.px(9, 4, hex(BASE.y)); q.px(18, 7, hex(BASE.y));
  });
}

// ---------------------------------------------------------------- obstáculos de §10 (recreación de juego)
// obstaculo_crater_luna (48 × 6): cráter pequeño visto de lado con el Sol rasante desde la izquierda: bordes levantados claros,
//   la pared izquierda interior en sombra negra y la derecha iluminada. La línea del suelo es la fila 2 (se pone con su borde de
//   arriba 2 px por encima del suelo): los bordes sobresalen y el hueco se pinta sobre el suelo.
// obstaculo_matorral_<1..3> (~5 × 6): matas del desierto (gobernadora, hojasén) con tallos pardos.
// obstaculo_toba_bloque_<1|2>: bloques de toba clara y porosa (Jabal Bayda), 5 y 4 px de alto.
// obstaculo_rizadura (16 × 3, tile): rizaduras de viento en la arena; se repite a lo ancho.
export function generarObstaculosR() {
  const O = 'obstaculos/', L = PALETAS.luna.roca, K = '#0e0c16';
  // La línea del suelo es la fila 2: los bordes sobresalen 2 px y el hueco (filas 2..5) se pinta sobre el suelo.
  tira(O + 'obstaculo_crater_luna.png', 48, 6, 1, (q) => {
    for (let x = 0; x < 48; x++) {
      const u = (x + 0.5 - 24) / 24, a = Math.abs(u);
      if (a >= 0.74) {                                                                                     // bordes levantados
        const r = Math.round(2.2 * Math.exp(-((a - 0.84) ** 2) / 0.006));
        for (let y = 2 - r; y < 2; y++) q.px(x, y, hex(y === 2 - r ? (u < 0 ? '#ffffff' : L[5]) : u < 0 ? L[5] : L[4]));
        if (r > 0 && u > 0) q.px(x, 2, hex(L[3]));                                                         // pie del borde derecho
        continue;
      }
      const d = Math.max(1, Math.round(3.6 * (1 - (a / 0.74) ** 2)));                                      // hondo
      for (let y = 2; y < 2 + d; y++) {
        const k = y - 2, piso = y === 1 + d;
        const sombra = u < 0.2 - k * 0.12;                                                                  // la pared izquierda no ve el Sol
        let c = sombra ? (piso ? L[1] : '#000000') : piso ? L[4] : u > 0.45 ? L[6] : L[5];                 // pared derecha iluminada
        if (y === 2 && !sombra) c = L[6];
        q.px(x, y, hex(c));
      }
    }
  }, { contorno: false });
  const M = PALETAS.tierra.matorral, TALLO = '#5e3a24';
  const MATAS = [
    ['.G.G.', 'GgGgd', 'gdgGd', '.dgd.', '..t..', '.t.t.'],
    ['..G.G.', '.GgGgd', 'GgdgGd', '.dgdgd', '..tt..', '.t..t.'],
    ['.G..', 'GgG.', 'gdgd', '.dt.', '.t..'],
  ];
  MATAS.forEach((rows, i) => tira(`${O}obstaculo_matorral_${i + 1}.png`, rows[0].length, rows.length, 1,
    (q) => filas(q, rows, 0, 0, { G: M[4], g: M[3], d: M[2], t: TALLO }), { contorno: true }));
  const T = PALETAS.tierra.toba_clara;
  const BLOQUES = [
    ['..434..', '.44a32.', '43a3321', '3332a11', '3221111'],
    ['.443.', '4a332', '33a21', '32211'],
  ];
  BLOQUES.forEach((rows, i) => tira(`${O}obstaculo_toba_bloque_${i + 1}.png`, rows[0].length + 2, rows.length + 1, 1,
    (q) => filas(q, rows, 1, 1, { 1: T[1], 2: T[2], 3: T[3], 4: T[5], a: T[0] })));                         // a: poros oscuros
  const A = PALETAS.tierra.arena;
  tira(O + 'obstaculo_rizadura.png', 16, 3, 1, (q) => filas(q, ['..cd....cd....cd'.slice(0, 16), '.cbba..cbba..cbb', 'bbaabbbbaabbbbaa'],
    0, 0, { a: A[2], b: A[3], c: A[4], d: A[5] }), { contorno: false });
}
