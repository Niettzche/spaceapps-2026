// Bloques y parches de superficie de los niveles destacados (content/niveles_destacados.js). RECREACIÓN declarada:
// el modelo de elevación de 30 m no resuelve bloques de medio metro ni parches de ceniza, talud o hielo.
// generarElementos es pura (pruebas en niveles_destacados.test.mjs); crearElementos hace los cuerpos de Matter y el dibujo.
import { tr } from '../i18n.js';
import { aleatorio, semillaDe, alturaEn, PLANO_INICIO_M, PLANO_FINAL_M } from './perfil.js';
import { velAMs } from './escala.js';

const MARGEN_INICIO_M = 4;
const MARGEN_FINAL_M = 2;
const entre = (r, [a, b]) => a + r() * (b - a);

/** Pendiente local (grados, absoluta) alrededor de x. */
export function pendienteLocal(perfil, x, w = 1.5) {
  return Math.abs((Math.atan2(alturaEn(perfil, x + w) - alturaEn(perfil, x - w), 2 * w) * 180) / Math.PI);
}

/**
 * Lista determinista de elementos del nivel.
 * @returns {Array<{tipo:'parche', clase, desde_m, hasta_m, superficie, agarre, arte, recreacion} |
 *                 {tipo:'bloque', clase, x_m, radio_m, alto_m, arte, danio, recreacion}>}
 */
export function generarElementos(perfil, cfg, semilla = '') {
  if (!cfg || !perfil) return [];
  const inicio = PLANO_INICIO_M + MARGEN_INICIO_M;
  const fin = perfil.largo_m - PLANO_FINAL_M - MARGEN_FINAL_M;
  const lista = [];
  const ocupado = (a, b) => lista.some((o) => o.tipo === 'parche' && a < o.hasta_m && b > o.desde_m);
  for (const [i, P] of (cfg.parches ?? []).entries()) {
    const r = aleatorio(semillaDe(`parche:${semilla}:${P.clase}:${i}`));
    for (let x = inicio + entre(r, P.cada) / 2; x < fin; x += entre(r, P.cada)) {
      const hasta = Math.min(x + entre(r, P.largo), fin);
      if (hasta - x < 3 || ocupado(x, hasta)) continue;
      let ok = true;
      for (let s = x; s <= hasta && ok; s += 1) ok = pendienteLocal(perfil, s) <= (P.pendienteMax ?? 90);
      // pendienteMin: el parche debe tener al menos un tramo con esa pendiente (p. ej. talud al pie de un banco).
      if (ok && P.pendienteMin != null) {
        let max = 0;
        for (let s = x; s <= hasta; s += 1) max = Math.max(max, pendienteLocal(perfil, s));
        ok = max >= P.pendienteMin;
      }
      if (!ok) continue;
      lista.push({
        tipo: 'parche', clase: P.clase, desde_m: Math.round(x * 10) / 10, hasta_m: Math.round(hasta * 10) / 10,
        superficie: P.superficie, agarre: P.agarre, arte: P.arte ?? null, tinte: P.tinte ?? null, recreacion: true,
      });
    }
  }
  for (const [i, B] of (cfg.bloques ?? []).entries()) {
    const r = aleatorio(semillaDe(`bloque:${semilla}:${B.clase}:${i}`));
    let k = 0;
    for (let x = inicio + entre(r, B.cada) / 2; x < fin; x += entre(r, B.cada)) {
      const radio = Math.round(entre(r, B.radio) * 100) / 100;
      if (pendienteLocal(perfil, x) > (B.pendienteMax ?? 90)) continue;
      const arte = Array.isArray(B.arte) ? B.arte[k++ % B.arte.length] : B.arte ?? null;
      lista.push({
        tipo: 'bloque', clase: B.clase, x_m: Math.round(x * 10) / 10, radio_m: radio, alto_m: Math.round(radio * B.asoma * 100) / 100,
        arte, danio: B.danio ?? null, recreacion: true,
      });
    }
  }
  return lista;
}

/** Parche en x (m) o null. */
export const parcheEn = (lista, x) => lista.find((o) => o.tipo === 'parche' && x >= o.desde_m && x < o.hasta_m) ?? null;
/** Factor de agarre del parche en x (1 fuera de los parches). */
export const factorParcheEn = (lista, x) => parcheEn(lista, x)?.agarre ?? 1;
/** Superficie equivalente en x, o null si no hay parche (se usa la del perfil). */
export const superficieParcheEn = (lista, x) => parcheEn(lista, x)?.superficie ?? null;

