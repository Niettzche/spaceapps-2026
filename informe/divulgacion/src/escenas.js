// Una función por escena 3D. Cada escena vive en una sección «cine»: la imagen queda fija y el texto pasa encima.
// Devuelve { paso(i), progreso(i, p) }: el paso es la toma (cambia la escena y mueve la cámara) y el progreso (0–1)
// permite que algunas tomas avancen con el scroll (el relleno del cráter).
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { crearEscenario, luces, muelle, color, movimientoReducido } from './escenario.js';
import { crearRelieve, crearColumnas } from './relieve.js';

// Tonos de superficie ilustrativos (no son reflectancia medida), tomados de las paletas del juego (assets/paletas.json):
// Tierra arenosa y cálida, Luna gris frío, Marte óxido. La identidad de cada mundo la dan los rótulos.
const SUPERFICIE = { tierra: 0xc49a6c, luna: 0x9c9caa, marte: 0xa8664a };
const LINEA = 0x16130f;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function etiqueta(html, clase) {
  const div = document.createElement('div');
  div.className = clase;
  div.innerHTML = html;
  return new CSS2DObject(div);
}

// El texto va en su propia columna (no encima de la escena), así que la escena usa todo su lienzo.
function zonaCine(e) {
  if (!e.contenedor.classList.contains('pelicula-acto')) return { izq: 0, abajo: 0 };
  return { izq: 0, abajo: e.ancho < 700 ? 0.3 : 0.16 };
}

// Distancia a la que las 8 esquinas de `caja` caben en la zona libre, mirando desde `dir` hacia `objetivo`.
// suave: la cámara viaja hasta ahí (toma); si no, salta.
function encuadrar(e, caja, margen = 1.08, { dir = null, objetivo = null, suave = false } = {}) {
  const cam = e.camera;
  const { min: a, max: b } = caja;
  const esquinas = [];
  for (const x of [a.x, b.x]) for (const y of [a.y, b.y]) for (const z of [a.z, b.z]) esquinas.push(V(x, y, z));
  const obj = (objetivo ?? caja.getCenter(new THREE.Vector3())).clone();
  const d0 = (dir ?? e.inicio.posicion.clone().sub(e.inicio.objetivo)).clone().normalize();
  const { izq = 0, abajo = 0 } = e.zona || {};
  const guardaP = cam.position.clone(), guardaQ = cam.quaternion.clone();
  const v = new THREE.Vector3();
  const cabe = (d) => {
    cam.position.copy(obj).addScaledVector(d0, d);
    cam.lookAt(obj);
    cam.updateMatrixWorld();
    return esquinas.every((p) => {
      v.copy(p).project(cam);
      return Math.abs(v.x - izq) <= (1 - izq) / margen && Math.abs(v.y - abajo) <= (1 - abajo) / margen && v.z < 1;
    });
  };
  let lo = 0.3, hi = 80;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (cabe(m)) hi = m; else lo = m; }
  const destino = obj.clone().addScaledVector(d0, hi);
  e.inicio.posicion.copy(destino); e.inicio.objetivo.copy(obj);
  cam.position.copy(guardaP); cam.quaternion.copy(guardaQ);
  if (suave) e.irA(destino, obj);
  else { cam.position.copy(destino); e.controls?.target.copy(obj); cam.lookAt(obj); }
  return destino;
}
const cajaDe = (x0, y0, z0, x1, y1, z1) => new THREE.Box3(V(x0, y0, z0), V(x1, y1, z1));
const cajaRelieve = (r, cx = 0, cz = 0, k = 1) => cajaDe(cx - (r.lado * k) / 2, r.base * k, cz - (r.lado * k) / 2, cx + (r.lado * k) / 2, r.maxY * k, cz + (r.lado * k) / 2);

/* ── Introducción: El Elegante con un Sol bajo que gira ────────────────── */
export function portada(el, { relieves }) {
  const s = relieves.sitios.MX0008;
  const e = crearEscenario(el, { posicion: [0, 2.2, 3.9], objetivo: [0, -0.12, 0], sombras: true, polarMin: 0.3, polarMax: 1.2, zona: zonaCine, deriva: 0.35 });
  const r = crearRelieve(s.tierra, { lado: 3, exag: 2, colorBase: SUPERFICIE.tierra, colorLinea: LINEA, intervalo: 20 });
  e.scene.add(r.grupo);
  const l = luces(e.scene, { elevacion: 16, azimut: 140, intensidad: 3, sombras: true, tam: 2.4 });
  let az = 140;
  e.alActualizar.push((dt) => {
    if (movimientoReducido.matches) return;
    az = (az + dt * 7) % 360;                      // una vuelta del Sol cada ~50 s
    l.colocar(16 + 4 * Math.sin(THREE.MathUtils.degToRad(az * 2)), az);
  });
  e.alRedimensionar.push(() => encuadrar(e, cajaRelieve(r), 1.02, { dir: V(0, 0.55, 1) }));
  return {
    progreso(_i, p) {                              // acercamiento lento mientras se lee
      if (movimientoReducido.matches || e.toma) return;
      r.grupo.rotation.y = -0.35 * p;
    },
  };
}

