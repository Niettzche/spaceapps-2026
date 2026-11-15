// Obstáculos RECREADOS (declarados en pantalla): rocas sueltas y parches de arena blanda. Ver docs/juego/ESPECIFICACION.md §5b.
// Los modelos de elevación (30–200 m por píxel) no resuelven rocas de medio metro ni la arena suelta: se agregan para jugar,
// con semilla fija por sitio o destino (mismo nivel en cada partida), y llevan `recreacion: true`.
// Densidad, tamaños y agarre de la arena blanda son valores de juego (P). No toca el perfil (perfil.js).
//
// Reglas (P):
// - Rocas (0.3–0.6 m de diámetro, medio enterradas): Marte y Luna en todo el recorrido (los perfiles reales no traen tipo de
//   roca a esta escala); en la Tierra solo en tramos de roca y solo si el perfil no trae ya sus "bloques de roca recreados".
// - Arena blanda (5–8 m): en tramos de arena de la Tierra, solo donde el terreno es suave (< 10°). La rueda agarra 25 % menos.
// - Ni rocas ni arena blanda en los planos de inicio y final, ni en pendientes fuertes (no se vuelven paredes imposibles).
import { tr } from '../i18n.js';
import { aleatorio, semillaDe, alturaEn, superficieEn, PLANO_INICIO_M, PLANO_FINAL_M } from './perfil.js';

export const REGLAS_OBSTACULOS = {
  roca: {
    // asoma = fracción del radio que sobresale del suelo (el resto está enterrado).
    // Luna: rocas más bajas. Con 1/6 de gravedad, una roca de ~0.15 m de alto a 4 m/s lanza la carga fuera del soporte (probado).
    marte: { cada: [22, 38], radio: [0.15, 0.3], asoma: 0.8 },
    luna: { cada: [20, 34], radio: [0.15, 0.22], asoma: 0.5 },
    tierra: { cada: [14, 24], radio: [0.15, 0.3], asoma: 0.8 },
    pendienteMax: 14, // grados (ventana de ±1.5 m)
  },
  arenaBlanda: { cada: [35, 55], largo: [5, 8], pendienteMax: 10, agarre: 0.75 },
  margenInicio: 4, // m después del plano de inicio
  margenFinal: 2, // m antes del plano final
};

const entre = (r, [a, b]) => a + r() * (b - a);

/** Pendiente local (grados, absoluta) alrededor de x. */
function pendienteLocal(perfil, x, w = 1.5) {
  return Math.abs((Math.atan2(alturaEn(perfil, x + w) - alturaEn(perfil, x - w), 2 * w) * 180) / Math.PI);
}

/**
 * Lista determinista de obstáculos del nivel (función pura).
 * @returns {Array<{ tipo: 'roca', x_m, radio_m } | { tipo: 'arena_blanda', desde_m, hasta_m }>}
 */
export function generarObstaculos(perfil, { mundo = 'tierra', semilla = '' } = {}) {
  const R = REGLAS_OBSTACULOS;
  const r = aleatorio(semillaDe(`obstaculos:${semilla}`));
  const inicio = PLANO_INICIO_M + R.margenInicio;
  const fin = perfil.largo_m - PLANO_FINAL_M - R.margenFinal;
  const lista = [];

  const yaHayBloques = (perfil.recreacion ?? []).some((x) => x.tipo === 'bloque_roca');
  const reglaRoca = R.roca[mundo] ?? R.roca.tierra;
  if (!(mundo === 'tierra' && yaHayBloques)) {
    for (let x = inicio + entre(r, reglaRoca.cada) / 2; x < fin; x += entre(r, reglaRoca.cada)) {
      const radio = Math.round(entre(r, reglaRoca.radio) * 100) / 100;
      if (mundo === 'tierra' && superficieEn(perfil, x) !== 'roca') continue;
      if (pendienteLocal(perfil, x) > R.roca.pendienteMax) continue;
      lista.push({ tipo: 'roca', x_m: Math.round(x * 10) / 10, radio_m: radio, alto_m: Math.round(radio * reglaRoca.asoma * 100) / 100, recreacion: true });
    }
  }

  if (mundo === 'tierra') {
    const A = R.arenaBlanda;
    for (let x = inicio + entre(r, A.cada) / 2; x < fin; x += entre(r, A.cada)) {
      const largo = entre(r, A.largo);
      const hasta = Math.min(x + largo, fin);
      if (hasta - x < 3) continue;
      let ok = true;
      for (let s = x; s <= hasta && ok; s += 1) ok = superficieEn(perfil, s) === 'arena' && pendienteLocal(perfil, s) <= A.pendienteMax;
      if (ok) lista.push({ tipo: 'arena_blanda', desde_m: Math.round(x * 10) / 10, hasta_m: Math.round(hasta * 10) / 10, recreacion: true });
    }
  }
  return lista;
}

/** Factor de agarre en x (m): arena blanda = 0.75 (P); en otro lugar 1. */
export function factorAgarreEn(lista, x) {
  for (const o of lista) if (o.tipo === 'arena_blanda' && x >= o.desde_m && x < o.hasta_m) return REGLAS_OBSTACULOS.arenaBlanda.agarre;
  return 1;
}

