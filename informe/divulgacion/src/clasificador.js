// «Pruébalo»: el modelo de forma (model/forma.py) corriendo en el navegador. Tres deslizadores (diámetro, profundidad y
// altura del borde) o un cráter real; responde con P(Luna), si cae dentro de la nube Luna+Marte, el parecido de forma que
// usa el juego y qué variable empuja la decisión. La gráfica pone el cráter sobre los 4,288 cráteres lunares y los 573
// marcianos, con la frontera del 50 %. Sin red: todo sale de nube.json (preparar_datos.py).
import { puntuarForma, fronteraProfDiam } from './modelo_forma.js';

const RANGO = { logD: [-0.2, 1], dd: [0, 0.3], br: [-0.15, 0.15] };
const el = (tag, attrs = {}, hijos = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'texto') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const h of [].concat(hijos)) if (h) n.append(h);
  return n;
};
const limitar = (v, [a, b]) => Math.min(b, Math.max(a, v));

export function montarClasificador(cont, nube, ctx) {
  const m = nube.modelo;
  const ejemplos = [
    ...nube.ejemplos.map((e) => ({ id: e.id, x: e.x })),
    { id: 'Luna', x: nube.medianas.Luna }, { id: 'Marte', x: nube.medianas.Marte },
  ];
  const estado = { x: [...ejemplos[0].x], ejemplo: ejemplos[0].id };
  const D = () => ctx.din().clasif;
  // Como el resto de la página: punto decimal y coma de miles en los dos idiomas.
  const num = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  cont.replaceChildren();
  // ---------- Panel: ejemplos, deslizadores y resultado ----------
  const chips = el('div', { class: 'clasif-ejemplos', role: 'group' });
  const botones = ejemplos.map((e) => {
    const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', 'data-ej': e.id });
    b.addEventListener('click', () => { estado.x = [...e.x]; estado.ejemplo = e.id; pintar(true); });
    chips.append(b);
    return b;
  });
  const tituloEj = el('p', { class: 'clasif-rotulo', id: 'clasif-ej' });
  chips.setAttribute('aria-labelledby', 'clasif-ej');

  const deslizadores = ['logD', 'dd', 'br'].map((k, i) => {
    const id = `clasif-${k}`;
    const etiqueta = el('label', { for: id });
    const valor = el('output', { for: id, class: 'clasif-valor' });
    const r = el('input', { type: 'range', id, min: RANGO[k][0], max: RANGO[k][1], step: k === 'logD' ? 0.005 : 0.001 });
    r.addEventListener('input', () => { estado.x[i] = Number(r.value); estado.ejemplo = null; pintar(false); });
    return { k, i, etiqueta, valor, r, fila: el('div', { class: 'clasif-desl' }, [el('div', { class: 'clasif-desl-cab' }, [etiqueta, valor]), r]) };
  });

  const pct = el('b', { class: 'clasif-pct' });
  const veredicto = el('p', { class: 'clasif-veredicto' });
  const barra = el('div', { class: 'clasif-barra', 'aria-hidden': 'true' }, [el('span', { class: 'clasif-barra-marca' })]);
  const extremos = el('p', { class: 'clasif-extremos', 'aria-hidden': 'true' }, [el('span'), el('span')]);
  const nubeTxt = el('p', { class: 'clasif-nube' });
  const parecido = el('p', { class: 'clasif-parecido' });
  const empujaT = el('p', { class: 'clasif-rotulo' });
  const aportes = el('ul', { class: 'clasif-aportes' });
  const notaEj = el('p', { class: 'nota clasif-nota-ej' });
  const resultado = el('div', { class: 'clasif-resultado', 'aria-live': 'polite' },
    [el('p', { class: 'clasif-rotulo clasif-p-titulo' }), pct, veredicto, barra, extremos, nubeTxt, parecido, empujaT, aportes, notaEj]);

  const panel = el('div', { class: 'clasif-panel' }, [tituloEj, chips, ...deslizadores.map((d) => d.fila), resultado]);

  // ---------- Gráfica ----------
  const lienzo = el('canvas', { role: 'img', class: 'clasif-lienzo' });
  const leyenda = el('ul', { class: 'clasif-leyenda' });
  const pie = el('p', { class: 'nota' });
  const figura = el('figure', { class: 'clasif-figura' }, [lienzo, leyenda, el('figcaption', {}, pie)]);
  const limite = el('p', { class: 'nota clasif-limite' });
  cont.append(panel, figura, limite);

  // ---------- Dibujo ----------
  const PAD = { izq: 62, der: 14, arr: 14, aba: 44 };
  let dims = { w: 0, h: 0 };
  const color = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const aX = (logD) => PAD.izq + ((logD - RANGO.logD[0]) / (RANGO.logD[1] - RANGO.logD[0])) * (dims.w - PAD.izq - PAD.der);
  const aY = (dd) => dims.h - PAD.aba - ((dd - RANGO.dd[0]) / (RANGO.dd[1] - RANGO.dd[0])) * (dims.h - PAD.arr - PAD.aba);
  const deX = (px) => RANGO.logD[0] + ((px - PAD.izq) / (dims.w - PAD.izq - PAD.der)) * (RANGO.logD[1] - RANGO.logD[0]);
  const deY = (py) => RANGO.dd[0] + ((dims.h - PAD.aba - py) / (dims.h - PAD.arr - PAD.aba)) * (RANGO.dd[1] - RANGO.dd[0]);

  function dibujar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = lienzo.clientWidth;
    if (!w) return;
    const h = Math.round(Math.min(Math.max(w * 0.72, 280), 460));
    if (dims.w !== w || dims.h !== h) {
      dims = { w, h };
      lienzo.style.height = `${h}px`;
      lienzo.width = Math.round(w * dpr); lienzo.height = Math.round(h * dpr);
    }
    const g = lienzo.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const tinta3 = color('--tinta-3'), linea = color('--linea'), cLuna = color('--luna'), cMarte = color('--marte');
    const fuente = `500 11px ${color('--mono') || 'monospace'}`;

    // Rejilla y ejes
    g.font = fuente; g.fillStyle = tinta3; g.strokeStyle = linea; g.lineWidth = 1;
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (const km of [0.7, 1, 2, 3, 5, 10]) {
      const x = aX(Math.log10(km));
      g.beginPath(); g.moveTo(x, PAD.arr); g.lineTo(x, h - PAD.aba); g.stroke();
      g.fillText(num(km, km < 1 ? 1 : 0), x, h - PAD.aba + 6);
    }
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (const dd of [0, 0.1, 0.2, 0.3]) {
      const y = aY(dd);
      g.beginPath(); g.moveTo(PAD.izq, y); g.lineTo(w - PAD.der, y); g.stroke();
      g.fillText(num(dd, 1), PAD.izq - 8, y);
    }
    g.textAlign = 'center'; g.textBaseline = 'bottom';
    g.fillText(D().ejeX, PAD.izq + (w - PAD.izq - PAD.der) / 2, h - 2);
    g.save(); g.translate(4, PAD.arr + (h - PAD.arr - PAD.aba) / 2); g.rotate(-Math.PI / 2);
    g.textBaseline = 'top'; g.fillText(D().ejeY, 0, 0); g.restore();

    // Cráteres medidos: Luna y Marte
    g.save();
    g.beginPath(); g.rect(PAD.izq, PAD.arr, w - PAD.izq - PAD.der, h - PAD.arr - PAD.aba); g.clip();
    const puntos = (lista, c, alfa, r) => {
      g.globalAlpha = alfa; g.fillStyle = c;
      for (const p of lista) { g.beginPath(); g.arc(aX(p[0]), aY(p[1]), r, 0, Math.PI * 2); g.fill(); }
    };
    puntos(nube.luna, cLuna, 0.28, 1.5);
    puntos(nube.marte, cMarte, 0.55, 1.8);
    g.globalAlpha = 1;

    // Frontera del 50 % para el borde elegido (es una recta en log D contra d/D)
    const [x0, x1] = RANGO.logD;
    g.setLineDash([6, 5]); g.strokeStyle = color('--tinta'); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(aX(x0), aY(fronteraProfDiam(m, x0, estado.x[2]))); g.lineTo(aX(x1), aY(fronteraProfDiam(m, x1, estado.x[2]))); g.stroke();
    g.setLineDash([]);
    g.font = `600 11px ${color('--mono') || 'monospace'}`; g.textAlign = 'right';
    // Las etiquetas van arriba y abajo de la línea en todo su ancho (la línea está inclinada).
    const yA = aY(fronteraProfDiam(m, x1 - 0.3, estado.x[2])), yB = aY(fronteraProfDiam(m, x1, estado.x[2]));
    g.fillStyle = cLuna; g.textBaseline = 'bottom'; g.fillText(D().masLuna, w - PAD.der - 4, Math.min(yA, yB) - 6);
    g.fillStyle = cMarte; g.textBaseline = 'top'; g.fillText(D().masMarte, w - PAD.der - 4, Math.max(yA, yB) + 6);

    // Tu cráter
    const px = aX(limitar(estado.x[0], RANGO.logD)), py = aY(limitar(estado.x[1], RANGO.dd));
    g.strokeStyle = color('--tinta'); g.lineWidth = 1; g.globalAlpha = 0.35;
    g.beginPath(); g.moveTo(px, PAD.arr); g.lineTo(px, h - PAD.aba); g.moveTo(PAD.izq, py); g.lineTo(w - PAD.der, py); g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = color('--tierra'); g.strokeStyle = color('--fondo'); g.lineWidth = 2.5;
    g.beginPath(); g.arc(px, py, 7, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = color('--tierra'); g.lineWidth = 1.5;
    g.beginPath(); g.arc(px, py, 12, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  // Tocar o arrastrar en la gráfica mueve el diámetro y la profundidad.
  let arrastrando = false;
  const mover = (ev) => {
    const r = lienzo.getBoundingClientRect();
    estado.x[0] = Number(limitar(deX(ev.clientX - r.left), RANGO.logD).toFixed(3));
    estado.x[1] = Number(limitar(deY(ev.clientY - r.top), RANGO.dd).toFixed(3));
    estado.ejemplo = null;
    pintar(false);
  };
  lienzo.addEventListener('pointerdown', (ev) => { arrastrando = true; lienzo.setPointerCapture(ev.pointerId); mover(ev); });
  lienzo.addEventListener('pointermove', (ev) => { if (arrastrando) mover(ev); });
  lienzo.addEventListener('pointerup', () => { arrastrando = false; });
  lienzo.addEventListener('pointercancel', () => { arrastrando = false; });

  // ---------- Textos y resultado ----------
  function textosFijos() {
    const T = D();
    tituloEj.textContent = T.ejemplos;
    botones.forEach((b, i) => {
      const [nombre, sub] = T.ej[ejemplos[i].id];
      b.replaceChildren(el('span', { texto: nombre }), el('span', { class: 'chip-n', texto: sub }));
    });
    deslizadores.forEach((d) => { d.etiqueta.textContent = T.vars[d.i]; });
    resultado.querySelector('.clasif-p-titulo').textContent = T.pTitulo;
    extremos.children[0].textContent = T.marte; extremos.children[1].textContent = T.luna;
    empujaT.textContent = T.empuja;
    leyenda.replaceChildren(...[['luna', T.leyLuna], ['marte', T.leyMarte], ['tierra', T.leyTu], ['frontera', T.leyFrontera]]
      .map(([c, t]) => el('li', { 'data-serie': c }, [el('i', { 'aria-hidden': 'true' }), el('span', { texto: t })])));
    pie.textContent = T.pie;
    limite.textContent = T.limite;
  }

  function pintar(moverDeslizadores) {
    const T = D();
    const [logD, dd, br] = estado.x;
    const diamKm = 10 ** logD;
    const r = puntuarForma(m, estado.x);
    deslizadores.forEach((d) => {
      if (moverDeslizadores || document.activeElement !== d.r) d.r.value = String(limitar(estado.x[d.i], RANGO[d.k]));
      const texto = d.k === 'logD' ? `${num(diamKm, diamKm < 10 ? 2 : 1)} km`
        : `${num(estado.x[d.i] * diamKm * 1000, 0)} m · ${T.razon} ${num(estado.x[d.i], 3)}`;
      d.valor.textContent = texto;
      d.r.setAttribute('aria-valuetext', texto);
    });
    botones.forEach((b, i) => b.setAttribute('aria-pressed', String(ejemplos[i].id === estado.ejemplo)));

    pct.textContent = `${num(r.pLuna * 100, 0)} %`;
    pct.dataset.lado = r.pLuna >= 0.6 ? 'luna' : r.pLuna <= 0.4 ? 'marte' : 'duda';
    veredicto.textContent = r.pLuna >= 0.6 ? T.vLuna : r.pLuna <= 0.4 ? T.vMarte : T.vDuda;
    barra.style.setProperty('--p', String(r.pLuna));
    nubeTxt.textContent = r.dentro ? T.dentro : T.fuera;
    nubeTxt.dataset.dentro = String(r.dentro);
    parecido.textContent = T.parecido(num(r.formaLuna, 2), num(r.formaMarte, 2));
    const maximo = Math.max(1, ...r.aportes.map(Math.abs));
    aportes.replaceChildren(...r.aportes.map((a, i) => el('li', { 'data-lado': a >= 0 ? 'luna' : 'marte' }, [
      el('span', { class: 'clasif-aporte-nombre', texto: T.aporteVar[i] }),
      el('span', { class: 'clasif-aporte-barra', style: `--a:${(Math.abs(a) / maximo / 2).toFixed(3)}`, 'aria-hidden': 'true' }),
      el('span', { class: 'clasif-aporte-valor', texto: `${a >= 0 ? '+' : '−'}${num(Math.abs(a), 1)} ${a >= 0 ? T.haciaLuna : T.haciaMarte}` }),
    ])));
    notaEj.textContent = estado.ejemplo ? T.notas[estado.ejemplo] : T.notaLibre;
    lienzo.setAttribute('aria-label', T.aria(num(r.pLuna * 100, 0), `${num(diamKm, 2)} km`, num(dd, 3), num(br, 3)));
    dibujar();
  }

  textosFijos();
  pintar(true);
  ctx.alCambiarIdioma(() => { textosFijos(); pintar(true); });
  ctx.alCambiarTema(() => dibujar());
  new ResizeObserver(() => dibujar()).observe(figura);
}