/** Daño (puntos de resistencia) de un golpe a `v` m/s contra un bloque con `danio` (P). */
export function danioBloque(danio, v) {
  if (!danio) return 0;
  return Math.max(0, v - danio.umbral_ms) * danio.por_ms;
}

// Colores de las franjas de parche [base, mota] (arte provisional; pedir tiles en pendiente a Mauricio).
const COLOR_PARCHE = {
  toba: [0xd9cdb4, 0x9c8f78], talud: [0x7d7064, 0xb3a796], nieve: [0xf1f5fb, 0xc9d6e6], hielo: [0xbfe1ef, 0xffffff],
};

const NOMBRE = {
  toba: ['toba y ceniza blanda', 'soft tuff and ash'], talud: ['talud de roca suelta', 'loose-rock talus'],
  nieve: ['nieve', 'snow'], hielo: ['hielo', 'ice'], bomba: ['bombas volcánicas', 'volcanic bombs'],
  eyecta: ['bloques de eyecta', 'ejecta blocks'], lava_aa: ['bloques de lava aa', 'aa lava blocks'],
};
export const nombreElemento = (clase) => tr(...(NOMBRE[clase] ?? [clase, clase]));

/** Nota corta para el panel de datos: "recreado: 6 parches de toba (agarre −20 %, P), 5 bloques de eyecta de 0.5–0.8 m". */
export function notaElementos(lista) {
  if (!lista?.length) return null;
  const partes = [];
  const clases = [...new Set(lista.map((o) => `${o.tipo}:${o.clase}`))];
  for (const c of clases) {
    const [tipo, clase] = c.split(':');
    const de = lista.filter((o) => o.tipo === tipo && o.clase === clase);
    if (tipo === 'parche') {
      const pct = Math.round((1 - de[0].agarre) * 100);
      partes.push(tr(`${de.length} parches de ${nombreElemento(clase)} (agarre −${pct} %, P)`,
        `${de.length} patches of ${nombreElemento(clase)} (grip −${pct} %, P)`));
    } else {
      const d = de.map((o) => o.radio_m * 2);
      const dan = de[0].danio ? tr(`; cortan el chasis sobre ${de[0].danio.umbral_ms} m/s, P`, `; they cut the chassis above ${de[0].danio.umbral_ms} m/s, P`) : '';
      partes.push(tr(`${de.length} ${nombreElemento(clase)} de ${Math.min(...d).toFixed(1)}–${Math.max(...d).toFixed(1)} m${dan}`,
        `${de.length} ${nombreElemento(clase)} of ${Math.min(...d).toFixed(1)}–${Math.max(...d).toFixed(1)} m${dan}`));
    }
  }
  return tr(`recreado (el modelo de 30 m no lo resuelve): ${partes.join(', ')}`, `recreated (the 30 m model does not resolve it): ${partes.join(', ')}`);
}

/**
 * Cuerpos y dibujo. Los bloques son círculos estáticos medio enterrados con label 'suelo' (las ruedas los pisan y el chasis
 * recibe golpes como con el terreno). Los de lava aa además dañan al robot al golpearlos (danioBloque), desde aquí, sin tocar
 * robot.js. Devuelve { cuerpos, destruir() }.
 */
