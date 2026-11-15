// ANA, la tutora de análogos, también en la landing (la misma del juego: game/src/tutor/, frente modelo).
// Botón flotante con su retrato en pixel art → tarjeta de chat con la paleta del juego.
// - Preguntas sugeridas: respuestas fijas por reglas, sin red ni IA (cifras de docs/METODOLOGIA.md y
//   model/VALIDATION.md; las mismas que game/src/tutor/conocimiento.js; no agregar cifras que no estén allí).
// - Pregunta libre: POST {API}/tutor con pantalla 'landing' (api/tutor.py: contexto armado en el servidor, historial
//   firmado, filtros contra prompt injection, límites por IP). Si la API no está o no tiene llave, lo dice y sigue.
// Todo texto entra como textContent (nunca innerHTML): la respuesta de la IA es una fuente externa.
const API = String(import.meta.env.VITE_API_URL || 'https://v1.marsception.us/api').replace(/\/+$/, '');
const MAX_PREGUNTA = 400; // = api/tutor.py
const MAX_HISTORIAL = 6;
const ESPERA_MS = 30000;

const raiz = document.documentElement;
const en = () => raiz.lang === 'en';
const tr = (es, ing) => (en() ? ing : es);

function el(etiqueta, atributos = {}, hijos = []) {
  const n = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v === false || v == null) continue;
    n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const h of [].concat(hijos)) if (h != null && h !== false) n.append(h instanceof Node ? h : document.createTextNode(String(h)));
  return n;
}

// ---------- Contenido (fijo, con fuente) ----------
const PREGUNTAS = () => [
  { id: 'analogo', texto: tr('¿Qué es un análogo?', 'What is an analog?') },
  { id: 'modelo', texto: tr('¿Cómo encuentra el modelo los sitios?', 'How does the model find sites?') },
  { id: 'validacion', texto: tr('¿Qué tan confiable es?', 'How reliable is it?') },
  { id: 'tierra', texto: tr('¿Qué no puede probar la Tierra?', 'What can Earth not test?') },
];
const RESPUESTAS = {
  analogo: () => tr(
    'Un análogo es un lugar de la Tierra que se parece en algo medible a un lugar de la Luna o de Marte: la forma de un cráter, la aridez, la pendiente o el tipo de suelo. Sirve para probar robots y operaciones antes de la misión. Nunca es igual en todo: la gravedad, el vacío o la radiación del destino no se pueden copiar aquí.',
    'An analog is a place on Earth that matches a place on the Moon or Mars in something measurable: crater shape, dryness, slope or soil type. It lets you test robots and operations before the mission. It is never the same in everything: the destination\'s gravity, vacuum or radiation cannot be copied here.'),
  modelo: () => tr(
    'El mismo detector mide depresiones tipo cráter a 200 m por píxel en la Tierra (Copernicus DEM), el polo sur lunar (LRO LOLA) y Marte (HRSC+MOLA). Un modelo explicable, un árbol de decisión y una regresión logística entrenados con cráteres reales de la Luna y Marte, compara su forma; la regla principal es profundidad/diámetro. Después se suman clima (NASA POWER), vegetación (MODIS) y pendiente, y se descarta lo que tiene vegetación densa.',
    'One detector measures crater-like depressions at 200 m per pixel on Earth (Copernicus DEM), the lunar south pole (LRO LOLA) and Mars (HRSC+MOLA). An explainable model, a decision tree and a logistic regression trained on real Moon and Mars craters, compares their shape; the key rule is depth/diameter. Then climate (NASA POWER), vegetation (MODIS) and slope are added, and densely vegetated places are ruled out.'),
  validacion: () => tr(
    'Son pruebas distintas, no una sola cifra: el detector encuentra 9 de 11 cráteres conocidos de México; el modelo distingue cráteres de la Luna y de Marte con cerca de 78 % de exactitud balanceada; y el comparador da 0 % en los 3 controles negativos (Amazonas, Congo y un arrozal del Mekong). Un sitio candidato todavía necesita revisión: el puntaje no certifica nada.',
    'These are separate tests, not one number: the detector finds 9 of 11 known Mexican craters; the model tells Moon and Mars craters apart with about 78 % balanced accuracy; and the comparator gives 0 % on all 3 negative controls (Amazon, Congo and a Mekong rice plain). A candidate site still needs review: the score certifies nothing.'),
  tierra: () => tr(
    'Ningún lugar de la Tierra reproduce la gravedad del destino (Marte 3.71 y Luna 1.62 m/s², contra 9.81 aquí), la presión atmosférica, la radiación ni el vacío lunar. Por eso en el juego pruebas tu robot en la Tierra y la gravedad real solo aparece en la misión.',
    'No place on Earth reproduces the destination\'s gravity (Mars 3.71 and Moon 1.62 m/s², vs. 9.81 here), the atmospheric pressure, the radiation or the lunar vacuum. That is why in the game you test your robot on Earth, and the real gravity only shows up in the mission.'),
};
const SALUDO = () => tr(
  '¡Hola! Soy ANA, la tutora de análogos de MARSCEPTION. Pregúntame qué es un análogo, cómo encontramos los sitios o qué no puede probar la Tierra.',
  'Hi! I\'m ANA, MARSCEPTION\'s analog tutor. Ask me what an analog is, how we found the sites, or what Earth cannot test.');
