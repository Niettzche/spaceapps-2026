// Dueño: frente expediente. Vista del tutorial rápido del Expediente (coach marks); la lógica está en tutorial_expediente.js.
// Oscurece la pantalla salvo la zona del paso, la encuadra (ui_resalte), la señala con la flecha (ui_senalador, 4 cuadros
// que rebotan; quieta con prefers-reduced-motion) y explica en una burbuja con la astronauta guía (tutorial/guia, 3 cuadros
// de 48 × 48: normal, señalando, contenta). Sin arte, respaldos dibujados. Ratón, toque y teclado (Enter, ← →, Esc).
import { tr } from '../../i18n.js';
import { boton, cajaArte } from './interfaz.js';
import { P, txt, num } from './componentes.js';
import { movimientoReducido } from './efectos.js';
import { posicionBurbuja, marcarTutorialVisto } from './tutorial_expediente.js';

const W = 960;
const H = 540;
const BURBUJA_W = 560;
const RETRATO = 96; // guía 48 × 48 dibujada ×2
const HUECO = 36; // entre la zona y la burbuja (ahí va la flecha)
const PAD_ZONA = 6;

/** Corta una tira horizontal en cuadros cuadrados (o de `ancho` px) si la textura existe y aún no los tiene. */
function cuadros(scene, clave, ancho, alto) {
  if (!scene.textures.exists(clave)) return 0;
  const tex = scene.textures.get(clave);
  const src = tex.getSourceImage();
  const n = Math.max(1, Math.floor(src.width / ancho));
  for (let i = 0; i < n; i++) if (!tex.has(`c${i}`)) tex.add(`c${i}`, 0, i * ancho, 0, ancho, alto);
  return n;
}

/**
 * Abre el tutorial encima de todo. `pasos`: de pasosTutorial(); `zonas(nombre)` → { x, y, w, h } o null;
 * `alCerrar()` se llama al terminar o saltar (queda marcado como visto en ambos casos). Devuelve { cerrar, capa, paso() }.
 */
