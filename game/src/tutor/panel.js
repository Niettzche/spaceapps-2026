// Frente modelo. Panel de ANA, la tutora de análogos: capa HTML sobre el lienzo (como el Explorador: campos reales,
// accesibles con teclado, toque y lector de pantalla). No requiere cambios en main.js.
// - Preguntas sugeridas → respuesta por reglas al instante (conocimiento.js), sin red ni IA.
// - Pregunta libre → POST /tutor (IA anclada en nuestros datos). Si no hay API, llave o cupo, lo dice y sigue con reglas.
// Los textos van siempre como textContent (nunca innerHTML): la respuesta de la IA es una fuente externa.
import { el } from '../scenes/expediente/capa.js';
import { tr, idioma } from '../i18n.js';
import { NOMBRE_TUTORA, saludo, preguntasSugeridas, respuestaPorReglas, sinIA } from './conocimiento.js';
import { preguntarTutor, tutorDisponible } from './cliente.js';

const ID = 'mc-tutora';
const MAX_PREGUNTA = 400; // = api/tutor.py
const MAX_HISTORIAL = 6;

const ESTILOS = `
#mc-tutora { position: fixed; inset: 0; z-index: 12; display: flex; align-items: center; justify-content: center;
  padding: 8px; box-sizing: border-box; background: rgba(11, 13, 23, 0.78);
  font: 16px/1.45 ui-monospace, Menlo, Consolas, monospace; color: #fff; }
#mc-tutora *, #mc-tutora *::before, #mc-tutora *::after { box-sizing: border-box; }
#mc-tutora .caja { width: min(780px, 100%); max-height: 100%; display: flex; flex-direction: column; gap: 8px;
  background: #141831; border: 3px solid #2a3160; box-shadow: 0 0 0 3px #0b0d17, inset 0 3px 0 #7a4cff; padding: 12px 14px; }
#mc-tutora .caja:focus { outline: none; }
#mc-tutora header { display: flex; align-items: center; gap: 12px; }
#mc-tutora canvas { width: 64px; height: 64px; image-rendering: pixelated; flex: 0 0 auto; background: #0b0d17;
  border: 3px solid #2a3160; }
#mc-tutora header .titulo { flex: 1 1 auto; min-width: 0; }
#mc-tutora h1 { margin: 0; font-size: 20px; color: #ffd166; letter-spacing: 1px; }
#mc-tutora header p { margin: 2px 0 0; color: #a3abcc; font-size: 14px; }
#mc-tutora button { font: inherit; cursor: pointer; border-radius: 0; min-height: 44px; padding: 6px 12px; }
#mc-tutora button.cerrar { background: transparent; color: #ffd166; border: 2px solid #ffd166; flex: 0 0 auto; }
#mc-tutora .registro { flex: 1 1 auto; min-height: 96px; overflow-y: auto; background: #0b0d17; border: 2px solid #2a3160;
  padding: 8px 10px; display: flex; flex-direction: column; gap: 8px; }
#mc-tutora .msg { max-width: 92%; padding: 6px 10px; white-space: pre-wrap; overflow-wrap: anywhere; }
#mc-tutora .msg.ana { align-self: flex-start; background: #1f2550; border-left: 4px solid #06d6a0; }
#mc-tutora .msg.yo { align-self: flex-end; background: #2a2410; border-right: 4px solid #ffd166; }
#mc-tutora .msg small { display: block; color: #a3abcc; font-size: 13px; margin-top: 4px; }
#mc-tutora .msg.pensando { color: #a3abcc; }
#mc-tutora .chips { display: flex; flex-wrap: wrap; gap: 6px; }
#mc-tutora .chips button { background: #1f2550; color: #fff; border: 2px solid #2a3160; text-align: left; flex: 1 1 200px; }
#mc-tutora .chips button:hover { border-color: #06d6a0; }
#mc-tutora form { display: flex; gap: 6px; }
#mc-tutora input { flex: 1 1 auto; min-width: 0; font: inherit; font-size: 16px; color: #fff; background: #0b0d17;
  border: 2px solid #2a3160; padding: 8px 10px; min-height: 44px; }
#mc-tutora input:disabled { color: #a3abcc; }
#mc-tutora form button { background: #ffd166; color: #0b0d17; border: 0; font-weight: 600; flex: 0 0 auto; }
#mc-tutora form button:disabled { background: #6c7393; cursor: not-allowed; }
#mc-tutora .nota { margin: 0; color: #a3abcc; font-size: 13px; }
#mc-tutora :focus-visible { outline: 3px solid #06d6a0; outline-offset: 2px; }
@media (max-height: 460px) {
  #mc-tutora .caja { padding: 8px 10px; gap: 6px; }
  #mc-tutora canvas { width: 40px; height: 40px; }
  #mc-tutora header p { display: none; }
  #mc-tutora .chips { flex-wrap: nowrap; overflow-x: auto; }
  #mc-tutora .chips button { flex: 0 0 auto; white-space: nowrap; }
  #mc-tutora .nota { display: none; }
}
`;