const SIN_IA = (limite) => (limite
  ? tr('Respondí muchas preguntas seguidas y necesito un respiro. Mientras, prueba las preguntas sugeridas: esas las contesto siempre.',
    'I answered a lot of questions in a row and need a breather. Meanwhile, try the suggested questions: I can always answer those.')
  : tr('Ahora no puedo contestar preguntas libres (sin conexión con la API). Las preguntas sugeridas sí funcionan: salen directo de nuestros datos.',
    'I cannot answer free questions right now (no connection to the API). The suggested questions still work: they come straight from our data.'));

// ---------- Retrato en pixel art (el mismo de game/src/tutor/panel.js) ----------
const PALETA = { P: '#7a4cff', D: '#0b0d17', T: '#06d6a0', Y: '#ffd166', G: '#2a3160', W: '#a3abcc' };
const CARA = [
  '................', '.......YY.......', '........W.......', '...PPPPPPPPPP...', '..PDDDDDDDDDDP..', '..PDTTDDDDTTDP..',
  '..PDTTDDDDTTDP..', '..PDDDDDDDDDDP..', '..PDDTTTTTTDDP..', '..PDDDDDDDDDDP..', '...PPPPPPPPPP...', '......WWWW......',
  '...GGGGGGGGGG...', '..GGGYGGGGTGGG..', '..GGGGGGGGGGGG..', '................',
];
const BOCA_ABIERTA = [[8, '..PDDTDDDDTDDP..'], [9, '..PDDDTTTTDDDP..']];
const OJOS_CERRADOS = [[5, '..PDDDDDDDDDDP..']];
function retrato(lienzo, { abierta = false, parpadeo = false } = {}) {
  const ctx = lienzo.getContext('2d');
  const filas = CARA.slice();
  if (abierta) for (const [i, f] of BOCA_ABIERTA) filas[i] = f;
  if (parpadeo) for (const [i, f] of OJOS_CERRADOS) filas[i] = f;
  ctx.clearRect(0, 0, 16, 16);
  filas.forEach((fila, y) => [...fila].forEach((c, x) => { if (PALETA[c]) { ctx.fillStyle = PALETA[c]; ctx.fillRect(x, y, 1, 1); } }));
}
const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const tactil = () => matchMedia('(pointer: coarse)').matches;

