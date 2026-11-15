import Phaser from 'phaser';
import * as plan from './ambiente_plan.js';

// Fondo animado del Menú (frente expediente). Ilustración procedural, sin imágenes de terceros (AGENTS.md §3.8).
// Profundidades: arte de título -10 · Vía Láctea y galaxias -9.95 · estrellas -9.93 · planeta/Sol -9.9 ·
// disco de Marte -9.8 · halo -9.75 · destello -9.7 · asteroides/cometa -9.62…-9.45 · agujero negro -9.4 · viñeta -7.
// Todo lo creado lleva setData('ambiente', true): limpiar() de interfaz.js no lo borra al cambiar de vista.

const MARTE = { x: 480, y: 324, r: 228 }; // disco de Marte en pantalla (arte: centro 160,108 radio 76, × 3)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const hex = (s) => parseInt(String(s).slice(1), 16);

/** Paso de rampa con tramado ordenado (Bayer 4×4). t en 0..1. */
function tramado(paleta, t, x, y) {
  const f = clamp(t) * (paleta.length - 1);
  const i = Math.floor(f);
  const k = i + (f - i > BAYER[((y & 3) << 2) | (x & 3)] ? 1 : 0);
  return paleta[Math.min(paleta.length - 1, k)];
}

const PALETA = {
  mercurio: ['#3b3b42', '#6e6e78', '#a9a9b3', '#d8d8e0'],
  venus: ['#6e4a1e', '#b98a45', '#e0b46a', '#f5d99a'],
  tierra: ['#0d2a4f', '#2a6fb0', '#3c9a6a', '#bfe3ff'],
  jupiter: ['#6e3e22', '#b47a4e', '#d9a66b', '#f0d6a8'],
  saturno: ['#5a4a3a', '#b89a5e', '#e6cc8f', '#fff2cc'],
  urano: ['#2f6f78', '#6fb8c8', '#9fd8e0', '#d5f4f7'],
  neptuno: ['#14246b', '#2a46a0', '#3a5fd0', '#6f8ff0'],
  sol: ['#b5560f', '#f2701f', '#ffd23c', '#fff8c8'],
};

/** Textura de planeta o Sol (128 × 128). Ilustración, sin valor científico. */
function pintarPlaneta(ctx, id) {
  const N = 128, C = 64, R = id === 'sol' ? 40 : 40, pal = PALETA[id];
  const anillo = id === 'saturno';
  const dentroRanura = (x, y) => {
    const ex = (x + 0.5 - C) / (R * 1.9), ey = (y + 0.5 - C) / (R * 0.45);
    const d = ex * ex + ey * ey;
    return d > 0.55 && d < 1;
  };
  const dibujarAnillo = (delante) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!dentroRanura(x, y) || (y >= C) !== delante) continue;
      ctx.fillStyle = tramado(pal, 0.2 + 0.8 * ((x * 7 + y * 3) % 5) / 4, x, y);
      ctx.fillRect(x, y, 1, 1);
    }
  };
  if (anillo) dibujarAnillo(false);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x + 0.5 - C) / R, dy = (y + 0.5 - C) / R, d2 = dx * dx + dy * dy;
    if (d2 > 1) {
      if (id === 'sol' && d2 < (R + 10) ** 2 / (R * R)) {
        ctx.fillStyle = 'rgba(255,210,60,0.22)';
        ctx.fillRect(x, y, 1, 1);
      }
      continue;
    }
    const dz = Math.sqrt(1 - d2);
    let luz = 0.5 + 0.5 * (-0.5 * dx - 0.5 * dy + 0.7 * dz);
    if (id === 'jupiter' || id === 'saturno' || id === 'neptuno') luz += 0.14 * Math.sin(dy * 9 + (id === 'neptuno' ? 1 : 0));
    ctx.fillStyle = tramado(pal, clamp(luz), x, y);
    ctx.fillRect(x, y, 1, 1);
  }
  if (anillo) dibujarAnillo(true);
}

