// La ciencia como película: un reloj recorre un guion de tomas. Cada toma dice qué escena 3D se ve (acto), en qué paso
// está (lo que la escena muestra y adónde va la cámara) y qué subtítulo aparece. Se puede pausar, adelantar, saltar de
// capítulo y ver a pantalla completa. Las escenas son las mismas de src/escenas.js, con datos reales.

// Guion: segundos de inicio y fin, escena, paso de la escena y subtítulo (índice en DIN.pelicula.subtitulos).
// `avanza`: la escena recibe el progreso de la toma (0–1), por ejemplo para rellenar el cráter poco a poco.
export const GUION = [
  { t0: 0, t1: 6, acto: 'regla', paso: 0, sub: 0, cap: 0 },
  { t0: 6, t1: 13, acto: 'regla', paso: 1, sub: 1, cap: 0 },
  { t0: 13, t1: 19, acto: 'regla', paso: 2, sub: 2, cap: 0 },
  { t0: 19, t1: 23.5, acto: 'resolucion', paso: 0, sub: 3, cap: 1 },
  { t0: 23.5, t1: 28, acto: 'resolucion', paso: 1, sub: 4, cap: 1 },
  { t0: 28, t1: 34, acto: 'profundidad', paso: 0, sub: 5, cap: 2 },
  { t0: 34, t1: 44, acto: 'profundidad', paso: 1, sub: 6, cap: 2, avanza: true },
  { t0: 44, t1: 50, acto: 'profundidad', paso: 2, sub: 7, cap: 2, dato: 'hondura' },
  { t0: 50, t1: 55, acto: 'plano', paso: 0, sub: 8, cap: 3 },
  { t0: 55, t1: 60, acto: 'plano', paso: 1, sub: 9, cap: 3 },
  { t0: 60, t1: 66, acto: 'plano', paso: 2, sub: 10, cap: 3, dato: 'acierto' },
  { t0: 66, t1: 71, acto: 'plano', paso: 3, sub: 11, cap: 3 },
  { t0: 71, t1: 76, acto: 'borde', paso: 0, sub: 12, cap: 4 },
  { t0: 76, t1: 83, acto: 'borde', paso: 1, sub: 13, cap: 4 },
  { t0: 83, t1: 90, acto: 'borde', paso: 1, sub: 16, cap: 4, dato: 'orden' },
  { t0: 90, t1: 97, acto: 'borde', paso: 1, sub: 17, cap: 4, dato: 'fuera' },
  { t0: 97, t1: 101, acto: 'caida', paso: 0, sub: 14, cap: 5 },
  { t0: 101, t1: 109, acto: 'caida', paso: 1, sub: 15, cap: 5 },
];
const TOTAL = GUION[GUION.length - 1].t1;
const INICIO_CAP = [0, 19, 28, 50, 71, 97];