export function abrirTutorial(scene, { pasos, zonas, alCerrar, inicio = 0 }) {
  const capa = scene.add.container(0, 0).setDepth(50);
  const quieto = movimientoReducido();
  let i = Math.max(0, Math.min(inicio, pasos.length - 1));
  let animacion = null;
  let abierto = true;
  const nGuia = cuadros(scene, 'tutorial/guia', 48, 48);
  const nFlecha = cuadros(scene, 'ui/ui_senalador', 12, 14);

  const cerrar = () => {
    if (!abierto) return;
    abierto = false;
    marcarTutorialVisto();
    animacion?.remove();
    capa.destroy(true);
    alCerrar?.();
  };
  const ir = (paso) => {
    const n = i + paso;
    if (n >= pasos.length) { cerrar(); return; }
    i = Math.max(0, n);
    dibujar();
  };

  function dibujar() {
    animacion?.remove();
    animacion = null;
    capa.removeAll(true);
    const add = (o) => { capa.add(o.obj || o); return o; };
    const p = pasos[i];
    const z0 = zonas(p.zona);
    const z = z0 ? {
      x: Math.max(0, z0.x - PAD_ZONA), y: Math.max(0, z0.y - PAD_ZONA),
      w: Math.min(W, z0.x + z0.w + PAD_ZONA) - Math.max(0, z0.x - PAD_ZONA),
      h: Math.min(H, z0.y + z0.h + PAD_ZONA) - Math.max(0, z0.y - PAD_ZONA),
    } : null;

    // Bloquea los toques a lo de abajo (también dentro de la zona resaltada: se mira, no se toca).
    add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.01).setOrigin(0, 0).setInteractive());
    const sombra = (x, y, w, h) => { if (w > 0 && h > 0) add(scene.add.rectangle(x, y, w, h, 0x05060d, 0.8).setOrigin(0, 0)); };
    if (z) {
      sombra(0, 0, W, z.y);
      sombra(0, z.y + z.h, W, H - z.y - z.h);
      sombra(0, z.y, z.x, z.h);
      sombra(z.x + z.w, z.y, W - z.x - z.w, z.h);
      if (scene.textures.exists('ui/ui_resalte')) add(cajaArte(scene, 'ui/ui_resalte', z.x, z.y, z.w, z.h, { escala: 2 }));
      else add(scene.add.rectangle(z.x, z.y, z.w, z.h).setOrigin(0, 0).setStrokeStyle(3, num(P.accion)));
    } else sombra(0, 0, W, H);

    // Burbuja: retrato a la izquierda; título + «n/total», texto y botones a la derecha.
    const conGuia = nGuia > 0;
    const xt = 16 + (conGuia ? RETRATO + 14 : 0);
    const anchoTexto = BURBUJA_W - xt - 16;
    const tTitulo = txt(scene, 0, 0, p.titulo, { size: 16, color: P.accion, ancho: anchoTexto - 60 });
    const tTexto = txt(scene, 0, 0, p.texto, { size: 16, color: P.texto, ancho: anchoTexto, interlineado: 2 });
    const altoTexto = 14 + tTitulo.height + 8 + tTexto.height;
    const alto = Math.max(altoTexto, conGuia ? RETRATO + 14 : 0) + 12 + 44 + 10;
    const b = posicionBurbuja(z, { w: BURBUJA_W, h: alto }, { w: W, h: H }, { hueco: HUECO });
    add(scene.add.rectangle(b.x, b.y, BURBUJA_W, alto, P.panel).setOrigin(0, 0).setStrokeStyle(2, num(P.accion)));
    add(cajaArte(scene, 'ui/ui_tarjeta', b.x, b.y, BURBUJA_W, alto));
    if (conGuia) {
      const cuadro = i === pasos.length - 1 ? 2 : i === 0 ? 0 : 1;
      add(scene.add.image(b.x + 14, b.y + 14, 'tutorial/guia', `c${Math.min(cuadro, nGuia - 1)}`).setOrigin(0, 0).setScale(2));
    }
    add(tTitulo.setPosition(b.x + xt, b.y + 14));
    add(txt(scene, b.x + BURBUJA_W - 16, b.y + 14, `${i + 1}/${pasos.length}`, { size: 14, color: P.sec, origen: [1, 0] }));
    add(tTexto.setPosition(b.x + xt, b.y + 14 + tTitulo.height + 8));

    // Botones (fila de abajo): ◀ · Saltar · Siguiente ▶ (o «¡Entendido!» en el último).
    const yb = b.y + alto - 32;
    const ultimo = i === pasos.length - 1;
    const ant = add(boton(scene, b.x + 24, yb, '◀', () => ir(-1), { size: 16, origen: [0, 0.5], habilitado: i > 0 }));
    const saltar = add(boton(scene, b.x + 24 + 64 + 18, yb, tr('Saltar · Esc', 'Skip · Esc'), cerrar, { size: 14, origen: [0, 0.5] }));
    const sig = add(boton(scene, b.x + BURBUJA_W - 24, yb, ultimo ? tr('¡Entendido!', 'Got it!') : tr('Siguiente ▶', 'Next ▶'), () => ir(1),
      { size: 16, origen: [1, 0.5], sugerido: true }));

    // Flecha entre la burbuja y la zona, apuntando a la zona (el arte apunta hacia abajo; si la burbuja está debajo, se voltea).
    if (z && b.abajo !== null) {
      const ax = Math.round(Math.min(Math.max(z.x + z.w / 2, b.x + 40), b.x + BURBUJA_W - 40));
      const ay = b.abajo ? b.y - HUECO / 2 : b.y + alto + HUECO / 2;
      let flecha;
      if (nFlecha > 0) {
        flecha = add(scene.add.image(ax, ay, 'ui/ui_senalador', 'c0').setScale(2).setFlipY(!!b.abajo));
        if (!quieto && nFlecha > 1) {
          let k = 0;
          animacion = scene.time.addEvent({ delay: 130, loop: true, callback: () => { k = (k + 1) % nFlecha; if (flecha.active) flecha.setFrame(`c${k}`); } });
        }
      } else {
        const g = add(scene.add.graphics());
        const s = b.abajo ? -1 : 1; // punta hacia abajo (1) o hacia arriba (-1)
        g.fillStyle(num(P.accion), 1).fillTriangle(ax - 12, ay - 8 * s, ax + 12, ay - 8 * s, ax, ay + 10 * s);
      }
    }

    // Teclado: Enter = siguiente (sugerido), ← → cambian de paso, Esc salta. Lo de abajo no recibe teclas.
    const t = scene.teclado;
    t.items.filter((x) => x.obj.active).forEach((x) => x.enfocar(false));
    t.alEscape = cerrar;
    t.extra = { ArrowLeft: () => ir(-1), ArrowRight: () => ir(1), '?': () => {} };
    t.numerar([]);
    t.poner([ant, saltar, sig], sig);
  }

  dibujar();
  return { cerrar, capa, paso: () => i, abierto: () => abierto };
}

