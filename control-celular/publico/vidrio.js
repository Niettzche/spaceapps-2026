// Liquid glass con WebGL para la piel "glass".
//
// Safari no soporta refracción con CSS (backdrop-filter: url(#svg) solo existe en Chromium), así que el vidrio se dibuja
// con un shader: un lienzo detrás de los botones pinta el fondo animado y, encima, cada botón como una lente de vidrio
// que dobla el fondo en los bordes (refracción), separa un poco los colores (aberración cromática), tiene un filo de luz
// que mira hacia el dedo (especular) y sombra suave. Al presionar, el botón se infla y rebota con un resorte (gelatina).
//
// Los botones siguen siendo elementos HTML: los toques, el texto y la accesibilidad no cambian. Si no hay WebGL, el
// shader no compila o el contexto se pierde, se queda el vidrio de CSS (pad.css) sin hacer nada más.
(() => {
  const MAX = 24;
  const raiz = document.documentElement;
  const lienzo = document.createElement('canvas');
  lienzo.id = 'vidrio';
  lienzo.setAttribute('aria-hidden', 'true');

  const gl = lienzo.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  if (!gl) return;

  const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;      // tamaño del lienzo en px
uniform float uT;       // tiempo (s)
uniform float uE;       // px de lienzo por px CSS
uniform int uN;         // botones visibles
uniform vec4 uR[${MAX}];  // centro x, centro y, media anchura, media altura (px de lienzo, y hacia abajo)
uniform vec4 uP[${MAX}];  // radio, presión (resorte, puede pasar de 1), aparición (0..1), brillo extra
uniform vec3 uC[${MAX}];  // tinte
uniform vec2 uL;        // posición de la luz (px de lienzo)

float caja(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 mancha(vec2 u, vec2 c, float r, vec3 col) { vec2 d = u - c; return col * exp(-dot(d, d) / (r * r)); }

// Fondo: degradado espacial + manchas de color que flotan (lo que el vidrio deja ver y dobla).
vec3 fondo(vec2 p) {
  vec2 u = p / uRes.y;
  float a = uRes.x / uRes.y;
  float t = uT;
  vec3 c = mix(vec3(0.10, 0.11, 0.27), vec3(0.04, 0.04, 0.09), clamp(u.y * 0.9 + u.x * 0.15 / a, 0.0, 1.0));
  c += mancha(u, vec2(a * (0.16 + 0.10 * sin(t * 0.21)), 0.70 + 0.12 * cos(t * 0.17)), 0.42, vec3(1.00, 0.45, 0.20) * 0.95);
  c += mancha(u, vec2(a * (0.86 + 0.08 * cos(t * 0.15)), 0.12 + 0.14 * sin(t * 0.19)), 0.40, vec3(0.33, 0.45, 1.00) * 0.95);
  c += mancha(u, vec2(a * (0.52 + 0.14 * sin(t * 0.11 + 1.0)), 1.05 + 0.10 * sin(t * 0.23)), 0.34, vec3(0.75, 0.30, 1.00) * 0.85);
  c += mancha(u, vec2(a * (0.70 + 0.10 * sin(t * 0.27 + 2.0)), 0.52 + 0.16 * cos(t * 0.13)), 0.20, vec3(0.18, 0.88, 0.75) * 0.55);
  return c;
}

float azar(vec2 v) { return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
float estrellas(vec2 p) {
  float celda = 34.0 * uE;
  vec2 g = floor(p / celda);
  float h = azar(g);
  vec2 pos = (g + vec2(azar(g + 3.1), azar(g + 7.7))) * celda;
  float d = length(p - pos);
  return step(0.55, h) * (1.0 - smoothstep(0.0, 1.3 * uE, d)) * (0.35 + 0.45 * sin(uT * 1.7 + h * 50.0));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 col = fondo(p) + vec3(estrellas(p));

  // Botón más cercano (se copian sus datos: WebGL 1 no deja indexar uniformes con una variable).
  float dmin = 1e5;
  vec4 R = vec4(0.0); vec4 P = vec4(0.0); vec3 C = vec3(1.0);
  vec2 hb = vec2(1.0); float rad = 0.0;
  float sombra = 0.0;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= uN) break;
    vec4 r = uR[i]; vec4 q = uP[i];
    float s = (0.86 + 0.14 * q.z) * (1.0 + 0.045 * q.y);   // aparece creciendo; al presionar se infla
    vec2 b = r.zw * s;
    float rr = min(q.x * s, min(b.x, b.y));
    float d = caja(p - r.xy, b, rr);
    float ds = caja(p - r.xy - vec2(0.0, (7.0 - 4.0 * clamp(q.y, 0.0, 1.0)) * uE), b, rr);
    sombra = max(sombra, (1.0 - smoothstep(-6.0 * uE, 20.0 * uE, ds)) * 0.42 * q.z);
    if (d < dmin) { dmin = d; R = r; P = q; C = uC[i]; hb = b; rad = rr; }
  }
  col *= 1.0 - sombra;

  if (dmin < 1.5 * uE) {
    vec2 c = R.xy;
    float pr = clamp(P.y, 0.0, 1.3);
    // normal del borde (gradiente de la distancia)
    float e = uE;
    vec2 n = vec2(caja(p + vec2(e, 0.0) - c, hb, rad) - caja(p - vec2(e, 0.0) - c, hb, rad),
                  caja(p + vec2(0.0, e) - c, hb, rad) - caja(p - vec2(0.0, e) - c, hb, rad));
    n = n / max(length(n), 1e-4);
    float dentro = max(-dmin, 0.0);
    float bisel = min(min(hb.x, hb.y) * 0.9, 24.0 * uE);
    float k = clamp(1.0 - dentro / bisel, 0.0, 1.0);   // 1 en el borde, 0 en el centro plano
    float curva = k * k * k;

    // Refracción: el centro amplía un poco el fondo; el bisel lo dobla hacia afuera (lente).
    vec2 base = c + (p - c) * (0.90 - 0.05 * pr);
    vec2 off = -n * curva * bisel * 1.35;
    float ab = 0.10 + 0.10 * curva;
    vec3 g;
    g.r = fondo(base + off * (1.0 + ab)).r;
    g.g = fondo(base + off).g;
    g.b = fondo(base + off * (1.0 - ab)).b;
    // Las estrellas también pasan por la lente: se ven ampliadas y dobladas en el borde (la pista de que es vidrio).
    g += vec3(0.85, 0.9, 1.0) * estrellas(base + off) * 0.8;

    // Vidrio: un poco más claro y del color de su tinte; más luminoso al presionar.
    g = mix(g, vec3(1.0), 0.07 + 0.10 * pr + P.w);
    g = g * mix(vec3(1.0), C, 0.55) + C * (0.05 + 0.10 * pr);

    // Luz: filo brillante del lado de la luz, filo tenue del lado opuesto, brillo interno cerca del borde.
    vec2 L = normalize(uL - c + vec2(1e-3));
    float filo = 1.0 - smoothstep(0.0, 2.2 * uE, dentro);
    float frente = pow(max(dot(n, L), 0.0), 2.5);
    float atras = pow(max(dot(n, -L), 0.0), 2.5);
    g += vec3(1.0) * filo * (0.20 + 0.75 * frente + 0.35 * atras);
    g += vec3(1.0) * curva * (0.06 + 0.16 * frente);
    // brillo especular suave que se mueve con la luz
    vec2 hp = c + (uL - c) * 0.18;
    vec2 dh = (p - hp) / max(hb, vec2(1.0));
    g += vec3(1.0) * 0.10 * exp(-dot(dh, dh) * 2.2) * (0.6 + pr);

    float a = clamp(0.5 - dmin / uE, 0.0, 1.0) * clamp(P.z * 1.5, 0.0, 1.0);
    col = mix(col, g, a);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

  function compilar(tipo, src) {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[vidrio]', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = compilar(gl.VERTEX_SHADER, VS);
  const fs = compilar(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[vidrio]', gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uRes', 'uT', 'uE', 'uN', 'uR', 'uP', 'uC', 'uL']) U[n] = gl.getUniformLocation(prog, n);
  const datosR = new Float32Array(MAX * 4);
  const datosP = new Float32Array(MAX * 4);
  const datosC = new Float32Array(MAX * 3);

  // ---------------------------------------------------------------- tintes por botón
  const TINTE = {
    neutro: [0.92, 0.95, 1.0], naranja: [1.0, 0.62, 0.42], azul: [0.55, 0.70, 1.0], rosa: [1.0, 0.55, 0.75],
    verde: [0.45, 1.0, 0.80], rojo: [1.0, 0.45, 0.50], violeta: [0.80, 0.62, 1.0],
  };
  function tinte(el) {
    if (el.classList.contains('verde')) return TINTE.verde;
    if (el.classList.contains('rojo')) return TINTE.rojo;
    if (el.classList.contains('a')) return TINTE.azul;
    if (el.classList.contains('b')) return TINTE.rosa;
    if (el.classList.contains('grande')) return el.dataset.k === 'ArrowLeft' ? TINTE.naranja : TINTE.azul;
    if (el.classList.contains('flecha')) return TINTE.violeta;
    return TINTE.neutro;
  }

  // ---------------------------------------------------------------- resortes (gelatina)
  const estado = new WeakMap(); // el → { pr, vpr, ap, vap }
  function resorte(x, v, meta, dt, k, amort) {
    const a = k * (meta - x) - amort * v;
    v += a * dt;
    return [x + v * dt, v];
  }

  // ---------------------------------------------------------------- luz (sigue al dedo; si no, flota arriba a la izquierda)
  let luzMeta = null, luz = [0, 0], ultimoToque = -1e9;
  const alMover = (e) => { luzMeta = [e.clientX, e.clientY]; ultimoToque = performance.now(); };
  window.addEventListener('pointerdown', alMover, { capture: true, passive: true });
  window.addEventListener('pointermove', (e) => { if (e.pressure > 0 || e.buttons) alMover(e); }, { capture: true, passive: true });

  // ---------------------------------------------------------------- tamaño y calidad adaptativa
  let esc = Math.min(window.devicePixelRatio || 1, 1.5);
  let ancho = 0, alto = 0;
  function medir() {
    const w = Math.round(innerWidth * esc), h = Math.round(innerHeight * esc);
    if (w !== ancho || h !== alto) { ancho = lienzo.width = w; alto = lienzo.height = h; gl.viewport(0, 0, w, h); }
  }
  let tiempos = [];
  function vigilarRendimiento(dt) {
    tiempos.push(dt);
    if (tiempos.length < 90) return;
    const prom = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    tiempos = [];
    if (prom > 24 && esc > 0.6) { esc = Math.max(0.6, esc - 0.25); medir(); }
  }

  // ---------------------------------------------------------------- bucle
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  let activo = false, raf = 0, previo = 0, t0 = performance.now(), saltar = 0;
  function cuadro(ahora) {
    raf = requestAnimationFrame(cuadro);
    const dt = Math.min(0.05, (ahora - previo) / 1000 || 0.016);
    previo = ahora;
    // Ahorro: sin toques en 6 s y sin resortes moviéndose, se dibuja a ~20 fps.
    const ocupado = ahora - ultimoToque < 6000;
    let mueve = false;

    medir();
    const els = document.querySelectorAll('#pad .btn, #barra .chip');
    let n = 0;
    for (const el of els) {
      if (n >= MAX) break;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) { estado.delete(el); continue; }
      let s = estado.get(el);
      if (!s) {
        // border-radius puede venir en % (botones redondos: 50 %) o en px.
        const br = getComputedStyle(el).borderTopLeftRadius;
        s = { pr: 0, vpr: 0, ap: 0, vap: 0, radio: parseFloat(br) || 0, pct: br.trim().endsWith('%') };
        estado.set(el, s);
      }
      [s.pr, s.vpr] = resorte(s.pr, s.vpr, el.classList.contains('on') ? 1 : 0, dt, 420, 15);
      [s.ap, s.vap] = resorte(s.ap, s.vap, 1, dt, 160, 13);
      if (Math.abs(s.vpr) > 0.01 || Math.abs(s.vap) > 0.01) mueve = true;
      const radio = s.pct ? (Math.min(r.width, r.height) * s.radio) / 100 : s.radio;
      datosR.set([(r.left + r.width / 2) * esc, (r.top + r.height / 2) * esc, (r.width / 2) * esc, (r.height / 2) * esc], n * 4);
      datosP.set([radio * esc, s.pr, Math.min(s.ap, 1.08), 0], n * 4);
      datosC.set(tinte(el), n * 3);
      n++;
    }
    if (!ocupado && !mueve && (saltar++ % 3)) return;

    const t = quieto.matches ? 8 : (ahora - t0) / 1000;
    const def = [innerWidth * (0.22 + 0.06 * Math.sin(t * 0.3)), -innerHeight * 0.25];
    const meta = luzMeta && ocupado ? luzMeta : def;
    luz = [luz[0] + (meta[0] - luz[0]) * Math.min(1, dt * 8), luz[1] + (meta[1] - luz[1]) * Math.min(1, dt * 8)];

    gl.uniform2f(U.uRes, ancho, alto);
    gl.uniform1f(U.uT, t);
    gl.uniform1f(U.uE, esc);
    gl.uniform1i(U.uN, n);
    gl.uniform4fv(U.uR, datosR);
    gl.uniform4fv(U.uP, datosP);
    gl.uniform3fv(U.uC, datosC);
    gl.uniform2f(U.uL, luz[0] * esc, luz[1] * esc);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    vigilarRendimiento(dt * 1000);
  }

  let perdido = false;
  function encender() {
    if (activo || perdido) return;
    activo = true;
    if (!lienzo.isConnected) document.body.prepend(lienzo);
    luz = [innerWidth * 0.22, -innerHeight * 0.25];
    raiz.classList.add('gl');
    previo = performance.now();
    raf = requestAnimationFrame(cuadro);
  }
  function apagar() {
    if (!activo) return;
    activo = false;
    cancelAnimationFrame(raf);
    raiz.classList.remove('gl');
  }
  const decidir = () => (raiz.classList.contains('glass') && !document.hidden ? encender() : apagar());
  new MutationObserver(decidir).observe(raiz, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', decidir);
  // Si el sistema le quita el contexto WebGL (poca memoria), se vuelve al vidrio de CSS para siempre en esta visita.
  lienzo.addEventListener('webglcontextlost', (e) => { e.preventDefault(); perdido = true; apagar(); lienzo.remove(); }, false);
  window.__vidrio = { encendido: () => activo, escala: () => esc };
  decidir();
})();
