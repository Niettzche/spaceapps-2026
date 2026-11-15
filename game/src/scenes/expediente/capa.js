// Dueño: frente expediente. Capa HTML sobre el lienzo para formularios (Explorador).
// Se usa HTML en vez de texto de Phaser para tener campos reales, accesibles con teclado, toque y lector de pantalla.
// No requiere `dom: { createContainer: true }` en main.js (archivo del integrador).
// Diseño (docs/juego/DISENO.md): letra de 16 px o más, keywords, similitud en barras, botón principal grande y
// colores con significado fijo (paleta.js). Lo que sale de la vista principal va a un "ver más" (<details>), nunca se borra.
import { tr } from '../../i18n.js';
import { PALETA as P } from './paleta.js';
import { anchoBarra } from './medidor.js';

/** Crea un elemento. Los textos van siempre como textContent (nunca innerHTML): la API es una fuente externa. */
export function el(etiqueta, atributos = {}, hijos = []) {
  const n = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v === false || v == null) continue;
    if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, String(v));
  }
  if (atributos.selected === true) n.selected = true;
  for (const h of [].concat(hijos)) {
    if (h == null || h === false) continue;
    n.append(h instanceof Node ? h : document.createTextNode(String(h)));
  }
  return n;
}

/** Barra de similitud con el número escrito (nunca solo color). Sin dato: solo el texto. */
export function barra(valor, textoValor, { grande = false } = {}) {
  const ancho = anchoBarra(valor);
  return el('div', { class: `barra${grande ? ' grande' : ''}${ancho == null ? ' vacia' : ''}` }, [
    el('span', { class: 'pista', 'aria-hidden': 'true' }, ancho == null ? null : el('span', { class: 'relleno', style: `width: ${ancho}%` })),
    el('span', { class: 'cifra' }, textoValor),
  ]);
}

/** Chip de una o pocas palabras. `tipo`: bien · riesgo · dato · accion · neutro. */
export const chip = (texto, tipo = 'neutro', atributos = {}) => el('span', { class: `chip ${tipo}`, ...atributos }, texto);

/** "Ver más": el detalle completo (frases, fuentes, notas) a un clic o Enter, sin quitarlo de la página. */
export const detalle = (titulo, hijos) => el('details', {}, [el('summary', {}, titulo), ...[].concat(hijos).filter(Boolean)]);

export function crearCapa(id, css) {
  document.getElementById(id)?.remove();
  if (css && !document.getElementById(`${id}-estilos`)) {
    document.head.append(el('style', { id: `${id}-estilos` }, css));
  }
  const capa = el('div', { id, role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('Explorador libre', 'Free explorer') });
  document.body.append(capa);
  return capa;
}