// ---------- Estilos (paleta del juego; iguales en tema claro y oscuro: es un personaje del juego) ----------
const ESTILOS = `
.ana-boton { position: fixed; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); z-index: 40;
  display: inline-flex; align-items: center; gap: 10px; min-height: 52px; padding: 6px 16px 6px 6px; cursor: pointer;
  font: 500 0.85rem/1.2 var(--mono, ui-monospace, monospace); color: #fff; background: #141831;
  border: 3px solid #2a3160; box-shadow: 0 0 0 3px #0b0d17, inset 0 3px 0 #7a4cff, 0 12px 32px rgba(0, 0, 0, 0.45);
  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease; }
.ana-boton canvas { width: 40px; height: 40px; image-rendering: pixelated; background: #0b0d17; border: 2px solid #2a3160; }
.ana-boton:hover { border-color: #06d6a0; }
.ana-boton:active { transform: scale(0.97); }
.ana-boton:focus-visible, .ana :focus-visible { outline: 3px solid #06d6a0; outline-offset: 2px; }
.ana-boton[hidden], .ana[hidden] { display: none !important; }
.ana { position: fixed; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); z-index: 41;
  width: min(420px, calc(100vw - 32px)); height: min(600px, calc(100dvh - 32px)); display: flex; flex-direction: column; gap: 8px;
  padding: 12px; background: #141831; color: #fff; font: 0.9rem/1.45 var(--mono, ui-monospace, monospace);
  border: 3px solid #2a3160; box-shadow: 0 0 0 3px #0b0d17, inset 0 3px 0 #7a4cff, 0 24px 60px rgba(0, 0, 0, 0.55);
  transform-origin: bottom right; animation: ana-entra 220ms cubic-bezier(0.23, 1, 0.32, 1); }
@keyframes ana-entra { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
@media (prefers-reduced-motion: reduce) { .ana { animation: none; } .ana-boton { transition: none; } }
.ana *, .ana *::before, .ana *::after { box-sizing: border-box; }
.ana header { display: flex; align-items: center; gap: 10px; }
.ana header canvas { width: 48px; height: 48px; image-rendering: pixelated; background: #0b0d17; border: 3px solid #2a3160; flex: 0 0 auto; }
.ana header div { flex: 1 1 auto; min-width: 0; }
.ana h2 { margin: 0; font-size: 1rem; color: #ffd166; letter-spacing: 0.06em; }
.ana header p { margin: 2px 0 0; color: #a3abcc; font-size: 0.75rem; }
.ana button { font: inherit; cursor: pointer; border-radius: 0; min-height: 44px; padding: 6px 12px; }
.ana .ana-cerrar { background: transparent; color: #ffd166; border: 2px solid #ffd166; flex: 0 0 auto; min-width: 44px; }
.ana .ana-registro { flex: 1 1 auto; min-height: 80px; overflow-y: auto; overscroll-behavior: contain; background: #0b0d17;
  border: 2px solid #2a3160; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.ana .ana-msg { max-width: 94%; padding: 6px 10px; white-space: pre-wrap; overflow-wrap: anywhere; }
.ana .ana-msg.ana-ella { align-self: flex-start; background: #1f2550; border-left: 4px solid #06d6a0; }
.ana .ana-msg.ana-yo { align-self: flex-end; background: #2a2410; border-right: 4px solid #ffd166; }
.ana .ana-msg small { display: block; color: #a3abcc; font-size: 0.72rem; margin-top: 4px; }
.ana .ana-pensando { color: #a3abcc; }
.ana .ana-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ana .ana-chips button { flex: 1 1 160px; text-align: left; color: #fff; background: #1f2550; border: 2px solid #2a3160; font-size: 0.8rem; }
.ana .ana-chips button:hover { border-color: #06d6a0; }
.ana form { display: flex; gap: 6px; }
.ana input { flex: 1 1 auto; min-width: 0; font: inherit; font-size: 16px; color: #fff; background: #0b0d17; border: 2px solid #2a3160;
  padding: 8px 10px; min-height: 44px; border-radius: 0; }
.ana input:disabled { color: #a3abcc; }
.ana form button { background: #ffd166; color: #0b0d17; border: 0; font-weight: 600; }
.ana form button:disabled { background: #6c7393; cursor: not-allowed; }
.ana .ana-nota { margin: 0; color: #a3abcc; font-size: 0.7rem; }
@media (max-width: 520px) { .ana { right: 8px; left: 8px; bottom: 8px; width: auto; height: calc(100dvh - 16px); } }
`;

