// Dueño: frente expediente. Capa HTML sobre el lienzo para formularios (Explorador).
// Se usa HTML en vez de texto de Phaser para tener campos reales, accesibles con teclado, toque y lector de pantalla.
// No requiere `dom: { createContainer: true }` en main.js (archivo del integrador).

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
  const capa = el('div', { id, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Explorador libre' });
  document.body.append(capa);
  return capa;
}

export const ESTILOS = `
#mc-explorador { position: fixed; inset: 0; overflow: auto; padding: 16px; box-sizing: border-box;
  background: rgba(11, 13, 23, 0.94); color: #fff; font: 14px/1.45 ui-monospace, Menlo, Consolas, monospace; z-index: 10; }
#mc-explorador *, #mc-explorador *::before, #mc-explorador *::after { box-sizing: border-box; }
#mc-explorador > * { max-width: 880px; margin-left: auto; margin-right: auto; }
#mc-explorador header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
#mc-explorador h1 { font-size: 22px; margin: 4px 0; font-weight: 600; }
#mc-explorador .ayuda { color: #9aa4c7; font-size: 13px; }
#mc-explorador .fila { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin: 10px 0; }
#mc-explorador label { display: flex; flex-direction: column; gap: 4px; color: #9aa4c7; font-size: 12px; }
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
#mc-explorador .aviso { border: 1px solid #ef476f; background: #2a0f18; padding: 10px 14px; border-radius: 4px; }
#mc-explorador .aviso p { margin: 6px 0 0; }
#mc-explorador .ok { border: 1px solid #06d6a0; background: #0d2a22; padding: 10px 14px; border-radius: 4px; }
#mc-explorador .total { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
#mc-explorador .grande { font-size: 30px; color: #ffd166; font-weight: 600; }
#mc-explorador table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
#mc-explorador th, #mc-explorador td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #2a3160; vertical-align: top; }
#mc-explorador thead th { color: #9aa4c7; font-weight: 400; }
#mc-explorador td small { display: block; color: #6c7393; font-size: 11px; }
#mc-explorador td.num { text-align: right; white-space: nowrap; }
#mc-explorador .nota { color: #9aa4c7; font-size: 12px; margin: 4px 0; }
#mc-explorador .propuesta { border-top: 1px solid #2a3160; margin-top: 12px; padding-top: 8px; }
@media (max-width: 560px) { #mc-explorador input, #mc-explorador select { min-width: 0; width: 100%; }
  #mc-explorador label { flex: 1 1 100%; }
  #mc-explorador .par { flex: 1 1 100%; }
  #mc-explorador .par label { flex: 1 1 auto; }
  #mc-explorador .par select { width: auto; flex: 0 0 auto; } }
`;