// Datos que aparecen sobre la escena (cifras de model/VALIDATION.md; comprobadas por preparar_datos.py)
const ORDEN = { forma: { crater: 3, mina: 14 }, borde: { crater: 11, mina: 1 } };   // los 25 primeros de 296 candidatos áridos
const FUERA = [['Lonar', true], ['Wolfe Creek', true], ['Tenoumer', true], ['Pingualuit', true], ['Tswaing', true], ['Roter Kamm', true], ['Talemzane', true], ['Xiuyan', false]];
function cuadricula({ crater, mina }) {
  const celdas = [];
  for (let i = 0; i < 25; i++) celdas.push(`<i class="${i < crater ? 'c-crater' : i < crater + mina ? 'c-mina' : 'c-otro'}" style="--i:${i}"></i>`);
  return `<div class="pd-cuadricula">${celdas.join('')}</div>`;
}
function datoHTML(nombre, D) {
  const d = D.pelicula.datos;
  if (nombre === 'hondura') return `<div class="pd-par"><div><b>0.060</b><span>${D.luna}</span></div><div><b>0.027</b><span>${D.marte}</span></div></div><p>${d.hondura}</p>`;
  if (nombre === 'acierto') return `<b class="pd-grande">78 %</b><p>${d.acierto}</p>`;
  if (nombre === 'orden') return `<div class="pd-dos"><div><span class="pd-titulo">${d.porForma}</span>${cuadricula(ORDEN.forma)}<span class="pd-cuenta">${d.cuenta(ORDEN.forma)}</span></div><div><span class="pd-titulo">${d.porBorde}</span>${cuadricula(ORDEN.borde)}<span class="pd-cuenta">${d.cuenta(ORDEN.borde)}</span></div></div><p class="pd-leyenda"><i class="c-crater"></i>${d.crater} <i class="c-mina"></i>${d.mina} <i class="c-otro"></i>${d.otro}</p><p>${d.orden}</p>`;
  if (nombre === 'fuera') return `<b class="pd-grande">7 / 8</b><ul class="pd-lista">${FUERA.map(([n, ok], i) => `<li class="${ok ? 'si' : 'no'}" style="--i:${i}"><span>${ok ? '✓' : '✗'}</span>${n}</li>`).join('')}</ul><p>${d.fuera}</p>`;
  return '';
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function crearPelicula(raiz, ctx) {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)');
  const actos = new Map([...raiz.querySelectorAll('.pelicula-acto')].map((el) => [el.dataset.acto, el]));
  const apis = new Map();
  const subt = raiz.querySelector('.pelicula-subtitulo');
  const capChip = raiz.querySelector('.pelicula-capitulo');
  const portada = raiz.querySelector('.pelicula-portada');
  const final = raiz.querySelector('.pelicula-final');
  const botonPlay = raiz.querySelector('.pc-play');
  const rango = raiz.querySelector('.pc-tiempo-rango');
  const avance = raiz.querySelector('.pc-avance');
  const tiempo = raiz.querySelector('.pc-tiempo');
  const listaCap = raiz.parentElement.querySelector('.pelicula-capitulos');
  const datoEl = raiz.querySelector('.pelicula-dato');
  const cortinilla = raiz.querySelector('.pelicula-intertitulo');
  let cortinillaT = null;
  function mostrarCortinilla(cap) {
    const D = ctx.din();
    cortinilla.innerHTML = `<span class="pi-num">${cap + 1} / ${INICIO_CAP.length}</span><span class="pi-nombre">${D.pelicula.capitulos[cap]}</span>`;
    cortinilla.classList.remove('visible'); void cortinilla.offsetWidth;
    cortinilla.classList.add('visible');
    clearTimeout(cortinillaT);
    cortinillaT = setTimeout(() => cortinilla.classList.remove('visible'), 1900);
  }
  rango.max = String(TOTAL);
  raiz.querySelector('.pelicula-duracion').textContent = mmss(TOTAL);

  // Marcas de capítulo en la barra de tiempo y botones de capítulo debajo
  raiz.querySelector('.pc-marcas').innerHTML = INICIO_CAP.slice(1).map((t) => `<i style="left:${(t / TOTAL) * 100}%"></i>`).join('');
  listaCap.innerHTML = INICIO_CAP.map((t, i) => `<li><button type="button" data-cap="${i}"><span class="pc-num">${i + 1}</span><span class="pc-nombre"></span><span class="pc-t">${mmss(t)}</span></button></li>`).join('');
  listaCap.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { ir(INICIO_CAP[Number(b.dataset.cap)] + 0.01); reproducir(); raiz.focus({ preventScroll: true }); }));

  let t = 0, tocando = false, ultimo = 0, tomaActual = -1, actoActual = null, subActual = -1;

  function tomaEn(seg) {
    for (let i = 0; i < GUION.length; i++) if (seg < GUION[i].t1) return i;
    return GUION.length - 1;
  }

  function mostrarActo(nombre) {
    if (nombre === actoActual) return;
    const anterior = actoActual;
    actoActual = nombre;
    for (const [n, el] of actos) {
      el.classList.toggle('activo', n === nombre);
      if (el._escenario) el._escenario.activo = n === nombre || n === anterior;   // la saliente se dibuja durante el fundido
    }
    if (anterior && actos.get(anterior)?._escenario) {
      setTimeout(() => { if (actoActual !== anterior && actos.get(anterior)._escenario) actos.get(anterior)._escenario.activo = false; }, 900);
    }
  }

  function escribirSub(i) {
    const D = ctx.din();
    const texto = D.pelicula.subtitulos[i] ?? '';
    if (subt.dataset.i === String(i) && subt.textContent === texto) return;
    subt.dataset.i = String(i);
    subt.classList.remove('entra'); void subt.offsetWidth;
    subt.textContent = texto;
    subt.classList.add('entra');
  }

  function aplicar(forzar = false) {
    const i = tomaEn(t);
    const toma = GUION[i];
    if (i !== tomaActual || forzar) {
      const capAnterior = tomaActual >= 0 ? GUION[tomaActual].cap : -1;
      tomaActual = i;
      mostrarActo(toma.acto);
      if (toma.cap !== capAnterior && tocando) mostrarCortinilla(toma.cap);
      const D0 = ctx.din();
      if ((toma.dato || '') !== datoEl.dataset.dato || forzar) {
        datoEl.dataset.dato = toma.dato || '';
        datoEl.innerHTML = toma.dato ? datoHTML(toma.dato, D0) : '';
        datoEl.classList.remove('entra'); void datoEl.offsetWidth;
        if (toma.dato) datoEl.classList.add('entra');
      }
      apis.get(toma.acto)?.paso?.(toma.paso);
      const D = ctx.din();
      capChip.textContent = `${toma.cap + 1} · ${D.pelicula.capitulos[toma.cap]}`;
      listaCap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(Number(b.dataset.cap) === toma.cap)));
    }
    if (toma.sub !== subActual || forzar) { subActual = toma.sub; escribirSub(toma.sub); }
    if (toma.avanza) apis.get(toma.acto)?.progreso?.(toma.paso, (t - toma.t0) / (toma.t1 - toma.t0));
    const f = t / TOTAL;
    avance.style.transform = `scaleX(${f})`;
    rango.value = String(t);
    rango.setAttribute('aria-valuetext', mmss(t));
    tiempo.textContent = `${mmss(t)} / ${mmss(TOTAL)}`;
  }

  function ir(seg) {
    t = Math.max(0, Math.min(TOTAL - 0.01, seg));
    final.hidden = true;
    raiz.classList.remove('terminada');
    aplicar(true);
  }

  function ciclo(ahora) {
    if (!tocando) return;
    const dt = Math.min((ahora - ultimo) / 1000, 0.1);
    ultimo = ahora;
    t += dt;
    if (t >= TOTAL) { t = TOTAL; aplicar(); terminar(); return; }
    aplicar();
    requestAnimationFrame(ciclo);
  }
  function reproducir() {
    if (tocando) return;
    if (t >= TOTAL - 0.05) ir(0);
    tocando = true;
    raiz.classList.add('tocando');
    raiz.classList.add('empezada');
    portada.hidden = true;
    final.hidden = true;
    botonPlay.setAttribute('aria-label', ctx.din().pelicula.pausar);
    ultimo = performance.now();
    requestAnimationFrame(ciclo);
  }
  function pausar() {
    tocando = false;
    raiz.classList.remove('tocando');
    botonPlay.setAttribute('aria-label', ctx.din().pelicula.reproducir);
  }
  function terminar() {
    pausar();
    raiz.classList.add('terminada');
    final.hidden = false;
  }
  const alternar = () => (tocando ? pausar() : reproducir());

  portada.addEventListener('click', () => { ir(0); reproducir(); raiz.focus({ preventScroll: true }); });
  botonPlay.addEventListener('click', alternar);
  raiz.querySelector('.pelicula-otra-vez').addEventListener('click', () => { ir(0); reproducir(); });
  rango.addEventListener('input', () => { ir(Number(rango.value)); });
  raiz.querySelector('.pc-pantalla').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else raiz.requestFullscreen?.().catch(() => {});
  });
  // Si alguien toma la escena para girarla, la película se detiene (y sigue donde iba al darle play)
  raiz.querySelector('.pelicula-actos').addEventListener('pointerdown', () => { if (tocando) pausar(); });
  raiz.addEventListener('keydown', (ev) => {
    if (ev.target === rango && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) return;
    if (ev.key === ' ' || ev.key === 'k') { ev.preventDefault(); alternar(); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); ir(t + 5); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); ir(t - 5); }
    else if (ev.key === 'f') raiz.querySelector('.pc-pantalla').click();
  });
  // Si la película sale de la pantalla, se pausa
  new IntersectionObserver(([en]) => { if (!en.isIntersecting && tocando) pausar(); }, { threshold: 0.25 }).observe(raiz);

  const textos = () => {
    const D = ctx.din();
    listaCap.querySelectorAll('.pc-nombre').forEach((n, i) => { n.textContent = D.pelicula.capitulos[i]; });
    botonPlay.setAttribute('aria-label', tocando ? D.pelicula.pausar : D.pelicula.reproducir);
    aplicar(true);
  };
  ctx.alCambiarIdioma(textos);

  return {
    registrar(acto, api) {
      apis.set(acto, api);
      const el = actos.get(acto);
      if (el?._escenario) el._escenario.activo = acto === (actoActual ?? 'regla');
      if (acto === (actoActual ?? GUION[0].acto)) aplicar(true);
    },
    iniciar() { textos(); },
    reducido,
  };
}
