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
    deco_bateria_chica: ['....', '.he.', '.dE.', '....'],          // celda chica verde
    deco_bateria_grande: ['.....', '.hee.', '.dEE.', '.....'],     // bloque más ancho
    deco_panel_solar: ['..........', '.SsSsSsSs.', '..........'],  // panel delgado encima
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
    marte_: PALETAS.marte.roca.slice(2, 6),
    luna_: [PALETAS.luna.roca[1], PALETAS.luna.roca[3], PALETAS.luna.roca[4], PALETAS.luna.roca[6]], // más contraste (luz rasante)
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
}
