// Dueño: frente taller. Vista del tutorial del Taller (coach marks), con el mismo arte y la misma colocación de la burbuja que
// el del Expediente (expediente/tutorial_vista.js, que depende del teclado del Expediente; por eso esta copia local).
// Oscurece la pantalla salvo la zona del paso, la encuadra (ui/ui_resalte), la señala (ui/ui_senalador; quieta con
// prefers-reduced-motion) y explica en una burbuja con la astronauta guía (tutorial/guia, 3 cuadros de 48 × 48).
// Un paso con `espera` deja usar la zona resaltada (p. ej. arrastrar una rueda a su eje); los demás solo se miran.
// El teclado lo maneja la escena: llama a siguiente(), anterior() y cerrar().
// Cuando exista game/src/scenes/comun/tutorial.js, esta vista se puede cambiar por la común sin tocar Taller.js más que aquí.
import * as K from '../comun/pixel.js';
import { tr } from '../../i18n.js';
import { posicionBurbuja } from '../expediente/tutorial_expediente.js';
import { movimientoReducido } from '../expediente/efectos.js';
import { marcarTutorialTallerVisto } from './tutorial.js';

const W = 960;
const H = 540;
const BURBUJA_W = 600;
const RETRATO = 96; // guía 48 × 48 dibujada ×2
const HUECO = 36; // entre la zona y la burbuja (ahí va la flecha)
const PAD = 6;
const PROF = 70; // encima de todo el Taller (el fantasma del arrastre va a 90)

function cortar(scene, clave, ancho, alto) {
  if (!scene.textures.exists(clave)) return 0;
  const tex = scene.textures.get(clave);
  const n = Math.max(1, Math.floor(tex.getSourceImage().width / ancho));
  for (let i = 0; i < n; i++) if (!tex.has(`c${i}`)) tex.add(`c${i}`, 0, i * ancho, 0, ancho, alto);
  return n;
}

/**
 * Abre el tutorial. `pasos`: de pasosTutorialTaller(); `zonas(nombre)` → { x, y, w, h } o null; `alCerrar()` al terminar o
 * saltar (queda marcado como visto). Devuelve { cerrar, siguiente, anterior, paso(), espera(), abierto(), objetos() }.
 */
