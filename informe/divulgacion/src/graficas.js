// Gráficas 2D en SVG: histograma de d/D, perfil radial del borde y barras de oscilación térmica.
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, padre) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  padre?.appendChild(n);
  return n;
};
const fmt = (x, d) => Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

// Barra con el extremo de datos redondeado (4 px) y anclada a la línea base.
function barra(x, y0, w, h, arriba) {
  const r = Math.min(4, Math.abs(h), w / 2);
  if (Math.abs(h) < 0.5) return '';
  if (arriba) {
    const y1 = y0 - h;
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  }
  const y1 = y0 + h;
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

function crearTooltip(cont) {
  const t = document.createElement('div');
  t.className = 'tooltip';
  t.hidden = true;
  t.setAttribute('role', 'status');
  cont.appendChild(t);
  return {
    mostrar(html, x, y) {
      t.innerHTML = html; t.hidden = false;
      const w = cont.clientWidth;
      t.style.left = `${Math.min(Math.max(x + 12, 0), w - t.offsetWidth - 4)}px`;
      t.style.top = `${Math.max(y - t.offsetHeight - 10, 0)}px`;
    },
    ocultar() { t.hidden = true; },
  };
}

/* ── Histograma espejo de d/D: Luna arriba, Marte abajo (en % de cada mundo) ── */
export function histograma(cont, nube, ctx) {
  const W = 760, H = 236, m = { l: 44, r: 16, t: 26, b: 34 };
  const x0 = 0, x1 = 0.3, paso = 0.01, nb = Math.round((x1 - x0) / paso);
  const cuenta = (lista) => {
    const c = new Array(nb).fill(0);
    for (const p of lista) { const k = Math.min(Math.floor((p[1] - x0) / paso), nb - 1); if (k >= 0) c[k] += 1; }
    return c.map((n) => ({ n, pct: (100 * n) / lista.length }));
  };
  const hl = cuenta(nube.luna), hm = cuenta(nube.marte);
  const maxPct = Math.max(...hl.map((b) => b.pct), ...hm.map((b) => b.pct));
  const tope = Math.ceil(maxPct / 10) * 10;
  const X = (v) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
  const medio = m.t + (H - m.t - m.b) / 2;
  const altoMedio = (H - m.t - m.b) / 2;
  const Y = (pct) => (pct / tope) * altoMedio;

  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, cont);
  const titulo = svg('title', {}, s);
  for (const p of [tope, tope / 2]) {
    for (const signo of [-1, 1]) svg('line', { class: 'svg-rejilla', x1: m.l, x2: W - m.r, y1: medio + signo * Y(p), y2: medio + signo * Y(p) }, s);
    svg('text', { class: 'svg-texto', x: m.l - 8, y: medio - Y(p) + 4, 'text-anchor': 'end' }, s).textContent = `${p}%`;
    svg('text', { class: 'svg-texto', x: m.l - 8, y: medio + Y(p) + 4, 'text-anchor': 'end' }, s).textContent = `${p}%`;
  }
  const bw = X(paso) - X(0);
  const gBarras = svg('g', {}, s);
  const dibujar = (datos, arriba, cuerpo) => datos.forEach((b, i) => {
    const d = barra(X(x0 + i * paso) + 1, medio + (arriba ? -1 : 1), bw - 2, Y(b.pct), arriba);
    if (d) svg('path', { d, class: 'svg-barra', fill: `var(--${cuerpo})` }, gBarras);
  });
  dibujar(hl, true, 'luna');
  dibujar(hm, false, 'marte');
  svg('line', { class: 'svg-eje', x1: m.l, x2: W - m.r, y1: medio, y2: medio }, s);
  for (let v = 0; v <= 0.3001; v += 0.05) svg('text', { class: 'svg-texto', x: X(v), y: H - 10, 'text-anchor': 'middle' }, s).textContent = fmt(v, 2);
  const ejeTxt = svg('text', { class: 'svg-texto', x: W - m.r, y: H - 10, 'text-anchor': 'end' }, s);

  // Medianas
  const med = nube.mediana_prof_diam;
  const etMed = {};
  for (const [cuerpo, arriba] of [['Luna', true], ['Marte', false]]) {
    const v = med[cuerpo], c = cuerpo === 'Luna' ? 'luna' : 'marte';
    svg('line', { class: 'svg-mediana', stroke: `var(--${c})`, x1: X(v), x2: X(v), y1: arriba ? m.t - 4 : medio, y2: arriba ? medio : H - m.b + 4 }, s);
    etMed[cuerpo] = svg('text', { class: 'svg-texto-2', x: X(v) + 6, y: arriba ? m.t + 6 : H - m.b - 2 }, s);
  }
  const rotL = svg('text', { class: 'svg-texto-2', x: W - m.r, y: m.t + 6, 'text-anchor': 'end' }, s);
  const rotM = svg('text', { class: 'svg-texto-2', x: W - m.r, y: H - m.b - 2, 'text-anchor': 'end' }, s);

  // Marcador del cráter de la ilustración
  const marcador = svg('line', { class: 'svg-marcador', y1: m.t - 10, y2: H - m.b + 6, visibility: 'hidden' }, s);
  const marcaTxt = svg('text', { class: 'svg-texto', y: m.t - 14, 'text-anchor': 'middle', fill: 'var(--tinta)', visibility: 'hidden' }, s);

  const textos = () => {
    const D = ctx.din();
    etMed.Luna.textContent = `${D.medianaLuna} ${fmt(med.Luna, 3)}`;
    etMed.Marte.textContent = `${D.medianaMarte} ${fmt(med.Marte, 3)}`;
    rotL.textContent = `${D.luna} · ${nube.luna.length.toLocaleString('en-US')}`;
    rotM.textContent = `${D.marte} · ${nube.marte.length.toLocaleString('en-US')}`;
    ejeTxt.textContent = '';
    titulo.textContent = `${D.luna} / ${D.marte}: d/D`;
  };
  ctx.alCambiarIdioma(textos);
  textos();

  // Lectura por barra
  const tip = crearTooltip(cont);
  const zona = svg('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, s);
  zona.addEventListener('pointermove', (ev) => {
    const r = s.getBoundingClientRect();
    const vx = ((ev.clientX - r.left) / r.width) * W, vy = ((ev.clientY - r.top) / r.height) * H;
    const i = Math.floor(((vx - m.l) / (W - m.l - m.r)) * nb);
    if (i < 0 || i >= nb) { tip.ocultar(); return; }
    const arriba = vy < medio, b = (arriba ? hl : hm)[i], D = ctx.din();
    tip.mostrar(D.histoBin(arriba ? D.luna : D.marte, x0 + i * paso, x0 + (i + 1) * paso, b.pct, b.n), ev.clientX - r.left, ev.clientY - r.top);
  });
  zona.addEventListener('pointerleave', () => tip.ocultar());

  return {
    marcar(dd) {
      marcador.removeAttribute('visibility'); marcaTxt.removeAttribute('visibility');
      const x = X(Math.min(Math.max(dd, x0), x1));
      marcador.setAttribute('x1', x); marcador.setAttribute('x2', x);
      marcaTxt.setAttribute('x', Math.min(Math.max(x, m.l + 16), W - m.r - 16));
      marcaTxt.textContent = fmt(dd, 3);
    },
  };
}

/* ── Perfil radial: dos paneles (completo y acercamiento a la ventana del borde) ── */
export function perfil(cont, datos, ctx) {
  const ids = ['MX0008', 'MX0155'];
  const estilos = { MX0008: { trazo: 'var(--tinta)', guion: '' }, MX0155: { trazo: 'var(--tinta-3)', guion: '5 4' } };
  const nombres = { MX0008: 'El Elegante', MX0155: 'Peñasquito' };
  const r = datos.r, [va, vb] = datos.ventana;
  const rejilla = document.createElement('div');
  rejilla.style.cssText = 'display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))';
  cont.appendChild(rejilla);
  const tip = crearTooltip(cont);
  const paneles = [];

  const panel = ({ xr, yr, ticksY, decY, titulo }) => {
    const W = 440, H = 250, m = { l: 50, r: 84, t: 46, b: 36 };
    const X = (v) => m.l + ((v - xr[0]) / (xr[1] - xr[0])) * (W - m.l - m.r);
    const Y = (v) => m.t + ((yr[1] - v) / (yr[1] - yr[0])) * (H - m.t - m.b);
    const caja = document.createElement('div');
    caja.style.position = 'relative';
    rejilla.appendChild(caja);
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, caja);
    const cp = `cp${Math.random().toString(36).slice(2, 8)}`;
    svg('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }, svg('clipPath', { id: cp }, svg('defs', {}, s)));
    svg('rect', { class: 'svg-banda', x: X(Math.max(va, xr[0])), y: m.t, width: X(vb) - X(Math.max(va, xr[0])), height: H - m.t - m.b }, s);
    svg('rect', { x: X(vb), y: m.t, width: X(2) - X(vb), height: H - m.t - m.b, fill: 'var(--linea)' }, s);
    const etVentana = svg('text', { class: 'svg-texto', x: (X(Math.max(va, xr[0])) + X(vb)) / 2, y: m.t - 7, 'text-anchor': 'middle' }, s);
    const etLejos = svg('text', { class: 'svg-texto', x: (X(vb) + X(2)) / 2, y: m.t - 7, 'text-anchor': 'middle' }, s);
    for (const v of ticksY) {
      svg('line', { class: v === 0 ? 'svg-eje' : 'svg-rejilla', x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, s);
      svg('text', { class: 'svg-texto', x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }, s).textContent = v === 0 ? '0' : (v > 0 ? '+' : '−') + fmt(Math.abs(v), decY);
    }
    for (let v = Math.ceil(xr[0] * 2) / 2; v <= xr[1] + 1e-9; v += 0.5) svg('text', { class: 'svg-texto', x: X(v), y: H - 12, 'text-anchor': 'middle' }, s).textContent = fmt(v, 1);
    const etX = svg('text', { class: 'svg-texto', x: m.l, y: H - 0, 'text-anchor': 'start' }, s);
    const etTit = svg('text', { class: 'svg-texto-2', x: 0, y: 14 }, s);
    etTit.textContent = titulo;
    const g = svg('g', { 'clip-path': `url(#${cp})` }, s);
    const puntos = [], finales = [];
    for (const id of ids) {
      const p = datos.sitios[id].tierra;
      const d = p.map((v, i) => `${i ? 'L' : 'M'}${X(r[i])},${Y(v)}`).join('');
      svg('path', { d, class: 'svg-linea', stroke: estilos[id].trazo, 'stroke-dasharray': estilos[id].guion }, g);
      p.forEach((v, i) => {
        if (r[i] < xr[0] || r[i] > xr[1]) return;
        svg('circle', { cx: X(r[i]), cy: Y(v), r: 3.2, fill: estilos[id].trazo, stroke: 'var(--fondo)', 'stroke-width': 1.5 }, g);
        puntos.push({ id, x: X(r[i]), y: Y(v), r: r[i], v });
      });
      finales.push({ id, y: Math.min(Math.max(Y(p[p.length - 1]), m.t + 8), H - m.b - 4) });
    }
    // Rótulos directos al final de cada línea, sin encimarse
    finales.sort((a, b) => a.y - b.y);
    if (finales[1].y - finales[0].y < 15) { const c = (finales[0].y + finales[1].y) / 2; finales[0].y = c - 8; finales[1].y = c + 8; }
    for (const f of finales) svg('text', { class: 'svg-texto-2', x: W - m.r + 8, y: f.y + 4 }, s).textContent = nombres[f.id];
    const zona = svg('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, s);
    zona.addEventListener('pointermove', (ev) => {
      const b = s.getBoundingClientRect();
      const vx = ((ev.clientX - b.left) / b.width) * W, vy = ((ev.clientY - b.top) / b.height) * H;
      let mejor = null, dm = Infinity;
      for (const q of puntos) { const dd = Math.hypot(q.x - vx, q.y - vy); if (dd < dm) { dm = dd; mejor = q; } }
      if (!mejor || dm > 40) { tip.ocultar(); return; }
      const cb = cont.getBoundingClientRect();
      tip.mostrar(ctx.din().perfilTip(nombres[mejor.id], mejor.r, mejor.v), ev.clientX - cb.left, ev.clientY - cb.top);
    });
    zona.addEventListener('pointerleave', () => tip.ocultar());
    paneles.push({ etVentana, etLejos, etX });
    return { s, X, Y };
  };

  panel({ xr: [0, 2], yr: [-0.24, 0.03], ticksY: [-0.2, -0.1, 0], decY: 1, titulo: '' });
  const z = panel({ xr: [0.6, 2], yr: [-0.03, 0.016], ticksY: [-0.02, -0.01, 0, 0.01], decY: 2, titulo: '' });
  // Anota h/D (máximo en la ventana) en el acercamiento
  for (const id of ids) {
    const p = datos.sitios[id].tierra;
    let k = -1;
    r.forEach((ri, i) => { if (ri >= va && ri < vb && (k < 0 || p[i] > p[k])) k = i; });
    const h = datos.sitios[id].h_D;
    svg('text', { class: 'svg-texto', x: z.X(r[k]), y: z.Y(p[k]) + (h > 0 ? -10 : 18), 'text-anchor': 'middle', fill: 'var(--tinta)' }, z.s)
      .textContent = `h/D ${h > 0 ? '+' : '−'}${fmt(Math.abs(h), 4)}`;
  }

  const textos = () => {
    const D = ctx.din();
    paneles.forEach((p, i) => {
      p.etVentana.textContent = D.perfilVentana; p.etLejos.textContent = i === 0 ? '' : D.perfilLejano;
      p.etX.textContent = `${D.perfilX} · ${D.perfilY}`;
    });
    rejilla.children[0].querySelector('.svg-texto-2').textContent = D.perfilCompleto;
    rejilla.children[1].querySelector('.svg-texto-2').textContent = D.perfilZoom;
  };
  ctx.alCambiarIdioma(textos);
  textos();
}

/* ── Oscilación térmica diaria ─────────────────────────────────────────── */
export function barrasTermicas(cont, ctx) {
  const filas = [['pinacate', 'tierra', 14.5], ['jezero', 'marte', 55], ['polo', 'luna', 176]];
  const tope = 180, limite = 40;
  cont.innerHTML = filas.map(([k, c, v]) => `
    <div class="barra-fila" data-cuerpo="${c}">
      <span><span data-term="${k}"></span><b>${v} K</b></span>
      <div class="barra-pista barra-recorte"><div class="barra-valor" style="--v:${v / tope}"></div></div>
    </div>`).join('') + `
    <div class="barra-fila"><span class="nota" style="justify-content:flex-start"><span style="display:inline-block;width:${(limite / tope) * 100}%;border-right:1.5px dashed var(--tinta-3);height:0.9em;margin-right:0.5rem"></span><span data-term="tope"></span></span></div>`;
  const textos = () => {
    const D = ctx.din();
    cont.querySelectorAll('[data-term]').forEach((n) => { n.textContent = D.term[n.dataset.term]; });
  };
  ctx.alCambiarIdioma(textos);
  textos();
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { cont.classList.add('visto'); o.disconnect(); } }, { threshold: 0.4 }).observe(cont);
}
