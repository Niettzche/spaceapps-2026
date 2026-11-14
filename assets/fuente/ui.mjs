// Interfaz (prioridad A): íconos de barra 8 × 8, marco de barra 9-slice 6 × 6, botones táctiles ◀ ▶ 24 × 24
// (normal y presionado) y botón genérico 9-slice 12 × 12. Prefijo ui_ para no chocar con otros nombres.
import { tira, filas, contorno, createFrame, painterFor, guardar, BASE, hex } from './comun.mjs';

const D = 'ui/';

export function generar() {
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
