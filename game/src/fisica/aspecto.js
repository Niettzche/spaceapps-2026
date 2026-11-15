// Ganchos de arte (frente juego): usa los PNG de /assets si existen y, si no, deja las figuras provisionales.
// Ver docs/juego/ASSETS_ARTE.md §5 "Cómo entra el arte al juego".
//
// - Vite descubre los archivos al compilar (import.meta.glob): un archivo que no existe nunca se pide (sin 404).
// - Se indexan por nombre de archivo sin extensión (`rueda_ancha.png` → 'rueda_ancha'), en cualquier subcarpeta de /assets.
// - PNG solo = imagen o tira horizontal de cuadros; PNG + JSON con el mismo nombre = exportación de Aseprite.
// - Todo se dibuja a 1 px de arte y se escala × ZOOM_ARTE.
import { textoPixel } from '../scenes/comun/fuente.js';
import { ZOOM_ARTE } from './escala.js';
import { UMBRAL_INTEGRIDAD } from '../config/world.js';
import { personalizacionActual, pinturaPorId } from '../scenes/Taller/personalizacion.js'; // cosmética (frente taller)
import { NIVELES_DESTACADOS } from '../content/niveles_destacados.js';

// Sin assets/iconos/ ni assets/piezas/: son los íconos 16 × 16 y el arte 32 × 32 del taller (los carga Taller.js) y se llaman igual que las piezas
// (rueda_tacos, chasis_reforzado...). Si entraran aquí, una pieza sin sprite propio usaría su ícono como sprite.
const archivos = import.meta.glob(['../../../assets/**/*.{png,json}', '!../../../assets/iconos/**', '!../../../assets/piezas/**'], { eager: true, query: '?url', import: 'default' });

const PREFIJO = 'arte:'; // las texturas de Phaser son globales: el prefijo evita choques con otras escenas
const FPS = 8; // velocidad de las animaciones de tira (P)

/**
 * Assets con cuadros (docs/juego/ASSETS_ARTE.md §3): ancho nominal de un cuadro (px de arte) y número de cuadros permitido.
 * El número de cuadros de una tira se deduce de su ancho: el divisor exacto cuyo cuadro se parezca más al ancho nominal.
 * Así un chasis con antena que sobresale (28 px) sigue siendo 1 cuadro, y uno de 48 px son 2 (normal + dañado).
 * `animaciones`: nombre → [primer, último] cuadro, o 'todo'.
 */
