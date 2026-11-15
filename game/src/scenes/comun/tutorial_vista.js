// Vista común de los tutoriales guiados (docs/juego/PLAN_REMAKE.md §1); la lógica está en comun/tutorial.js.
// Dos piezas:
// - abrirTutorial: «coach marks». Oscurece la pantalla salvo la zona del paso, la encuadra (ui_resalte), la señala con la
//   flecha (ui_senalador, 4 cuadros que rebotan; quieta con prefers-reduced-motion) y explica en una burbuja con la
//   astronauta guía (tutorial/guia, 3 cuadros de 48 × 48: normal, señalando, contenta). La usan el Expediente, la
//   primera prueba, la primera misión y el Taller.
// - abrirResumen: las 4 viñetas del tutorial (tutorial/tutorial_1..4) con una frase cada una, al elegir destino.
// Sin arte, respaldos dibujados. Ratón, toque y teclado (Enter, ← →, Esc). Textos con la fuente pixel ≥ 14 px.
import { tr } from '../../i18n.js';
import { boton, cajaArte } from '../expediente/interfaz.js';
import { P, txt, num } from '../expediente/componentes.js';
import { movimientoReducido } from '../expediente/efectos.js';
import { posicionBurbuja } from './tutorial.js';

const W = 960;
const H = 540;
const BURBUJA_W = 560;
const RETRATO = 96; // guía 48 × 48 dibujada ×2
const HUECO = 36; // entre la zona y la burbuja (ahí va la flecha)
const PAD_ZONA = 6;

/** Corta una tira horizontal en cuadros de `ancho` × `alto` si la textura existe y aún no los tiene. Devuelve cuántos. */
export function cuadros(scene, clave, ancho, alto) {
  if (!scene.textures.exists(clave)) return 0;
  const tex = scene.textures.get(clave);
  const src = tex.getSourceImage();
  const n = Math.max(1, Math.floor(src.width / ancho));
  for (let i = 0; i < n; i++) if (!tex.has(`c${i}`)) tex.add(`c${i}`, 0, i * ancho, 0, ancho, alto);
  return n;
}

/** Retrato de la guía (cuadro 0 normal, 1 señalando, 2 contenta) o null si no hay arte. */
function retrato(scene, x, y, cuadro) {
  const n = cuadros(scene, 'tutorial/guia', 48, 48);
  if (!n) return null;
  return scene.add.image(x, y, 'tutorial/guia', `c${Math.min(cuadro, n - 1)}`).setOrigin(0, 0).setScale(2);
}

/**
 * Abre un tutorial de «coach marks» encima de todo.
 * @param {Phaser.Scene} scene
 * @param {object} o
 *   pasos: [{ zona, titulo, texto, bloquear?, esperar?, cuadro? }]
 *     - zona: nombre que se pasa a `zonas()`; sin zona (o null) la burbuja va centrada y se oscurece todo.
 *     - bloquear (por defecto true): un rectángulo invisible tapa los toques a lo de abajo. Con false, la zona y lo
 *       oscurecido dejan pasar el ratón y el toque (p. ej. «arrastra una rueda a su eje» o las flechas de manejo).
 *     - esperar: texto corto que reemplaza a «Siguiente ▶» (p. ej. «Arrastra una rueda…»); el paso avanza cuando la
 *       escena llama a `tutorial.avanzar()`. Enter no lo salta (Esc sí salta el tutorial).
 *     - cuadro: cuadro de la guía (0 normal, 1 señalando, 2 contenta); por defecto 0 en el primero, 2 en el último.
 *   zonas(nombre) → { x, y, w, h } en px de pantalla o null.
 *   alCerrar(motivo): al terminar ('fin'), saltar ('saltar') o cerrar desde la escena ('externo'). Siempre marca visto.
 *   marca: de marcaTutorial(clave) (comun/tutorial.js); se marca como visto al cerrar.
 *   inicio: paso inicial. profundidad: depth de la capa (por defecto 50).
 *   fijo: true en escenas con cámara que se mueve (Prueba, Misión): todo con scrollFactor 0.
 *   teclado: 'auto' usa el Teclado de interfaz.js si la escena lo tiene (scene.teclado); false = la escena reparte las
 *     teclas y llama a siguiente()/anterior()/cerrar() (Prueba y Misión, donde ← → manejan el robot).
 * @returns {{ cerrar(motivo?), siguiente(), anterior(), avanzar(), paso(): number, abierto(): boolean, capa, redibujar() }}
 */
