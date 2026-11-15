// Interfaz (prioridad A): íconos de barra 8 × 8, marco de barra 9-slice 6 × 6, botones táctiles ◀ ▶ 24 × 24
// (normal y presionado) y botón genérico 9-slice 12 × 12. Prefijo ui_ para no chocar con otros nombres.
import { tira, filas, contorno, createFrame, painterFor, guardar, BASE, hex, core } from './comun.mjs';

const D = 'ui/';

export function generar() {
  resultados();
  // ---- íconos de barra (7 × 7 de dibujo + contorno = 8 × 8)
  const iconos = {
    // batería con rayo
    ui_icono_energia: ['..mm....', '.mhhhm..', '.hyyYh..', '.hyYyh..', '.hYyyh..', '.hyyyh..', '.mdddm..', '........'],
    // caja de suministro con cruz
    ui_icono_carga: ['........', '.hhohhh.', '.hooohh.', '.hhohhh.', '.lllllm.', '.dddddd.', '........', '........'],
    // chasis con rueda (vida del robot)
    ui_icono_chasis: ['........', '.....y..', '.hhhhhh.', '.cllllm.', '.dmddmd.', '.Tt..Tt.', '........', '........'],
    // termómetro (temperatura del motor): tubo plateado con columna roja y marcas de escala
    // candado de las piezas bloqueadas (pestaña «Bloqueadas» del Taller)
    ui_candado: ['..hh....', '.h..h...', '.h..h...', 'YYYYYY..', 'YyykyY..', 'YyykyY..', 'OOOOOO..', '........'],
    ui_icono_temperatura: ['..hh....', '.hrlh.l.', '.hrlh...', '.hrlh.l.', '.hrrh...', 'hrrRrh..', 'hrRRrh..', '.hhhh...'],
  };
  for (const [nombre, rows] of Object.entries(iconos)) tira(D + nombre + '.png', 8, 8, 1, (p) => filas(p, rows));

  // ---- marco de barra 9-slice (6 × 6): borde de 2 px, interior hundido
  tira(D + 'ui_marco_barra.png', 6, 6, 1, (p) => filas(p, ['kkkkkk', 'kmlllk', 'kmggdk', 'kmggdk', 'kddddk', 'kkkkkk']), { contorno: false });

  // ---- botón genérico 9-slice (12 × 12)
  // 4 estados con borde visible (docs/juego/DISENO.md): normal, encima (borde amarillo), presionado (baja 1 px, sin canto)
  // y desactivado (gris apagado). 12 × 12, cortes de 4 px en los 4 lados. Relleno oscuro para que el texto claro se lea.
  const ESTADOS = {
    ui_boton: { borde: '#b9a6ff', luz: '#3a3f6e', relleno: '#262b4e', canto: '#14172e', baja: false },
    ui_boton_encima: { borde: '#ffd166', luz: '#4a5090', relleno: '#30366a', canto: '#191c3c', baja: false },
    ui_boton_presionado: { borde: '#e0a83c', luz: '#1e2242', relleno: '#1e2242', canto: null, baja: true },
    ui_boton_desactivado: { borde: '#4a5468', luz: '#1c2030', relleno: '#181b28', canto: '#10121c', baja: false },
  };
  for (const [nombre, e] of Object.entries(ESTADOS)) {
    const f = createFrame(12, 12), K = hex(BASE.k);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
      const esquina = (x === 0 || x === 11) && (y === 0 || y === 11);
      if (esquina) continue;
      const y0 = e.baja ? 1 : 0, yCanto = e.canto ? 9 : 11;      // el presionado no tiene canto: ocupa todo
      let c;
      if (x === 0 || x === 11 || y === 11 || y === y0) c = K;                         // contorno
      else if (y < y0) c = 0;
      else if (e.canto && y >= yCanto) c = hex(e.canto);                              // canto inferior (relieve)
      else if (x === 1 || x === 10 || y === y0 + 1 || y === yCanto - 1) c = hex(e.borde);   // borde visible
      else if (y === y0 + 2) c = hex(e.luz);                                          // brillo de arriba
      else c = hex(e.relleno);
      if (c) f.color[y * 12 + x] = c;
    }
    guardar(D + nombre + '.png', f);
  }

  // ---- chips 9-slice (8 × 8, cortes de 3 px) para etiquetas cortas: rojo = límite / riesgo, cian = dato medido
  const chip = (nombre, borde, relleno) => {
    const f = createFrame(8, 8);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const cx = Math.min(x, 7 - x), cy = Math.min(y, 7 - y);
      if (cx + cy < 1) continue;                                                      // esquinas redondeadas
      f.color[y * 8 + x] = cx === 0 || cy === 0 || (cx + cy === 1) ? hex(borde) : hex(relleno);
    }
    guardar(D + nombre + '.png', f);
  };
  chip('ui_chip_rojo', '#ff7a93', '#3a1424');
  chip('ui_chip_cian', '#80e0dc', '#0f3236');
  kit();
  hudPanel();
  guia();
  senalador();
  resalte();

  // ---- botones táctiles 24 × 24 con flecha naranja; el presionado baja 2 px y pierde el canto
  const flecha = (p, dir, dy) => {
    const cx = 12, cy = 10 + dy;
    for (let i = 0; i < 7; i++) {
      const x = dir < 0 ? cx + 3 - i : cx - 3 + i; // la columna más ancha queda detrás de la punta
      for (let y = cy - (6 - i); y <= cy + (6 - i); y++) p.px(x, y, hex(i === 0 ? BASE.Y : y === cy - (6 - i) ? BASE.y : BASE.o));
    }
  };
  for (const [nombre, dir] of [['izq', -1], ['der', 1]])
    for (const presionado of [false, true]) {
      const f = createFrame(24, 24), p = painterFor(f), dy = presionado ? 2 : 0;
      const K = hex(BASE.k);
      // cuerpo redondeado
      p.shade(0, 0, 24, 24, (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        // rectángulo con esquinas recortadas (2 px en diagonal)
        const enCaja = (top, bot) => yi >= top && yi <= bot && xi >= 1 && xi <= 22 &&
          !((xi === 1 || xi === 22) && (yi <= top + 1 || yi >= bot - 1)) && !((xi === 2 || xi === 21) && (yi === top || yi === bot));
        if (!presionado && enCaja(1, 22) && yi > 19) return hex(yi === 22 ? BASE.k : BASE.d);  // canto (relieve)
        if (enCaja(1 + dy, 19 + dy)) return yi <= 3 + dy ? hex(BASE.h) : yi >= 17 + dy ? hex(BASE.m) : hex(presionado ? BASE.m : BASE.l);
        return 0;
      });
      flecha(p, dir, dy);
      contorno(f, 0, 0, 24, 24, BASE.k);
      void K;
      guardar(`${D}ui_boton_${nombre}${presionado ? '_presionado' : ''}.png`, f);
    }
}