// ---------- API ----------
async function disponible() {
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`${API}/tutor`, { signal: ctrl.signal });
    return r.ok && (await r.json())?.disponible === true;
  } catch { return false; } finally { clearTimeout(reloj); }
}

async function preguntar(cuerpo, senal) {
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort('espera'), ESPERA_MS);
  senal?.addEventListener('abort', () => ctrl.abort('cancelado'), { once: true });
  try {
    const r = await fetch(`${API}/tutor`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: ctrl.signal });
    if (r.status === 503) return { ok: false, tipo: 'sin_configurar' };
    if (r.status === 429) return { ok: false, tipo: 'limite' };
    if (!r.ok) return { ok: false, tipo: 'http' };
    const d = await r.json();
    if (typeof d?.respuesta !== 'string' || !d.respuesta.trim()) return { ok: false, tipo: 'http' };
    return { ok: true, respuesta: d.respuesta, fuente: d.fuente || 'llm', firma: d.firma || null };
  } catch {
    return { ok: false, tipo: ctrl.signal.aborted ? ctrl.signal.reason : 'red' };
  } finally { clearTimeout(reloj); }
}

// ---------- Montaje ----------
export function montarTutora() {
  if (document.querySelector('.ana-boton')) return;
  document.head.append(el('style', {}, ESTILOS));

  const caraBoton = el('canvas', { width: 16, height: 16, 'aria-hidden': 'true' });
  retrato(caraBoton);
  const etiqueta = el('span');
  const boton = el('button', { type: 'button', class: 'ana-boton', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' }, [caraBoton, etiqueta]);
  const rotular = () => { etiqueta.textContent = tr('Pregúntale a ANA', 'Ask ANA'); };
  rotular();
  document.body.append(boton);

  let panel = null;
  // El idioma de la página cambia sin recargar (main.js → aplicarIdioma): el botón se re-rotula y el panel se rehace.
  new MutationObserver(() => { rotular(); if (panel) { panel.cerrar(false); abrir(); } }).observe(raiz, { attributes: true, attributeFilter: ['lang'] });

  function abrir() {
    if (panel) return;
    panel = crearPanel(() => { panel = null; boton.hidden = false; boton.setAttribute('aria-expanded', 'false'); });
    boton.hidden = true;
    boton.setAttribute('aria-expanded', 'true');
  }
  boton.addEventListener('click', abrir);

  function crearPanel(alCerrar) {
    const historial = [];
    let consulta = null, cerrado = false, hablando = null, ia = null;

    const cara = el('canvas', { width: 16, height: 16, 'aria-hidden': 'true' });
    retrato(cara);
    const cerrarBtn = el('button', { type: 'button', class: 'ana-cerrar', 'aria-label': tr('Cerrar', 'Close') }, '✕');
    const registro = el('div', { class: 'ana-registro', role: 'log', 'aria-live': 'polite' });
    const chips = el('div', { class: 'ana-chips' });
    const campo = el('input', { type: 'text', maxlength: MAX_PREGUNTA, autocomplete: 'off', enterkeyhint: 'send',
      'aria-label': tr('Tu pregunta', 'Your question'), placeholder: tr('Escribe tu pregunta…', 'Type your question…') });
    const enviar = el('button', { type: 'submit' }, tr('Preguntar', 'Ask'));
    const form = el('form', {}, [campo, enviar]);
    const caja = el('section', { class: 'ana', role: 'dialog', 'aria-labelledby': 'ana-titulo', 'data-lenis-prevent': true }, [
      el('header', {}, [cara, el('div', {}, [el('h2', { id: 'ana-titulo' }, 'ANA'),
        el('p', {}, tr('Tutora de análogos del juego · habla con los datos del modelo', 'The game\'s analog tutor · talks with the model\'s data'))]), cerrarBtn]),
      registro, chips, form,
      el('p', { class: 'ana-nota' }, tr('Sugeridas: respuestas fijas con nuestros datos (sin IA). Libres: IA anclada en nuestros datos; puede equivocarse.',
        'Suggested: fixed answers from our data (no AI). Free questions: AI grounded in our data; it can be wrong.')),
    ]);
    document.body.append(caja);

    const agregar = (clase, texto, nota) => {
      const m = el('div', { class: `ana-msg ${clase}` }, [el('span', {}, texto), nota ? el('small', {}, nota) : null]);
      registro.append(m);
      registro.scrollTop = registro.scrollHeight;
      return m;
    };
    const hablar = () => {
      clearInterval(hablando);
      if (quieto()) return;
      let n = 0;
      hablando = setInterval(() => {
        n += 1; retrato(cara, { abierta: n % 2 === 1 });
        if (n >= 10) { clearInterval(hablando); hablando = null; retrato(cara); }
      }, 140);
    };
    const responder = (texto, nota) => { agregar('ana-ella', texto, nota); hablar(); };
    const NOTA_REGLAS = tr('datos del proyecto · sin IA', 'project data · no AI');

    for (const p of PREGUNTAS()) {
      const b = el('button', { type: 'button' }, p.texto);
      b.addEventListener('click', () => { agregar('ana-yo', p.texto); responder(RESPUESTAS[p.id](), NOTA_REGLAS); });
      chips.append(b);
    }

    const ponerIA = (si) => {
      ia = si; campo.disabled = !si; enviar.disabled = !si;
      campo.placeholder = si ? tr('Escribe tu pregunta…', 'Type your question…') : tr('Preguntas libres no disponibles: usa las sugeridas', 'Free questions unavailable: use the suggested ones');
    };
    disponible().then((si) => {
      if (cerrado) return;
      ponerIA(si);
      if (!si && document.activeElement === campo) chips.querySelector('button')?.focus();
    });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const pregunta = campo.value.trim().slice(0, MAX_PREGUNTA);
      if (!pregunta || consulta || ia === false) return;
      campo.value = '';
      agregar('ana-yo', pregunta);
      const pensando = agregar('ana-ella ana-pensando', tr('ANA está pensando…', 'ANA is thinking…'));
      enviar.disabled = true;
      consulta = new AbortController();
      const r = await preguntar({ pregunta, pantalla: 'landing', idioma: en() ? 'en' : 'es', historial: historial.slice(-MAX_HISTORIAL) }, consulta.signal);
      consulta = null;
      if (cerrado) return;
      pensando.remove();
      enviar.disabled = ia === false;
      if (r.ok && r.fuente === 'filtro') responder(r.respuesta, tr('respuesta fija · filtro de seguridad', 'fixed answer · safety filter'));
      else if (r.ok) {
        if (r.firma) historial.push({ rol: 'usuario', texto: pregunta }, { rol: 'tutor', texto: r.respuesta, firma: r.firma });
        responder(r.respuesta, tr('IA anclada en nuestros datos · puede equivocarse', 'AI grounded in our data · it can be wrong'));
      } else if (r.tipo !== 'cancelado') {
        responder(SIN_IA(r.tipo === 'limite'), NOTA_REGLAS);
        if (r.tipo === 'sin_configurar') ponerIA(false);
      }
      if (!tactil()) campo.focus();
    });

    const parpadeo = quieto() ? null : setInterval(() => {
      if (hablando) return;
      retrato(cara, { parpadeo: true });
      setTimeout(() => { if (!hablando) retrato(cara); }, 160);
    }, 3800);

    function cerrar(devolverFoco = true) {
      if (cerrado) return;
      cerrado = true;
      consulta?.abort();
      clearInterval(hablando); clearInterval(parpadeo);
      caja.remove();
      alCerrar();
      if (devolverFoco) boton.focus();
    }
    cerrarBtn.addEventListener('click', () => cerrar());
    caja.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); } });

    responder(SALUDO());
    ((tactil() ? null : campo) || chips.querySelector('button')).focus({ preventScroll: true });
    return { cerrar };
  }
}