export function crearElementos(scene, perfil, { xMundo, yMundo }, lista, { mundo = 'tierra', sprite = null, hayArte = () => false, robot = null } = {}) {
  const PX = 3;
  const g = scene.add.graphics().setDepth(3);
  const cuerpos = [];
  const sufijo = (base) => {
    if (mundo === 'tierra' || !base) return base;
    const n = base.replace(/(_\d)$/, `_${mundo}$1`);
    return hayArte(scene, n) ? n : base;
  };
  for (const o of lista) {
    if (o.tipo === 'bloque') {
      const x = xMundo(o.x_m);
      const rpx = o.radio_m * 24;
      const ySuelo = yMundo(alturaEn(perfil, o.x_m));
      const alto = o.alto_m * 24;
      const c = scene.matter.add.circle(x, ySuelo + rpx - alto, rpx, { isStatic: true, label: 'suelo', friction: 1, frictionStatic: 1, restitution: 0 });
      c.obstaculo = o.clase;
      c.danioBloque = o.danio;
      cuerpos.push(c);
      const nombre = sprite && sufijo(o.arte);
      const s = nombre && sprite(scene, nombre, { x, y: ySuelo + PX, origen: [0.5, 1], profundidad: 3 });
      if (s) {
        // Escala el arte al tamaño del bloque (ancho = cuerda a ras del suelo), sin pasar de 2× el arte.
        const cuerda = 2 * Math.sqrt(Math.max(0, rpx * rpx - (rpx - alto) * (rpx - alto)));
        s.setScale(Math.max(1, Math.min(6, cuerda / s.frame.width)), Math.max(1, Math.min(6, (alto + PX) / s.frame.height)));
      } else {
        g.fillStyle(o.clase === 'lava_aa' ? 0x2b2324 : 0x6a5a50, 1).fillCircle(x, ySuelo + rpx - alto, rpx);
      }
    } else if (o.tipo === 'parche') {
      // Casi plano: tiles de arte de Mauricio (obstaculo_toba, _talud, _hielo...). En pendiente los tiles quedan en escalones,
      // así que ahí se dibuja una franja que sigue el terreno, con el color del material y motas.
      let maxPend = 0;
      for (let xm = o.desde_m; xm <= o.hasta_m; xm += 1) maxPend = Math.max(maxPend, pendienteLocal(perfil, xm));
      const arte = sprite && o.arte && maxPend < 6 ? sufijo(o.arte) : null;
      if (arte && hayArte(scene, arte)) {
        for (let xm = o.desde_m; xm < o.hasta_m - 0.05; xm += 2) {
          const t = sprite(scene, arte, { x: xMundo(xm), y: yMundo(alturaEn(perfil, xm + 1)) + 2 * PX, origen: [0, 1], profundidad: 3 });
          if (!t) continue;
          if (o.tinte) t.setTint(o.tinte);
          t.setScale((2 * 24) / t.frame.width, 3); // 2 m de ancho por tile
          if (xm + 2 > o.hasta_m) t.setCrop(0, 0, Math.max(1, Math.round(((o.hasta_m - xm) / 2) * t.frame.width)), t.frame.height);
        }
        continue;
      }
      const [base, mota] = COLOR_PARCHE[o.clase] ?? [o.tinte ?? 0xc8c0b0, 0xffffff];
      const r = aleatorio(semillaDe(`parche_vista:${o.clase}:${o.desde_m}`));
      const grueso = 0.3 * 24;
      for (let xm = o.desde_m; xm < o.hasta_m - 1e-6; xm += 0.5) {
        const xb = Math.min(xm + 0.5, o.hasta_m);
        const a = { x: xMundo(xm), y: yMundo(alturaEn(perfil, xm)) };
        const b = { x: xMundo(xb), y: yMundo(alturaEn(perfil, xb)) };
        g.fillStyle(base, 0.95).fillPoints([{ x: a.x, y: a.y - PX }, { x: b.x, y: b.y - PX }, { x: b.x, y: b.y + grueso }, { x: a.x, y: a.y + grueso }], true);
        g.fillStyle(mota, 0.9).fillRect(Math.round((a.x + r() * 9) / PX) * PX, Math.round((a.y + r() * grueso * 0.6) / PX) * PX, PX, PX);
      }
    }
  }
  // Lava aa: golpes del robot contra el bloque → daño al chasis (P). El robot emite la telemetría.
  let alChocar = null;
  if (robot && cuerpos.some((c) => c.danioBloque)) {
    const ultimo = new Map(); // bloque → t del último golpe (un golpe por bloque cada 0.5 s)
    alChocar = (ev) => {
      for (const par of ev.pairs) {
        const A = par.bodyA.parent;
        const B = par.bodyB.parent;
        const bloque = A.danioBloque ? A : B.danioBloque ? B : null;
        if (!bloque) continue;
        const otro = bloque === A ? B : A;
        if (!robot._esMio?.(otro) || robot.destruido) continue;
        if ((robot.t ?? 0) - (ultimo.get(bloque) ?? -9) < 0.5) continue;
        const v = Math.abs(velAMs(Math.hypot(otro.velocity.x, otro.velocity.y)));
        const d = danioBloque(bloque.danioBloque, v);
        if (d <= 0) continue;
        ultimo.set(bloque, robot.t ?? 0);
        robot.vida = Math.max(0, robot.vida - d);
        robot.alEvento?.('golpe_chasis', tr(`lava aa ${v.toFixed(1)} m/s`, `aa lava ${v.toFixed(1)} m/s`));
        if (robot.vida <= 0 && !robot.destruido) {
          robot.destruido = true;
          robot.alEvento?.('chasis_destruido', robot.piezas?.chasis?.id ?? '');
        }
      }
    };
    scene.matter.world.on('collisionstart', alChocar);
  }
  return {
    cuerpos,
    destruir() { if (alChocar) scene.matter?.world?.off('collisionstart', alChocar); },
  };
}