/** Nota corta para el HUD y el panel de datos, p. ej. "obstáculos recreados (5 rocas, 2 parches de arena blanda)". */
export function notaObstaculos(lista) {
  const rocas = lista.filter((o) => o.tipo === 'roca').length;
  const arena = lista.filter((o) => o.tipo === 'arena_blanda').length;
  if (!rocas && !arena) return null;
  const partes = [];
  const d = lista.filter((o) => o.tipo === 'roca').map((o) => o.radio_m * 2);
  const tam = d.length ? `${Math.min(...d).toFixed(1)}–${Math.max(...d).toFixed(1)} m` : '';
  const alto = Math.max(...lista.filter((o) => o.tipo === 'roca').map((o) => o.alto_m ?? 0));
  if (rocas) partes.push(tr(`${rocas} ${rocas === 1 ? 'roca' : 'rocas'} de ${tam} medio enterradas (asoman ≤ ${alto.toFixed(2)} m)`,
    `${rocas} half-buried ${rocas === 1 ? 'rock' : 'rocks'} of ${tam} (≤ ${alto.toFixed(2)} m high)`));
  if (arena) partes.push(tr(`${arena} ${arena === 1 ? 'parche' : 'parches'} de arena blanda (agarre −25 %)`, `${arena} soft-sand ${arena === 1 ? 'patch' : 'patches'} (grip −25 %)`));
  return tr(`obstáculos recreados (${partes.join(', ')}; el modelo de elevación no los resuelve)`,
    `recreated obstacles (${partes.join(', ')}; the elevation model does not resolve them)`);
}

// Colores provisionales (hasta que haya arte `obstaculo_roca`): un tono más oscuro que la roca de cada mundo.
const COLOR_ROCA = { tierra: [0x5a5560, 0x8a8490], marte: [0x6a3c2e, 0x9a6050], luna: [0x5e5e64, 0x9a9aa2] };
const COLOR_ARENA_BLANDA = { tierra: 0xc49a58, marte: 0xa9603a, luna: 0x86868c };

/**
 * Crea los cuerpos (rocas estáticas, label 'suelo' para que cuenten como suelo en contactos y golpes) y el dibujo.
 * @param {Phaser.Scene} scene
 * @param {object} perfil
 * @param {{ xMundo, yMundo }} terreno  conversores de construirTerreno
 * @param {Array} lista  de generarObstaculos
 * @param {{ mundo, sprite?: (nombre, opciones) => object|null }} o  sprite = fisica/aspecto.js sprite (arte si existe)
 */
export function crearObstaculos(scene, perfil, { xMundo, yMundo }, lista, { mundo = 'tierra', sprite = null } = {}) {
  const PX = 3; // 1 px de arte
  const g = scene.add.graphics().setDepth(3);
  const cuerpos = [];
  const [oscuro, claro] = COLOR_ROCA[mundo] ?? COLOR_ROCA.tierra;
  let i = 0;
  for (const o of lista) {
    if (o.tipo === 'roca') {
      const x = xMundo(o.x_m);
      const rpx = o.radio_m * 24;
      const ySuelo = yMundo(alturaEn(perfil, o.x_m));
      const alto = Math.min(o.alto_m ?? o.radio_m, o.radio_m) * 24; // lo que sobresale
      const cuerpo = scene.matter.add.circle(x, ySuelo + rpx - alto, rpx, { // el centro queda bajo el suelo
        isStatic: true, label: 'suelo', friction: 1, frictionStatic: 1, restitution: 0,
      });
      cuerpo.obstaculo = 'roca';
      cuerpos.push(cuerpo);
      const s = sprite?.(scene, 'obstaculo_roca', { x, y: ySuelo + PX, origen: [0.5, 1], profundidad: 3 });
      if (s) {
        const frames = s.texture.getFrameNames().filter((f) => f !== '__BASE');
        if (frames.length > 1) s.setFrame(frames[i % frames.length]);
        s.setDisplaySize(rpx * 2, alto + PX);
      } else {
        // Roca de píxeles (1 px de arte = 1/8 m): mínimo 3 × 2 px para que se vea; tapa más angosta, brillo y sombra.
        const ancho = 2 * Math.sqrt(Math.max(0, rpx * rpx - (rpx - alto) * (rpx - alto))); // cuerda a ras del suelo
        const w = Math.max(3, Math.round(ancho / PX));
        const h = Math.max(2, Math.round(alto / PX));
        const x0 = Math.round(x / PX) * PX - Math.floor(w / 2) * PX;
        const y0 = Math.round(ySuelo / PX) * PX + PX; // la base se mete 1 px en el suelo
        g.fillStyle(oscuro, 1);
        for (let k = 0; k < h; k++) {
          const recorte = k === h - 1 && w > 3 ? 1 : 0; // fila de arriba más angosta
          g.fillRect(x0 + recorte * PX, y0 - (k + 1) * PX, (w - 2 * recorte) * PX, PX);
        }
        g.fillStyle(claro, 1);
        g.fillRect(x0 + (w > 3 ? PX : 0), y0 - h * PX, Math.max(1, Math.floor(w / 3)) * PX, PX);
        g.fillStyle(0x000000, 0.35);
        g.fillRect(x0 + w * PX, y0 - PX, PX, PX);
      }
      i++;
    } else if (o.tipo === 'arena_blanda') {
      // Discreto: puntitos más oscuros sobre la superficie del tramo.
      g.fillStyle(COLOR_ARENA_BLANDA[mundo] ?? COLOR_ARENA_BLANDA.tierra, 0.85);
      const r = aleatorio(semillaDe(`arena:${o.desde_m}`));
      for (let xm = o.desde_m; xm < o.hasta_m; xm += 0.25) {
        const y = yMundo(alturaEn(perfil, xm));
        g.fillRect(Math.round(xMundo(xm) / PX) * PX, Math.round(y / PX) * PX - PX + Math.floor(r() * 3) * PX, PX, PX);
      }
    }
  }
  return { cuerpos, dibujo: g };
}