/* ── 01: la misma regla en tres mundos ─────────────────────────────────── */
export function regla(el, { relieves }, ctx) {
  const s = relieves.sitios.MX0008;
  const mundos = ['tierra', 'luna', 'marte'];
  const e = crearEscenario(el, { posicion: [0, 4.6, 7.2], objetivo: [0, -0.15, 0], sombras: true, polarMin: 0.35, polarMax: 1.25, etiquetas: true, zona: zonaCine, deriva: 0.12 });
  luces(e.scene, { elevacion: 24, azimut: 130, intensidad: 2.8, sombras: true, tam: 8 });

  const piezas = mundos.map((m) => {
    const rel = s[m];
    const r = crearRelieve(rel, { lado: rel.km, exag: 2, colorBase: SUPERFICIE[m], colorLinea: LINEA, intervalo: 20 });
    const rot = etiqueta(`<i></i><b>${m}</b>`, 'rotulo');
    rot.element.dataset.cuerpo = m;
    rot.position.set(0, r.base, rel.km / 2 + 0.35);
    r.grupo.add(rot);
    e.scene.add(r.grupo);
    return { m, r, rot, km: rel.km, x: muelle(0, 0.7), z: muelle(0, 0.7), esc: muelle(1, 0.7), vis: muelle(m === 'tierra' ? 1 : 0, 0.9) };
  });

  let paso = 0;
  const movil = () => e.ancho < 900;
  function disponer(suave = true) {
    const forma = paso >= 2;
    const lados = piezas.map((p) => (forma ? 3 : p.km));
    const visibles = paso === 0 ? [true, false, false] : [true, true, true];
    const hueco = 0.8;
    const total = lados.reduce((a, l, i) => a + (visibles[i] ? l : 0), 0) + hueco * (visibles.filter(Boolean).length - 1);
    let c = -total / 2;
    piezas.forEach((p, i) => {
      p.esc.meta = lados[i] / p.km;
      p.vis.meta = visibles[i] ? 1 : 0;
      const centro = visibles[i] ? c + lados[i] / 2 : 0;
      if (visibles[i]) c += lados[i] + hueco;
      if (movil()) { p.x.meta = 0; p.z.meta = centro; } else { p.x.meta = centro; p.z.meta = 0; }
      if (!suave) { p.x.valor = p.x.meta; p.z.valor = p.z.meta; p.esc.valor = p.esc.meta; p.vis.valor = p.vis.meta; }
    });
    const cajas = piezas.filter((p) => p.vis.meta > 0.5).map((p) => {
      const k = cajaRelieve(p.r, p.x.meta, p.z.meta, p.esc.meta);
      k.min.y = Math.min(k.min.y, p.r.base * p.esc.meta - 0.3);
      return k;
    });
    const caja = cajas.reduce((a, k) => a.union(k), new THREE.Box3());
    const dirs = movil() ? [V(0, 1.1, 1), V(0.1, 1.6, 0.7), V(-0.1, 1.5, 0.75)] : [V(0.2, 0.6, 1), V(0, 0.75, 1), V(-0.15, 0.7, 1)];
    encuadrar(e, caja, 1.04, { dir: dirs[paso], suave });
  }

  e.alActualizar.push((dt) => {
    for (const p of piezas) {
      p.x.paso(dt); p.z.paso(dt); p.esc.paso(dt); p.vis.paso(dt);
      const v = Math.max(0, Math.min(1, p.vis.valor));
      p.r.grupo.position.set(p.x.valor, -(1 - v) * 2.5, p.z.valor);   // los gemelos suben desde abajo
      p.r.grupo.scale.setScalar(Math.max(p.esc.valor * (0.8 + 0.2 * v), 1e-3));
      p.r.grupo.visible = v > 0.02;
    }
  });
  e.alRedimensionar.push(() => disponer(false));

  const fichas = document.getElementById('regla-fichas');
  const textos = () => {
    const D = ctx.din();
    piezas.forEach((p) => { p.rot.element.querySelector('b').textContent = D[p.m]; });
    fichas.innerHTML = `
      <p data-cuerpo="tierra"><b>${D.tierra}</b>${D.fichaTierra(s)}</p>
      <p data-cuerpo="luna"><b>${D.luna}</b>${D.fichaLuna(s.luna.gemelo)}</p>
      <p data-cuerpo="marte"><b>${D.marte}</b>${D.fichaMarte(s.marte)}</p>`;
  };
  ctx.alCambiarIdioma(textos);
  textos();
  return { paso(i) { paso = Math.min(i, 2); disponer(true); } };
}