// ---------------------------------------------------------------- UI de resultados (prioridad B)
// Estrellas llena y vacía (16 × 16), panel de resultados 9-slice (16 × 16) y aviso "terreno ilustrativo".
// Usa la lavanda y los morados de la paleta del título para separar la UI del mundo.
function resultados() {
  const LAV = { k: '#0d051c', f: '#180630', b: '#40188a', l: '#b9a6ff', w: '#e8e2ff' };
  // estrella de 5 puntas: prueba de punto en polígono
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 3.1 : 7; return [7.5 + Math.cos(a) * r, 8 + Math.sin(a) * r]; });
  const dentro = (x, y) => { let c = false; for (let i = 0, j = 9; i < 10; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  for (const llena of [true, false]) {
    tira(`${D}ui_estrella_${llena ? 'llena' : 'vacia'}.png`, 16, 16, 1, (p) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        if (!dentro(x + 0.5, y + 0.5)) continue;
        const luz = x + y < 13, sombra = x + y > 19;
        const c = llena ? (luz ? (x + y < 10 ? BASE.Y : BASE.y) : sombra ? BASE.O : BASE.o) : (luz ? '#4a4258' : '#2f2a3a');
        p.px(x, y, hex(c));
      }
      if (llena) p.px(5, 6, hex('#ffffff'));
    });
  }
  // panel 9-slice: borde de 3 px (contorno, morado, filo lavanda) y fondo morado oscuro
  tira(D + 'ui_panel.png', 16, 16, 1, (p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const e = Math.min(x, y, 15 - x, 15 - y);
      if ((x === 0 || x === 15) && (y === 0 || y === 15)) continue;                    // esquinas redondeadas
      const c = e === 0 ? LAV.k : e === 1 ? (x === 1 || y === 1 ? LAV.l : LAV.b) : e === 2 ? LAV.k : LAV.f;
      p.px(x, y, hex(c));
    }
  }, { contorno: false });
  // aviso "TERRENO ILUSTRATIVO": triángulo de atención y texto en placa oscura
  const txt = 'TERRENO ILUSTRATIVO', tw = core.textWidth(txt, 'mini'), w = tw + 16, h = 11;
  tira(D + 'ui_aviso_ilustrativo.png', w, h, 1, (p) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if ((x === 0 || x === w - 1) && (y === 0 || y === h - 1)) continue;
      p.px(x, y, hex(x === 0 || y === 0 || x === w - 1 || y === h - 1 ? LAV.k : y === 1 ? LAV.b : LAV.f));
    }
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {                          // triángulo amarillo con "!"
      if (Math.abs(x - 3) <= y / 2) p.px(3 + x, 2 + y, hex(x === 3 && (y >= 2 && y <= 4 || y === 6) ? LAV.k : BASE.y));
    }
    p.text(txt, 12, 3, hex(LAV.w), { font: 'mini' });
  }, { contorno: false });
}

