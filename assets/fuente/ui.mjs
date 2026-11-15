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
