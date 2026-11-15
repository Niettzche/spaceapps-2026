// Escenario 3D compartido: un renderizador por figura y un solo ciclo de dibujo que solo pinta lo visible.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export const movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)');
const escenarios = new Set();
let corriendo = false;
let ultimo = 0;

// Las escenas viven en secciones de cine, siempre oscuras: los colores se leen de ahí (si no hay, de la raíz).
export function color(nombre) {
  const fuente = document.querySelector('.pelicula, .cine') || document.documentElement;
  return new THREE.Color(getComputedStyle(fuente).getPropertyValue(nombre).trim() || '#888');
}
const suavizar = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);   // ease-in-out cúbica, para tomas de cámara

export function crearEscenario(contenedor, op = {}) {
  const {
    fov = 32, posicion = [0, 3, 6], objetivo = [0, 0, 0], orbitar = true, sombras = false,
    polarMin = 0.15, polarMax = 1.35, etiquetas = false, giroAuto = 0, deriva = 0,
  } = op;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  contenedor.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  if (sombras) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 200);
  camera.position.set(...posicion);
  const inicio = { posicion: new THREE.Vector3(...posicion), objetivo: new THREE.Vector3(...objetivo) };

  let controls = null;
  if (orbitar) {
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.085;
    controls.enableZoom = false;       // la rueda es para leer la página, no para acercar
    controls.enablePan = false;
    controls.rotateSpeed = 0.7;
    controls.minPolarAngle = polarMin;
    controls.maxPolarAngle = polarMax;
    controls.target.copy(inicio.objetivo);
    controls.autoRotate = giroAuto > 0 && !movimientoReducido.matches;
    controls.autoRotateSpeed = giroAuto;
    controls.addEventListener('start', () => { controls.autoRotate = false; e.toma = null; e.ultimoToque = performance.now(); });
    controls.update();
    // En pantallas táctiles el desplazamiento vertical sigue moviendo la página; el arrastre horizontal gira.
    canvas.style.touchAction = 'pan-y';
  } else {
    camera.lookAt(inicio.objetivo);
  }

  let css2d = null;
  if (etiquetas) {
    css2d = new CSS2DRenderer();
    css2d.domElement.className = 'etiquetas-3d';
    contenedor.appendChild(css2d.domElement);
  }

  const e = {
    contenedor, canvas, renderer, scene, camera, controls, css2d, inicio,
    visible: false, ancho: 1, alto: 1, alActualizar: [], alRedimensionar: [],
    zona: { izq: 0, abajo: 0 }, toma: null, deriva: 0, ultimoToque: -1e9,
    // Toma de cámara: viaja en coordenadas esféricas alrededor del objetivo (como un travelling), no en línea recta
    irA(posicion, objetivo, ms = 1700) {
      const objActual = controls ? controls.target.clone() : e.inicio.objetivo.clone();
      if (movimientoReducido.matches || !e.visible) {
        camera.position.copy(posicion); controls?.target.copy(objetivo); camera.lookAt(objetivo); e.toma = null; return;
      }
      const s0 = new THREE.Spherical().setFromVector3(camera.position.clone().sub(objActual));
      const s1 = new THREE.Spherical().setFromVector3(posicion.clone().sub(objetivo));
      let dt = s1.theta - s0.theta;
      if (dt > Math.PI) dt -= 2 * Math.PI; else if (dt < -Math.PI) dt += 2 * Math.PI;
      e.toma = { s0, s1, dTheta: dt, o0: objActual, o1: objetivo.clone(), t: 0, ms };
    },
    reiniciar() {
      camera.position.copy(inicio.posicion);
      if (controls) { controls.target.copy(inicio.objetivo); controls.update(); }
    },
  };

  const ro = new ResizeObserver(() => {
    const r = contenedor.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    e.ancho = r.width; e.alto = r.height;
    renderer.setSize(r.width, r.height, false);
    css2d?.setSize(r.width, r.height);
    camera.aspect = r.width / r.height;
    e.zona = op.zona ? op.zona(e) : { izq: 0, abajo: 0 };
    // Deja libre el lado de la tarjeta de texto: corre el centro óptico hacia la zona libre
    if (e.zona.izq || e.zona.abajo) camera.setViewOffset(r.width, r.height, (-r.width * e.zona.izq) / 2, (r.height * e.zona.abajo) / 2, r.width, r.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    e.alRedimensionar.forEach((f) => f(e));
    if (!e.visible) dibujar(e, 0, performance.now() / 1000);
  });
  ro.observe(contenedor);

  const io = new IntersectionObserver(([en]) => {
    e.visible = en.isIntersecting;
    if (e.visible) arrancar();
  }, { rootMargin: '120px 0px' });
  io.observe(contenedor);

  e.deriva = deriva;
  e.activo = true;                 // la película apaga las escenas que no se ven
  contenedor._escenario = e;
  escenarios.add(e);
  return e;
}