// ---------------------------------------------------------------- más piezas del kit (rediseño en pixel art)
/** Cuadro de w × h a partir de una función (x, y) → color hex o null. */
function cuadroDe(ruta, w, h, fn) {
  const f = createFrame(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y); if (c) f.color[y * w + x] = hex(c); }
  guardar(D + ruta + '.png', f);
}
const K = '#0e0c16';

function kit() {
  // ui_tarjeta (12 × 12, cortes de 4): panel oscuro para tarjetas; contorno, borde azul grisáceo y brillo arriba
  cuadroDe('ui_tarjeta', 12, 12, (x, y) => {
    const ex = Math.min(x, 11 - x), ey = Math.min(y, 11 - y);
    if (ex + ey === 0) return null;                                        // esquinas redondeadas
    if (ex === 0 || ey === 0) return K;
    if (ex === 1 || ey === 1) return y === 1 ? '#4a5490' : y === 10 ? '#1a1e38' : '#2e3560';
    if (y === 2) return '#1c2140';
    return '#141830';
  });

  // ui_barra_relleno_<color> (4 × 3, cortes de 1 a los lados): entra en el hueco de ui_marco_barra
  // (marco 9-slice con cortes de 2: con alto 7 el hueco mide 3 px). Fila de brillo, color y sombra.
  const RELLENOS = {
    amarillo: ['#fff08a', '#ffd166', '#c8901c'],
    verde: ['#a8f0b0', '#4cc38a', '#1f7a4a'],
    rojo: ['#ffc0cc', '#ff7a93', '#a8304a'],
  };
  for (const [color, [luz, medio, sombra]] of Object.entries(RELLENOS))
    cuadroDe('ui_barra_relleno_' + color, 4, 3, (x, y) => (y === 0 ? (x === 3 ? medio : luz) : y === 1 ? medio : sombra));

  // ui_ayuda (10 × 10, cortes de 3): marco de ayuda / tooltip, fondo azul noche con borde amarillo
  cuadroDe('ui_ayuda', 10, 10, (x, y) => {
    const ex = Math.min(x, 9 - x), ey = Math.min(y, 9 - y);
    if (ex + ey === 0) return null;
    if (ex === 0 || ey === 0) return K;
    if (ex === 1 || ey === 1) return '#ffd166';
    return '#0f1226';
  });
  // ui_ayuda_flecha (7 × 4): punta que se pega abajo del tooltip (centrada), mismos colores
  cuadroDe('ui_ayuda_flecha', 7, 4, (x, y) => {
    const d = Math.abs(x - 3);
    if (d > 3 - y) return null;
    if (d === 3 - y) return K;
    if (d === 2 - y) return '#ffd166';
    return y === 0 ? '#0f1226' : null;
  });

  // ui_titulo_placa (24 × 16, cortes de 6 a los lados y 5 arriba y abajo): placa morada con remaches para el título de cada
  // pantalla; las filas del centro son iguales, así que se estira a lo alto sin deformarse.
  const T = { borde: '#b9a6ff', brillo: '#5a2aa6', relleno: '#2e0d6b', sombra: '#180630', remache: '#c9a7ff' };
  cuadroDe('ui_titulo_placa', 24, 16, (x, y) => {
    const ex = Math.min(x, 23 - x), ey = Math.min(y, 15 - y);
    if (ex + ey <= 1 && !(ex === 1 && ey === 0) && !(ex === 0 && ey === 1)) return ex + ey === 0 ? null : K;
    if (ex === 0 || ey === 0) return K;
    if (ex === 1 || ey === 1) return y >= 14 ? '#6a4cc0' : T.borde;
    if ((x === 3 || x === 20) && (y === 3 || y === 12)) return T.remache;   // remaches en las esquinas
    if (y === 2) return T.brillo;
    if (y === 13) return T.sombra;
    return T.relleno;
  });
}