/* ── 02: por qué 200 m ─────────────────────────────────────────────────── */
export function resolucion(el, { relieves }, ctx) {
  const s = relieves.sitios.MX0008;
  const e = crearEscenario(el, { posicion: [0, 3.4, 2.6], objetivo: [0, -0.15, 0], sombras: true, polarMin: 0.25, polarMax: 1.2, zona: zonaCine, deriva: 0.2 });
  luces(e.scene, { elevacion: 26, azimut: 125, intensidad: 2.8, sombras: true, tam: 2.4 });
  const ref = crearRelieve(s.tierra, { lado: 3, exag: 2, falda: false });
  const base = ref.base;
  let actual = null, res = 0;
  const crec = muelle(1, 0.6);
  const lectura = document.getElementById('res-lectura');

  function usar(resM) {
    if (resM === res) return;
    res = resM;
    if (actual) { e.scene.remove(actual.malla); actual.malla.geometry.dispose(); actual.malla.material.dispose(); }
    actual = crearColumnas(s.tierra, { lado: 3, exag: 2, resM, colorBase: SUPERFICIE.tierra, base });
    e.scene.add(actual.malla);
    crec.valor = 0.15; crec.vel = 0; crec.meta = 1;
    actual.fijar(movimientoReducido.matches ? 1 : 0.15);
    escribir();
  }
  const escribir = () => {
    const n = Math.round((s.diam_km * 1000) / res);
    lectura.innerHTML = ctx.din().pixeles(n, res);
  };
  e.alActualizar.push((dt) => {
    if (!actual || crec.valor === crec.meta) return;
    actual.fijar(crec.paso(dt));
  });
  const dirs = [V(0.1, 0.8, 1), V(0.45, 1.1, 0.8), V(-0.4, 1.4, 0.7)];
  let paso = 0;
  e.alRedimensionar.push(() => encuadrar(e, cajaRelieve(ref), 1.04, { dir: dirs[paso] }));
  ctx.alCambiarIdioma(escribir);
  usar(80);
  return {
    paso(i) {
      paso = Math.min(i, 2);
      usar([80, 200, 463][paso]);
      encuadrar(e, cajaRelieve(ref), 1.04, { dir: dirs[paso], suave: true });
    },
  };
}

/* ── 03: profundidad entre diámetro (ilustración en corte) ─────────────── */
export function profundidad(el, { nube }, ctx) {
  const e = crearEscenario(el, { posicion: [0.35, 0.95, 4.6], objetivo: [0, -0.12, -0.5], polarMin: 0.6, polarMax: 1.45, etiquetas: true, zona: zonaCine, deriva: 0.1 });
  e.controls.minAzimuthAngle = -0.8;
  e.controls.maxAzimuthAngle = 0.8;
  luces(e.scene, { elevacion: 38, azimut: 60, intensidad: 2.6 });

  const R = 1, D = 2 * R, hBorde = 0.04 * D;        // borde ≈ 0.04 D en un cráter simple fresco
  const ddFresco = 0.2;
  const fondo0 = hBorde - ddFresco * D;
  const zMax = hBorde - 0.015 * D;                 // con relleno total queda d/D ≈ 0.015
  const L = 2.2, N = 150, BASE = -0.62;
  const roca = new THREE.Color(0x8e8c8a), sedimento = new THREE.Color(0xc9ad7c);

  const perfil = (r) => (r <= R ? hBorde - ddFresco * D * (1 - (r / R) ** 2) : hBorde * (R / r) ** 3);

  const geo = new THREE.PlaneGeometry(2 * L, L, N, Math.round(N / 2));
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -L / 2);                     // media superficie: z de −L a 0 (el corte queda en z = 0)
  const pos = geo.attributes.position;
  const colores = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  const sup = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
  e.scene.add(sup);

  const matCorte = new THREE.MeshStandardMaterial({ color: 0x6f6c69, roughness: 1, side: THREE.DoubleSide });
  const matSed = new THREE.MeshStandardMaterial({ color: sedimento, roughness: 1, side: THREE.DoubleSide });
  const corte = new THREE.Mesh(new THREE.BufferGeometry(), matCorte);
  const corteSed = new THREE.Mesh(new THREE.BufferGeometry(), matSed);
  corteSed.position.z = 0.002;
  e.scene.add(corte, corteSed);

  // Cotas: D entre las crestas y d desde la cresta hasta el fondo
  const matCota = new THREE.LineBasicMaterial({ color: color('--tinta'), transparent: true, opacity: 0.85 });
  const cotaD = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-R, hBorde + 0.12, 0.01), V(R, hBorde + 0.12, 0.01)]), matCota);
  const cotaDgeo = new THREE.BufferGeometry();
  const cotad = new THREE.Line(cotaDgeo, matCota);
  e.scene.add(cotaD, cotad);
  const etD = etiqueta('D', 'eje-titulo'); etD.position.set(0, hBorde + 0.2, 0.01);
  const etd = etiqueta('d', 'eje-titulo');
  e.scene.add(etD, etd);

  const histo = ctx.histograma(document.getElementById('dd-histo'), nube);
  const lectura = document.getElementById('dd-lectura');
  const med = nube.mediana_prof_diam;
  const relleno = muelle(0, 0.5);
  let dibujado = -1;

  function rehacer(f) {
    const zf = fondo0 + f * (zMax - fondo0);
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), z = pos.getZ(k), r = Math.hypot(x, z);
      const y0 = perfil(r);
      const lleno = r < R && zf > y0;
      pos.setY(k, lleno ? zf : y0);
      const c = lleno ? sedimento : roca;
      colores[k * 3] = c.r; colores[k * 3 + 1] = c.g; colores[k * 3 + 2] = c.b;
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();

    // Cara del corte (z = 0): perfil de roca hasta la base, y encima el sedimento
    if (!corte.geometry.attributes.position) {
      const forma = new THREE.Shape();
      forma.moveTo(-L, BASE);
      for (let i = 0; i <= 240; i++) { const x = -L + (2 * L * i) / 240; forma.lineTo(x, perfil(Math.abs(x))); }
      forma.lineTo(L, BASE); forma.closePath();
      corte.geometry.dispose(); corte.geometry = new THREE.ShapeGeometry(forma, 1);
    }
    corteSed.geometry.dispose();
    const xf = zf > fondo0 ? R * Math.sqrt(Math.max(0, 1 - (hBorde - zf) / (ddFresco * D))) : 0;
    if (xf > 0.001) {
      const sed = new THREE.Shape();
      sed.moveTo(-xf, zf);
      for (let i = 0; i <= 120; i++) { const x = -xf + (2 * xf * i) / 120; sed.lineTo(x, perfil(Math.abs(x))); }
      sed.lineTo(xf, zf); sed.closePath();
      corteSed.geometry = new THREE.ShapeGeometry(sed, 1);
    } else corteSed.geometry = new THREE.BufferGeometry();

    const fondo = Math.max(zf, fondo0);
    cotaDgeo.setFromPoints([V(0.05, hBorde, 0.012), V(0.05, fondo, 0.012)]);
    etd.position.set(0.16, (hBorde + fondo) / 2, 0.012);
    escribir(fondo);
  }
  let ultimoFondo = fondo0;
  function escribir(fondo = ultimoFondo) {
    ultimoFondo = fondo;
    const dd = (hBorde - fondo) / D;
    const D_ = ctx.din();
    const lado = dd >= med.Luna ? D_.ladoLuna : dd <= med.Marte ? D_.ladoMarte : D_.ladoMedio;
    lectura.innerHTML = D_.ddLectura(dd, lado);
    histo.marcar(dd);
  }
  e.alActualizar.push((dt) => {
    const f = relleno.paso(dt);
    if (Math.abs(f - dibujado) > 0.002) { dibujado = f; rehacer(f); }
  });
  ctx.alCambiarIdioma(() => escribir());
  const caja = cajaDe(-L, BASE, -L * 0.55, L, hBorde + 0.25, 0);
  const dirs = [V(0.25, 0.25, 1), V(0.08, 0.12, 1), V(-0.3, 0.35, 1)];
  let paso = 0;
  e.alRedimensionar.push(() => encuadrar(e, caja, 1.03, { dir: dirs[paso], objetivo: V(0, -0.15, -0.4) }));
  rehacer(0); dibujado = 0;
  return {
    paso(i) {
      paso = Math.min(i, 2);
      if (paso === 0) relleno.meta = 0;
      if (paso === 2) relleno.meta = 1;
      encuadrar(e, caja, 1.03, { dir: dirs[paso], objetivo: V(0, -0.15, -0.4), suave: true });
    },
    progreso(i, p) {
      if (i !== 1) return;
      relleno.meta = Math.min(1, Math.max(0, (p - 0.12) / 0.7));   // el sedimento sube con el scroll
    },
  };
}