// ---------- Retrato en pixel art (16 × 16, arte propio; el frente de arte puede cambiarlo por un sprite) ----------
const PALETA = { P: '#7a4cff', D: '#0b0d17', T: '#06d6a0', Y: '#ffd166', G: '#2a3160', W: '#a3abcc' };
const CARA = [
  '................',
  '.......YY.......',
  '........W.......',
  '...PPPPPPPPPP...',
  '..PDDDDDDDDDDP..',
  '..PDTTDDDDTTDP..',
  '..PDTTDDDDTTDP..',
  '..PDDDDDDDDDDP..',
  '..PDDDDDDDDDDP..',
  '..PDDDDDDDDDDP..',
  '...PPPPPPPPPP...',
  '......WWWW......',
  '...GGGGGGGGGG...',
  '..GGGYGGGGTGGG..',
  '..GGGGGGGGGGGG..',
  '................',
];
const BOCA = { cerrada: [[8, '..PDDTTTTTTDDP..']], abierta: [[8, '..PDDTDDDDTDDP..'], [9, '..PDDDTTTTDDDP..']] };
const OJOS_CERRADOS = [[5, '..PDDDDDDDDDDP..'], [6, '..PDTTDDDDTTDP..']];

function dibujarRetrato(lienzo, { boca = 'cerrada', parpadeo = false } = {}) {
  const ctx = lienzo.getContext('2d');
  const filas = CARA.slice();
  for (const [i, f] of BOCA[boca]) filas[i] = f;
  if (parpadeo) for (const [i, f] of OJOS_CERRADOS) filas[i] = f;
  ctx.clearRect(0, 0, 16, 16);
  filas.forEach((fila, y) => [...fila].forEach((c, x) => {
    if (PALETA[c]) { ctx.fillStyle = PALETA[c]; ctx.fillRect(x, y, 1, 1); }
  }));
}

const movimientoReducido = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const tactil = () => globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;

/**
 * Abre el panel. `sitio` y `destino` son los objetos de data/ que el jugador está viendo (pueden faltar).
 * `pantalla`: 'expediente' | 'numeros' | 'menu' | 'resultados'. Devuelve { cerrar }.
 */
