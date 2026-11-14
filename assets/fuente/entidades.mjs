// Sprites de prioridad A (docs/juego/ASSETS_ARTE.md §3): robot, carga, astronauta, meta y zona de entrega.
// Se dibuja el interior y el contorno de 1 px sale automático (comun.contorno).
import { tira, filas, BASE } from './comun.mjs';

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
  const marcas7 = [[3, 2], [4, 3], [3, 4], [2, 3]]; // arriba, derecha, abajo, izquierda
  tira(D + 'rueda_estandar.png', 7, 7, 4, (p, i) => {
    const r = [
      '.......',
      '..TTT..',
      '.TdmdT.',
      '.TmhmT.',
      '.tdmdt.',
      '..ttt..',
      '.......',
    ].map((s) => [...s]);
    const [mx, my] = marcas7[i];
    r[my][mx] = 'o';
    filas(p, r.map((a) => a.join('')));
  });

  // ---- rueda_ancha: 8 × 8, 4 cuadros. Llanta doble (gruesa, "para arena") con surcos; cubo con marca que gira.
  const marcas8 = [[3, 3], [4, 3], [4, 4], [3, 4]]; // horario en el cubo 2 × 2
  const surcos = [[[3, 1], [6, 3], [4, 6], [1, 4]], [[4, 1], [6, 4], [3, 6], [1, 3]]];
  tira(D + 'rueda_ancha.png', 8, 8, 4, (p, i) => {
    const r = [
      '........',
      '..TTTT..',
      '.TggggT.',
      '.Tgmmgt.',
      '.Tgmmgt.',
      '.tggggt.',
      '..tttt..',
      '........',
    ].map((s) => [...s]);
    for (const [x, y] of surcos[i % 2]) r[y][x] = 'k';
    const [mx, my] = marcas8[i];
    r[my][mx] = 'o';
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
  tira(D + 'zona_entrega.png', 16, 4, 1, (p) => {
    const rows = [0, 1, 2].map((y) => Array.from({ length: 16 }, (_, x) => ((x + y) % 8 < 4 ? 'y' : 'k')).join(''));
    rows.push('dddddddddddddddd');
    filas(p, rows);
  }, { contorno: false });
}