// ui_hud_panel (16 × 16, cortes: 5 a los lados, 2 arriba, 6 abajo): barra de arriba de la prueba y la misión. Fondo azul noche
// casi opaco, borde inferior lavanda con canto de metal y remaches; arriba solo una línea, porque va pegado al borde de la pantalla.
function hudPanel() {
  const f = createFrame(16, 16);
  const C = (h, a = 255) => ((a << 24) | (parseInt(h.slice(5, 7), 16) << 16) | (parseInt(h.slice(3, 5), 16) << 8) | parseInt(h.slice(1, 3), 16)) >>> 0;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ex = Math.min(x, 15 - x);
    let c;
    if (y === 15) c = ex === 0 ? 0 : C('#0e0c16');                         // contorno de abajo
    else if (y === 14) c = ex === 0 ? C('#0e0c16') : C('#2e3560');          // canto de metal
    else if (y === 13) c = ex === 0 ? C('#0e0c16') : (ex === 2 ? C('#c9a7ff') : C('#4a5490'));
    else if (y === 12) c = ex === 0 ? C('#0e0c16') : C('#b9a6ff');          // borde lavanda
    else if (ex === 0) c = C('#0e0c16');
    else if (ex === 1) c = C('#2e3560');
    else if (y === 0) c = C('#2e3560');
    else c = C(y < 3 ? '#141830' : '#0b0d17', 235);                        // relleno casi opaco
    if (c) f.color[y * 16 + x] = c;
  }
  guardar(D + 'ui_hud_panel.png', f);
}

