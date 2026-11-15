// Dueño: frente taller. Accesibilidad del Taller sin Phaser (PLAN_REMAKE.md §2, DISENO.md §2.9):
// - resumen textual del diseño para lector de pantalla (un nodo HTML `aria-live="polite"` fuera del lienzo, oculto a la vista),
// - «Leer» en voz alta el panel de cifras (Web Speech API `speechSynthesis`, solo si el navegador la tiene),
// - nivel del agarre (bien / medio / bajo) para color **y** patrón de las barras (nada solo por color),
// - suelo principal del sitio de la prueba (el de más metros en sitio.nivel.superficies).
// Las funciones de texto son puras (se prueban con `node game/src/scenes/Taller/accesible.test.mjs`).
import { tr, trDato, enIngles } from '../../i18n.js';

const SUELO_EN = { arena: 'sand', roca: 'rock', compacto: 'compact' };
export const nombreSuelo = (s) => tr(s, SUELO_EN[s] ?? s);

/** Nivel de un agarre (0–1) para la barra: 'bien' ≥ 0.7 · 'medio' ≥ 0.5 · 'bajo' < 0.5 · null sin dato. */
export function nivelAgarre(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v >= 0.7 ? 'bien' : v >= 0.5 ? 'medio' : 'bajo';
}

/** Suelo con más metros en el recorrido del sitio (`sitio.nivel.superficies`); null si el sitio no lo trae. */
export function sueloPrincipal(sitio) {
  const tramos = sitio?.nivel?.superficies;
  if (!Array.isArray(tramos) || !tramos.length) return null;
  const metros = {};
  for (const t of tramos) {
    if (!t?.tipo) continue;
    const m = Number(t.hasta) - Number(t.desde);
    metros[t.tipo] = (metros[t.tipo] ?? 0) + (Number.isFinite(m) && m > 0 ? m : 0);
  }
  const orden = Object.entries(metros).sort((a, b) => b[1] - a[1]);
  return orden.length ? orden[0][0] : null;
}

const minus = (s) => String(s ?? '').charAt(0).toLowerCase() + String(s ?? '').slice(1);

/** Estado del diseño en palabras: «Listo para probar.» o lo que falta / cuánto excede. */
export function estadoDiseno(errores, costo, presupuesto, faltan = []) {
  if (!errores?.length) return tr('Listo para probar.', 'Ready to test.');
  const partes = [];
  if (faltan.length) partes.push(tr(`Falta: ${faltan.map(minus).join(', ')}`, `Missing: ${faltan.map(minus).join(', ')}`));
  if (costo > presupuesto) partes.push(tr(`excede por ${costo - presupuesto} créditos`, `over budget by ${costo - presupuesto} credits`));
  if (!partes.length) partes.push(String(errores[0]));
  const t = partes.join('; ');
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
}

/**
 * Frase para el lector de pantalla después de un cambio, p. ej.
 * «Rueda ancha para arena en el eje delantero. Presupuesto 890 de 1000. Listo para probar.»
 * `accion`: 'poner' | 'quitar' | 'mover' | 'ejes' | 'otro'; `texto` para 'otro' (p. ej. «Deshecho: …»).
 */
export function anuncioCambio({ accion, pieza = null, ranura = null, texto = '', costo, presupuesto, errores = [], faltan = [] }) {
  const nombreP = pieza ? trDato(pieza, 'nombre') : '';
  const nombreR = ranura ? minus(trDato(ranura, 'nombre')) : '';
  let que;
  if (accion === 'poner' || accion === 'mover') que = tr(`${nombreP} en ${art(nombreR)}`, `${nombreP} on the ${nombreR}`);
  else if (accion === 'ejes') que = tr(`${nombreP} en los dos ejes`, `${nombreP} on both axles`);
  else if (accion === 'quitar') que = tr(`Quitaste ${art(nombreR)}`, `Removed the ${nombreR}`);
  else que = texto;
  const frase = que ? `${que.charAt(0).toUpperCase()}${que.slice(1)}. ` : '';
  return `${frase}${tr(`Presupuesto ${costo} de ${presupuesto}.`, `Budget ${costo} of ${presupuesto}.`)} ${estadoDiseno(errores, costo, presupuesto, faltan)}`;
}