const _sph = new THREE.Spherical(), _v = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0);
function dibujar(e, dt, t) {
  for (const f of e.alActualizar) f(dt, t);
  const objetivo = e.controls ? e.controls.target : e.inicio.objetivo;
  if (e.toma) {
    const m = e.toma;
    m.t += dt * 1000;
    const k = suavizar(Math.min(m.t / m.ms, 1));
    _sph.set(m.s0.radius + (m.s1.radius - m.s0.radius) * k, m.s0.phi + (m.s1.phi - m.s0.phi) * k, m.s0.theta + m.dTheta * k);
    objetivo.lerpVectors(m.o0, m.o1, k);
    e.camera.position.copy(objetivo).add(_v.setFromSpherical(_sph));
    e.camera.lookAt(objetivo);
    if (k >= 1) e.toma = null;
  } else if (e.deriva && !movimientoReducido.matches && performance.now() - e.ultimoToque > 6000) {
    // Balanceo lento de la cámara, como una toma en grúa
    const a = Math.sin((t * 2 * Math.PI) / 26) * e.deriva;
    const da = a - (e._deriva ?? a);
    e._deriva = a;
    _v.copy(e.camera.position).sub(objetivo).applyAxisAngle(_y, da);
    e.camera.position.copy(objetivo).add(_v);
    e.camera.lookAt(objetivo);
  }
  e.controls?.update();
  e.renderer.render(e.scene, e.camera);
  e.css2d?.render(e.scene, e.camera);
}

function ciclo(ahora) {
  const dt = Math.min((ahora - ultimo) / 1000, 0.05);
  ultimo = ahora;
  let alguno = false;
  for (const e of escenarios) {
    if (!e.visible || e.activo === false) continue;
    alguno = true;
    dibujar(e, dt, ahora / 1000);
  }
  if (alguno && !document.hidden) requestAnimationFrame(ciclo);
  else corriendo = false;
}

function arrancar() {
  if (corriendo) return;
  corriendo = true;
  ultimo = performance.now();
  requestAnimationFrame(ciclo);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) arrancar(); });

// Muelle críticamente amortiguado (sin rebote) para transiciones de valores: arranca del valor actual y se puede
// redirigir a medio camino sin saltos (respuesta ≈ segundos hasta casi llegar).
export function muelle(valor, respuesta = 0.45) {
  const m = { valor, meta: valor, vel: 0 };
  const w = (2 * Math.PI) / respuesta;
  m.paso = (dt) => {
    if (movimientoReducido.matches) { m.valor = m.meta; m.vel = 0; return m.valor; }
    const x = m.valor - m.meta;
    const a = -w * w * x - 2 * w * m.vel;
    m.vel += a * dt;
    m.valor += m.vel * dt;
    if (Math.abs(m.valor - m.meta) < 1e-5 && Math.abs(m.vel) < 1e-5) { m.valor = m.meta; m.vel = 0; }
    return m.valor;
  };
  return m;
}

export function luces(scene, { elevacion = 22, azimut = 135, intensidad = 2.6, sombras = false, tam = 4 } = {}) {
  const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x2a2622, 0.55);
  scene.add(hemi);
  const sol = new THREE.DirectionalLight(0xfff4e6, intensidad);
  scene.add(sol);
  scene.add(sol.target);
  if (sombras) {
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    const c = sol.shadow.camera;
    c.left = -tam; c.right = tam; c.top = tam; c.bottom = -tam; c.near = 0.1; c.far = 40;
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.02;
  }
  const colocar = (elev, az) => {
    const e = THREE.MathUtils.degToRad(elev), a = THREE.MathUtils.degToRad(az);
    sol.position.set(Math.cos(e) * Math.cos(a) * 12, Math.sin(e) * 12, Math.cos(e) * Math.sin(a) * 12);
  };
  colocar(elevacion, azimut);
  return { hemi, sol, colocar };
}