const TABLA = {
  chasis_ligero: { ancho: 24, cuadros: [1, 2] },
  chasis_reforzado: { ancho: 24, cuadros: [1, 2] },
  rueda_estandar: { ancho: 7, cuadros: [1, 4] },
  rueda_ancha: { ancho: 8, cuadros: [1, 4] },
  rueda_tacos: { ancho: 7, cuadros: [1, 4] },
  rueda_malla: { ancho: 8, cuadros: [1, 4] }, // malla tipo LRV (Mauricio, #72)
  rueda_grousers: { ancho: 7, cuadros: [1, 4] }, // arte de #72; hoy ninguna pieza usa este id
  rueda_nitinol: { ancho: 7, cuadros: [1, 4] }, // pendiente de arte (SPRITES_PENDIENTES.md): hoy usa RESPALDO_ARTE
  chasis_titanio: { ancho: 24, cuadros: [1, 2] }, // pendiente de arte: hoy usa RESPALDO_ARTE
  chasis_carbono: { ancho: 24, cuadros: [1, 2] }, // pendiente de arte: hoy usa RESPALDO_ARTE
  soporte_basico: { ancho: 10, cuadros: [1] },
  soporte_correas: { ancho: 10, cuadros: [1] }, // pendiente de arte (docs/arte/SPRITES_PENDIENTES.md): hoy usa la figura
  soporte_amortiguado: { ancho: 10, cuadros: [1] },
  carga: { ancho: 7, cuadros: [1, 3] },
  astronauta: { ancho: 8, cuadros: [1, 4, 8, 14], animaciones: { reposo: [0, 3], saluda: [4, 7], celebra: [8, 13] } },
  base: { ancho: 40, cuadros: [1] },
  baliza: { ancho: 4, cuadros: [1, 4], animaciones: { parpadea: 'todo' } },
  meta: { ancho: 8, cuadros: [1, 4], animaciones: { ondea: 'todo' } },
  zona_entrega: { ancho: 16, cuadros: [1] },
  // Eventos de fondo (Mauricio, #93; fisica/eventos_fondo.js): remolino 8 cuadros de 16 × 40, micrometeorito 6 de 16 × 16.
  evento_remolino: { ancho: 16, cuadros: [1, 8], animaciones: { gira: 'todo' } },
  evento_micrometeorito: { ancho: 16, cuadros: [1, 6], animaciones: { destello: 'todo' } },
  evento_fobos: { ancho: 8, cuadros: [1] },
  evento_tierra: { ancho: 24, cuadros: [1] },
};
// Pintura del chasis (Taller, cosmética): chasis_<ligero|reforzado>_<color>, mismos cuadros que el original (2.º = dañado).
for (const chasis of ['chasis_ligero', 'chasis_reforzado']) {
  for (const color of ['rojo', 'azul', 'verde', 'amarillo', 'morado']) TABLA[`${chasis}_${color}`] = { ancho: 24, cuadros: [1, 2] };
}
/**
 * Piezas sin sprite propio todavía (docs/arte/SPRITES_PENDIENTES.md): usan el sprite de otra pieza teñido, para que en
 * el Taller y en la prueba se vean distintas de la original. Cuando llegue el arte propio, se usa ese y esto se ignora.
 */
export const RESPALDO_ARTE = {
  chasis_titanio: { base: 'chasis_ligero', tinte: 0xb4c0d4 }, // gris titanio
  chasis_carbono: { base: 'chasis_ligero', tinte: 0x5c6274 }, // gris carbón
  rueda_nitinol: { base: 'rueda_malla', tinte: 0xc8dcff }, // plateado
};

/** Arte de una pieza: { nombre, tinte } con su sprite propio o el de respaldo; null si no hay ninguno. */
export function arteDePieza(scene, id) {
  if (hayArte(scene, id)) return { nombre: id, tinte: null };
  const r = RESPALDO_ARTE[id];
  return r && hayArte(scene, r.base) ? { nombre: r.base, tinte: r.tinte } : null;
}

const SUPERFICIES = ['arena', 'roca', 'compacto'];
const ES_TILE = /^(tierra|marte|luna)_(arena|roca|compacto)(_borde)?$/;
const ES_FONDO = /^fondo_[a-z0-9_]+_[123]$/;

/** Fondo por sitio terrestre; Marte y Luna usan el del mundo. Sin fondo propio → 'desierto'. */
// Fondo propio por sitio (si falta el arte, crearFondo usa 'desierto'). mx0207 = tajo minero; g00281 = maar Al Wahbah.
const FONDO_POR_SITIO = { samalayuca: 'dunas', pinacate: 'lava', mx0207: 'mina', g00281: 'maar' };
// Niveles destacados (content/niveles_destacados.js): el fondo de arte más parecido a cada lugar.
for (const [id, n] of Object.entries(NIVELES_DESTACADOS)) FONDO_POR_SITIO[id] ??= n.fondo;
const PARALAJE = [0, 0.2, 0.5]; // capas 1 (cielo fijo), 2 (lejana), 3 (cercana)

