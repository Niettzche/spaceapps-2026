// Fuente bitmap del juego (arte de Mauricio, #80): assets/fuentes/pixel (cuerpo, glifos blancos que se tiñen) y
// pixel_titulo (estilo del logo, colores fijos). Celda de 11 px de alto (7 de mayúscula): se dibuja a escala entera
// (×2 = mayúscula de 14 px, el mínimo de DISENO.md §2.1; ×3 para números y títulos), así se ve nítida.
// Sin dependencias de otras escenas (lo importan interfaz.js, componentes.js, comun/pixel.js, ui.js y fisica/).
// Respaldo: si la fuente no cargó o el renderizador no es WebGL (BitmapText no se tiñe en Canvas), todo sigue con
// Text monoespaciado, como antes.
import Phaser from 'phaser';
import urlPixel from '../../../../assets/fuentes/pixel.png?url';
import urlPixelXml from '../../../../assets/fuentes/pixel.xml?url';
import urlTitulo from '../../../../assets/fuentes/pixel_titulo.png?url';
import urlTituloXml from '../../../../assets/fuentes/pixel_titulo.xml?url';

export const FUENTE_CUERPO = 'pixel';
export const FUENTE_TITULO = 'pixel_titulo';
export const FUENTE_RESPALDO = 'monospace';
const NATIVO = 11; // tamaño (size) de las dos fuentes en su XML
const MAYUSCULA = 7; // filas de la mayúscula en la celda

/** Encola la carga de las dos fuentes (Boot.preload). Si fallan, el juego sigue con monospace. */
export function cargarFuentes(scene) {
  if (!scene.cache.bitmapFont.exists(FUENTE_CUERPO)) scene.load.bitmapFont(FUENTE_CUERPO, urlPixel, urlPixelXml);
  if (!scene.cache.bitmapFont.exists(FUENTE_TITULO)) scene.load.bitmapFont(FUENTE_TITULO, urlTitulo, urlTituloXml);
}

/** ¿Se puede dibujar con la fuente bitmap? */
export function hayFuente(scene, clave = FUENTE_CUERPO) {
  return scene.sys.game.renderer?.type === Phaser.WEBGL && scene.cache.bitmapFont.exists(clave);
}

/**
 * Escala entera para un tamaño pedido en px «de Text» (los tamaños de siempre: 14–18 cuerpo, 22–32 números, 38 títulos).
 * 14–23 → ×2 (mayúscula 14 px) · 24–33 → ×3 · 34–42 → ×4 · 43+ → ×5 (igual para la fuente del logo).
 */
export function escalaPara(px, titulo = false) {
  const k = Math.max(2, Math.round((Number(px) || 16) / 9.5));
  return titulo ? Math.max(2, k) : k;
}

/** Alto de la mayúscula en px de pantalla de un BitmapText de la fuente (para revisiones: ≥ 14). */
export const mayusculaDe = (t) => (t.fontSize / NATIVO) * MAYUSCULA;

// Glifos que la fuente no tiene → el más parecido que sí tiene (el texto conserva su significado).
const SUSTITUTOS = {
  '▶': '›', '▸': '›', '◀': '‹', '▲': '↑', '▼': '↓', '•': '·', '⚑': '»', '♪': '', '≈': '~', '±': '+/-', '³': '3',
  '∝': '~', '↔': '←→', 'ρ': 'p', '⚡': '!', '₂': '2', '⁻': '-', '¹': '1', '⁰': '0', 'º': '°', '∈': 'en', '§': 'S',
  '′': "'", '″': '"', '✗': '✕', 'ⓘ': 'i', '\t': '  ', '─': '-', ' ': ' ', '‑': '-',
};
let glifos = null;
/** Cambia los caracteres que la fuente no tiene; los que no tienen sustituto (p. ej. árabe) se omiten. */
export function aGlifos(scene, s) {
  const str = String(s ?? '');
  if (!glifos) {
    const datos = scene.cache.bitmapFont.get(FUENTE_CUERPO)?.data?.chars;
    if (!datos) return str;
    glifos = new Set(Object.keys(datos).map((c) => String.fromCharCode(Number(c))));
    glifos.add('\n');
  }
  let out = '';
  for (const ch of str) {
    if (glifos.has(ch)) out += ch;
    else if (ch in SUSTITUTOS) out += SUSTITUTOS[ch];
    else if (/\s/.test(ch)) out += ' ';
  }
  return out;
}

