// Control de celular de MARSCEPTION: botones → WebSocket → relay en la compu → puente → teclas del juego.
(() => {
  const params = new URLSearchParams(location.search);
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } };
  const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

  // ------------------------------------------------------------ idioma
  const EN = (params.get('lang') ?? navigator.language ?? 'es').toLowerCase().startsWith('en');
  const T = {
    conectando: ['Conectando…', 'Connecting…'], sinPantalla: ['Abre el juego en la compu', 'Open the game on the computer'],
    listo: ['Conectado', 'Connected'], sinRed: ['Sin conexión · reintentando', 'Offline · retrying'],
    frenar: ['Frenar', 'Brake'], acelerar: ['Acelerar', 'Throttle'], pausa: ['Pausa', 'Pause'], datos: ['Datos', 'Data'],
    sonido: ['Sonido', 'Sound'], reanudar: ['Seguir', 'Resume'], abandonar: ['Abandonar', 'Quit'], atras: ['Atrás', 'Back'],
    control: ['Control de celular', 'Phone controller'], tocar: ['Toca para empezar', 'Tap to start'],
    consejoIOS: ['Consejo: Compartir → “Agregar a inicio” para verlo en pantalla completa.',
      'Tip: Share → “Add to Home Screen” for full screen.'],
    pideSala: ['Escribe el código de sala que aparece en la compu', 'Enter the room code shown on the computer'],
    entrar: ['Entrar', 'Join'], girar: ['Gira tu celular', 'Rotate your phone'],
    auto: ['Auto', 'Auto'], modoConducir: ['Conducir', 'Drive'], modoNavegar: ['Menús', 'Menus'],
    glass: ['Glass', 'Glass'], general: ['Clásico', 'Classic'],
    pestana: ['Pestaña', 'Tab'], quitar: ['Quitar', 'Remove'], igualar: ['Igualar ejes', 'Match axles'],
    ayuda: ['Ayuda', 'Help'], probar: ['Probar ▶', 'Test ▶'], analogia: ['Analogía', 'Analogy'], idioma: ['Idioma', 'Lang'],
    pausado: ['en pausa', 'paused'], condiciones: ['Condiciones', 'Conditions'],
  };
  const t = (k) => (T[k] ? T[k][EN ? 1 : 0] : k);
  document.documentElement.lang = EN ? 'en' : 'es';
  const traducir = (raiz = document) => raiz.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  traducir();

  // ------------------------------------------------------------ dispositivo y piel
  const ua = navigator.userAgent;
  const ES_IOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const ES_APPLE = ES_IOS || (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua));
  const STANDALONE = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches
    || navigator.standalone === true;
  let piel = params.get('piel') ?? leer('mc.piel') ?? (ES_APPLE ? 'glass' : 'general');
  function ponerPiel(p) {
    piel = p === 'glass' ? 'glass' : 'general';
    document.documentElement.classList.toggle('glass', piel === 'glass');
    document.documentElement.classList.toggle('general', piel !== 'glass');
    $('#bPiel').textContent = t(piel === 'glass' ? 'glass' : 'general');
  }
  const $ = (s) => document.querySelector(s);
  ponerPiel(piel);
  $('#bPiel').addEventListener('click', () => { ponerPiel(piel === 'glass' ? 'general' : 'glass'); guardar('mc.piel', piel); });
  if (!ES_IOS || STANDALONE) $('#consejoIOS').remove();

  // ------------------------------------------------------------ modo (auto según la escena del juego)
  const pad = $('#pad');
  let modo = leer('mc.modo') ?? 'auto'; // auto | conducir | navegar
  let escena = null;
  const CONDUCIR = new Set(['Prueba', 'Mision']);
  function modoEfectivo() { return modo === 'auto' ? (escena && CONDUCIR.has(escena.clave) ? 'conducir' : 'navegar') : modo; }
  function aplicarModo() {
    const m = modoEfectivo();
    if (pad.dataset.modo !== m) { soltarTodo(); pad.dataset.modo = m; }
    pad.dataset.pausado = escena?.pausado ? '1' : '0';
    $('#bModo').textContent = modo === 'auto' ? `${t('auto')} · ${t(m === 'conducir' ? 'modoConducir' : 'modoNavegar')}`
      : t(modo === 'conducir' ? 'modoConducir' : 'modoNavegar');
    $('#escena').textContent = escena?.clave ? `· ${escena.clave}${escena.pausado ? ` (${t('pausado')})` : ''}` : '';
    pintarContexto();
  }
  $('#bModo').addEventListener('click', () => {
    modo = { auto: 'conducir', conducir: 'navegar', navegar: 'auto' }[modo];
    guardar('mc.modo', modo);
    aplicarModo();
  });

  // Atajos de la fila central según la escena (las mismas teclas que ya entiende el juego).
  const CONTEXTO = {
    Taller: [['Tab', 'pestana'], ['Delete', 'quitar'], ['a', 'igualar'], ['h', 'ayuda'], ['c', 'probar']],
    Resultados: [['1', '1'], ['2', '2'], ['3', '3'], ['a', 'analogia']],
    Menu: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['l', 'idioma']],
    Expediente: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['i', 'datos'], ['c', 'condiciones']],
  };
  let contextoPintado = '';
  function pintarContexto() {
    const lista = CONTEXTO[escena?.clave] ?? [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['m', 'sonido']];
    const firma = JSON.stringify(lista) + EN;
    if (firma === contextoPintado) return;
    contextoPintado = firma;
    const c = $('#contexto');
    c.innerHTML = '';
    for (const [k, etiqueta] of lista) {
      const b = document.createElement('div');
      b.className = 'btn atajo';
      b.dataset.k = k;
      b.innerHTML = '<span class="txt"></span>';
      b.firstChild.textContent = t(etiqueta);
      // Etiqueta de la tecla real (ayuda a quien también juega con teclado); los números ya son su tecla.
      const tecla = { Tab: 'Tab', Delete: EN ? 'Del' : 'Supr', Escape: 'Esc' }[k] ?? (/^[a-z]$/.test(k) ? k.toUpperCase() : null);
      if (tecla) { const s = document.createElement('span'); s.className = 'tecla'; s.textContent = tecla; b.append(s); }
      else b.classList.add('num');
      c.append(b);
    }
  }

  // ------------------------------------------------------------ vibración
  const haptico = $('#haptico');
  function vibrar(ms = 8) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* sin permiso */ } }
    else if (ES_IOS) { try { haptico.click(); } catch { /* iOS < 18 */ } }
  }

  // ------------------------------------------------------------ toques → teclas
  // Cada dedo apunta a un botón; si el dedo se desliza a otro botón, cambia de tecla (como un control físico).
  const dedos = new Map(); // pointerId → elemento
  const activas = new Map(); // tecla → elemento
  const cruz = $('.cruz');
  const FLECHAS = { ArrowRight: 0, ArrowDown: 90, ArrowLeft: 180, ArrowUp: 270 };
  // La cruceta es UNA zona (como un control físico): la dirección sale del ángulo del dedo respecto al centro, así que
  // las diagonales, el centro y un margen alrededor también cuentan. Antes, un dedo en la diagonal no mandaba nada.
  function flechaEn(x, y, previa) {
    if (pad.dataset.modo !== 'navegar') return undefined;
    const r = cruz.getBoundingClientRect();
    const m = r.width * 0.14;
    if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) return undefined;
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.08) return previa ?? null; // centro: se queda con la dirección que traía
    const ang = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const dif = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
    // Histéresis: cerca de la diagonal se conserva la flecha actual (no parpadea entre dos).
    const k = previa?.dataset.k;
    if (k in FLECHAS && dif(ang, FLECHAS[k]) < 55) return previa;
    const elegida = Object.keys(FLECHAS).reduce((a, b) => (dif(ang, FLECHAS[a]) <= dif(ang, FLECHAS[b]) ? a : b));
    return cruz.querySelector(`[data-k="${elegida}"]`);
  }
  function botonEn(x, y, previa = null) {
    const el = document.elementFromPoint(x, y)?.closest('[data-k]');
    const directo = el && pad.contains(el) ? el : null;
    // Un botón de otra zona (atajos, OK) gana sobre el margen de la cruceta.
    if (directo && !cruz.contains(directo)) return directo;
    const f = flechaEn(x, y, previa && cruz.contains(previa) ? previa : null);
    return f === undefined ? directo : f;
  }
  function recalcular() {
    const quiero = new Map();
    for (const el of dedos.values()) if (el) quiero.set(el.dataset.k, el);
    for (const [k, el] of activas) {
      if (!quiero.has(k)) { activas.delete(k); el.classList.remove('on'); mandar({ t: 'k', k, d: 0 }); }
    }
    for (const [k, el] of quiero) {
      if (!activas.has(k)) {
        activas.set(k, el);
        el.classList.add('on');
        vibrar();
        mandar({ t: 'k', k, d: 1, r: el.dataset.r === '1' ? 1 : 0 });
      }
    }
  }
  function luz(el, e) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--y', `${((e.clientY - r.top) / r.height) * 100}%`);
  }
  function soltarTodo() {
    dedos.clear();
    for (const el of activas.values()) el.classList.remove('on');
    activas.clear();
    mandar({ t: 'soltar' });
  }

  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { e.target.releasePointerCapture?.(e.pointerId); } catch { /* sin captura */ }
    const el = botonEn(e.clientX, e.clientY);
    dedos.set(e.pointerId, el);
    luz(el, e);
    recalcular();
  }, { passive: false });
  // Mover y soltar se escuchan en toda la ventana: si el dedo sale del control (a la barra o al borde) y se suelta
  // ahí, el pointerup no llega a #pad. Antes la tecla se quedaba presionada y ese botón dejaba de responder.
  window.addEventListener('pointermove', (e) => {
    if (!dedos.has(e.pointerId)) return;
    const el = botonEn(e.clientX, e.clientY, dedos.get(e.pointerId));
    luz(el, e);
    if (el !== dedos.get(e.pointerId)) { dedos.set(e.pointerId, el); recalcular(); }
  });
  const fin = (e) => { if (dedos.delete(e.pointerId)) recalcular(); };
  window.addEventListener('pointerup', fin);
  window.addEventListener('pointercancel', fin);
  // Respaldo: si un navegador pierde un pointerup, al no quedar ningún dedo en la pantalla se suelta todo.
  window.addEventListener('touchend', (e) => { if (!e.touches.length && dedos.size) { dedos.clear(); recalcular(); } });
  window.addEventListener('touchcancel', (e) => { if (!e.touches.length && dedos.size) { dedos.clear(); recalcular(); } });
  // iOS: sin lupa, sin menú de pulsación larga, sin zoom con dos dedos.
  pad.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  // Si el celular se bloquea o se cambia de app, se suelta todo (nunca queda el acelerador pegado).
  document.addEventListener('visibilitychange', () => { if (document.hidden) soltarTodo(); });
  window.addEventListener('pagehide', soltarTodo);
  window.addEventListener('blur', soltarTodo);

  // ------------------------------------------------------------ pantalla completa
  async function pantallaCompleta() {
    const d = document.documentElement;
    if (!document.fullscreenElement && d.requestFullscreen) {
      try { await d.requestFullscreen({ navigationUI: 'hide' }); } catch { /* iPhone: no hay API */ }
    }
    try { await screen.orientation?.lock?.('landscape'); } catch { /* no soportado */ }
  }
  $('#bPantalla').addEventListener('click', pantallaCompleta);
  if (!document.documentElement.requestFullscreen) $('#bPantalla').remove();
  // 'click' y no 'pointerdown': un pointerdown táctil no cuenta como gesto del usuario para el navegador, y sin gesto
  // Android rechaza la pantalla completa y la vibración.
  $('#inicio').addEventListener('click', (e) => {
    e.preventDefault();
    vibrar(15);
    if (!ES_IOS) pantallaCompleta();
    $('#inicio').classList.add('oculto');
  });

  // ------------------------------------------------------------ conexión
  let sala = params.get('s') ?? leer('mc.sala') ?? '';
  let ws = null;
  let espera = 400;
  let pantallaLista = false;
  let tPing = 0;
  function mandar(m) { if (ws?.readyState === 1) ws.send(JSON.stringify(m)); }
  function estado(clase, texto) {
    $('#punto').className = `punto ${clase}`;
    $('#estado').textContent = texto;
  }

  // Vigía: iOS congela la página en segundo plano y al volver el socket puede seguir "abierto" pero muerto.
  // El relay contesta cada ping (cada 2 s); si en 5 s no llega nada, se cierra y se reconecta.
  let ultimoMensaje = 0;
  let tRecon = 0;
  setInterval(() => {
    if (ws?.readyState === 1 && performance.now() - ultimoMensaje > 5000) ws.close();
  }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || ws?.readyState !== 1) return;
    ultimoMensaje = performance.now() - 3500; // al volver, si en 1.5 s no responde, se reconecta
    mandar({ t: 'p', ts: performance.now() });
  });

  function conectar() {
    clearTimeout(tRecon);
    if (!/^\d{4}$/.test(sala)) { pedirSala(); return; }
    if (ws && ws.readyState <= 1) { ws.onclose = null; ws.close(); }
    estado('', t('conectando'));
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const este = new WebSocket(`${proto}://${location.host}/ws?rol=pad&sala=${sala}`);
    ws = este;
    este.onopen = () => {
      espera = 400;
      ultimoMensaje = performance.now();
      guardar('mc.sala', sala);
      $('#sinSala').classList.add('oculto');
      clearInterval(tPing);
      tPing = setInterval(() => mandar({ t: 'p', ts: performance.now() }), 2000);
      mandar({ t: 'p', ts: performance.now() });
    };
    este.onmessage = (e) => {
      ultimoMensaje = performance.now();
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.t === 'estado') {
        pantallaLista = m.pantalla;
        estado(pantallaLista ? 'ok' : 'medio', t(pantallaLista ? 'listo' : 'sinPantalla'));
        escena = m.escena;
        aplicarModo();
      } else if (m.t === 'p') {
        $('#ping').textContent = `${Math.round(performance.now() - m.ts)} ms`;
      } else if (m.t === 'vibrar') vibrar(m.ms);
    };
    este.onclose = (e) => {
      if (ws !== este) return; // un socket viejo no programa reconexiones
      clearInterval(tPing);
      for (const el of activas.values()) el.classList.remove('on');
      activas.clear();
      dedos.clear();
      $('#ping').textContent = '';
      if (e.code === 4001) { sala = ''; guardar('mc.sala', ''); pedirSala(); return; }
      estado('mal', t('sinRed'));
      tRecon = setTimeout(conectar, espera);
      espera = Math.min(espera * 2, 3000);
    };
  }

  function pedirSala() {
    $('#inicio').classList.add('oculto');
    $('#sinSala').classList.remove('oculto');
    setTimeout(() => $('#campoSala').focus(), 50);
  }
  $('#formSala').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#campoSala').value.trim();
    if (!/^\d{4}$/.test(v)) return;
    sala = v;
    params.set('s', v); // conserva ?piel= y ?lang=
    history.replaceState(null, '', `?${params}`);
    conectar();
  });

  aplicarModo();
  conectar();
})();
