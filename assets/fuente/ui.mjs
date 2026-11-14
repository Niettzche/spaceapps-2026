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
  };
  for (const [nombre, rows] of Object.entries(iconos)) tira(D + nombre + '.png', 8, 8, 1, (p) => filas(p, rows));

  // ---- marco de barra 9-slice (6 × 6): borde de 2 px, interior hundido
  tira(D + 'ui_marco_barra.png', 6, 6, 1, (p) => filas(p, ['kkkkkk', 'kmlllk', 'kmggdk', 'kmggdk', 'kddddk', 'kkkkkk']), { contorno: false });

  // ---- botón genérico 9-slice (12 × 12): normal y presionado
  const boton = (presionado) => {
    const g = Array.from({ length: 12 }, (_, y) => Array.from({ length: 12 }, (_, x) => {
      if (x === 0 || y === 0 || x === 11 || y === 11) return 'k';
      const yy = presionado ? y - 1 : y;
      if (!presionado && y >= 9) return y === 10 ? 'd' : 'm';              // canto inferior (relieve)
      if (yy <= 1) return presionado ? 'm' : 'h';                          // brillo superior
      return presionado ? 'd' : 'l';
    }));
    // esquinas redondeadas
    for (const [x, y] of [[0, 0], [11, 0], [0, 11], [11, 11]]) g[y][x] = '.';
    return g.map((r) => r.join(''));
  };
  tira(D + 'ui_boton.png', 12, 12, 1, (p) => filas(p, boton(false)), { contorno: false });
  tira(D + 'ui_boton_presionado.png', 12, 12, 1, (p) => filas(p, boton(true)), { contorno: false });

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
