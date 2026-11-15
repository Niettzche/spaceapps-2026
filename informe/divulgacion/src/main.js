import '@fontsource-variable/inter/index.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './estilos.css';
import { EN, DIN } from './textos.js';
import { histograma, perfil, barrasTermicas } from './graficas.js';
import { montarInfografia } from './infografia.js';
import { pixelarCifras } from './pixelnum.js';
import { montarCielo } from './cielo.js';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const raiz = document.documentElement;
const inicio = document.getElementById('inicio');
raiz.classList.add('js');

/* ── Idioma ───────────────────────────────────────────────────────────── */
const ES = new Map();
document.querySelectorAll('[data-t]').forEach((n) => ES.set(n, n.innerHTML));
const ES_ALT = new Map();
document.querySelectorAll('[data-t-alt]').forEach((n) => ES_ALT.set(n, n.getAttribute('alt')));
const ES_SRC = new Map();
document.querySelectorAll('[data-src-en]').forEach((n) => ES_SRC.set(n, n.getAttribute('src')));
const ES_ARIA = new Map();
document.querySelectorAll('[data-t-aria]').forEach((n) => ES_ARIA.set(n, n.getAttribute('aria-label')));
const tituloES = document.title, descES = document.querySelector('meta[name="description"]').content;
let idioma = raiz.lang === 'en' ? 'en' : 'es';
const avisosIdioma = [];

function aplicarIdioma(lang) {
  idioma = lang;
  raiz.lang = lang;
  for (const [n, es] of ES) n.innerHTML = lang === 'en' ? (EN[n.dataset.t] ?? es) : es;
  for (const [n, es] of ES_ARIA) n.setAttribute('aria-label', lang === 'en' ? (EN[n.dataset.tAria] ?? es) : es);
  for (const [n, es] of ES_ALT) n.setAttribute('alt', lang === 'en' ? (EN[n.dataset.tAlt] ?? es) : es);
  for (const [n, es] of ES_SRC) n.setAttribute('src', lang === 'en' ? n.dataset.srcEn : es);
  document.title = lang === 'en' ? 'Marsception · Train on Earth, land on the Moon or Mars' : tituloES;
  document.querySelector('meta[name="description"]').content = lang === 'en'
    ? 'A browser game to test a rover in real places on Earth that resemble the Moon and Mars, chosen with NASA open data. And the science behind it, explained in 3D.' : descES;
  const url = new URL(location.href);
  if (lang === 'en') url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
  history.replaceState(null, '', url);
  avisosIdioma.forEach((f) => f());
}