/* ── 04: el modelo es un plano (nube 3D) ───────────────────────────────── */
const RANGO = { x: [-0.25, 1.0], y: [0, 0.3], z: [-0.16, 0.1] };
const MEDIO = { x: 1.5, y: 1.0, z: 1.0 };               // semiejes del cuadro en la escena

function aEscena(v) {
  const n = (val, [a, b], s) => (((val - a) / (b - a)) * 2 - 1) * s;
  return [n(v[0], RANGO.x, MEDIO.x), n(v[1], RANGO.y, MEDIO.y), n(v[2], RANGO.z, MEDIO.z)];
}
const dentro = (v) => v[0] >= RANGO.x[0] && v[0] <= RANGO.x[1] && v[1] >= RANGO.y[0] && v[1] <= RANGO.y[1] && v[2] >= RANGO.z[0] && v[2] <= RANGO.z[1];

function capaPuntos(lista, { tam, forma, colorVar }) {
  const p = [];
  for (const v of lista) if (dentro(v)) p.push(...aEscena(v));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { uColor: { value: color(colorVar) }, uTam: { value: tam }, uPr: { value: Math.min(devicePixelRatio || 1, 2) }, uForma: { value: forma }, uOp: { value: 1 } },
    vertexShader: `uniform float uTam, uPr; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uTam * uPr * clamp(3.2 / -mv.z, 0.75, 1.6); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uForma, uOp;
      void main(){
        vec2 q = gl_PointCoord - 0.5; float a;
        if (uForma < 0.5) { float r = length(q); a = 1.0 - smoothstep(0.42, 0.5, r); }
        else if (uForma < 1.5) { float r = length(q); a = (1.0 - smoothstep(0.43, 0.5, r)) * smoothstep(0.24, 0.31, r); }
        else { float r = abs(q.x) + abs(q.y); a = 1.0 - smoothstep(0.42, 0.5, r); }
        if (a < 0.02) discard;
        gl_FragColor = vec4(uColor, a * uOp);
        #include <colorspace_fragment>
      }`,
  });
  const puntos = new THREE.Points(geo, mat);
  return { puntos, n: p.length / 3, colorVar };
}