// ---------------------------------------------------------------- guía de los tutoriales rápidos
// tutorial/guia.png: retrato de la astronauta guía, 48 × 48, 3 cuadros en tira: 0 normal, 1 señalando (mano a la derecha), 2 contenta.
// Casco blanco con el visor abierto, cara visible, cuello naranja y parche lavanda de la misión. Fondo transparente.
function guia() {
  const W = 48, N = 3, f = createFrame(W * N, W);
  const P = {
    k: '#0e0c16', w: '#ffffff', h: '#e4e8f2', l: '#b4bccc', m: '#7a8498', d: '#4a5468',
    piel: '#c68456', pielC: '#e0a878', pielO: '#8e5636', pelo: '#2a1a14', peloC: '#4a2e20',
    ojo: '#1a1020', iris: '#3a2a4a', boca: '#8a2a30', lengua: '#d0605a', rubor: '#e8907a', oro: '#ffd166', oroO: '#c8901c', nar: '#f2701f', narO: '#a8301a', lav: '#b9a6ff', lavO: '#7a4cff',
  };
  for (let i = 0; i < N; i++) {
    const g = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < W) f.color[y * f.w + i * W + x] = hex(P[c]); };
    const mapa = Array.from({ length: W }, () => Array(W).fill(null));
    const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < W) mapa[y][x] = c; };
    // traje (hombros) y cuello
    for (let y = 36; y < 48; y++) for (let x = 4; x < 44; x++) {
      const borde = Math.abs(x - 23.5) / 20 + (y - 36) * -0.02;
      if (Math.abs(x - 23.5) > 14 + (y - 36) * 1.2) continue;
      put(x, y, y === 36 ? 'h' : x < 20 ? 'h' : x > 32 ? 'l' : 'h');
      if (y >= 40 && y <= 44 && x >= 28 && x <= 33) put(x, y, y === 40 || y === 44 || x === 28 || x === 33 ? 'lavO' : 'lav');   // parche
      if (y > 41 && (x === 15 || x === 16)) put(x, y, 'l');                                                                   // costura
    }
    for (let x = 13; x <= 34; x++) { put(x, 35, 'nar'); put(x, 36, 'narO'); }                                               // cuello naranja
    // casco
    for (let y = 2; y < 36; y++) for (let x = 4; x < 44; x++) {
      const d = Math.hypot(x + 0.5 - 24, (y + 0.5 - 19) * 1.04);
      if (d > 17.5) continue;
      put(x, y, d > 16 ? 'l' : x + y < 30 ? 'w' : x + y < 46 ? 'h' : 'l');
    }
    put(38, 10, 'm'); put(39, 9, 'm'); put(40, 8, 'nar');                                                                   // antenita
    for (let y = 17; y <= 22; y++) { put(6, y, 'm'); put(7, y, 'd'); }                                                     // luz lateral
    // visor abierto: marco dorado y la cara adentro
    for (let y = 8; y < 33; y++) for (let x = 10; x < 38; x++) {
      const e = ((x + 0.5 - 24) / 12.5) ** 2 + ((y + 0.5 - 20.5) / 11) ** 2;
      if (e > 1) continue;
      if (e > 0.82) { put(x, y, y < 18 ? 'oro' : 'oroO'); continue; }
      put(x, y, e > 0.66 && x > 29 ? 'pielO' : x + y < 33 ? 'pielC' : 'piel');
    }
    // pelo (flequillo) arriba del visor
    for (let y = 10; y < 16; y++) for (let x = 13; x < 35; x++) {
      const e = ((x + 0.5 - 24) / 11) ** 2 + ((y + 0.5 - 20.5) / 9.6) ** 2;
      if (e > 1 || e < 0) continue;
      if (y < 13 + Math.round(Math.sin(x * 0.9) * 0.8 + (x > 26 ? 1 : 0))) put(x, y, (x + y) % 5 === 0 ? 'peloC' : 'pelo');
    }
    // cara según la expresión
    const ojos = (cerrados) => {
      for (const ox of [19, 28]) {
        if (cerrados) { put(ox - 1, 21, 'ojo'); put(ox, 20, 'ojo'); put(ox + 1, 20, 'ojo'); put(ox + 2, 21, 'ojo'); }       // ^ ^ (sonriendo)
        else {
          // ojo de 2 × 3 abierto: brillo blanco arriba a la izquierda, iris abajo
          put(ox, 19, 'w'); put(ox + 1, 19, 'ojo'); put(ox, 20, 'ojo'); put(ox + 1, 20, 'ojo'); put(ox, 21, 'iris'); put(ox + 1, 21, 'ojo');
        }
      }
      for (const ox of [18, 27]) { put(ox, 17, 'peloC'); put(ox + 1, 16, 'peloC'); put(ox + 2, 16, 'peloC'); put(ox + 3, 17, 'peloC'); }   // cejas arqueadas
      for (const [x, y] of [[17, 23], [18, 23], [30, 23], [31, 23]]) put(x, y, 'rubor');                                    // mejillas
    };
    if (i === 2) {
      ojos(true);
      for (let x = 21; x <= 27; x++) put(x, 25, 'boca'); for (let x = 21; x <= 27; x++) put(x, 26, x === 21 || x === 27 ? 'boca' : 'w');
      for (let x = 22; x <= 26; x++) put(x, 27, x === 22 || x === 26 ? 'boca' : 'lengua'); for (let x = 23; x <= 25; x++) put(x, 28, 'boca');   // sonrisa abierta
    } else {
      ojos(false);
      put(21, 25, 'boca'); put(22, 26, 'boca'); for (let x = 23; x <= 25; x++) put(x, 27, 'boca'); put(26, 26, 'boca'); put(27, 25, 'boca');   // sonrisa clara
      put(24, 23, 'pielO');                                                                                                  // nariz
    }
    // señalando: brazo y guante que suben por la derecha con el índice hacia afuera
    if (i === 1) {
      for (let y = 26; y < 44; y++) for (let x = 34; x < 46; x++) {
        const enBrazo = Math.abs((x - 38) - (44 - y) * 0.25) < 3.2 && y >= 33;
        if (enBrazo) put(x, y, x < 38 ? 'h' : 'l');
      }
      for (let y = 26; y <= 32; y++) for (let x = 37; x <= 43; x++) put(x, y, y === 26 || x === 37 ? 'w' : 'h');            // guante
      for (let x = 43; x <= 47; x++) { put(x, 27, 'w'); put(x, 28, 'h'); }                                                  // índice
      put(37, 33, 'nar'); put(38, 33, 'nar'); put(39, 33, 'nar'); put(40, 33, 'nar');                                     // puño naranja
    }
    // pasar al cuadro con contorno automático (4 vecinos)
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (mapa[y][x]) g(x, y, mapa[y][x]);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      if (mapa[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => mapa[y + dy]?.[x + dx])) g(x, y, 'k');
    }
  }
  guardar('tutorial/guia.png', f);
}

