// Dueño: frente expediente. Capa HTML sobre el lienzo para formularios (Explorador).
// Se usa HTML en vez de texto de Phaser para tener campos reales, accesibles con teclado, toque y lector de pantalla.
// No requiere `dom: { createContainer: true }` en main.js (archivo del integrador).
import { tr } from '../../i18n.js';

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
#mc-explorador { position: fixed; inset: 0; overflow: auto; padding: 16px; box-sizing: border-box;
  background: rgba(11, 13, 23, 0.94); color: #fff; font: 16px/1.45 ui-monospace, Menlo, Consolas, monospace; z-index: 10; }
#mc-explorador *, #mc-explorador *::before, #mc-explorador *::after { box-sizing: border-box; }
#mc-explorador > * { max-width: 928px; margin-left: auto; margin-right: auto; }
#mc-explorador [hidden] { display: none !important; }
#mc-explorador header { display: flex; justify-content: space-between; align-items: center; gap: 8px 12px; flex-wrap: wrap; }
#mc-explorador header .barra-consulta { flex: 1 1 380px; margin-top: 0; }
#mc-explorador h1 { font-size: 24px; margin: 0; font-weight: 600; }
#mc-explorador .ayuda { color: #9aa4c7; font-size: 15px; margin-top: 6px; margin-bottom: 6px; }
#mc-explorador .fila { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin: 8px 0; }
#mc-explorador label { display: flex; flex-direction: column; gap: 4px; color: #9aa4c7; font-size: 15px; }
/* 16 px en campos y listas: con menos, iOS hace zoom automático al escribir. */
#mc-explorador input, #mc-explorador select { font: inherit; font-size: 16px; color: #fff; background: #141831;
  border: 1px solid #2a3160; padding: 8px 10px; border-radius: 4px; min-width: 140px; min-height: 44px; }
#mc-explorador .par { display: flex; gap: 6px; align-items: flex-end; }
#mc-explorador .par select { min-width: 0; }
#mc-explorador button { font: inherit; cursor: pointer; border-radius: 4px; padding: 8px 14px; min-height: 44px; }
#mc-explorador button.primario { background: #ffd166; color: #0b0d17; border: 0; font-weight: 600; }
#mc-explorador button.primario:disabled { background: #6c7393; cursor: progress; }
#mc-explorador button.secundario { background: transparent; color: #ffd166; border: 1px solid #ffd166; }
#mc-explorador :focus-visible { outline: 3px solid #06d6a0; outline-offset: 2px; }
#mc-explorador .error { color: #ef476f; min-height: 1.2em; margin: 4px 0; }
#mc-explorador .estado { color: #ffd166; min-height: 1.2em; }
#mc-explorador p.estado:empty { display: none; }
#mc-explorador .aviso { border: 1px solid #ef476f; background: #2a0f18; padding: 10px 14px; border-radius: 4px; }
#mc-explorador .aviso p { margin: 6px 0 0; }
#mc-explorador .aviso button { margin-top: 12px; }
#mc-explorador .ok { border: 1px solid #06d6a0; background: #0d2a22; padding: 10px 14px; border-radius: 4px; }
#mc-explorador .total { display: flex; align-items: baseline; gap: 4px 10px; flex-wrap: wrap; margin-top: 4px; }
#mc-explorador .grande { font-size: 30px; color: #ffd166; font-weight: 600; }
#mc-explorador table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 15px; }
#mc-explorador th, #mc-explorador td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a3160; vertical-align: top; }
#mc-explorador thead th { color: #9aa4c7; font-weight: 400; }
#mc-explorador td small { display: block; color: #8a91b4; font-size: 15px; }
#mc-explorador td.num { text-align: right; white-space: nowrap; }
#mc-explorador .nota { color: #9aa4c7; font-size: 15px; margin: 4px 0; }
#mc-explorador .propuesta { border-top: 1px solid #2a3160; margin-top: 12px; padding-top: 8px; }
#mc-explorador .propuesta button:disabled { cursor: not-allowed; }
/* Resultado sin desplazarse: barra del punto consultado (formulario colapsado) y ficha en dos columnas. */
#mc-explorador .barra-consulta { display: flex; align-items: center; justify-content: space-between; gap: 6px 12px;
  border: 1px solid #2a3160; background: #141831; padding: 2px 4px 2px 12px; border-radius: 4px; margin-top: 6px; }
#mc-explorador .barra-consulta > span { flex: 1 1 auto; min-width: 0; }
#mc-explorador .barra-consulta > button { flex: 0 0 auto; }
#mc-explorador .dos-col { display: grid; grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.35fr); gap: 0 18px; align-items: start; }
#mc-explorador .dos-col > div > :first-child { margin-top: 4px; }
#mc-explorador .dos-col p { margin: 4px 0; }
#mc-explorador table.compacta { margin: 4px 0; }
#mc-explorador table.compacta th, #mc-explorador table.compacta td { padding: 3px 6px; }
#mc-explorador table.compacta td small, #mc-explorador table.compacta th small { line-height: 1.25; }
#mc-explorador table.compacta th small.sim { display: block; color: #ffd166; font-weight: 400; font-size: 15px; }
#mc-explorador .dos-col.mitades { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
#mc-explorador .propuesta.compacta { margin-top: 6px; padding-top: 4px; }
#mc-explorador .propuesta.compacta .fila { flex-wrap: nowrap; align-items: center; margin: 4px 0; }
#mc-explorador .propuesta.compacta .nota { flex: 1 1 auto; }
#mc-explorador .propuesta.compacta .fila > button { flex: 0 0 auto; }
#mc-explorador .fuera { padding: 6px 12px; }
#mc-explorador .fuera p { margin: 4px 0; }
@media (max-width: 720px) { #mc-explorador .dos-col, #mc-explorador .dos-col.mitades { grid-template-columns: minmax(0, 1fr); }
  #mc-explorador .propuesta.compacta .fila { flex-wrap: wrap; } }
/* Modo sin API: catálogo precalculado + clima de NASA POWER */
#mc-explorador .modo { border: 1px solid #ffd166; background: #2a2410; padding: 8px 14px; border-radius: 4px; margin: 8px auto; }
#mc-explorador .modo p { margin: 4px 0 0; font-size: 15px; }
#mc-explorador .etiqueta { display: inline-block; color: #0b0d17; background: #9aa4c7; font-size: 15px; font-weight: 600;
  padding: 2px 10px; border-radius: 3px; margin: 6px 0 2px; }
#mc-explorador h2 { font-size: 22px; margin: 4px 0 2px; font-weight: 600; }
#mc-explorador h3 { font-size: 18px; margin: 14px 0 2px; font-weight: 600; color: #ffd166; }
#mc-explorador .fuera { border: 1px solid #2a3160; background: #141831; padding: 10px 14px; border-radius: 4px; }
#mc-explorador .fuera p { margin: 6px 0; }
#mc-explorador .cercanos { list-style: none; padding: 0; margin: 6px 0 0; display: flex; flex-direction: column; gap: 6px; }
#mc-explorador .cercanos button { text-align: left; width: 100%; }
#mc-explorador a.boton { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 14px; border-radius: 4px;
  color: #ffd166; border: 1px solid #ffd166; text-decoration: none; }
@media (max-width: 560px) { #mc-explorador input, #mc-explorador select { min-width: 0; width: 100%; }
  #mc-explorador label { flex: 1 1 100%; }
  #mc-explorador .par { flex: 1 1 100%; }
  #mc-explorador .par label { flex: 1 1 auto; }
  #mc-explorador .par select { width: auto; flex: 0 0 auto; } }
`;