/** Galaxia de fondo (128 × 96), con ruido determinista (no Math.random). */
function pintarGalaxia(ctx, id) {
  const ruido = (x, y, s) => {
    const v = Math.sin(x * 127.1 + y * 311.7 + s) * 43758.5453;
    return v - Math.floor(v);
  };
  const celda = (x, y, a, rgb) => { ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a)})`; ctx.fillRect(x, y, 1, 1); };
  const cx = 64, cy = 48;
  for (let y = 0; y < 96; y++) for (let x = 0; x < 128; x++) {
    const dx = (x - cx), dy = (y - cy);
    if (id === 'enana_canis_major') {
      const d = (dx / 60) ** 2 + (dy / 16) ** 2;
      if (d < 1) celda(x, y, (1 - d) ** 2 * (0.7 + 0.3 * ruido(x, y, 1)) * 0.35, [150, 170, 220]);
    } else if (id === 'enana_sagitario') {
      const d = (dx / 22) ** 2 + (dy / 16) ** 2;
      if (d < 1) celda(x, y, (1 - d) * (0.6 + 0.4 * ruido(x, y, 2)) * 0.5, [255, 220, 140]);
    } else {
      const d = (dx / 56) ** 2 + (dy / 34) ** 2;
      if (d < 1) celda(x, y, (1 - d) * (0.6 + 0.4 * ruido(x, y, 3)) * 0.45, [120, 190, 255]);
    }
  }
  if (id === 'enana_sagitario') {
    for (let t = -1.3; t <= 1.3; t += 0.03) {
      const x = Math.round(cx + 48 * Math.cos(t)), y = Math.round(cy + 22 * Math.sin(t));
      celda(x, y, 0.45, [255, 224, 150]);
      celda(x, y + 1, 0.25, [255, 224, 150]);
    }
  }
  if (id === 'gran_nube_magallanes') {
    ctx.strokeStyle = 'rgba(255,230,200,0.35)';
    ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(88, 56); ctx.stroke();
    ctx.fillStyle = 'rgba(255,143,184,0.8)';
    ctx.beginPath(); ctx.arc(84, 36, 4, 0, Math.PI * 2); ctx.fill();
  }
}

/** Asteroide (40 × 40): polígono sombreado con tramado y borde oscuro. */
function pintarAsteroide(ctx, poligono) {
  const S = 16, C = 20;
  const dentro = (px, py) => {
    let en = false;
    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
      const [xi, yi] = poligono[i], [xj, yj] = poligono[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) en = !en;
    }
    return en;
  };
  const dentroPx = (x, y) => dentro((x + 0.5 - C) / S, (y + 0.5 - C) / S);
  const pal = ['#2c2630', '#4d4450', '#7a6f78', '#aa9ea6'];
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
    if (!dentroPx(x, y)) continue;
    const borde = !dentroPx(x - 1, y) || !dentroPx(x + 1, y) || !dentroPx(x, y - 1) || !dentroPx(x, y + 1);
    ctx.fillStyle = borde ? '#17131b' : tramado(pal, 0.5 - 0.5 * ((x - C) + (y - C)) / (C * 1.4), x, y);
    ctx.fillRect(x, y, 1, 1);
  }
}

/** Mezcla de dos colores 0xRRGGBB (t en 0..1). */
const lerpColor = (a, b, t) => {
  const ca = [(a >> 16) & 255, (a >> 8) & 255, a & 255], cb = [(b >> 16) & 255, (b >> 8) & 255, b & 255];
  return ((ca[0] + (cb[0] - ca[0]) * t) << 16) | ((ca[1] + (cb[1] - ca[1]) * t) << 8) | (ca[2] + (cb[2] - ca[2]) * t);
};

export class FondoMenu {
  /**
   * @param {Phaser.Scene} scene
   * @param {{ semilla?: number, animado?: boolean }} opciones  animado=false (?ambiente=off) deja solo el arte y la viñeta.
   */
  constructor(scene, { semilla = Math.floor(Math.random() * 2 ** 31), animado = true } = {}) {
    this.scene = scene;
    this.rng = plan.crearRng(semilla);
    this.animado = animado;
    this.reducido = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.vivo = false;
    this.objetos = [];
    this.galaxiaActiva = false;
    this.eventoActivo = false;
    this.cometaActivo = false;
    this.ultimaGalaxia = null;
    this.asteroides = [];
    this.onUpdate = (_t, dt) => this.girarAsteroides(dt);
  }

  /** Crea el fondo: arte, viñeta y, si está animado, las capas del cielo y los planificadores. */
  crear() {
    const s = this.scene;
    this.vivo = true;
    this.marcar(s.add.rectangle(480, 270, 960, 540, 0x0b0d17).setDepth(-10.01)); // fondo sólido (sin arte, o detrás del arte)
    if (s.textures.exists('titulo/titulo_fondo')) this.marcar(s.add.image(480, 270, 'titulo/titulo_fondo').setScale(3).setDepth(-10));
    this.viñeta();
    s.events.on('update', this.onUpdate);
    if (!this.animado) return;
    this.estrellas();
    this.viaLactea();
    if (!this.reducido) {
      this.texturasCielo();
      this.copiaDeMarte();
      this.halo(true);
      this.destellos();
      this.cometa();
      this.asteroidesPool();
      this.programar('asteroide', () => this.lanzarAsteroide());
      this.programar('cometa', () => this.lanzarCometa());
      this.programar('evento', () => this.pasarEvento());
      this.programar('galaxia', () => this.pasarGalaxia());
    } else {
      this.halo(false);
    }
    this.bh = this.marcar(s.add.graphics().setDepth(-9.4));
  }

  marcar(obj) {
    obj.setData('ambiente', true);
    this.objetos.push(obj);
    return obj;
  }

  viñeta() {
    const g = this.marcar(this.scene.add.graphics().setDepth(-7));
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x0b0d17, 0.12);
      g.fillRoundedRect(300 - i * 10, 150 - i * 10, 360 + i * 20, 370 + i * 20, 16);
    }
  }

  estrellas() {
    const g = this.marcar(this.scene.add.graphics().setDepth(-9.93));
    for (let i = 0; i < 140; i++) {
      const x = plan.entre(this.rng, [0, 960]), y = plan.entre(this.rng, [0, 540]);
      g.fillStyle(0xffffff, plan.entre(this.rng, [0.25, 0.9]));
      const k = this.rng() < 0.15 ? 6 : 3;
      g.fillRect(Math.floor(x / 3) * 3, Math.floor(y / 3) * 3, k, k);
    }
  }

  viaLactea() {
    const g = this.marcar(this.scene.add.graphics().setDepth(-9.95));
    const nx = 0.336, ny = 0.942; // normal a la banda (de (-80,470) a (1040,70))
    for (let i = 0; i < 900; i++) {
      const t = this.rng();
      const o = (this.rng() + this.rng() + this.rng() - 1.5) * 120;
      const x = -80 + t * 1120 + nx * o, y = 470 - t * 400 + ny * o;
      g.fillStyle(0xd8ccff, 0.04 + this.rng() * 0.3 * (1 - Math.abs(o) / 180));
      g.fillRect(Math.floor(x / 3) * 3, Math.floor(y / 3) * 3, 3, 3);
    }
    for (let i = 0; i < 450; i++) { // carriles de polvo
      const t = this.rng();
      const o = (this.rng() - 0.5) * 60 + 15;
      const x = -80 + t * 1120 + nx * o, y = 470 - t * 400 + ny * o;
      g.fillStyle(0x05030c, 0.35 + this.rng() * 0.25);
      g.fillRect(Math.floor(x / 3) * 3, Math.floor(y / 3) * 3, 3, 3);
    }
    if (!this.reducido) {
      this.scene.tweens.add({ targets: g, x: 10, duration: 60000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  texturasCielo() {
    const tx = this.scene.textures;
    const crear = (clave, w, h, pintar) => {
      if (tx.exists(clave)) return;
      const t = tx.createCanvas(clave, w, h);
      pintar(t.getContext());
      t.refresh();
    };
    for (const id of Object.keys(PALETA)) crear(`amb_planeta_${id}`, 128, 128, (c) => pintarPlaneta(c, id));
    for (const id of ['enana_canis_major', 'enana_sagitario', 'gran_nube_magallanes']) crear(`amb_galaxia_${id}`, 128, 96, (c) => pintarGalaxia(c, id));
    const variantes = plan.variantesAsteroide(this.rng, 8);
    variantes.forEach((poli, i) => crear(`amb_ast_${i}`, 40, 40, (c) => pintarAsteroide(c, poli)));
  }

  copiaDeMarte() {
    if (!this.scene.textures.exists('titulo/titulo_fondo')) return;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff).fillCircle(MARTE.x, MARTE.y, MARTE.r);
    const copia = this.marcar(this.scene.add.image(480, 270, 'titulo/titulo_fondo').setScale(3).setDepth(-9.8));
    copia.setMask(g.createGeometryMask());
    this.mascara = g;
  }

  halo(respira) {
    const g = this.marcar(this.scene.add.graphics().setDepth(-9.75).setBlendMode(Phaser.BlendModes.ADD));
    for (let k = 0; k < 6; k++) {
      g.lineStyle(3, 0xa9c8ff, 0.12 - k * 0.018);
      g.strokeCircle(MARTE.x, MARTE.y, MARTE.r + 6 + k * 5);
    }
    if (respira) this.scene.tweens.add({ targets: g, alpha: 0.6, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  destellos() {
    this.brillo = this.marcar(this.scene.add.graphics().setDepth(-9.7).setBlendMode(Phaser.BlendModes.ADD));
    const mascara = this.scene.make.graphics({ x: 0, y: 0, add: false });
    mascara.fillStyle(0xffffff).fillCircle(MARTE.x, MARTE.y, MARTE.r);
    this.brillo.setMask(mascara.createGeometryMask());
    this.mascaraBrillo = mascara;
    this.programarDestello();
  }

  programarDestello() {
    this.scene.time.delayedCall(plan.entre(this.rng, [6, 10]) * 1000, () => {
      if (!this.vivo) return;
      this.lanzarDestello();
      this.programarDestello();
    });
  }

  lanzarDestello() {
    const g = this.brillo;
    const c = hex(plan.DESTELLOS[plan.elegirDestello(this.rng)]);
    g.clear();
    g.setRotation(-0.5);
    g.setAlpha(1);
    g.fillStyle(c, 0.10).fillRect(-120, -400, 50, 800);
    g.fillStyle(c, 0.22).fillRect(-70, -400, 40, 800);
    g.fillStyle(c, 0.10).fillRect(-30, -400, 50, 800);
    g.setPosition(MARTE.x - 300, MARTE.y);
    this.scene.tweens.add({ targets: g, x: MARTE.x + 300, duration: 2200, ease: 'Sine.easeInOut' });
  }

  cometa() {
    const s = this.scene;
    const c = this.marcar(s.add.container(0, 0).setDepth(-9.5).setVisible(false));
    const dx = 0.866, dy = 0.5;
    const ion = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    for (let k = -1; k <= 1; k++) {
      ion.lineStyle(3 - Math.abs(k), 0x7cc8ff, 0.35);
      ion.lineBetween(0, k, 110 * dx, 110 * dy + k);
    }
    const polvo = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const pts = [];
    for (let t = 0; t <= 1.001; t += 0.05) pts.push({ x: t * 95 * dx, y: t * 95 * dy + 18 * t * t });
    polvo.lineStyle(3, 0xffe08a, 0.35);
    polvo.strokePoints(pts, false, false);
    const coma = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    coma.fillStyle(0xbfe9ff, 0.25).fillCircle(0, 0, 9);
    const nucleo = s.add.graphics();
    nucleo.fillStyle(0xffffff, 1).fillCircle(0, 0, 2);
    c.add([ion, polvo, coma, nucleo]);
    this.comet = c;
  }

  lanzarCometa(forzar = false) {
    if (!this.animado || this.reducido || (this.cometaActivo && !forzar) || !this.comet) return;
    const r = this.rng;
    const enTop = r() < 0.5;
    const fin = enTop ? { x: plan.entre(r, [0, 960]), y: -40 } : { x: -40, y: plan.entre(r, [0, 300]) };
    const inicio = { x: fin.x + 0.866 * 1000, y: fin.y + 0.5 * 1000 };
    this.cometaActivo = true;
    this.comet.setPosition(inicio.x, inicio.y).setVisible(true);
    this.scene.tweens.add({
      targets: this.comet, x: fin.x, y: fin.y, duration: plan.entre(r, [12000, 16000]), ease: 'Linear',
      onComplete: () => { this.comet.setVisible(false); this.cometaActivo = false; },
    });
  }

  asteroidesPool() {
    for (let i = 0; i < plan.MAXIMO.asteroides; i++) {
      const img = this.marcar(this.scene.add.image(0, 0, 'amb_ast_0').setVisible(false));
      img.setData('vivo', false);
      this.asteroides.push(img);
    }
  }

  lanzarAsteroide() {
    if (!this.animado || this.reducido) return;
    const libre = this.asteroides.find((a) => !a.getData('vivo'));
    if (!libre) return;
    const r = this.rng;
    const capa = Math.floor(r() * 3);
    const [escala, alfa, profundidad, dur] = [
      [0.8, 0.55, -9.62, [50, 60]], [1.4, 0.8, -9.55, [35, 45]], [2.2, 1, -9.45, [22, 30]],
    ][capa];
    const vertical = r() < 0.5;
    const ini = vertical ? { x: plan.entre(r, [0, 960]), y: -40 } : { x: -40, y: plan.entre(r, [0, 540]) };
    const fin = vertical ? { x: ini.x + plan.entre(r, [-200, 200]), y: 580 } : { x: 1000, y: ini.y + plan.entre(r, [-200, 200]) };
    libre.setTexture(`amb_ast_${Math.floor(r() * 8)}`);
    libre.setPosition(ini.x, ini.y).setScale(escala).setAlpha(alfa).setDepth(profundidad).setVisible(true);
    libre.setData('vivo', true);
    libre.setData('giro', plan.entre(r, [-40, 40]));
    this.scene.tweens.add({
      targets: libre, x: fin.x, y: fin.y, duration: plan.entre(r, dur) * 1000, ease: 'Linear',
      onComplete: () => { libre.setVisible(false); libre.setData('vivo', false); },
    });
  }

  girarAsteroides(dt) {
    for (const a of this.asteroides) {
      if (a.getData('vivo')) a.rotation += (a.getData('giro') * Math.PI / 180) * (dt / 1000);
    }
  }

  pasarEvento(forzar = false, id = null) {
    if (!this.animado || this.reducido || (this.eventoActivo && !forzar)) return;
    const r = this.rng;
    const cuerpo = id ?? plan.elegirEvento(r);
    const escala = cuerpo === 'sol' ? 1.7 : cuerpo === 'saturno' ? 1.3 : plan.entre(r, [0.8, 1.3]);
    const y = plan.entre(r, [40, 260]);
    const izqDer = r() < 0.5;
    const ini = izqDer ? -160 : 1120, fin = izqDer ? 1120 : -160;
    const img = this.marcar(this.scene.add.image(ini, y, `amb_planeta_${cuerpo}`).setScale(escala).setDepth(-9.9)
      .setAlpha(cuerpo === 'sol' ? 0.9 : 1));
    this.eventoActivo = true;
    this.scene.tweens.add({
      targets: img, x: fin, duration: plan.entre(r, plan.DURACION_EVENTO_S) * 1000, ease: 'Linear',
      onComplete: () => { img.destroy(); this.eventoActivo = false; },
    });
  }

  pasarGalaxia(forzar = false) {
    if (!this.animado || this.reducido || (this.galaxiaActiva && !forzar)) return;
    const r = this.rng;
    const id = plan.elegirGalaxia(r, this.ultimaGalaxia);
    this.ultimaGalaxia = id;
    const img = this.marcar(this.scene.add.image(-200, plan.entre(r, [30, 200]), `amb_galaxia_${id}`)
      .setScale(2.2).setDepth(-9.94).setAlpha(0.9));
    this.galaxiaActiva = true;
    this.scene.tweens.add({
      targets: img, x: 1160, duration: plan.entre(r, plan.DURACION_GALAXIA_S) * 1000, ease: 'Linear',
      onComplete: () => { img.destroy(); this.galaxiaActiva = false; },
    });
  }

  programar(clave, fn) {
    this.scene.time.delayedCall(plan.esperaMs(this.rng, clave), () => {
      if (!this.vivo) return;
      fn();
      this.programar(clave, fn);
    });
  }

  /** Agujero negro: aparece, crece, se queda y se consume (≈10 s). Con movimiento reducido, solo un fundido. */
  lanzarAgujero() {
    if (!this.bh || !this.vivo) return;
    this.bhPos = plan.posicionAgujero(this.rng);
    this.bh.setPosition(this.bhPos.x, this.bhPos.y);
    this.scene.tweens.addCounter({
      from: 0, to: 10000, duration: 10000,
      onUpdate: (tw) => this.dibujarAgujero(tw.getValue()),
      onComplete: () => this.bh.clear(),
    });
  }

  dibujarAgujero(ms) {
    const g = this.bh;
    g.clear();
    if (this.reducido) {
      const a = ms < 500 ? ms / 500 : ms < 1500 ? 1 : ms < 2300 ? 1 - (ms - 1500) / 800 : 0;
      g.fillStyle(0x000000, clamp(a)).fillCircle(0, 0, 10);
      return;
    }
    let R = 0, core = 0, flash = 0, distorsion = 0;
    if (ms < 1200) {
      core = ms / 1200;
      distorsion = 1 - ms / 1200;
      R = 0;
    } else if (ms < 6200) {
      const f = (ms - 1200) / 5000;
      R = 6 + 54 * (1 - (1 - f) ** 2);
      core = 1;
    } else if (ms < 7700) {
      R = 60;
      core = 1;
    } else {
      const f = (ms - 7700) / 2300;
      R = 60 * (1 - f * f);
      core = 1;
      flash = 0.35 * Math.sin(Math.PI * f);
    }
    g.setRotation(ms * 0.0002);
    if (distorsion > 0) {
      g.lineStyle(2, 0xffffff, 0.8 * distorsion);
      g.strokeCircle(0, 0, 6);
    }
    if (R > 0) {
      for (let k = 0; k < 12; k++) {
        const rr = R * (1 + (k / 11) * 1.4);
        g.lineStyle(Math.max(2, R * 0.09), lerpColor(0xff4a1c, 0x7a0c0c, k / 11), (0.75 - k * 0.05) * core);
        g.strokeEllipse(0, 0, rr * 2, rr * 2 * 0.38);
      }
      const arco = [];
      for (let t = 0; t <= Math.PI; t += 0.08) arco.push({ x: Math.cos(t) * R * 1.15, y: Math.sin(t) * R * 1.15 * 0.38 });
      g.lineStyle(2, 0xffb27a, 0.85 * core);
      g.strokePoints(arco, false, false);
    }
    g.fillStyle(0x000000, core).fillCircle(0, 0, Math.max(3, R * 0.5));
    if (flash > 0) g.fillStyle(0xffffff, flash).fillCircle(0, 0, R * 0.6 + 4);
  }

  /** Disparador de QA y del pitch: 'agujero' | 'planeta' | 'galaxia' | 'cometa' | 'asteroide'. */
  disparar(tipo) {
    if (!this.vivo) return;
    if (tipo === 'agujero') this.lanzarAgujero();
    else if (tipo === 'planeta') this.pasarEvento(true);
    else if (tipo === 'galaxia') this.pasarGalaxia(true);
    else if (tipo === 'cometa') this.lanzarCometa(true);
    else if (tipo === 'asteroide') this.lanzarAsteroide();
  }

  destruir() {
    this.vivo = false;
    this.scene.events.off('update', this.onUpdate);
    this.scene.tweens.killAll();
    for (const o of this.objetos) if (o && o.active !== undefined) o.destroy();
    this.objetos = [];
    this.mascara?.destroy();
    this.mascaraBrillo?.destroy();
  }
}

// Regla del agujero negro entre visitas al Menú (módulo: persiste mientras la página esté abierta).
let conteoAlSalir = null;
/** Al salir del Menú: guarda cuántos resultados hay en la partida. */
export function recordarResultados(n) { conteoAlSalir = n; }
/** Al entrar al Menú: ¿hay más resultados que al salir? (la primera vez solo fija la línea base). */
export function hayRegreso(n) { return plan.evaluarRegreso(conteoAlSalir, n); }