// ui_senalador.png: flecha amarilla que apunta hacia abajo y rebota, 4 cuadros de 12 × 14 (desplazamiento 0, 1, 2, 1).
// Para apuntar a otro lado se gira en el juego.
function senalador() {
  const W = 12, Hh = 14, f = createFrame(W * 4, Hh), K = hex('#0e0c16');
  [0, 1, 2, 1].forEach((dy, i) => {
    const m = Array.from({ length: Hh }, () => Array(W).fill(null));
    for (let y = 0; y < 11; y++) for (let x = 0; x < W; x++) {
      const yy = y + dy + 1;
      if (yy >= Hh - 1) continue;
      const tallo = y <= 5 && x >= 4 && x <= 7, punta = y > 5 && Math.abs(x + 0.5 - 6) <= 5.5 - (y - 5) * 1.1;
      if (tallo || punta) m[yy][x] = x < 6 ? '#fff08a' : y > 7 ? '#c8901c' : '#ffd166';
    }
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const X = i * W + x;
      if (m[y][x]) f.color[y * f.w + X] = hex(m[y][x]);
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => m[y + b]?.[x + a])) f.color[y * f.w + X] = K;
    }
  });
  guardar(D + 'ui_senalador.png', f);
}

// ui_resalte.png (12 × 12, cortes de 4): marco de resaltado con esquinas en escuadra amarillas y bordes finos; centro transparente.
function resalte() {
  const f = createFrame(12, 12), Y = hex('#ffd166'), YC = hex('#fff08a'), K = hex('#0e0c16');
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const ex = Math.min(x, 11 - x), ey = Math.min(y, 11 - y);
    let c = 0;
    const esquina = ex < 4 && ey < 4;
    if (esquina && (ex <= 2 || ey <= 2) && ex >= 0) c = (ex === 0 || ey === 0) ? K : (ex === 1 || ey === 1) ? (x + y < 12 ? YC : Y) : (ex === 2 && ey <= 2) || (ey === 2 && ex <= 2) ? K : 0;
    else if (!esquina && (ex === 1 || ey === 1)) c = Y;                              // borde fino
    else if (!esquina && (ex === 0 || ey === 0 || ex === 2 || ey === 2) && Math.min(ex, ey) <= 2) c = K;
    if (c) f.color[y * 12 + x] = c;
  }
  guardar(D + 'ui_resalte.png', f);
}
