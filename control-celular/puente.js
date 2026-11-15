// Puente de la pantalla: corre dentro de la página del juego (en la compu) y convierte los botones del celular en
// teclas. El juego no se modifica: Phaser lee event.keyCode y la clase Teclado del juego lee event.key, así que cada
// botón se emite como un KeyboardEvent con ambos.
//
// Además: muestra un panel con el QR para emparejar, avisa cuando entra o sale un celular, y le cuenta al celular en
// qué escena está el juego para que cambie solo entre "conducir" y "navegar".
(() => {
  if (window.__controlCelular) return;
  window.__controlCelular = { version: 1 };

  // Carpeta del relay: 'http://<compu>:8787/' en local; 'https://<mismo dominio>/mando/' en la demo pública.
  const RELAY = new URL('.', document.currentScript?.src ?? 'http://localhost:8787/puente.js').href;
  // Modo público: el relay vive en el mismo origen que el juego (detrás de nginx). Allí hay varias salas: el relay le da
  // una a esta pantalla ({t:'sala'}) y el QR apunta a la página del control en este mismo dominio, por internet.
  const PUBLICO = new URL(RELAY).origin === location.origin;
  const CLAVE_SALA = 'marsception.mando.sala';
  let salaPublica = null; // { sala, token }
  try { salaPublica = JSON.parse(sessionStorage.getItem(CLAVE_SALA) ?? 'null'); } catch { /* sin almacenamiento */ }
  function urlWs() {
    let u = RELAY.replace(/^http/, 'ws') + 'ws?rol=pantalla';
    // Al recargar la página se recupera la misma sala (el celular sigue conectado) con su token.
    if (PUBLICO && salaPublica?.sala && salaPublica?.token) {
      u += `&sala=${encodeURIComponent(salaPublica.sala)}&token=${encodeURIComponent(salaPublica.token)}`;
    }
    return u;
  }

  // ------------------------------------------------------------ idioma (playtest de Leo, B1: siempre salía en español)
  // Igual que game/src/i18n.js: el juego pone <html lang> al cargar y al cambiar de idioma; si aún no lo puso,
  // ?lang=es|en en la URL → lo guardado en el navegador → idioma del navegador (español si empieza con «es»).
  function idioma() {
    const html = document.documentElement.getAttribute('lang');
    if (html === 'es' || html === 'en') return html;
    try {
      const url = new URLSearchParams(location.search).get('lang');
      if (url === 'es' || url === 'en') return url;
    } catch { /* sin URL */ }
    try {
      const g = localStorage.getItem('marsception.idioma');
      if (g === 'es' || g === 'en') return g;
    } catch { /* sin almacenamiento */ }
    return (navigator.language ?? 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  }
  const tr = (es, en) => (idioma() === 'en' ? en : es);

  // tecla → [keyCode, code]
  const TECLAS = {
    ArrowLeft: [37, 'ArrowLeft'], ArrowUp: [38, 'ArrowUp'], ArrowRight: [39, 'ArrowRight'], ArrowDown: [40, 'ArrowDown'],
    Enter: [13, 'Enter'], Escape: [27, 'Escape'], ' ': [32, 'Space'], Tab: [9, 'Tab'], Delete: [46, 'Delete'],
    Backspace: [8, 'Backspace'],
  };
  for (const c of 'achilmnprx') TECLAS[c] = [c.toUpperCase().charCodeAt(0), `Key${c.toUpperCase()}`];
  for (let n = 1; n <= 9; n++) TECLAS[String(n)] = [48 + n, `Digit${n}`];

  // ------------------------------------------------------------ teclas sintéticas
  function emitir(tipo, k, repeat = false) {
    const t = TECLAS[k];
    if (!t) return;
    const ev = new KeyboardEvent(tipo, { key: k, code: t[1], bubbles: true, cancelable: true, repeat });
    Object.defineProperty(ev, 'keyCode', { get: () => t[0] });
    Object.defineProperty(ev, 'which', { get: () => t[0] });
    const el = document.activeElement;
    (el && el !== document.documentElement ? el : document.body).dispatchEvent(ev);
  }

  // Como un teclado real: al mantener una flecha para navegar, se repite. Para conducir no (r = 0).
  // La espera es más larga que en un teclado (520 ms): un toque lento en la pantalla no debe contar doble.
  const repeticion = new Map();
  function abajo(k, repetir) {
    soltarRepeticion(k);
    emitir('keydown', k);
    if (repetir) {
      const t = setTimeout(function rep() {
        emitir('keydown', k, true);
        repeticion.set(k, setTimeout(rep, 120));
      }, 520);
      repeticion.set(k, t);
    }
  }
  function soltarRepeticion(k) { clearTimeout(repeticion.get(k)); repeticion.delete(k); }
  const presionadas = new Set();
  function tecla(k, d, r) {
    if (d) { presionadas.add(k); abajo(k, r); }
    else { presionadas.delete(k); soltarRepeticion(k); emitir('keyup', k); }
  }
  function soltarTodo() { [...presionadas].forEach((k) => tecla(k, 0)); }

  // ------------------------------------------------------------ escena actual (para el modo automático)
  // Phaser deja window.Phaser global; se toma el juego la primera vez que el SceneManager se actualiza.
  let juego = null;
  (function engancharPhaser() {
    const P = window.Phaser;
    if (!P?.Scenes?.SceneManager) return setTimeout(engancharPhaser, 200);
    const proto = P.Scenes.SceneManager.prototype;
    const original = proto.update;
    proto.update = function (...a) {
      if (!juego) { juego = this.game; proto.update = original; }
      return original.apply(this, a);
    };
  })();

  let ultima = '';
  window.__controlCelular.escena = () => escenaActual(); // para pruebas automáticas
  window.__controlCelular.juego = () => juego;
  function escenaActual() {
    if (!juego) return null;
    const activas = juego.scene.getScenes(true).filter((s) => s.sys.settings.key !== 'Boot');
    const s = activas[activas.length - 1];
    if (!s) return null;
    return { clave: s.sys.settings.key, pausado: !!s.recorrido?.pausado };
  }
  setInterval(() => {
    const e = escenaActual();
    const f = JSON.stringify(e);
    if (e && f !== ultima && ws?.readyState === 1) { ultima = f; ws.send(JSON.stringify({ t: 'escena', ...e })); }
  }, 200);

  // ------------------------------------------------------------ conexión
  let ws = null;
  let espera = 500;
  // Latido: un proxy (nginx, Cloudflare) cierra un WebSocket sin datos; la pantalla casi no manda nada por sí sola.
  setInterval(() => { if (PUBLICO && ws?.readyState === 1) ws.send('{"t":"p"}'); }, 25000);
  let pads = 0;
  function conectar() {
    ws = new WebSocket(urlWs());
    ws.onopen = () => { espera = 500; ultima = ''; ui.estado(true); };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'k') tecla(m.k, m.d, m.r);
      else if (m.t === 'sala' && /^\d{4,6}$/.test(String(m.sala))) {
        salaPublica = { sala: String(m.sala), token: String(m.token ?? '') };
        try { sessionStorage.setItem(CLAVE_SALA, JSON.stringify(salaPublica)); } catch { /* sin almacenamiento */ }
        ui.repintar();
      }
      else if (m.t === 'pads') {
        if (m.n > pads) { ui.aviso(tr('📱 Control conectado', '📱 Phone controller connected')); ui.cerrar(); }
        else if (m.n < pads) ui.aviso(tr('📱 Control desconectado', '📱 Phone controller disconnected'));
        pads = m.n;
        ui.pads(pads);
      }
    };
    ws.onclose = () => {
      soltarTodo();
      ui.estado(false);
      setTimeout(conectar, espera);
      espera = Math.min(espera * 2, 4000);
    };
  }

  // ------------------------------------------------------------ interfaz (Shadow DOM: no toca los estilos del juego)
  const ui = (() => {
    const host = document.createElement('div');
    host.id = 'control-celular';
    const raiz = host.attachShadow({ mode: 'open' });
    raiz.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; font-family: ui-monospace, Menlo, Consolas, monospace; }
        .pastilla { position: fixed; left: 50%; bottom: 6px; transform: translateX(-50%); z-index: 2147483000;
          background: rgba(11,13,23,.78); color: #e8eaf6; border: 1px solid rgba(255,209,102,.5); border-radius: 999px;
          padding: 3px 9px; font-size: 11px; cursor: pointer; opacity: .9; transition: opacity .4s; user-select: none; }
        .pastilla.tenue { opacity: .25; }
        .pastilla:hover { opacity: 1; }
        .pastilla .p { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef476f; margin-right: 6px; }
        .pastilla .p.ok { background: #06d6a0; }
        .velo { position: fixed; inset: 0; z-index: 2147483001; display: none; align-items: center; justify-content: center;
          background: rgba(5,6,12,.72); }
        .velo.abierto { display: flex; }
        .tarjeta { background: #12152a; color: #e8eaf6; border: 2px solid #ffd166; border-radius: 16px; padding: 20px 24px;
          display: grid; grid-template-columns: auto 1fr; gap: 20px; align-items: center; max-width: min(720px, 94vw); }
        .qr { width: 220px; height: 220px; background: #fff; border-radius: 10px; padding: 6px; }
        .qr img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
        h2 { margin: 0 0 8px; color: #ffd166; font-size: 18px; }
        p { margin: 6px 0; font-size: 13px; line-height: 1.45; }
        .sala { font-size: 28px; letter-spacing: 6px; color: #ffd166; }
        .url { font-size: 12px; word-break: break-all; color: #9fb3ff; }
        .redes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        button { background: #1f2440; color: #e8eaf6; border: 1px solid #3a4170; border-radius: 8px; padding: 5px 9px;
          font-size: 11px; cursor: pointer; }
        button.act { border-color: #ffd166; color: #ffd166; }
        .cerrar { margin-top: 12px; background: #ffd166; color: #12152a; border: 0; font-weight: bold; font-size: 13px; padding: 7px 14px; }
        .aviso { position: fixed; top: 12px; left: 50%; transform: translate(-50%, -80px); z-index: 2147483002;
          background: rgba(11,13,23,.9); color: #e8eaf6; border: 1px solid #06d6a0; border-radius: 10px; padding: 8px 14px;
          font-size: 13px; transition: transform .3s; }
        .aviso.ver { transform: translate(-50%, 0); }
      </style>
      <div class="pastilla"><span class="p"></span><span class="t"></span></div>
      <div class="velo"><div class="tarjeta">
        <div class="qr"><img></div>
        <div>
          <h2></h2>
          <p class="paso1"></p>
          <p class="paso2"></p>
          <p><span class="etSala"></span> <span class="sala">····</span></p>
          <p class="url"></p>
          <div class="redes"></div>
          <button class="cerrar"></button>
        </div>
      </div></div>
      <div class="aviso"></div>`;
    const $ = (s) => raiz.querySelector(s);
    const pastilla = $('.pastilla'), velo = $('.velo');
    let info = null, elegida = 0, tenue, nPads = 0;

    // Textos fijos en el idioma del juego; se vuelven a poner si el juego cambia de idioma (observa <html lang>).
    function textos() {
      pastilla.title = tr('Control de celular', 'Phone controller');
      $('.qr img').alt = tr('QR para conectar el celular', 'QR code to connect your phone');
      $('h2').textContent = tr('📱 Usa tu celular como control', '📱 Use your phone as a controller');
      $('.paso1').innerHTML = PUBLICO
        ? tr('1. Tu celular solo necesita <b>internet</b> (no hace falta estar en la misma red).',
          '1. Your phone just needs <b>internet</b> (no need to be on the same network).')
        : tr('1. Celular y compu en la <b>misma red</b> (Wi-Fi o hotspot del celular).',
          '1. Phone and computer on the <b>same network</b> (Wi-Fi or the phone\'s hotspot).');
      $('.paso2').textContent = tr('2. Escanea el QR con la cámara y gira el celular.', '2. Scan the QR code with the camera and turn the phone sideways.');
      $('.etSala').textContent = tr('Código de sala:', 'Room code:');
      $('.cerrar').textContent = tr('Listo · jugar (Enter / Esc)', 'Done · play (Enter / Esc)');
      $('.pastilla .t').textContent = nPads
        ? tr(`Control · ${nPads} conectado${nPads > 1 ? 's' : ''}`, `Controller · ${nPads} connected`)
        : tr('Conectar celular', 'Connect phone');
      if (velo.classList.contains('abierto')) pintar();
    }
    textos();
    new MutationObserver(textos).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    async function cargarInfo() {
      if (PUBLICO) return pintar();
      try { info = await (await fetch(RELAY + 'info', { cache: 'no-store' })).json(); } catch { info = null; }
      pintar();
    }
    function pintarPublico() {
      $('.redes').innerHTML = '';
      if (!salaPublica?.sala || ws?.readyState !== 1) {
        $('.sala').textContent = '······';
        $('.qr img').removeAttribute('src');
        $('.url').textContent = tr('Conectando con el servidor del control…', 'Connecting to the controller server…');
        return;
      }
      const url = `${RELAY}?s=${salaPublica.sala}&lang=${idioma()}`;
      $('.sala').textContent = salaPublica.sala;
      $('.qr img').src = `${RELAY}qr.svg?u=${encodeURIComponent(url)}`;
      $('.url').textContent = url;
    }
    function pintar() {
      if (PUBLICO) return pintarPublico();
      if (!info) { $('.url').textContent = tr('No se pudo leer la red del relay.', 'Could not read the relay\'s network.'); return; }
      $('.sala').textContent = info.sala;
      const dirs = info.direcciones;
      if (!dirs.length) {
        $('.url').textContent = tr('Esta compu no tiene red: conéctala al Wi-Fi o al hotspot del celular.',
          'This computer has no network: connect it to Wi-Fi or to the phone\'s hotspot.');
        $('.qr img').removeAttribute('src');
        $('.redes').innerHTML = '';
        return;
      }
      elegida = Math.min(elegida, dirs.length - 1);
      const d = dirs[elegida];
      $('.qr img').src = `${RELAY}qr.svg?u=${encodeURIComponent(d.url)}`;
      $('.url').textContent = d.url;
      $('.redes').innerHTML = '';
      if (dirs.length > 1) {
        dirs.forEach((x, i) => {
          const b = document.createElement('button');
          b.textContent = `${x.nombre} · ${x.ip}`;
          if (i === elegida) b.className = 'act';
          b.onclick = () => { elegida = i; pintar(); };
          $('.redes').append(b);
        });
      }
    }
    const abrir = () => { velo.classList.add('abierto'); cargarInfo(); };
    const cerrar = () => velo.classList.remove('abierto');
    pastilla.onclick = () => (velo.classList.contains('abierto') ? cerrar() : abrir());
    $('.cerrar').onclick = cerrar;
    velo.onclick = (e) => { if (e.target === velo) cerrar(); };
    // Enter o Esc cierran el panel (playtest de Leo, A2). Se escucha en captura sobre window, antes que Phaser, y la
    // tecla no llega al juego: así cerrar el panel no pausa la prueba ni activa el botón del menú que esté enfocado.
    let cerradoCon = null; // su keyup tampoco llega
    window.addEventListener('keydown', (e) => {
      if (!velo.classList.contains('abierto') || (e.key !== 'Enter' && e.key !== 'Escape')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      cerradoCon = e.key;
      cerrar();
    }, true);
    window.addEventListener('keyup', (e) => {
      if (cerradoCon && e.key === cerradoCon) { e.stopImmediatePropagation(); cerradoCon = null; }
    }, true);
    // Si la red cambia con el panel abierto, el QR se actualiza.
    setInterval(() => { if (velo.classList.contains('abierto') && !PUBLICO) cargarInfo(); }, 4000);

    let tAviso;
    return {
      montar() { document.body.append(host); }, // el panel del QR se abre al tocar la pastilla (abrirlo solo tapaba el título; playtest de Leo)
      cerrar,
      repintar() { if (velo.classList.contains('abierto')) pintar(); },
      estado(ok) { $('.pastilla .p').classList.toggle('ok', ok); if (!ok) this.pads(0); this.repintar(); },
      pads(n) {
        nPads = n;
        textos();
        pastilla.classList.remove('tenue');
        clearTimeout(tenue);
        tenue = setTimeout(() => pastilla.classList.add('tenue'), n ? 4000 : 10000);
      },
      aviso(texto) {
        const a = $('.aviso');
        a.textContent = texto;
        a.classList.add('ver');
        clearTimeout(tAviso);
        tAviso = setTimeout(() => a.classList.remove('ver'), 2200);
      },
    };
  })();

  const iniciar = () => { ui.montar(); conectar(); };
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);
})();