export function plano(el, { nube }, ctx) {
  const e = crearEscenario(el, { posicion: [3.3, 1.7, 3.6], objetivo: [0, -0.05, 0], polarMin: 0.2, polarMax: 1.65, etiquetas: true, zona: zonaCine, deriva: 0.25 });
  e.renderer.localClippingEnabled = true;
  const S = MEDIO;

  // Cuadro y marcas
  const matLinea = new THREE.LineBasicMaterial({ color: color('--tinta-3'), transparent: true, opacity: 0.45 });
  e.scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * S.x, 2 * S.y, 2 * S.z)), matLinea));
  const marca = (txt, pos, clase = 'eje-etiqueta') => { const o = etiqueta(txt, clase); o.position.set(...pos); e.scene.add(o); return o; };
  for (const [km, txt] of [[0.6, '0.6'], [1, '1 km'], [2, '2'], [5, '5'], [10, '10 km']]) {
    const [x] = aEscena([Math.log10(km), 0, 0]); marca(txt, [x, -S.y - 0.09, S.z + 0.06]);
  }
  for (const v of [0, 0.1, 0.2, 0.3]) { const [, y] = aEscena([0, v, 0]); marca(v.toFixed(1), [-S.x - 0.12, y, S.z]); }
  for (const v of [-0.15, -0.1, -0.05, 0, 0.05, 0.1]) { const [, , z] = aEscena([0, 0, v]); marca(v.toFixed(2), [S.x + 0.14, -S.y - 0.06, z]); }
  const tituloX = marca('', [0, -S.y - 0.26, S.z + 0.2], 'eje-titulo');
  const tituloY = marca('', [-S.x - 0.2, S.y + 0.14, S.z], 'eje-titulo');
  const tituloZ = marca('', [S.x + 0.34, -S.y - 0.22, 0], 'eje-titulo');

  // Capas de puntos, cada una con su opacidad animada
  const capas = {
    luna: capaPuntos(nube.luna, { tam: 3.4, forma: 0, colorVar: '--luna' }),
    marte: capaPuntos(nube.marte, { tam: 4.6, forma: 0, colorVar: '--marte' }),
    tierra: capaPuntos(nube.tierra.map((t) => t.x), { tam: 9, forma: 1, colorVar: '--tierra' }),
    impactos: capaPuntos(nube.impactos.map((t) => t.x), { tam: 13, forma: 2, colorVar: '--impacto' }),
  };
  ['luna', 'marte', 'tierra', 'impactos'].forEach((k, i) => { capas[k].puntos.renderOrder = 2 + i; e.scene.add(capas[k].puntos); });
  const op = { luna: muelle(1, 0.8), marte: muelle(0, 0.8), tierra: muelle(0, 0.8), impactos: muelle(0, 0.8), plano: muelle(0, 0.9) };
  const totales = nube.luna.length + nube.marte.length + nube.tierra.length + nube.impactos.length;
  const dibujados = Object.values(capas).reduce((a, c) => a + c.n, 0);

  // Rótulos directos en la mediana de cada nube
  const mediana = (lista, j) => { const v = lista.map((p) => p[j]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const rotLuna = etiqueta('', 'eje-titulo'), rotMarte = etiqueta('', 'eje-titulo');
  const pL = aEscena([0, 1, 2].map((j) => mediana(nube.luna, j))), pM = aEscena([0, 1, 2].map((j) => mediana(nube.marte, j)));
  rotLuna.position.set(pL[0], pL[1] + 0.35, pL[2]); rotMarte.position.set(pM[0], pM[1] - 0.28, pM[2]);
  e.scene.add(rotLuna, rotMarte);

  // Plano P(Luna) = 0.5, recortado al cuadro
  const { w, b } = nube.plano;
  const lo = [RANGO.x[0], RANGO.y[0], RANGO.z[0]], hi = [RANGO.x[1], RANGO.y[1], RANGO.z[1]], sc = [S.x, S.y, S.z];
  const nU = w.map((wj, j) => (wj * (hi[j] - lo[j])) / 2);
  const cU = b + w.reduce((a, wj, j) => a + (wj * (lo[j] + hi[j])) / 2, 0);
  const nW = V(nU[0] / sc[0], nU[1] / sc[1], nU[2] / sc[2]);
  const largo = nW.length();
  nW.divideScalar(largo);
  const cW = cU / largo;
  const recortes = [
    new THREE.Plane(V(-1, 0, 0), S.x), new THREE.Plane(V(1, 0, 0), S.x),
    new THREE.Plane(V(0, -1, 0), S.y), new THREE.Plane(V(0, 1, 0), S.y),
    new THREE.Plane(V(0, 0, -1), S.z), new THREE.Plane(V(0, 0, 1), S.z),
  ];
  const matPlano = new THREE.MeshBasicMaterial({ color: color('--plano'), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, clippingPlanes: recortes, toneMapped: false });
  const matRejilla = new THREE.MeshBasicMaterial({ color: color('--plano'), transparent: true, opacity: 0, wireframe: true, depthWrite: false, clippingPlanes: recortes, toneMapped: false });
  const grupoPlano = new THREE.Group();
  grupoPlano.add(new THREE.Mesh(new THREE.PlaneGeometry(8, 8), matPlano));
  grupoPlano.add(new THREE.Mesh(new THREE.PlaneGeometry(8, 8, 32, 32), matRejilla));
  grupoPlano.quaternion.setFromUnitVectors(V(0, 0, 1), nW);
  const sobre = nW.clone().multiplyScalar(-cW);
  grupoPlano.position.copy(sobre);
  grupoPlano.renderOrder = 1;
  e.scene.add(grupoPlano);

  e.alActualizar.push((dt) => {
    for (const k of Object.keys(capas)) {
      const v = Math.max(0, op[k].paso(dt));
      capas[k].puntos.material.uniforms.uOp.value = v;
      capas[k].puntos.visible = v > 0.01;
    }
    rotLuna.visible = op.luna.valor > 0.5; rotMarte.visible = op.marte.valor > 0.5;
    const vp = Math.max(0, op.plano.paso(dt));
    matPlano.opacity = 0.14 * vp; matRejilla.opacity = 0.32 * vp;
    grupoPlano.visible = vp > 0.01;
    grupoPlano.position.copy(sobre).addScaledVector(nW, (1 - Math.min(1, vp)) * 0.9);   // el plano baja hasta su lugar
  });

  // Lectura de puntos de la Tierra e impactos
  const tip = document.getElementById('plano-tooltip');
  const ray = new THREE.Raycaster();
  ray.params.Points.threshold = 0.035;
  const raton = new THREE.Vector2();
  const resaltado = capaPuntos([[0, 0, 0]], { tam: 22, forma: 1, colorVar: '--tinta' });
  resaltado.puntos.visible = false; resaltado.puntos.renderOrder = 9;
  e.scene.add(resaltado.puntos);
  const tierraVis = nube.tierra.filter((t) => dentro(t.x));
  const impVis = nube.impactos.filter((t) => dentro(t.x));
  let pendiente = null;
  const ocultar = () => { tip.hidden = true; resaltado.puntos.visible = false; };
  const buscar = () => {
    pendiente = null;
    const objetivos = [capas.impactos.puntos, capas.tierra.puntos].filter((p) => p.visible);
    if (!objetivos.length) { ocultar(); return; }
    ray.setFromCamera(raton, e.camera);
    const hit = ray.intersectObjects(objetivos, false)[0];
    if (!hit) { ocultar(); return; }
    const esImpacto = hit.object === capas.impactos.puntos;
    const d = (esImpacto ? impVis : tierraVis)[hit.index];
    const D = ctx.din();
    const nombre = esImpacto ? d.nombre : (d.nombre || d.id);
    const etiq = esImpacto ? D.tipImpacto : `${D.etiquetas[d.etiqueta_ia] ?? '—'} · ${D.tipIA}`;
    tip.innerHTML = `<b>${nombre}</b>${esImpacto ? '' : `${d.region}<br>`}${etiq}<br>${D.tipP(d.P_Luna)} · ${d.dentro_95 ? D.tipDentro : D.tipFuera}`;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const px = ((raton.x + 1) / 2) * r.width, py = ((1 - raton.y) / 2) * r.height;
    const izquierda = px > r.width - 260;
    tip.style.left = `${izquierda ? px - 14 - tip.offsetWidth : px + 14}px`;
    tip.style.top = `${Math.min(py + 14, r.height - tip.offsetHeight - 8)}px`;
    resaltado.puntos.position.set(...aEscena(d.x)).sub(V(...aEscena([0, 0, 0])));
    resaltado.puntos.visible = true;
  };
  e.canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const r = e.canvas.getBoundingClientRect();
    raton.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    if (!pendiente) pendiente = requestAnimationFrame(buscar);
  });
  e.canvas.addEventListener('pointerleave', ocultar);
  e.canvas.addEventListener('pointerdown', ocultar);

  // Textos que dependen del idioma
  const ecuacion = document.getElementById('plano-ecuacion');
  const fuera = document.getElementById('plano-fuera');
  const textos = () => {
    const D = ctx.din();
    tituloX.element.textContent = D.ejeX; tituloY.element.textContent = D.ejeY; tituloZ.element.textContent = D.ejeZ;
    rotLuna.element.textContent = D.luna; rotMarte.element.textContent = D.marte;
    ecuacion.innerHTML = `${D.ecuacion(w, b)}<small>${D.ecuacionNota(-b / w[1])}</small>`;
    fuera.textContent = totales > dibujados ? D.fuera(totales - dibujados) : '';
  };
  ctx.alCambiarIdioma(textos);
  textos();

  const caja = cajaDe(-S.x - 0.1, -S.y - 0.15, -S.z - 0.05, S.x + 0.2, S.y + 0.1, S.z + 0.15);
  const dirs = [V(1, 0.5, 1.1), V(1.2, 0.3, 0.7), V(0.15, 0.12, 1.3), V(0.9, 0.55, 1)];
  let paso = 0;
  e.alRedimensionar.push(() => encuadrar(e, caja, e.ancho < 900 ? 1.06 : 1.1, { dir: dirs[paso], objetivo: V(0, -0.05, 0) }));
  return {
    paso(i) {
      paso = Math.min(i, 3);
      op.luna.meta = 1;
      op.marte.meta = paso >= 1 ? 1 : 0;
      op.plano.meta = paso >= 2 ? 1 : 0;
      op.tierra.meta = paso >= 3 ? 1 : 0;
      op.impactos.meta = paso >= 3 ? 1 : 0;
      if (paso < 3) ocultar();
      encuadrar(e, caja, e.ancho < 900 ? 1.06 : 1.1, { dir: dirs[paso], objetivo: V(0, -0.05, 0), suave: true });
    },
  };
}