export function abrirTutorialTaller(scene, { pasos, zonas, alCerrar }) {
  const quieto = movimientoReducido();
  let i = 0;
  let abierto = true;
  let objs = [];
  let animacion = null;
  const nGuia = cortar(scene, 'tutorial/guia', 48, 48);
  const nFlecha = cortar(scene, 'ui/ui_senalador', 12, 14);

  const limpiar = () => {
    animacion?.remove();
    animacion = null;
    objs.forEach((o) => o.destroy());
    objs = [];
  };
  const cerrar = () => {
    if (!abierto) return;
    abierto = false;
    marcarTutorialTallerVisto();
    limpiar();
    alCerrar?.();
  };
  const ir = (d) => {
    if (!abierto) return;
    const n = i + d;
    if (n >= pasos.length) { cerrar(); return; }
    i = Math.max(0, n);
    dibujar();
  };

  function dibujar() {
    limpiar();
    const add = (o, d = 0) => { o.setDepth?.(PROF + d); objs.push(o); return o; };
    const p = pasos[i];
    const z0 = zonas(p.zona);
    const z = z0 ? {
      x: Math.max(0, z0.x - PAD), y: Math.max(0, z0.y - PAD),
      w: Math.min(W, z0.x + z0.w + PAD) - Math.max(0, z0.x - PAD),
      h: Math.min(H, z0.y + z0.h + PAD) - Math.max(0, z0.y - PAD),
    } : null;

    // Sombra en 4 rectángulos alrededor de la zona; bloquean los toques. Sin `espera`, la zona también se bloquea.
    // `capa = true`: bloquea toques pero no es un control (las revisiones de zona táctil la ignoran).
    const sombra = (x, y, w, h) => {
      if (w > 0 && h > 0) { const r = add(scene.add.rectangle(x, y, w, h, 0x05060d, 0.8).setOrigin(0, 0).setInteractive()); r.capa = true; }
    };
    if (z) {
      sombra(0, 0, W, z.y);
      sombra(0, z.y + z.h, W, H - z.y - z.h);
      sombra(0, z.y, z.x, z.h);
      sombra(z.x + z.w, z.y, W - z.x - z.w, z.h);
      if (!p.espera) add(scene.add.rectangle(z.x, z.y, z.w, z.h, 0x000000, 0.01).setOrigin(0, 0).setInteractive()).capa = true;
      add(K.nueve(scene, 'ui/ui_resalte', z.x, z.y, z.w, z.h, 4, 2)
        ?? scene.add.rectangle(z.x, z.y, z.w, z.h).setOrigin(0, 0).setStrokeStyle(4, K.num(K.P.accion)), 1);
    } else sombra(0, 0, W, H);

    // Burbuja: retrato a la izquierda; título + «n/total», texto y botones a la derecha.
    const conGuia = nGuia > 0;
    const xt = 16 + (conGuia ? RETRATO + 14 : 0);
    const anchoTexto = BURBUJA_W - xt - 16;
    const tTitulo = K.txt(scene, 0, 0, p.titulo, { size: 18, color: K.P.accion, ancho: anchoTexto - 50 });
    const tTexto = K.txt(scene, 0, 0, p.texto, { size: 16, color: K.P.texto, ancho: anchoTexto, interlineado: 2 });
    const altoTexto = 14 + tTitulo.height + 10 + tTexto.height;
    const alto = Math.max(altoTexto, conGuia ? RETRATO + 14 : 0) + 12 + 45 + 10;
    const b = posicionBurbuja(z, { w: BURBUJA_W, h: alto }, { w: W, h: H }, { hueco: HUECO });
    add(scene.add.rectangle(b.x, b.y, BURBUJA_W, alto, K.P.panel).setOrigin(0, 0).setStrokeStyle(2, K.num(K.P.accion)).setInteractive(), 1);
    const marco = K.nueve(scene, 'ui/ui_tarjeta', b.x, b.y, BURBUJA_W, alto, 4, 3);
    if (marco) add(marco, 1);
    if (conGuia) {
      const cuadro = i === pasos.length - 1 ? 2 : i === 0 ? 0 : 1;
      add(scene.add.image(b.x + 14, b.y + 14, 'tutorial/guia', `c${Math.min(cuadro, nGuia - 1)}`).setOrigin(0, 0).setScale(2), 2);
    }
    add(tTitulo.setPosition(b.x + xt, b.y + 14), 2);
    add(K.txt(scene, b.x + BURBUJA_W - 16, b.y + 14, `${i + 1}/${pasos.length}`, { size: 14, color: K.P.sec, origen: [1, 0] }), 2);
    add(tTexto.setPosition(b.x + xt, b.y + 14 + tTitulo.height + 10), 2);

    // Botones: ‹ · Saltar · Siguiente › (o «¡Entendido!»). En un paso con `espera` no hay «Siguiente»: se avanza al hacerlo.
    const yb = b.y + alto - 10 - 22;
    const ultimo = i === pasos.length - 1;
    const boton = (x, etiqueta, fn, o) => {
      const bt = K.boton(scene, x, yb, etiqueta, fn, { size: 16, alto: 45, pad: 12, reservaFoco: false, ...o });
      K.fijarBoton(bt, PROF + 3);
      objs.push(bt.obj, bt.caja);
      return bt;
    };
    const ant = boton(b.x + xt, '‹', () => ir(-1), { origen: [0, 0.5], habilitado: i > 0 });
    const saltar = boton(ant.caja.x + ant.ancho + 12, tr('Saltar · Esc', 'Skip · Esc'), cerrar, { origen: [0, 0.5], color: K.P.sec });
    let sig = null;
    if (p.espera) {
      add(K.txt(scene, b.x + BURBUJA_W - 16, yb, tr('Te espero…', 'Your turn…'), { size: 16, color: K.P.dato, origen: [1, 0.5] }), 2);
    } else {
      sig = boton(b.x + BURBUJA_W - 16, ultimo ? tr('¡Entendido!', 'Got it!') : tr('Siguiente ›', 'Next ›'), () => ir(1),
        { origen: [1, 0.5], color: K.P.bien });
    }
    botones = { ant, saltar, sig };

    // Flecha entre la burbuja y la zona (el arte apunta hacia abajo; si la burbuja está debajo, se voltea).
    if (z && b.abajo !== null) {
      const ax = Math.round(Math.min(Math.max(z.x + z.w / 2, b.x + 40), b.x + BURBUJA_W - 40));
      const ay = b.abajo ? b.y - HUECO / 2 : b.y + alto + HUECO / 2;
      if (nFlecha > 0) {
        const flecha = add(scene.add.image(ax, ay, 'ui/ui_senalador', 'c0').setScale(2).setFlipY(!!b.abajo), 2);
        if (!quieto && nFlecha > 1) {
          let k = 0;
          animacion = scene.time.addEvent({ delay: 130, loop: true, callback: () => { k = (k + 1) % nFlecha; if (flecha.active) flecha.setFrame(`c${k}`); } });
        }
      } else {
        const g = add(scene.add.graphics(), 2);
        const s = b.abajo ? -1 : 1;
        g.fillStyle(K.num(K.P.accion), 1).fillTriangle(ax - 12, ay - 8 * s, ax + 12, ay - 8 * s, ax, ay + 10 * s);
      }
    }
  }
  let botones = {};

  dibujar();
  return {
    cerrar,
    siguiente: () => ir(1),
    anterior: () => ir(-1),
    paso: () => i,
    espera: () => (abierto ? pasos[i].espera ?? null : null),
    abierto: () => abierto,
    botones: () => botones,
  };
}