// Índice nombre → { png, json } (URLs que resuelve Vite).
const indice = {};
for (const [ruta, url] of Object.entries(archivos)) {
  // Íconos del taller (iconos/) y pantalla de título (titulo/) los cargan otras escenas y repiten nombres de piezas.
  if (/\/(iconos|piezas|titulo)\//.test(ruta)) continue; // piezas/: arte 32 × 32 de la bandeja del Taller (#85)
  const [, nombre, ext] = ruta.match(/([^/]+)\.(png|json)$/) ?? [];
  if (!nombre) continue;
  indice[nombre] ??= {};
  if (indice[nombre][ext]) console.warn(`[arte] nombre repetido en /assets: ${nombre}.${ext} (se usa el primero)`);
  else indice[nombre][ext] = url;
}

// Calcomanías de piezas sobre el chasis: deco_<id de pieza>.png (p. ej. deco_motor_potente). El robot se ve distinto
// según las piezas elegidas. Posición en px de arte respecto al centro del chasis (24 × 6), girando con él. (P)
const ES_DECO = /^deco_/;
// Obstáculos recreados (fisica/obstaculos.js): obstaculo_roca[_marte|_luna]_1..3, obstaculo_arena_blanda[_marte|_luna].
const ES_OBSTACULO = /^obstaculo_/;
const POS_DECO = { motor: { x: -8, y: 0 }, bateria: { x: 6, y: 0 }, modulo: { x: 5, y: -4 } };

const esDelJuego = (nombre) => nombre in TABLA || ES_TILE.test(nombre) || ES_FONDO.test(nombre) || ES_DECO.test(nombre) || ES_OBSTACULO.test(nombre);

/** Llamar en preload(): pide solo los PNG del juego que existen (y su JSON de Aseprite si lo hay). */
export function cargarArte(scene) {
  for (const [nombre, f] of Object.entries(indice)) {
    if (!f.png || !esDelJuego(nombre)) continue;
    const clave = PREFIJO + nombre;
    if (scene.textures.exists(clave)) continue; // ya cargado por otra escena
    if (f.json) scene.load.aseprite(clave, f.png, f.json);
    else scene.load.image(clave, f.png);
  }
}

/** ¿Hay arte cargado con ese nombre? */
export const hayArte = (scene, nombre) => scene.textures.exists(PREFIJO + nombre);

const cuadrosPorTextura = new WeakMap();

/** Nombres de los cuadros del asset, en orden. Corta las tiras horizontales la primera vez. */
export function cuadros(scene, nombre) {
  const tex = scene.textures.get(PREFIJO + nombre);
  if (cuadrosPorTextura.has(tex)) return cuadrosPorTextura.get(tex);
  let lista;
  if (scene.cache.json.exists(PREFIJO + nombre)) {
    lista = tex.getFrameNames(); // Aseprite: los cuadros vienen del JSON
  } else {
    const fuente = tex.source[0];
    const n = numeroDeCuadros(fuente.width, TABLA[nombre]);
    if (n <= 1) lista = ['__BASE'];
    else {
      const w = fuente.width / n;
      lista = [];
      for (let i = 0; i < n; i++) {
        tex.add(String(i), 0, i * w, 0, w, fuente.height);
        lista.push(String(i));
      }
    }
  }
  cuadrosPorTextura.set(tex, lista);
  return lista;
}

/** Número de cuadros de una tira a partir de su ancho (ver TABLA). */
export function numeroDeCuadros(anchoImagen, def) {
  if (!def) return 1;
  let mejor = 1;
  let error = Infinity;
  for (const n of def.cuadros) {
    if (anchoImagen % n !== 0) continue;
    const e = Math.abs(anchoImagen / n - def.ancho);
    if (e < error) { mejor = n; error = e; }
  }
  return mejor;
}

/** Clave de animación del asset (la crea la primera vez) o null si no hay cuadros para ella. */
export function animacion(scene, nombre, etiqueta) {
  const clave = `${PREFIJO}${nombre}:${etiqueta}`;
  if (scene.anims.exists(clave)) return clave;
  const lista = cuadros(scene, nombre);
  let rango = null;
  const json = scene.cache.json.get(PREFIJO + nombre);
  const tag = json?.meta?.frameTags?.find((t) => t.name === etiqueta);
  if (tag) rango = [tag.from, tag.to];
  else {
    const def = TABLA[nombre]?.animaciones?.[etiqueta];
    if (def === 'todo' || (json && !json.meta?.frameTags?.length)) rango = [0, lista.length - 1];
    else if (def) rango = [def[0], Math.min(def[1], lista.length - 1)];
  }
  if (!rango || rango[1] <= rango[0] || rango[0] >= lista.length) return null;
  scene.anims.create({
    key: clave,
    frames: lista.slice(rango[0], rango[1] + 1).map((frame) => ({ key: PREFIJO + nombre, frame })),
    frameRate: FPS,
    repeat: -1,
  });
  return clave;
}

/** Sprite del asset a escala de arte, o null si no hay arte. */
export function sprite(scene, nombre, { x = 0, y = 0, origen = [0.5, 0.5], profundidad = 0, anim = null } = {}) {
  if (!hayArte(scene, nombre)) return null;
  const s = scene.add.sprite(x, y, PREFIJO + nombre, cuadros(scene, nombre)[0])
    .setOrigin(origen[0], origen[1]).setScale(ZOOM_ARTE).setDepth(profundidad);
  const clave = anim && animacion(scene, nombre, anim);
  if (clave) s.play(clave);
  return s;
}

/** Tira repetible apoyada en el suelo (origen inferior izquierdo), p. ej. zona_entrega. */
export function tira(scene, nombre, x, ySuelo, ancho, profundidad = 0) {
  if (!hayArte(scene, nombre)) return null;
  const clave = PREFIJO + nombre;
  const f = scene.textures.getFrame(clave, cuadros(scene, nombre)[0]);
  const paso = f.width * ZOOM_ARTE;
  const piezas = [];
  for (let dx = 0; dx < ancho - 0.5; dx += paso) {
    const s = scene.add.image(x + dx, ySuelo, clave, f.name).setOrigin(0, 1).setScale(ZOOM_ARTE).setDepth(profundidad);
    const resto = ancho - dx;
    if (resto < paso) s.setCrop(0, 0, Math.ceil(resto / ZOOM_ARTE), f.height);
    piezas.push(s);
  }
  return piezas;
}

// ─── Robot ──────────────────────────────────────────────────────────────────────────────

/** Cuadro de la rueda según su giro real: 1 cuadro cada 90°, el sprite no rota. */
export const cuadroDeRueda = (angulo, n) => ((Math.floor(angulo / (Math.PI / 2)) % n) + n) % n;

/** Estado de la carga: 0 entera, 1 dañada, 2 crítica (bajo el umbral de entrega). (P) */
export const estadoDeCarga = (integridad, perdida) => (perdida || integridad < UMBRAL_INTEGRIDAD ? 2 : integridad < 0.85 ? 1 : 0);

/**
 * Dibuja el robot con sprites donde haya arte y con las figuras de robot.dibujar donde no.
 * Sin ningún sprite, el resultado es idéntico a robot.dibujar(g).
 */
export class AspectoRobot {
  constructor(scene, robot) {
    this.scene = scene;
    this.robot = robot;
    const p = robot.piezas;
    // Personalización del Taller (solo cosmética): pintura del chasis y nombre sobre el robot.
    // Con la variante de arte (chasis_<id>_<color>) se usa ese sprite; si no, el sprite base teñido; sin arte, la figura.
    const { pintura, nombre } = personalizacionActual();
    const color = pinturaPorId(pintura);
    // Chasis sin sprite propio (titanio, carbono): el de respaldo teñido (RESPALDO_ARTE); la pintura manda si hay una.
    const arteChasis = arteDePieza(scene, p.chasis.id);
    const baseChasis = arteChasis?.nombre ?? p.chasis.id;
    this.claveChasis = hayArte(scene, `${p.chasis.id}_${color.id}`) ? `${p.chasis.id}_${color.id}` : baseChasis;
    this.chasis = sprite(scene, this.claveChasis, { profundidad: 11 });
    robot.colorChasis = color.figura; // figura de respaldo (robot.dibujar)
    if (this.chasis && this.claveChasis === baseChasis) {
      const tinte = color.tinte !== 0xffffff ? color.tinte : arteChasis?.tinte;
      if (tinte != null) this.chasis.setTint(tinte);
    }
    this.nombre = nombre
      ? textoPixel(scene, 0, 0, nombre, { size: 14, color: '#ffffff', borde: true, origen: [0.5, 1] }).setDepth(12).setAlpha(0.9)
      : null;
    this.soporte = sprite(scene, p.carga.id, { profundidad: 11.2 }); // la ranura `carga` lleva el soporte
    this.carga = sprite(scene, 'carga', { profundidad: 11.4 });
    // Ruedas: sprite propio o el de respaldo teñido (rueda de Nitinol → malla plateada).
    this.clavesRueda = robot.ruedas.map((w) => arteDePieza(scene, w.pieza.id));
    this.ruedas = this.clavesRueda.map((a) => {
      const s = a ? sprite(scene, a.nombre, { profundidad: 11.6 }) : null;
      if (s && a.tinte != null) s.setTint(a.tinte);
      return s;
    });
    this.omitir = { chasis: !!this.chasis, soporte: !!this.soporte, carga: !!this.carga, ruedas: this.ruedas.map(Boolean) };
    // Calcomanías de motor, batería y módulo (si el arte existe), encima del chasis.
    this.decos = Object.entries(POS_DECO)
      .map(([ranura, pos]) => ({ pos, s: p[ranura] ? sprite(scene, `deco_${p[ranura].id}`, { profundidad: 11.1 }) : null }))
      .filter((d) => d.s);
  }

  dibujar(g) {
    const r = this.robot;
    r.dibujar(g, this.omitir);
    // El nombre flota sobre el robot, sin girar con él (se lee aunque el chasis vaya inclinado).
    if (this.nombre) this.nombre.setPosition(r.chasis.position.x, r.chasis.bounds.min.y - 18);
    const partes = r.chasis.parts;
    const ang = r.chasis.angle;
    if (this.chasis) {
      const base = partes.length > 1 ? partes[1] : partes[0];
      const n = cuadros(this.scene, this.claveChasis);
      const danado = r.destruido || (r.vidaMax && r.vida / r.vidaMax < 0.5);
      this.chasis.setPosition(base.position.x, base.position.y).setRotation(ang).setFrame(n[danado && n.length > 1 ? 1 : 0]);
    }
    if (this.decos.length) {
      const base = partes.length > 1 ? partes[1] : partes[0];
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      for (const { pos, s } of this.decos) {
        const dx = pos.x * ZOOM_ARTE;
        const dy = pos.y * ZOOM_ARTE;
        s.setPosition(base.position.x + dx * c - dy * sn, base.position.y + dx * sn + dy * c).setRotation(ang);
      }
    }
    if (this.soporte && partes.length > 3) {
      // Centro entre las dos paredes del soporte.
      const x = (partes[2].position.x + partes[3].position.x) / 2;
      const y = (partes[2].position.y + partes[3].position.y) / 2;
      this.soporte.setPosition(x, y).setRotation(ang);
    }
    if (this.carga) {
      const n = cuadros(this.scene, 'carga');
      const i = Math.min(estadoDeCarga(r.integridad, r.cargaPerdida), n.length - 1);
      this.carga.setPosition(r.carga.position.x, r.carga.position.y).setRotation(r.carga.angle).setFrame(n[i]);
    }
    r.ruedas.forEach((w, i) => {
      const s = this.ruedas[i];
      if (!s) return;
      const n = cuadros(this.scene, this.clavesRueda[i].nombre);
      s.setPosition(w.cuerpo.position.x, w.cuerpo.position.y).setFrame(n[cuadroDeRueda(w.cuerpo.angle, n.length)]);
    });
  }
}

// ─── Terreno ────────────────────────────────────────────────────────────────────────────

/**
 * Dibuja con tiles los tramos cuya superficie tiene arte: relleno `<mundo>_<sup>` repetido bajo el polígono (máscara)
 * y borde `<mundo>_<sup>_borde` siguiendo la línea del suelo (su lado superior sobre la línea).
 * @param tramos [{ a:{x,y}, b:{x,y}, tipo }] en px de mundo, de izquierda a derecha
 * @param fondoY  y de mundo donde termina el relleno
 * @returns {{ relleno: Set<string>, borde: Set<string> }} superficies ya dibujadas (el resto queda para las figuras)
 */
export function dibujarTerrenoConArte(scene, mundo, tramos, fondoY) {
  const hecho = { relleno: new Set(), borde: new Set() };
  for (const tipo of SUPERFICIES) {
    const mios = tramos.filter((t) => t.tipo === tipo);
    if (!mios.length) continue;
    if (hayArte(scene, `${mundo}_${tipo}`)) {
      rellenoConTiles(scene, `${mundo}_${tipo}`, mios, fondoY);
      hecho.relleno.add(tipo);
    }
    if (hayArte(scene, `${mundo}_${tipo}_borde`)) hecho.borde.add(tipo);
  }
  // Bordes después del relleno para que queden encima. Se agrupan en corridas continuas del mismo tipo.
  let corrida = [];
  const cerrar = () => {
    if (corrida.length) bordeConTiles(scene, `${mundo}_${corrida[0].tipo}_borde`, corrida);
    corrida = [];
  };
  for (const t of tramos) {
    if (!hecho.borde.has(t.tipo)) { cerrar(); continue; }
    if (corrida.length && corrida[0].tipo !== t.tipo) cerrar();
    corrida.push(t);
  }
  cerrar();
  return hecho;
}

function rellenoConTiles(scene, nombre, tramos, fondoY) {
  const clave = PREFIJO + nombre;
  const fuente = scene.textures.get(clave).source[0];
  const tw = fuente.width;
  const th = fuente.height;
  const x0 = Math.min(...tramos.map((t) => t.a.x));
  const x1 = Math.max(...tramos.map((t) => t.b.x));
  const y0 = Math.min(...tramos.flatMap((t) => [t.a.y, t.b.y]));
  const W = tw * ZOOM_ARTE;
  const H = th * ZOOM_ARTE;
  const cols = Math.ceil((x1 - x0) / W);
  const filas = Math.ceil((fondoY - y0) / H);
  const mapa = scene.make.tilemap({ tileWidth: tw, tileHeight: th, width: cols, height: filas });
  const ts = mapa.addTilesetImage(nombre, clave, tw, th, 0, 0);
  const capa = mapa.createBlankLayer(nombre, ts, x0, y0).setScale(ZOOM_ARTE);
  for (let c = 0; c < cols; c++) {
    const ca = x0 + c * W;
    const cb = ca + W;
    let arriba = Infinity;
    for (const t of tramos) if (t.b.x > ca && t.a.x < cb) arriba = Math.min(arriba, t.a.y, t.b.y);
    if (arriba === Infinity) continue;
    const f0 = Math.max(0, Math.floor((arriba - y0) / H));
    capa.fill(ts.firstgid, c, f0, 1, filas - f0);
  }
  // La máscara recorta el relleno con la forma exacta del suelo.
  const mascara = scene.make.graphics({}, false);
  mascara.fillStyle(0xffffff, 1);
  for (const t of tramos) mascara.fillPoints([t.a, t.b, { x: t.b.x, y: fondoY }, { x: t.a.x, y: fondoY }], true);
  capa.setMask(mascara.createGeometryMask());
  return capa;
}

/** Borde con Ropes de un tile de largo: la textura sigue la línea del suelo sin estirarse. */
function bordeConTiles(scene, nombre, corrida) {
  const clave = PREFIJO + nombre;
  const tex = scene.textures.get(clave);
  const tw = tex.source[0].width;
  const th = tex.source[0].height;
  const T = tw * ZOOM_ARTE;
  const medio = (th * ZOOM_ARTE) / 2 - 1; // 1 px de pantalla por encima de la línea: tapa el borde de la máscara del relleno
  // Longitudes acumuladas de la polilínea.
  const acum = [0];
  for (const t of corrida) acum.push(acum.at(-1) + Math.hypot(t.b.x - t.a.x, t.b.y - t.a.y));
  const total = acum.at(-1);
  const punto = (s) => {
    let i = acum.findIndex((v, k) => k > 0 && v >= s) - 1;
    if (i < 0) i = corrida.length - 1;
    const t = corrida[i];
    const L = acum[i + 1] - acum[i] || 1;
    const u = (s - acum[i]) / L;
    const nx = -(t.b.y - t.a.y) / L; // normal hacia abajo (dentro del suelo)
    const ny = (t.b.x - t.a.x) / L;
    return { x: (t.a.x + (t.b.x - t.a.x) * u + nx * medio) / ZOOM_ARTE, y: (t.a.y + (t.b.y - t.a.y) * u + ny * medio) / ZOOM_ARTE };
  };
  for (let s = 0; s < total - 0.5; s += T) {
    const largo = Math.min(T, total - s);
    let frame = '__BASE';
    if (largo < T) {
      const w = Math.max(1, Math.round(largo / ZOOM_ARTE));
      frame = `parcial_${w}`;
      if (!tex.has(frame)) tex.add(frame, 0, 0, 0, w, th);
    }
    const n = Math.max(2, Math.ceil(largo / 12) + 1);
    const puntos = Array.from({ length: n }, (_, k) => punto(s + (largo * k) / (n - 1)));
    scene.add.rope(0, 0, clave, frame, puntos, true).setScale(ZOOM_ARTE);
  }
}

// ─── Fondos ─────────────────────────────────────────────────────────────────────────────

/** Clave del fondo: Marte y Luna por mundo; en la Tierra, por sitio (o 'desierto'). */
export function claveDeFondo(mundo, sitioId) {
  if (mundo && mundo !== 'tierra') return mundo;
  return FONDO_POR_SITIO[sitioId] ?? 'desierto';
}

/**
 * Fondo de 3 capas `fondo_<clave>_{1,2,3}` con paralaje horizontal, repetido a lo ancho y fijo en vertical.
 * Devuelve las imágenes creadas ([] si no hay arte: queda el color de fondo de la cámara).
 */
export function crearFondo(scene, clave, { x: bx, ancho: bw }) {
  const capas = [1, 2, 3].map((n) => `fondo_${clave}_${n}`);
  if (!capas.some((c) => hayArte(scene, c))) {
    if (clave !== 'desierto' && !['marte', 'luna'].includes(clave)) return crearFondo(scene, 'desierto', { x: bx, ancho: bw });
    return [];
  }
  const cam = scene.cameras.main;
  const imagenes = [];
  capas.forEach((nombre, i) => {
    if (!hayArte(scene, nombre)) return;
    const f = PARALAJE[i];
    const ancho = scene.textures.get(PREFIJO + nombre).source[0].width * ZOOM_ARTE;
    // En pantalla: x − scrollX·f. Cubre desde el borde izquierdo hasta el derecho en todo el rango de la cámara.
    const desde = bx * f - ancho;
    const hasta = (bx + bw) * f + cam.width + ancho;
    for (let x = desde; x < hasta; x += ancho) {
      imagenes.push(scene.add.image(x, 0, PREFIJO + nombre).setOrigin(0, 0).setScale(ZOOM_ARTE).setScrollFactor(f, 0).setDepth(-30 + i * 10));
    }
  });
  return imagenes;
}