/* ── 05: el borde levantado ────────────────────────────────────────────── */
export function borde(el, { relieves, perfiles }, ctx) {
  const ids = ['MX0008', 'MX0155'];
  const e = crearEscenario(el, { posicion: [0, 4.2, 5.6], objetivo: [0, -0.2, 0], sombras: true, polarMin: 0.3, polarMax: 1.25, etiquetas: true, zona: zonaCine, deriva: 0.12 });
  luces(e.scene, { elevacion: 26, azimut: 125, intensidad: 2.8, sombras: true, tam: 5 });
  const piezas = ids.map((id) => {
    const rel = relieves.sitios[id].tierra;
    const r = crearRelieve(rel, { lado: rel.km, exag: 2, colorBase: SUPERFICIE.tierra, colorLinea: LINEA, colorBanda: color('--banda'), intervalo: 20 });
    const rot = etiqueta(`<b>${id === 'MX0008' ? 'El Elegante' : 'Peñasquito'}</b> <small></small>`, 'rotulo');
    rot.position.set(0, r.base, rel.km / 2 + 0.35);
    r.grupo.add(rot);
    e.scene.add(r.grupo);
    return { id, r, rot, km: rel.km };
  });
  const textosBorde = () => piezas.forEach((p) => { p.rot.element.querySelector('small').textContent = ctx.din()[p.id === 'MX0008' ? 'craterVolcanico' : 'tajoMinero']; });
  ctx.alCambiarIdioma(textosBorde);
  textosBorde();
  const banda = muelle(0, 0.5);
  e.alActualizar.push((dt) => { const v = Math.max(0, banda.paso(dt)); piezas.forEach((p) => { p.r.uniforms.uOpBanda.value = v; }); });

  let paso = 0, caja = null;
  const dirsAncho = [V(0, 0.75, 1), V(0.15, 1.5, 0.7), V(-0.25, 0.8, 1)];
  const dirsMovil = [V(0, 1.6, 1), V(0.1, 2.2, 0.8), V(-0.1, 1.8, 1)];
  const dir = () => (e.ancho < 900 ? dirsMovil : dirsAncho)[paso];
  e.alRedimensionar.push(() => {
    const [a, b] = piezas;
    if (e.ancho < 900) {
      a.r.grupo.position.set(0, 0, -(a.km / 2 + 0.25)); b.r.grupo.position.set(0, 0, b.km / 2 + 0.25);
      caja = cajaRelieve(a.r, 0, -(a.km / 2 + 0.25)).union(cajaRelieve(b.r, 0, b.km / 2 + 0.25));
    } else {
      const hueco = 0.8, total = a.km + b.km + hueco;
      a.r.grupo.position.set(-total / 2 + a.km / 2, 0, 0); b.r.grupo.position.set(total / 2 - b.km / 2, 0, 0);
      caja = cajaRelieve(a.r, -total / 2 + a.km / 2).union(cajaRelieve(b.r, total / 2 - b.km / 2));
    }
    encuadrar(e, caja, 1.04, { dir: dir() });
  });

  ctx.perfil(document.getElementById('borde-perfil'), perfiles);
  return {
    paso(i) {
      paso = Math.min(i, 2);
      banda.meta = paso >= 1 ? 0.42 : 0;
      if (caja) encuadrar(e, caja, 1.04, { dir: dir(), suave: true });
    },
  };
}