export function abrirTutorial(scene, { pasos, zonas, alCerrar, marca = null, inicio = 0, profundidad = 50, fijo = false, teclado = 'auto' }) {
  const capa = scene.add.container(0, 0).setDepth(profundidad);
  if (fijo) capa.setScrollFactor(0);
  const quieto = movimientoReducido();
  const usarTeclado = teclado !== false && scene.teclado;
  let i = Math.max(0, Math.min(inicio, pasos.length - 1));
  let animacion = null;
  let abierto = true;
  const nGuia = cuadros(scene, 'tutorial/guia', 48, 48);
  const nFlecha = cuadros(scene, 'ui/ui_senalador', 12, 14);

  const cerrar = (motivo = 'externo') => {
    if (!abierto) return;
    abierto = false;
    marca?.marcarVisto();
    animacion?.remove();
    capa.destroy(true);
    alCerrar?.(motivo);
  };
  const ir = (paso) => {
    if (!abierto) return;
    const n = i + paso;
    if (n >= pasos.length) { cerrar('fin'); return; }
    i = Math.max(0, n);
    dibujar();
  };

  function dibujar() {
    animacion?.remove();
    animacion = null;
    capa.removeAll(true);
    const add = (o) => {
      const obj = o.obj || o;
      if (fijo) obj.setScrollFactor?.(0);
      capa.add(obj);
      return o;
    };
    const p = pasos[i];
    const bloquear = p.bloquear !== false;
    const z0 = p.zona ? zonas(p.zona) : null;
    const z = z0 ? {
      x: Math.max(0, z0.x - PAD_ZONA), y: Math.max(0, z0.y - PAD_ZONA),
      w: Math.min(W, z0.x + z0.w + PAD_ZONA) - Math.max(0, z0.x - PAD_ZONA),
      h: Math.min(H, z0.y + z0.h + PAD_ZONA) - Math.max(0, z0.y - PAD_ZONA),
    } : null;

    // Bloquea los toques a lo de abajo (también dentro de la zona resaltada: se mira, no se toca), salvo bloquear: false.
    if (bloquear) add(scene.add.rectangle(0, 0, W, H, 0x000000, 0.01).setOrigin(0, 0).setInteractive());
    const sombra = (x, y, w, h) => { if (w > 0 && h > 0) add(scene.add.rectangle(x, y, w, h, 0x05060d, bloquear ? 0.8 : 0.6).setOrigin(0, 0)); };
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
    // El fondo de la burbuja siempre recibe el toque: lo de abajo no se activa por error al tocar la burbuja.
    add(scene.add.rectangle(b.x, b.y, BURBUJA_W, alto, P.panel).setOrigin(0, 0).setStrokeStyle(2, num(P.accion)).setInteractive());
    add(cajaArte(scene, 'ui/ui_tarjeta', b.x, b.y, BURBUJA_W, alto));
    if (conGuia) {
      const cuadro = p.cuadro ?? (i === pasos.length - 1 ? 2 : i === 0 ? 0 : 1);
      add(retrato(scene, b.x + 14, b.y + 14, cuadro));
    }
    add(tTitulo.setPosition(b.x + xt, b.y + 14));
    add(txt(scene, b.x + BURBUJA_W - 16, b.y + 14, `${i + 1}/${pasos.length}`, { size: 14, color: P.sec, origen: [1, 0] }));
    add(tTexto.setPosition(b.x + xt, b.y + 14 + tTitulo.height + 8));

    // Botones (fila de abajo): ◀ · Saltar · Siguiente ▶ (o «¡Entendido!» en el último; o la pista de `esperar`).
    const yb = b.y + alto - 32;
    const ultimo = i === pasos.length - 1;
    const ant = add(boton(scene, b.x + 24, yb, '◀', () => ir(-1), { size: 16, origen: [0, 0.5], habilitado: i > 0 }));
    const saltar = add(boton(scene, b.x + 24 + 64 + 18, yb, tr('Saltar · Esc', 'Skip · Esc'), () => cerrar('saltar'), { size: 14, origen: [0, 0.5] }));
    let sig = null;
    if (p.esperar) add(txt(scene, b.x + BURBUJA_W - 24, yb, p.esperar, { size: 14, color: P.dato, origen: [1, 0.5] }));
    else {
      sig = add(boton(scene, b.x + BURBUJA_W - 24, yb, ultimo ? tr('¡Entendido!', 'Got it!') : tr('Siguiente ▶', 'Next ▶'), () => ir(1),
        { size: 16, origen: [1, 0.5], sugerido: true }));
    }

    // Flecha entre la burbuja y la zona, apuntando a la zona (el arte apunta hacia abajo; si la burbuja está debajo, se voltea).
    if (z && b.abajo !== null) {
      const ax = Math.round(Math.min(Math.max(z.x + z.w / 2, b.x + 40), b.x + BURBUJA_W - 40));
      const ay = b.abajo ? b.y - HUECO / 2 : b.y + alto + HUECO / 2;
      if (nFlecha > 0) {
        const flecha = add(scene.add.image(ax, ay, 'ui/ui_senalador', 'c0').setScale(2).setFlipY(!!b.abajo));
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

    // Teclado (escenas con el Teclado de interfaz.js): Enter = siguiente, ← → cambian de paso, Esc salta. Lo de abajo no
    // recibe teclas. Con teclado: false, la escena reparte las teclas (siguiente/anterior/cerrar).
    if (usarTeclado) {
      const t = scene.teclado;
      t.items.filter((x) => x.obj.active).forEach((x) => x.enfocar(false));
      t.alEscape = () => cerrar('saltar');
      t.extra = { ArrowLeft: () => ir(-1), ArrowRight: () => { if (!pasos[i].esperar) ir(1); }, '?': () => {} };
      t.numerar([]);
      t.poner([ant, saltar, sig].filter(Boolean), sig ?? saltar);
    }
  }

  dibujar();
  return {
    cerrar,
    capa,
    paso: () => i,
    abierto: () => abierto,
    /** Enter / «Siguiente»: no salta un paso que espera una acción. */
    siguiente: () => { if (abierto && !pasos[i].esperar) ir(1); },
    anterior: () => ir(-1),
    /** La escena avisa que el jugador hizo lo que pedía el paso actual (pasos con `esperar`, o cualquiera). */
    avanzar: () => ir(1),
    redibujar: () => { if (abierto) dibujar(); },
  };
}

/**
 * Resumen de la partida en 4 viñetas (arte de Mauricio, 96 × 64 dibujadas ×2) con una frase cada una, a pantalla
 * completa. `vinetas`: de pasosResumen(); `titulo`; `alCerrar(motivo)` ('fin' o 'saltar'); `marca` se marca al cerrar.
 * Las viñetas aparecen una tras otra (todas juntas con prefers-reduced-motion). Teclado: Enter sigue, Esc salta.
 * @returns {{ cerrar(motivo?), capa, abierto(): boolean, botones: {seguir, saltar} }}
 */
export function abrirResumen(scene, { vinetas, titulo, alCerrar, marca = null, profundidad = 60 }) {
  const capa = scene.add.container(0, 0).setDepth(profundidad);
  const add = (o) => { capa.add(o.obj || o); return o; };
  let abierto = true;
  const cerrar = (motivo = 'fin') => {
    if (!abierto) return;
    abierto = false;
    marca?.marcarVisto();
    capa.destroy(true);
    alCerrar?.(motivo);
  };

  add(scene.add.rectangle(0, 0, W, H, 0x05060d, 0.86).setOrigin(0, 0).setInteractive());
  const X0 = 30, Y0 = 34, AW = 900, AH = 474;
  add(scene.add.rectangle(X0, Y0, AW, AH, P.panel).setOrigin(0, 0).setStrokeStyle(2, num(P.accion)));
  add(cajaArte(scene, 'ui/ui_tarjeta', X0, Y0, AW, AH));
  // Cabecera: la guía señalando y el título.
  const guia = retrato(scene, X0 + 24, Y0 + 16, 1);
  if (guia) add(guia);
  const xTitulo = guia ? X0 + 24 + RETRATO + 18 : X0 + 24;
  add(txt(scene, xTitulo, Y0 + 30, titulo, { size: 22, color: P.accion, ancho: AW - (xTitulo - X0) - 24 }));
  add(txt(scene, xTitulo, Y0 + 72, tr('Así se juega, en 4 pasos', 'How to play, in 4 steps'), { size: 16, color: P.sec }));

  // 4 viñetas en fila con «›» entre ellas; debajo, el número y la frase.
  const VW = 192, VH = 128, SEP = 30;
  const n = vinetas.length;
  const xv0 = Math.round(W / 2 - (n * VW + (n - 1) * SEP) / 2);
  const yv = Y0 + 136;
  const quieto = movimientoReducido();
  vinetas.forEach((v, k) => {
    const x = xv0 + k * (VW + SEP);
    const grupo = [];
    grupo.push(add(scene.add.rectangle(x, yv, VW, VH, 0x0b0d17).setOrigin(0, 0).setStrokeStyle(2, P.borde)));
    if (v.imagen && scene.textures.exists(v.imagen)) {
      const img = scene.add.image(x + VW / 2, yv + VH / 2, v.imagen);
      img.setScale(Math.min(VW / img.width, VH / img.height));
      grupo.push(add(img));
    } else grupo.push(add(txt(scene, x + VW / 2, yv + VH / 2, String(k + 1), { size: 32, color: P.sec, origen: [0.5, 0.5] })));
    grupo.push(add(txt(scene, x + VW / 2, yv + VH + 14, String(k + 1), { size: 22, color: P.accion, origen: [0.5, 0] })));
    grupo.push(add(txt(scene, x + VW / 2, yv + VH + 46, v.texto, { size: 16, color: P.texto, origen: [0.5, 0], ancho: VW + 12, alinear: 'center', interlineado: 2 })));
    if (k < n - 1) grupo.push(add(txt(scene, x + VW + SEP / 2, yv + VH / 2, '›', { size: 22, color: P.accion, origen: [0.5, 0.5] })));
    if (!quieto) {
      grupo.forEach((o) => o.setAlpha(0));
      scene.tweens.add({ targets: grupo, alpha: 1, duration: 260, delay: 150 + k * 350 });
    }
  });

  const yb = Y0 + AH - 40;
  const saltar = add(boton(scene, X0 + 32, yb, tr('Saltar · Esc', 'Skip · Esc'), () => cerrar('saltar'), { size: 16, origen: [0, 0.5] }));
  const seguir = add(boton(scene, X0 + AW - 32, yb, tr('¡Vamos! ▶', "Let's go! ▶"), () => cerrar('fin'), { size: 18, origen: [1, 0.5], sugerido: true }));
  if (scene.teclado) {
    const t = scene.teclado;
    t.items.filter((x) => x.obj.active).forEach((x) => x.enfocar(false));
    t.alEscape = () => cerrar('saltar');
    t.extra = { ...t.extra, ArrowLeft: () => {}, ArrowRight: () => {} };
    t.numerar([]);
    t.poner([saltar, seguir], seguir);
  }
  return { cerrar, capa, abierto: () => abierto, botones: { seguir, saltar } };
}