const aNumero = (c) => (typeof c === 'number' ? c : parseInt(String(c).replace('#', ''), 16));

/**
 * Texto con la fuente pixel del juego. Devuelve un BitmapText (o un Text de respaldo) con la misma API mínima de Text
 * que usan las escenas: setColor (tinte), setText (cambia glifos que faltan), setWordWrapWidth (maxWidth),
 * setTamano(px), y no-ops para setPadding / setBackgroundColor / setFixedSize / setStroke (las cajas van detrás).
 * Opciones: size (px «de Text», se lleva a escala entera ≥ ×2), color, origen [x, y], ancho (ajuste de línea),
 *   alinear ('left' | 'center' | 'right'), titulo (fuente del logo, sin tinte, ≥ ×3), interlineado (px), borde (sombra).
 */
export function textoPixel(scene, x, y, contenido, {
  size = 16, color = '#ffffff', origen = [0, 0], ancho, alinear = 'left', titulo = false, interlineado = 0, borde = false, estilo = 'normal',
} = {}) {
  const clave = titulo ? FUENTE_TITULO : FUENTE_CUERPO;
  if (!hayFuente(scene, clave) || !hayFuente(scene, FUENTE_CUERPO)) {
    const t = scene.add.text(x, y, contenido, {
      fontFamily: FUENTE_RESPALDO, fontSize: `${Math.max(14, size)}px`, color, align: alinear, fontStyle: titulo ? 'bold' : estilo,
      lineSpacing: interlineado, wordWrap: ancho ? { width: ancho, useAdvancedWrap: true } : undefined,
      ...(borde ? { stroke: '#0b0d17', strokeThickness: 4 } : {}),
    });
    t.esPixel = false;
    t.setTamano = (px) => t.setFontSize(`${Math.max(14, px)}px`);
    return t.setOrigin(origen[0], origen[1]);
  }
  const t = scene.add.bitmapText(Math.round(x), Math.round(y), clave, aGlifos(scene, contenido), NATIVO * escalaPara(size, titulo));
  const original = t.setText;
  t.setText = function (s) { return original.call(this, aGlifos(scene, Array.isArray(s) ? s.join('\n') : s)); };
  t.esPixel = true;
  t.titulo = titulo;
  t.setColor = (c) => { t.colorTexto = c; if (!titulo && c != null) t.setTint(aNumero(c)); return t; };
  t.setTamano = (px) => t.setFontSize(NATIVO * escalaPara(px, titulo));
  t.setWordWrapWidth = (w) => t.setMaxWidth(w || 0);
  // Renglones con el ajuste de línea real (como Text.getWrappedText): para paginar textos largos.
  t.getWrappedText = (s) => {
    const antes = t.text;
    t.setText(s);
    const r = (t.maxWidth > 0 ? t.getTextBounds().wrappedText : t.text) || '';
    original.call(t, antes);
    return r.split('\n').map((l) => l.replace(/\s+$/, ''));
  };
  t.setStyle = (st = {}) => { if (st.color) t.setColor(st.color); if (st.fontSize) t.setTamano(parseFloat(st.fontSize)); return t; };
  for (const m of ['setPadding', 'setBackgroundColor', 'setFixedSize', 'setStroke', 'setShadow', 'setResolution']) t[m] = () => t;
  t.setColor(color);
  if (ancho) t.setMaxWidth(ancho);
  if (interlineado) t.setLineSpacing(interlineado);
  t.align = alinear === 'center' ? 1 : alinear === 'right' ? 2 : 0;
  if (borde) t.setDropShadow(2, 2, 0x0b0d17, 1);
  return t.setOrigin(origen[0], origen[1]);
}

/** Recorta el texto con «…» hasta que su ancho dibujado quepa en `max` px (fuente de ancho variable). Devuelve el texto. */
export function ajustarAncho(t, max) {
  if (!(max > 0)) return t;
  let s = t.text;
  while (t.width > max && s.length > 1) {
    s = s.replace(/…$/, '').slice(0, -1).replace(/\s+$/, '') + '…';
    t.setText(s);
  }
  return t;
}