/* ── 07: caída libre con tres gravedades ───────────────────────────────── */
export function caida(el, _datos, ctx) {
  const H = 2;
  const mundos = [['tierra', 9.81], ['marte', 3.71], ['luna', 1.62]];
  const e = crearEscenario(el, { orbitar: false, posicion: [0, 1.05, 6.2], objetivo: [0, 1.0, 0], etiquetas: true, fov: 30, zona: zonaCine });
  luces(e.scene, { elevacion: 45, azimut: 60, intensidad: 2.4 });

  const matSuelo = new THREE.LineBasicMaterial({ color: color('--tinta-3'), transparent: true, opacity: 0.6 });
  e.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-6, 0, 0), V(6, 0, 0)]), matSuelo));
  const regla = new THREE.Group();
  const puntosRegla = [V(0, 0, 0), V(0, H, 0)];
  for (let h = 0; h <= H + 1e-6; h += 0.5) puntosRegla.push(V(0, h, 0), V(h % 1 === 0 ? 0.1 : 0.06, h, 0));
  regla.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(puntosRegla), matSuelo));
  for (let h = 0; h <= H; h += 1) { const o = etiqueta(`${h} m`, 'regla-etiqueta'); o.position.set(-0.08, h, 0); regla.add(o); }
  e.scene.add(regla);

  const relojes = document.getElementById('caida-relojes');
  // El objeto que cae es la carga del juego (assets/entidades/carga.png, primer cuadro de 7 × 5 px)
  const textura = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}arte/carga.png`);
  textura.magFilter = THREE.NearestFilter; textura.minFilter = THREE.NearestFilter;
  textura.colorSpace = THREE.SRGBColorSpace; textura.generateMipmaps = false;
  textura.repeat.set(1 / 3, 1);
  const bolas = mundos.map(([m, g]) => {
    const bola = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, toneMapped: false }));
    bola.scale.set(0.42, 0.3, 1);
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
    sombra.rotation.x = -Math.PI / 2; sombra.position.y = 0.002;
    const onda = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 48), new THREE.MeshBasicMaterial({ color: color(`--${m}`), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    onda.rotation.x = -Math.PI / 2; onda.position.y = 0.004;
    e.scene.add(bola, sombra, onda);
    const div = document.createElement('div');
    div.className = 'reloj'; div.dataset.cuerpo = m;
    div.innerHTML = `<b><i></i><span class="reloj-nombre"></span></b><small class="reloj-g"></small><output>0.00 s</output>`;
    relojes.appendChild(div);
    return { m, g, bola, sombra, onda, div, out: div.querySelector('output'), tCaida: Math.sqrt((2 * H) / g), llego: false, tOnda: -1 };
  });

  let t0 = null;
  const colocar = (t) => {
    for (const b of bolas) {
      const tt = Math.min(t, b.tCaida);
      const y = Math.max(H - 0.5 * b.g * tt * tt, 0) + 0.15;
      b.bola.position.y = y;
      const k = 1 - (y - 0.15) / H;
      b.sombra.scale.setScalar(0.55 + 0.45 * k);
      b.sombra.material.opacity = 0.08 + 0.22 * k;
      if (t0 !== null) b.out.textContent = ctx.din().caidaT(tt);
      if (t >= b.tCaida && !b.llego && t0 !== null) { b.llego = true; b.tOnda = 0; }
    }
  };
  e.alActualizar.push((dt) => {
    if (t0 !== null) colocar(performance.now() / 1000 - t0);
    for (const b of bolas) {
      if (b.tOnda < 0) continue;
      b.tOnda += dt;
      const p = Math.min(b.tOnda / 0.6, 1);
      b.onda.scale.setScalar(1 + 2.2 * (1 - (1 - p) ** 3)); b.onda.material.opacity = 0.55 * (1 - p);
      if (p >= 1) b.tOnda = -1;
    }
  });
  const soltar = () => {
    bolas.forEach((b) => { b.llego = false; b.tOnda = -1; b.onda.material.opacity = 0; });
    t0 = performance.now() / 1000;
  };
  const reiniciar = () => { t0 = null; bolas.forEach((b) => { b.llego = false; b.out.textContent = ctx.din().caidaT(0); }); colocar(0); };
  document.getElementById('caida-soltar').addEventListener('click', soltar);

  e.alRedimensionar.push(() => {
    const vfov = THREE.MathUtils.degToRad(e.camera.fov);
    // Que quepan los 2 m (y los relojes) en la zona libre
    const libreAlto = 1 - e.zona.abajo;
    const movil = e.ancho < 900;
    const d = Math.max(6.2, (movil ? 4.2 : 3.6) / libreAlto / (2 * Math.tan(vfov / 2)));
    const cy = movil ? 1.55 : 1.0;                 // deja aire para los relojes (arriba en el teléfono, abajo en escritorio)
    e.camera.position.set(0, cy + 0.05, d); e.camera.lookAt(0, cy, 0);
    const anchoVisible = 2 * Math.tan(vfov / 2) * e.camera.aspect * d * (1 - e.zona.izq);
    const paso = Math.min(1.45, anchoVisible * 0.27);
    bolas.forEach((b, i) => { const x = (i - 1) * paso; b.bola.position.x = x; b.sombra.position.x = x; b.onda.position.x = x; });
    regla.position.x = -1.5 * paso - Math.min(0.25, anchoVisible * 0.04);
    colocar(t0 === null ? 0 : performance.now() / 1000 - t0);
  });
  const textos = () => {
    const D = ctx.din();
    bolas.forEach((b) => {
      b.div.querySelector('.reloj-nombre').textContent = D[b.m];
      b.div.querySelector('.reloj-g').textContent = D.caidaG(b.g);
      if (b.llego || t0 === null) b.out.textContent = D.caidaT(t0 === null ? 0 : b.tCaida);
    });
  };
  ctx.alCambiarIdioma(textos);
  textos();
  colocar(0);
  let pasoActual = -1;
  return {
    paso(i) {
      if (i === pasoActual) return;
      pasoActual = i;
      if (i === 0) reiniciar();
      if (i >= 1) setTimeout(soltar, movimientoReducido.matches ? 0 : 350);
    },
  };
}