export const ESTILOS = `
#mc-explorador { position: fixed; inset: 0; overflow: auto; padding: 14px 16px; box-sizing: border-box;
  background: rgba(11, 13, 23, 0.96); color: ${P.texto}; font: 16px/1.4 ui-monospace, Menlo, Consolas, monospace; z-index: 10; }
#mc-explorador *, #mc-explorador *::before, #mc-explorador *::after { box-sizing: border-box; }
#mc-explorador > * { max-width: 928px; margin-left: auto; margin-right: auto; }
#mc-explorador [hidden] { display: none !important; }
#mc-explorador header { display: flex; justify-content: space-between; align-items: center; gap: 8px 12px; flex-wrap: wrap; }
#mc-explorador header .barra-consulta { flex: 1 1 380px; margin-top: 0; }
#mc-explorador h1 { font-size: 24px; margin: 0; font-weight: 600; }
#mc-explorador .ayuda { color: ${P.secundario}; margin: 6px 0; }
#mc-explorador .fila { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin: 8px 0; }
#mc-explorador label { display: flex; flex-direction: column; gap: 4px; color: ${P.secundario}; }
/* 16 px en campos y listas: con menos, iOS hace zoom automático al escribir. */
#mc-explorador input, #mc-explorador select { font: inherit; font-size: 16px; color: ${P.texto}; background: ${P.panel};
  border: 1px solid ${P.borde}; padding: 8px 10px; border-radius: 4px; min-width: 140px; min-height: 44px; }
#mc-explorador .par { display: flex; gap: 6px; align-items: flex-end; }
#mc-explorador .par select { min-width: 0; }
#mc-explorador button { font: inherit; cursor: pointer; border-radius: 6px; padding: 8px 14px; min-height: 44px; }
/* Botón principal grande (DISENO.md §2.6): amarillo = acción. */
#mc-explorador button.primario { background: ${P.accion}; color: ${P.fondo}; border: 0; font-weight: 700; font-size: 18px;
  min-height: 52px; padding: 10px 22px; }
#mc-explorador button.primario:disabled { background: ${P.secundario}; color: ${P.fondo}; cursor: not-allowed; }
#mc-explorador button.secundario { background: transparent; color: ${P.accion}; border: 2px solid ${P.accion}; }
#mc-explorador :focus-visible { outline: 3px solid ${P.bien}; outline-offset: 2px; }
#mc-explorador .error { color: ${P.riesgo}; min-height: 1.2em; margin: 4px 0; }
#mc-explorador .estado { color: ${P.accion}; min-height: 1.2em; }
#mc-explorador p.estado:empty { display: none; }
#mc-explorador .aviso { border: 2px solid ${P.riesgo}; background: #2a0f18; padding: 10px 14px; border-radius: 6px; }
#mc-explorador .aviso p { margin: 6px 0 0; }
#mc-explorador .ok { border: 2px solid ${P.bien}; background: #0d2a22; padding: 10px 14px; border-radius: 6px; }
#mc-explorador table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 16px; }
#mc-explorador th, #mc-explorador td { text-align: left; padding: 4px 6px; border-bottom: 1px solid ${P.borde}; vertical-align: top; }
#mc-explorador thead th { color: ${P.secundario}; font-weight: 400; }
#mc-explorador td.dato { color: ${P.dato}; }
#mc-explorador .nota { color: ${P.secundario}; margin: 4px 0; }
#mc-explorador .propuesta { border-top: 1px solid ${P.borde}; margin-top: 8px; padding-top: 6px; }
#mc-explorador .propuesta.compacta .fila { flex-wrap: nowrap; align-items: center; margin: 4px 0; }
#mc-explorador .propuesta.compacta .nota { flex: 1 1 auto; }
#mc-explorador .propuesta.compacta .fila > button { flex: 0 0 auto; }
/* Resultado sin desplazarse: barra del punto consultado (formulario colapsado) y ficha en dos columnas. */
#mc-explorador .barra-consulta { display: flex; align-items: center; justify-content: space-between; gap: 6px 12px;
  border: 1px solid ${P.borde}; background: ${P.panel}; padding: 2px 4px 2px 12px; border-radius: 6px; }
#mc-explorador .barra-consulta > span { flex: 1 1 auto; min-width: 0; }
#mc-explorador .barra-consulta > button { flex: 0 0 auto; }
#mc-explorador .dos-col { display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr); gap: 0 18px; align-items: start; }
#mc-explorador .dos-col.mitades { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
#mc-explorador .dos-col p { margin: 4px 0; }
/* Tarjeta del resultado */
#mc-explorador .tarjeta { border: 1px solid ${P.borde}; background: ${P.panel}; border-radius: 8px; padding: 8px 12px; margin: 4px 0; }
#mc-explorador .etiqueta { display: inline-block; color: ${P.fondo}; background: ${P.secundario}; font-weight: 700;
  padding: 2px 10px; border-radius: 4px; margin: 6px 0 2px; }
#mc-explorador h2 { font-size: 24px; margin: 2px 0; font-weight: 700; }
#mc-explorador h3 { font-size: 18px; margin: 6px 0 2px; font-weight: 700; color: ${P.accion}; }
#mc-explorador .titulo-medidor { color: ${P.secundario}; margin: 2px 0; }
/* Chips (keywords) */
#mc-explorador .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0; }
#mc-explorador .chip { display: inline-block; border: 1px solid ${P.borde}; border-radius: 999px; padding: 1px 10px; color: ${P.texto}; }
#mc-explorador .chip.bien { border-color: ${P.bien}; color: ${P.bien}; }
#mc-explorador .chip.riesgo { border-color: ${P.riesgo}; color: ${P.riesgo}; }
#mc-explorador .chip.dato { border-color: ${P.dato}; color: ${P.dato}; }
#mc-explorador .chip.accion { border-color: ${P.accion}; color: ${P.accion}; }
#mc-explorador .chip.neutro { color: ${P.secundario}; }
/* Barras de similitud (número siempre escrito) */
#mc-explorador .barra { display: flex; align-items: center; gap: 8px; margin: 2px 0; }
#mc-explorador .barra .pista { flex: 1 1 auto; height: 10px; border-radius: 5px; background: ${P.borde}; overflow: hidden; min-width: 40px; }
#mc-explorador .barra .relleno { display: block; height: 100%; background: ${P.dato}; }
#mc-explorador .barra .cifra { flex: 0 0 auto; color: ${P.texto}; min-width: 3.2em; text-align: right; }
#mc-explorador .barra.grande .pista { height: 18px; border-radius: 9px; }
#mc-explorador .barra.grande .cifra { font-size: 32px; font-weight: 700; color: ${P.accion}; min-width: 3.6em; }
#mc-explorador .barra.vacia .pista { display: none; }
#mc-explorador .barra.vacia .cifra { color: ${P.secundario}; text-align: left; }
/* "Ver más" */
#mc-explorador details { margin: 4px 0; }
#mc-explorador summary { cursor: pointer; color: ${P.accion}; min-height: 32px; display: list-item; }
#mc-explorador details[open] { border-left: 2px solid ${P.borde}; padding-left: 10px; }
#mc-explorador details li { margin: 2px 0; }
/* Modo sin API: catálogo precalculado + clima de NASA POWER */
#mc-explorador .modo { border: 2px solid ${P.accion}; background: #2a2410; padding: 6px 14px; border-radius: 6px; margin: 8px auto; }
#mc-explorador .modo p { margin: 4px 0 0; }
#mc-explorador .fuera { border: 1px solid ${P.borde}; background: ${P.panel}; padding: 6px 12px; border-radius: 8px; }
#mc-explorador .fuera p { margin: 4px 0; }
#mc-explorador .cercanos { list-style: none; padding: 0; margin: 6px 0 0; display: flex; flex-direction: column; gap: 6px; }
#mc-explorador .cercanos button { text-align: left; width: 100%; }
#mc-explorador a.boton { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 14px; border-radius: 6px;
  color: ${P.accion}; border: 2px solid ${P.accion}; text-decoration: none; }
@media (prefers-reduced-motion: reduce) { #mc-explorador * { transition: none !important; animation: none !important; } }
@media (max-width: 720px) { #mc-explorador .dos-col, #mc-explorador .dos-col.mitades { grid-template-columns: minmax(0, 1fr); }
  #mc-explorador .propuesta.compacta .fila { flex-wrap: wrap; } }
@media (max-width: 560px) { #mc-explorador input, #mc-explorador select { min-width: 0; width: 100%; }
  #mc-explorador label { flex: 1 1 100%; }
  #mc-explorador .par { flex: 1 1 100%; }
  #mc-explorador .par label { flex: 1 1 auto; }
  #mc-explorador .par select { width: auto; flex: 0 0 auto; } }
`;