/* ── Estrellas de fondo (como la landing): se dibujan una vez por tamaño de ventana ── */
function estrellas() {
  const c = document.getElementById('estrellas');
  if (!c) return;
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  const w = innerWidth, h = innerHeight;
  c.width = Math.round(w * pr); c.height = Math.round(h * pr);
  const g = c.getContext('2d');
  g.scale(pr, pr);
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const n = Math.round((w * h) / 4200);
  for (let i = 0; i < n; i++) {
    const x = azar() * w, y = azar() * h, r = azar() < 0.92 ? 0.5 + azar() * 0.5 : 1 + azar() * 0.6;
    const a = 0.18 + azar() * 0.6, tono = azar();
    g.fillStyle = tono < 0.08 ? `rgba(207,196,255,${a})` : tono < 0.14 ? `rgba(255,200,160,${a})` : `rgba(244,239,233,${a})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
}
estrellas();
let esperaEstrellas;
addEventListener('resize', () => { clearTimeout(esperaEstrellas); esperaEstrellas = setTimeout(estrellas, 150); });

/* ── Tema ─────────────────────────────────────────────────────────────── */
const avisosTema = [];
const temaOscuro = () => raiz.dataset.theme ? raiz.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
function avisarTema() { requestAnimationFrame(() => avisosTema.forEach((f) => f())); }
document.getElementById('tema').addEventListener('click', () => {
  raiz.dataset.theme = temaOscuro() ? 'light' : 'dark';
  try { localStorage.setItem('mc-tema', raiz.dataset.theme); } catch (e) { /* sin almacenamiento */ }
  avisarTema();
});
matchMedia('(prefers-color-scheme: light)').addEventListener('change', avisarTema);

/* ── Controles segmentados con indicador que se desliza ─────────────── */
function segmento(grupo, alCambiar) {
  const botones = [...grupo.querySelectorAll('button')];
  const ind = grupo.querySelector('.segmento-indicador');
  const mover = (instante) => {
    const b = botones.find((x) => x.getAttribute('aria-pressed') === 'true');
    if (!b || !ind) return;
    if (instante) ind.style.transition = 'none';
    ind.style.width = `${b.offsetWidth}px`;
    ind.style.transform = `translateX(${b.offsetLeft}px)`;
    if (instante) { ind.offsetWidth; ind.style.transition = ''; }
  };
  botones.forEach((b) => b.addEventListener('click', () => {
    if (b.getAttribute('aria-pressed') === 'true') return;
    botones.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    mover(false);
    alCambiar?.(b.dataset.valor ?? b.dataset.lang);
  }));
  new ResizeObserver(() => mover(true)).observe(grupo);
  avisosIdioma.push(() => requestAnimationFrame(() => mover(true)));
  mover(true);
}

const idiomaGrupo = document.querySelector('.ajustes .segmento');
idiomaGrupo.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === idioma)));
segmento(idiomaGrupo, (lang) => aplicarIdioma(lang));
if (idioma === 'en') aplicarIdioma('en');

/* ── Aparición al hacer scroll, índice y barra ───────────────────────── */
const revelar = new IntersectionObserver((entradas) => {
  for (const en of entradas) if (en.isIntersecting) { en.target.classList.add('visto'); revelar.unobserve(en.target); }
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.revela').forEach((n) => {
  const hermanos = [...n.parentElement.children].filter((h) => h.classList.contains('revela'));
  n.style.setProperty('--retraso', `${Math.min(hermanos.indexOf(n), 4) * 70}ms`);
  revelar.observe(n);
});

const enlaces = new Map([...document.querySelectorAll('.indice a')].map((a) => [a.getAttribute('href').slice(1), a]));
const seccionActual = new IntersectionObserver((entradas) => {
  for (const en of entradas) {
    if (!en.isIntersecting) continue;
    const actual = en.target.dataset.grupo || en.target.id;
    enlaces.forEach((a, id) => a.setAttribute('aria-current', String(id === actual)));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main > section').forEach((s) => seccionActual.observe(s));

const barra = document.getElementById('barra');
const marcarBarra = () => {
  const sobre = scrollY < inicio.offsetHeight - barra.offsetHeight - 8;
  barra.classList.toggle('sobre-inicio', sobre);
  barra.classList.toggle('con-borde', !sobre);
};
addEventListener('scroll', marcarBarra, { passive: true });
marcarBarra();

/* ── Portada: fondo en píxeles del juego, estrellas que titilan, paralaje y el rover ───────────── */
const reducido = matchMedia('(prefers-reduced-motion: reduce)');
const fondoInicio = inicio.querySelector('.inicio-fondo');
const lienzoEstrellas = inicio.querySelector('.inicio-estrellas');
const suelo = inicio.querySelector('.inicio-suelo');
let k = 4;

function escalarInicio() {
  // Píxeles de arte enteros (el juego usa ×3 sobre 960 × 540): el fondo cubre la portada y el logotipo crece por escalones.
  const w = inicio.clientWidth, h = inicio.clientHeight;
  k = Math.max(Math.ceil(w / 320), Math.ceil(h / 180), 2);
  inicio.style.setProperty('--k', String(k));
  inicio.style.setProperty('--s', String(w >= 1200 ? 4 : w >= 760 ? 3 : 2));
  armarSuelo();
}

// Estrellas propias, a 1 px de arte, en la misma rejilla que el fondo (320 × 180)
const ctxE = lienzoEstrellas.getContext('2d');
lienzoEstrellas.width = 320; lienzoEstrellas.height = 180;
let semillaE = 11;
const azarE = () => ((semillaE = (semillaE * 16807) % 2147483647) / 2147483647);
const estrellasInicio = Array.from({ length: 70 }, () => ({
  x: Math.floor(azarE() * 320), y: Math.floor(azarE() * 150), fase: azarE() * Math.PI * 2, vel: 0.6 + azarE() * 1.8,
  color: azarE() < 0.25 ? [207, 196, 255] : azarE() < 0.4 ? [185, 166, 255] : [255, 255, 255], cruz: azarE() < 0.12,
}));
let fugaz = null, proximaFugaz = 2.5;
function pintarEstrellas(t, dt) {
  ctxE.clearRect(0, 0, 320, 180);
  for (const e of estrellasInicio) {
    const b = 0.5 + 0.5 * Math.sin(t * e.vel + e.fase);
    const nivel = Math.round(b * 3) / 3;            // brillo en escalones, como el tramado del juego
    if (nivel === 0) continue;
    ctxE.fillStyle = `rgba(${e.color[0]},${e.color[1]},${e.color[2]},${0.25 + 0.75 * nivel})`;
    ctxE.fillRect(e.x, e.y, 1, 1);
    if (e.cruz && nivel === 1) {
      ctxE.fillStyle = `rgba(${e.color[0]},${e.color[1]},${e.color[2]},0.45)`;
      ctxE.fillRect(e.x - 1, e.y, 1, 1); ctxE.fillRect(e.x + 1, e.y, 1, 1); ctxE.fillRect(e.x, e.y - 1, 1, 1); ctxE.fillRect(e.x, e.y + 1, 1, 1);
    }
  }
  proximaFugaz -= dt;
  if (!fugaz && proximaFugaz <= 0) {
    fugaz = { x: 180 + azarE() * 140, y: 4 + azarE() * 40, v: 150 + azarE() * 60, vida: 0 };
    proximaFugaz = 5 + azarE() * 6;
  }
  if (fugaz) {
    fugaz.vida += dt;
    const d = fugaz.v * fugaz.vida;
    const hx = Math.round(fugaz.x - d), hy = Math.round(fugaz.y + d * 0.45);
    for (let i = 0; i < 9; i++) {
      ctxE.fillStyle = `rgba(255,240,220,${Math.max(0, 0.95 - i * 0.11)})`;
      ctxE.fillRect(hx + i * 2, hy - Math.round(i * 0.9), 1, 1);
    }
    if (hx < -20 || hy > 140) fugaz = null;
  }
}

// Paralaje: el fondo sigue al puntero con un muelle y se mueve en píxeles de arte enteros (sin emborronar el arte)
const paralaje = { x: 0, y: 0, vx: 0, vy: 0, mx: 0, my: 0 };
inicio.addEventListener('pointermove', (ev) => {
  if (ev.pointerType !== 'mouse') return;
  const r = inicio.getBoundingClientRect();
  paralaje.mx = ((ev.clientX - r.left) / r.width - 0.5) * -6;   // hasta 3 px de arte a cada lado
  paralaje.my = ((ev.clientY - r.top) / r.height - 0.5) * -4;
});
inicio.addEventListener('pointerleave', () => { paralaje.mx = 0; paralaje.my = 0; });

// El suelo avanza con WAAPI para poder acelerarlo con suavidad (al pasar sobre «Jugar ahora» el rover acelera)
let animSuelo = null;
const velocidad = { valor: 1, meta: 1, vel: 0 };
function armarSuelo() {
  animSuelo?.cancel();
  if (reducido.matches) return;
  const paso = 16 * k;                              // un tile de 16 px de arte
  animSuelo = suelo.animate(
    [{ backgroundPosition: '0px 0px' }, { backgroundPosition: `${-paso * 4}px 0px` }],
    { duration: 1800, iterations: Infinity, easing: `steps(${16 * 4})` },
  );
  animSuelo.playbackRate = velocidad.valor;
}
const jugar = inicio.querySelector('.boton-jugar');
jugar.addEventListener('pointerenter', () => { velocidad.meta = 2.4; });
jugar.addEventListener('pointerleave', () => { velocidad.meta = 1; });
jugar.addEventListener('focus', () => { velocidad.meta = 2.4; });
jugar.addEventListener('blur', () => { velocidad.meta = 1; });

let inicioEnPantalla = true, ultimoInicio = performance.now(), acumulado = 0;
function cicloInicio(ahora) {
  const dt = Math.min((ahora - ultimoInicio) / 1000, 0.1);
  ultimoInicio = ahora;
  if (inicioEnPantalla && !document.hidden) {
    // muelle críticamente amortiguado (sin rebote) para el paralaje y la velocidad del suelo
    const w = 2 * Math.PI / 0.6;
    for (const [p, v, m] of [['x', 'vx', 'mx'], ['y', 'vy', 'my']]) {
      paralaje[v] += (-w * w * (paralaje[p] - paralaje[m]) - 2 * w * paralaje[v]) * dt;
      paralaje[p] += paralaje[v] * dt;
    }
    inicio.style.setProperty('--px', `${Math.round(paralaje.x) * k}px`);
    inicio.style.setProperty('--py', `${Math.round(paralaje.y) * k}px`);
    const wv = 2 * Math.PI / 0.8;
    velocidad.vel += (-wv * wv * (velocidad.valor - velocidad.meta) - 2 * wv * velocidad.vel) * dt;
    velocidad.valor += velocidad.vel * dt;
    if (animSuelo) animSuelo.playbackRate = Math.max(0.1, velocidad.valor);
    acumulado += dt;
    if (acumulado >= 1 / 20) { pintarEstrellas(ahora / 1000, acumulado); acumulado = 0; }  // 20 cuadros por segundo, como un juego retro
  }
  requestAnimationFrame(cicloInicio);
}

new IntersectionObserver(([en]) => {
  inicioEnPantalla = en.isIntersecting;
  if (animSuelo) inicioEnPantalla ? animSuelo.play() : animSuelo.pause();
}).observe(inicio);
new ResizeObserver(escalarInicio).observe(inicio);
escalarInicio();
if (reducido.matches) pintarEstrellas(0, 0);
else requestAnimationFrame(cicloInicio);

/* ── Escenas de cine: la toma activa es la tarjeta que cruza el centro de la pantalla ───────────── */
const apis = new Map();          // sección .cine → { paso, progreso }
const pasoActivo = new Map();    // sección .cine → índice de la toma
const beatsVisibles = new Set();
const observarBeats = new IntersectionObserver((entradas) => {
  for (const en of entradas) {
    const beat = en.target, cine = beat.closest('.cine');
    if (en.isIntersecting) {
      beatsVisibles.add(beat);
      const i = Number(beat.dataset.paso);
      cine.querySelectorAll('.beat').forEach((b) => b.classList.toggle('activo', b === beat));
      cine.querySelectorAll('.cine-avance li').forEach((li, k) => li.classList.toggle('activo', k === i));
      if (pasoActivo.get(cine) !== i) { pasoActivo.set(cine, i); apis.get(cine)?.paso?.(i); }
    } else beatsVisibles.delete(beat);
  }
}, { rootMargin: '-48% 0px -48% 0px' });
document.querySelectorAll('.cine .beat').forEach((b) => observarBeats.observe(b));
document.querySelectorAll('.cine').forEach((cine) => {
  const n = cine.querySelectorAll('.beat').length;
  const lienzo = cine.querySelector('.cine-lienzo');
  if (n < 2 || !lienzo) return;
  const ol = document.createElement('ol');
  ol.className = 'cine-avance'; ol.setAttribute('aria-hidden', 'true');
  ol.innerHTML = '<li></li>'.repeat(n);
  lienzo.appendChild(ol);
});

// Progreso dentro de la toma (0 cuando la tarjeta entra al centro, 1 cuando sale): lo usan las tomas que avanzan con el scroll
let progresoPendiente = false;
function medirProgreso() {
  progresoPendiente = false;
  const centro = innerHeight / 2;
  for (const beat of beatsVisibles) {
    const r = beat.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (centro - r.top) / r.height));
    apis.get(beat.closest('.cine'))?.progreso?.(Number(beat.dataset.paso), p);
  }
}
addEventListener('scroll', () => { if (!progresoPendiente) { progresoPendiente = true; requestAnimationFrame(medirProgreso); } }, { passive: true });

/* ── Contactar a ventas: arma un correo con el tipo de licencia ───────── */
let tipoVentas = 'general';
document.querySelectorAll('.contactar-ventas').forEach((b) => b.addEventListener('click', () => {
  tipoVentas = b.dataset.tipo || 'general';
  const caja = document.getElementById('contacto-ventas');
  caja.classList.remove('resalta'); void caja.offsetWidth; caja.classList.add('resalta');
}));
const botonVentas = document.getElementById('boton-ventas');
botonVentas.addEventListener('click', (ev) => {
  const correo = botonVentas.dataset.correo;                  // se configura en index.html (data-correo)
  if (!correo) { ev.preventDefault(); console.warn('[ventas] falta configurar el correo de ventas (data-correo en #boton-ventas)'); return; }
  const tipos = { educacion: 'Educación', investigacion: 'Investigación', anuncios: 'Anuncios y patrocinio', general: 'General' };
  const asunto = `Marsception for Business · ${tipos[tipoVentas]}`;
  const cuerpo = idioma === 'en'
    ? 'Hi, I would like to know more about Marsception for Business.\n\nName:\nInstitution:\nWhat we need:\n'
    : 'Hola, me interesa saber más de Marsception for Business.\n\nNombre:\nInstitución:\nQué necesitamos:\n';
  botonVentas.href = `mailto:${correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
});

/* ── Las cifras gigantes (dígitos de píxel) cuentan desde cero al aparecer, por escalones como en el juego ── */
const repintar = pixelarCifras();
const contar = new IntersectionObserver((entradas) => {
  for (const en of entradas) {
    if (!en.isIntersecting) continue;
    contar.unobserve(en.target);
    const el = en.target, hasta = Number(el.dataset.hasta), dec = Number(el.dataset.dec || 0);
    const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { repintar(el, fmt(hasta)); continue; }
    const i = [...document.querySelectorAll('.kn-valor')].indexOf(el);
    const inicio = performance.now() + (i % 4) * 90, dur = 1300;
    repintar(el, fmt(0));
    let ultimoTexto = '';
    const paso = (ahora) => {
      const k = Math.min(1, Math.max(0, (ahora - inicio) / dur));
      const texto = fmt(hasta * (1 - (1 - k) ** 4));
      if (texto !== ultimoTexto) { ultimoTexto = texto; repintar(el, texto); }
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
}, { threshold: 0.6 });
document.querySelectorAll('.kn-valor').forEach((n) => contar.observe(n));

/* ── Datos y escenas ─────────────────────────────────────────────────── */
const ctx = {
  din: () => DIN[idioma],
  alCambiarIdioma: (f) => avisosIdioma.push(f),
  alCambiarTema: (f) => avisosTema.push(f),
  segmento,
};
ctx.histograma = (cont, nube) => histograma(cont, nube, ctx);
ctx.perfil = (cont, datos) => perfil(cont, datos, ctx);

document.getElementById('imprimir-cartel')?.addEventListener('click', () => window.print());

/* ── Scroll suave con inercia (Lenis); los enlaces internos viajan suave a cada sección ── */
const pantallaCompleta = new Set(['inicio', 'ciencia', 'aportes']);   // secciones que ocupan toda la pantalla
let lenis = null;
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 });
  const rafLenis = (t) => { lenis.raf(t); requestAnimationFrame(rafLenis); };
  requestAnimationFrame(rafLenis);
}
document.addEventListener('click', (ev) => {
  const a = ev.target.closest?.('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const destino = id ? document.getElementById(id) : null;
  if (!destino) return;
  ev.preventDefault();
  const offset = id === 'inicio' || (pantallaCompleta.has(id) && modoPantalla.matches) ? 0 : -72;
  if (lenis) lenis.scrollTo(destino, { offset, duration: 1.4 });
  else destino.scrollIntoView({ block: 'start' });
  history.replaceState(null, '', `#${id}`);
});

/* ── El cartel cabe en una pantalla: si no cabe, achica las ilustraciones; si aun así no cabe, se lee bajando ── */
const museo = document.getElementById('museo');
const modoPantalla = matchMedia('(min-width: 900px) and (min-height: 640px)');
function encajarMuseo() {
  if (!museo) return;
  museo.classList.remove('sin-encaje');
  museo.style.setProperty('--encaje', '1');
  if (!modoPantalla.matches) return;
  const sobra = () => {
    const limite = museo.getBoundingClientRect().bottom - parseFloat(getComputedStyle(museo).paddingBottom);
    let fondo = 0;
    for (const n of museo.querySelectorAll('.museo-pie, .museo-limites, .museo-pasos')) fondo = Math.max(fondo, n.getBoundingClientRect().bottom);
    for (const n of museo.querySelectorAll('.museo-paso > p:last-child, .museo-limites li')) fondo = Math.max(fondo, n.getBoundingClientRect().bottom);
    return fondo - limite;
  };
  let e = 1;
  while (sobra() > 0 && e > 0.56) { e -= 0.04; museo.style.setProperty('--encaje', e.toFixed(2)); }
  if (sobra() > 0) museo.classList.add('sin-encaje');
}
const aportes = document.querySelector('.museo-aportes');
if (aportes) montarCielo(aportes, { bajar: 0.22 });
function encajarAportes() {
  if (!aportes) return;
  aportes.classList.remove('sin-encaje');
  if (!modoPantalla.matches) return;
  const lista = aportes.querySelector('.aportes-nota').getBoundingClientRect().bottom;
  if (lista > aportes.getBoundingClientRect().bottom) aportes.classList.add('sin-encaje');
}
new ResizeObserver(() => requestAnimationFrame(encajarAportes)).observe(document.documentElement);
avisosIdioma.push(() => requestAnimationFrame(encajarAportes));
if (museo) {
  new ResizeObserver(() => requestAnimationFrame(encajarMuseo)).observe(document.documentElement);
  document.fonts?.ready.then(encajarMuseo);
  avisosIdioma.push(() => requestAnimationFrame(encajarMuseo));
}

// Detalles técnicos: se llenan con los datos, sin escenas 3D
function llenarDetalles({ nube, relieves, perfiles }) {
  const s = relieves.sitios.MX0008;
  const fichas = document.getElementById('regla-fichas');
  const ecuacion = document.getElementById('plano-ecuacion');
  const { w, b } = nube.plano;
  const textos = () => {
    const D = ctx.din();
    if (fichas) fichas.innerHTML = `
      <p data-cuerpo="tierra"><b>${D.tierra}</b>${D.fichaTierra(s)}</p>
      <p data-cuerpo="luna"><b>${D.luna}</b>${D.fichaLuna(s.luna.gemelo)}</p>
      <p data-cuerpo="marte"><b>${D.marte}</b>${D.fichaMarte(s.marte)}</p>`;
    if (ecuacion) ecuacion.innerHTML = `${D.ecuacion(w, b)}<small>${D.ecuacionNota(-b / w[1])}</small>`;
  };
  avisosIdioma.push(textos);
  textos();
  const histo = document.getElementById('dd-histo');
  if (histo) histograma(histo, nube, ctx);      // sin marcador: aquí no hay cráter de ilustración
  const perf = document.getElementById('borde-perfil');
  if (perf) perfil(perf, perfiles, ctx);
}

const base = import.meta.env.BASE_URL;
const cargar = (n) => fetch(`${base}datos/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); });

Promise.all([cargar('nube'), cargar('relieves'), cargar('perfiles')]).then(([nube, relieves, perfiles]) => {
  const datos = { nube, relieves, perfiles };
  barrasTermicas(document.getElementById('term-barras'), ctx);
  const museo = document.getElementById('museo');
  if (museo) montarInfografia(museo, datos);
  llenarDetalles(datos);
  // Escenas 3D: three.js solo se descarga si la página tiene alguna
  if (!document.querySelector('[data-escena]')) return;
  const escenasListas = import('./escenas.js');
  const montar = new IntersectionObserver(async (entradas) => {
    const escenas = await escenasListas;
    for (const en of entradas) {
      if (!en.isIntersecting) continue;
      montar.unobserve(en.target);
      const nombre = en.target.dataset.escena;
      try {
        const api = escenas[nombre](en.target, datos, ctx) || {};
        const cine = en.target.closest('.cine');
        if (cine) { apis.set(cine, api); if (pasoActivo.has(cine)) api.paso?.(pasoActivo.get(cine)); }
      } catch (err) { console.error(`[divulgacion] escena ${nombre}:`, err); en.target.classList.add('sin-3d'); }
    }
  }, { rootMargin: '600px 0px' });
  document.querySelectorAll('[data-escena]').forEach((n) => montar.observe(n));
}).catch((err) => {
  console.error('[divulgacion] no se pudieron cargar los datos', err);
  document.querySelectorAll('[data-escena]').forEach((n) => n.classList.add('sin-3d'));
});