// «el eje delantero», «la batería», «el módulo»… (solo en español; en inglés se usa «the»).
const FEMENINAS = ['batería', 'carga'];
function art(nombre) {
  if (enIngles()) return nombre;
  return `${FEMENINAS.some((f) => nombre.startsWith(f)) ? 'la' : 'el'} ${nombre}`;
}

/**
 * Texto que lee «Leer» (y que resume el panel de cifras). `res` = resumen() de Taller/diseno.js; números de juego (P).
 */
export function textoPanel(res, { presupuesto, errores = [], faltan = [], masaCarga = 0, suelo = null }) {
  const n2 = (v) => (typeof v === 'number' ? v.toFixed(2) : tr('sin dato', 'no data'));
  const lineas = [
    tr(`Presupuesto: ${res.costo} de ${presupuesto} créditos, quedan ${presupuesto - res.costo}.`,
      `Budget: ${res.costo} of ${presupuesto} credits, ${presupuesto - res.costo} left.`),
    tr(`Masa ${res.masa} kilos más ${masaCarga} de carga.`, `Mass ${res.masa} kilograms plus ${masaCarga} of cargo.`),
  ];
  if (res.autonomia_s != null) lineas.push(tr(`Autonomía ${Math.round(res.autonomia_s)} segundos.`, `Run time ${Math.round(res.autonomia_s)} seconds.`));
  const a = res.agarre ?? {};
  lineas.push(tr(`Agarre: arena ${n2(a.arena)}, roca ${n2(a.roca)}, compacto ${n2(a.compacto)}.`,
    `Grip: sand ${n2(a.arena)}, rock ${n2(a.roca)}, compact ${n2(a.compacto)}.`));
  if (suelo) lineas.push(tr(`El suelo de este lugar es ${nombreSuelo(suelo)}.`, `This place's ground is ${nombreSuelo(suelo)}.`));
  if (res.proteccion != null) {
    lineas.push(tr(`Protección ${Math.round(res.proteccion * 100)} por ciento, resistencia ${res.resistencia ?? '—'}.`,
      `Protection ${Math.round(res.proteccion * 100)} percent, durability ${res.resistencia ?? '—'}.`));
  }
  lineas.push(estadoDiseno(errores, res.costo, presupuesto, faltan));
  return lineas.join(' ');
}

// ───────────────────────── navegador (DOM y voz) ─────────────────────────

/**
 * Nodo `aria-live="polite"` visualmente oculto (fuera del lienzo). Devuelve { decir(texto), destruir() }.
 * Sin `document` (Node) devuelve un objeto que no hace nada.
 */
export function crearRegionViva(id = 'mc-taller-resumen') {
  const doc = globalThis.document;
  if (!doc?.body) return { decir() {}, destruir() {}, nodo: null };
  doc.getElementById(id)?.remove();
  const nodo = doc.createElement('div');
  nodo.id = id;
  nodo.setAttribute('aria-live', 'polite');
  nodo.setAttribute('role', 'status');
  nodo.setAttribute('aria-atomic', 'true');
  // Oculto a la vista pero no al lector de pantalla (patrón «visually hidden»).
  nodo.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;'
    + 'clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;';
  doc.body.append(nodo);
  let ultimo = '';
  return {
    nodo,
    decir(t) {
      // Mismo texto dos veces seguidas: se vacía y se vuelve a poner para que el lector lo repita.
      if (t === ultimo) nodo.textContent = '';
      ultimo = t;
      nodo.textContent = t;
    },
    destruir() { nodo.remove(); },
  };
}

/** ¿El navegador puede leer en voz alta? */
export function hayVoz() {
  try { return typeof globalThis.speechSynthesis?.speak === 'function' && typeof globalThis.SpeechSynthesisUtterance === 'function'; } catch { return false; }
}

/** Lee `texto` en el idioma actual; si ya está hablando, se calla (el mismo botón para y vuelve a leer). Devuelve true si habló. */
export function leerEnVoz(texto) {
  if (!hayVoz()) return false;
  try {
    const voz = globalThis.speechSynthesis;
    if (voz.speaking || voz.pending) { voz.cancel(); return false; }
    const u = new globalThis.SpeechSynthesisUtterance(texto);
    u.lang = enIngles() ? 'en-US' : 'es-MX';
    u.rate = 1;
    voz.speak(u);
    return true;
  } catch { return false; }
}

/** Calla la voz (al salir del Taller). */
export function callarVoz() {
  try { if (hayVoz()) globalThis.speechSynthesis.cancel(); } catch { /* nada */ }
}