export function abrirTutora(scene, { sitio = null, destino = null, pantalla = 'expediente', alCerrar } = {}) {
  document.getElementById(ID)?.remove();
  if (!document.getElementById(`${ID}-estilos`)) document.head.append(el('style', { id: `${ID}-estilos` }, ESTILOS));

  // Mientras el panel está abierto, Phaser no recibe teclas ni clics (Esc, 1–5, I, C… son de la escena).
  const teclado = scene.input?.keyboard;
  const antes = { input: scene.input?.enabled, teclado: teclado?.enabled };
  if (scene.input) scene.input.enabled = false;
  if (teclado) { teclado.enabled = false; teclado.disableGlobalCapture?.(); }

  const historial = [];
  let consulta = null;
  let cerrado = false;
  let hablando = null;

  const lienzo = el('canvas', { width: 16, height: 16, 'aria-hidden': 'true' });
  dibujarRetrato(lienzo);
  const cerrarBtn = el('button', { type: 'button', class: 'cerrar' }, tr('Cerrar (Esc)', 'Close (Esc)'));
  const subtitulo = sitio
    ? tr('Tutora de análogos · habla con los datos de este sitio', 'Analog tutor · talks with this site\'s data')
    : tr('Tutora de análogos · habla con los datos del modelo', 'Analog tutor · talks with the model\'s data');
  const encabezado = el('header', {}, [lienzo, el('div', { class: 'titulo' }, [el('h1', { id: `${ID}-titulo` }, NOMBRE_TUTORA), el('p', {}, subtitulo)]), cerrarBtn]);
  const registro = el('div', { class: 'registro', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
  const chips = el('div', { class: 'chips' });
  const campo = el('input', { type: 'text', maxlength: MAX_PREGUNTA, autocomplete: 'off', enterkeyhint: 'send',
    'aria-label': tr('Tu pregunta', 'Your question'), placeholder: tr('Escribe tu pregunta…', 'Type your question…') });
  const enviar = el('button', { type: 'submit' }, tr('Preguntar', 'Ask'));
  const form = el('form', {}, [campo, enviar]);
  const nota = el('p', { class: 'nota' }, tr('Preguntas sugeridas: respuestas armadas con nuestros datos (sin IA). Preguntas libres: IA anclada en nuestros datos; puede equivocarse, revisa la fuente.',
    'Suggested questions: answers built from our data (no AI). Free questions: AI grounded in our data; it can be wrong, check the source.'));
  const caja = el('div', { class: 'caja', tabindex: '-1' }, [encabezado, registro, chips, form, nota]);
  const capa = el('div', { id: ID, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `${ID}-titulo`, lang: idioma() }, caja);
  document.body.append(capa);

  // ---------- Mensajes ----------
  function agregar(quien, texto, etiqueta) {
    const m = el('div', { class: `msg ${quien}` }, [el('span', {}, texto), etiqueta ? el('small', {}, etiqueta) : null]);
    registro.append(m);
    registro.scrollTop = registro.scrollHeight;
    return m;
  }

  function hablar(ms = 1400) {
    clearInterval(hablando);
    if (movimientoReducido()) return;
    let n = 0;
    hablando = setInterval(() => {
      n += 1;
      dibujarRetrato(lienzo, { boca: n % 2 ? 'abierta' : 'cerrada' });
      if (n * 140 >= ms) { clearInterval(hablando); hablando = null; dibujarRetrato(lienzo); }
    }, 140);
  }

  function responder(texto, etiqueta) {
    agregar('ana', texto, etiqueta);
    hablar();
  }

  const ETQ_REGLAS = tr('datos del juego · sin IA', 'game data · no AI');

  // ---------- Preguntas sugeridas (reglas) ----------
  for (const p of preguntasSugeridas({ sitio, destino })) {
    const b = el('button', { type: 'button' }, p.texto);
    b.addEventListener('click', () => {
      agregar('yo', p.texto);
      responder(respuestaPorReglas(p.id, { sitio, destino }) || sinIA(), ETQ_REGLAS);
    });
    chips.append(b);
  }

  // ---------- Pregunta libre (IA) ----------
  let iaDisponible = null; // null = comprobando
  const ponerIA = (si) => {
    iaDisponible = si;
    campo.disabled = !si;
    enviar.disabled = !si;
    campo.placeholder = si ? tr('Escribe tu pregunta…', 'Type your question…')
      : tr('Preguntas libres no disponibles: usa las sugeridas', 'Free questions unavailable: use the suggested ones');
  };
  tutorDisponible().then((si) => {
    if (cerrado) return;
    ponerIA(si);
    // Sin IA, el foco pasa del campo (deshabilitado) a la primera pregunta sugerida.
    if (!si && (document.activeElement === campo || document.activeElement === caja)) chips.querySelector('button')?.focus({ preventScroll: true });
  });

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const pregunta = campo.value.trim().slice(0, MAX_PREGUNTA);
    if (!pregunta || consulta || iaDisponible === false) return;
    campo.value = '';
    agregar('yo', pregunta);
    const pensando = agregar('ana pensando', tr(`${NOMBRE_TUTORA} está pensando…`, `${NOMBRE_TUTORA} is thinking…`));
    enviar.disabled = true;
    consulta = new AbortController();
    const r = await preguntarTutor({
      pregunta, sitio: sitio?.id ?? null, destino: destino?.id ?? null, pantalla, idioma: idioma(),
      historial: historial.slice(-MAX_HISTORIAL),
    }, { senal: consulta.signal });
    consulta = null;
    if (cerrado) return;
    pensando.remove();
    enviar.disabled = iaDisponible === false;
    if (r.ok && r.fuente === 'filtro') {
      responder(r.respuesta, tr('respuesta fija · filtro de seguridad', 'fixed answer · safety filter'));
    } else if (r.ok) {
      // El historial que se manda al servidor: solo pares pregunta → respuesta firmada (el servidor descarta lo demás).
      if (r.firma) historial.push({ rol: 'usuario', texto: pregunta }, { rol: 'tutor', texto: r.respuesta, firma: r.firma });
      responder(r.respuesta, tr('IA anclada en nuestros datos · puede equivocarse', 'AI grounded in our data · it can be wrong'));
    } else if (r.tipo !== 'cancelado') {
      responder(sinIA(r.tipo === 'limite' ? 'limite' : 'red'), ETQ_REGLAS);
      if (r.tipo === 'sin_configurar' || r.tipo === 'no_publicada') ponerIA(false);
    }
    if (!tactil()) campo.focus();
  });

  // ---------- Cerrar, teclado y foco ----------
  function cerrar() {
    if (cerrado) return;
    cerrado = true;
    scene.events.off('shutdown', cerrar);
    consulta?.abort();
    clearInterval(hablando);
    clearInterval(parpadeo);
    capa.remove();
    // Un instante después: la tecla que cerró el panel (Esc) no debe llegar también a la escena.
    setTimeout(() => {
      if (!scene.sys?.isActive?.()) return;
      if (scene.input) scene.input.enabled = antes.input ?? true;
      if (teclado) { teclado.enabled = antes.teclado ?? true; teclado.enableGlobalCapture?.(); }
      alCerrar?.();
    }, 120);
  }
  cerrarBtn.addEventListener('click', cerrar);
  capa.addEventListener('pointerdown', (ev) => { if (ev.target === capa) cerrar(); });
  const enTeclas = (ev) => {
    ev.stopPropagation(); // Phaser escucha en window: las teclas del panel no llegan a la escena
    if (ev.type !== 'keydown') return;
    if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); }
    else if (ev.key === 'Tab') mantenerFoco(ev);
  };
  capa.addEventListener('keydown', enTeclas);
  capa.addEventListener('keyup', enTeclas);
  function mantenerFoco(ev) {
    const enfocables = [...capa.querySelectorAll('button, input')].filter((e) => !e.disabled && e.offsetParent !== null);
    if (!enfocables.length) return;
    const primero = enfocables[0], ultimo = enfocables[enfocables.length - 1];
    const actual = document.activeElement;
    if (ev.shiftKey && (actual === primero || !capa.contains(actual) || actual === caja)) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && (actual === ultimo || !capa.contains(actual))) { ev.preventDefault(); primero.focus(); }
  }
  scene.events.once('shutdown', cerrar);

  // Parpadeo de vez en cuando (quieto con prefers-reduced-motion).
  const parpadeo = movimientoReducido() ? null : setInterval(() => {
    if (hablando) return;
    dibujarRetrato(lienzo, { parpadeo: true });
    setTimeout(() => { if (!hablando) dibujarRetrato(lienzo); }, 160);
  }, 3800);

  responder(saludo({ sitio, destino }));
  // Con teclado físico, el foco va al campo de texto (así escribir no activa un botón con la barra espaciadora);
  // en táctil, a la primera pregunta (no se abre el teclado del teléfono).
  ((tactil() ? null : campo) || chips.querySelector('button') || caja).focus({ preventScroll: true });
  return { cerrar };
}
