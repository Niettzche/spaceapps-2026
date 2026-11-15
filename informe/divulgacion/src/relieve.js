// Relieves medidos (rejillas de alturas en metros) como bloques 3D con curvas de nivel, y como columnas de píxeles.
import * as THREE from 'three';

const ANILLO = [0.8335, 1.6665]; // ventana del borde en radios (model/borde.py, limites_ventana)

/**
 * rej: { z: [[m]], km }  — ventana cuadrada de `km` de lado (2 diámetros: el centro está a 2 radios de cada orilla).
 * lado: tamaño en la escena. exag: exageración vertical declarada.
 */
export function crearRelieve(rej, { lado = 2, exag = 2, colorBase, colorLinea, colorBanda, intervalo = 20, falda = true } = {}) {
  const filas = rej.z.length, cols = rej.z[0].length;
  const kmPorUnidad = rej.km / lado;
  const escalaY = exag / 1000 / kmPorUnidad;      // metros → unidades de la escena

  const geo = new THREE.PlaneGeometry(lado, lado, cols - 1, filas - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < cols; j++) {
      const y = rej.z[i][j] * escalaY;
      pos.setY(i * cols + j, y);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  geo.computeVertexNormals();

  const uniforms = {
    uMpu: { value: 1 / escalaY }, uIntervalo: { value: intervalo },
    uLinea: { value: new THREE.Color(colorLinea ?? 0x000000) }, uOpLinea: { value: 0.32 },
    uRadio: { value: lado / 4 }, uAnIn: { value: ANILLO[0] }, uAnOut: { value: ANILLO[1] },
    uBanda: { value: new THREE.Color(colorBanda ?? 0xf0b44a) }, uOpBanda: { value: 0 },
  };
  const mat = new THREE.MeshStandardMaterial({ color: colorBase ?? 0x9a948c, roughness: 0.97, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vLocal;
uniform float uMpu, uIntervalo, uOpLinea, uRadio, uAnIn, uAnOut, uOpBanda;
uniform vec3 uLinea, uBanda;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  float hm = vLocal.y * uMpu / uIntervalo;
  float d = abs(fract(hm - 0.5) - 0.5) / max(fwidth(hm), 1e-4);
  float linea = 1.0 - clamp(d - 0.35, 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, uLinea, linea * uOpLinea);
  float rr = length(vLocal.xz) / uRadio;
  float aa = max(fwidth(rr) * 1.2, 0.004);
  float banda = smoothstep(uAnIn - aa, uAnIn + aa, rr) * (1.0 - smoothstep(uAnOut - aa, uAnOut + aa, rr));
  diffuseColor.rgb = mix(diffuseColor.rgb, uBanda, banda * uOpBanda);
}`);
  };

  const malla = new THREE.Mesh(geo, mat);
  malla.castShadow = true;
  malla.receiveShadow = true;

  const grupo = new THREE.Group();
  grupo.add(malla);
  const base = minY - lado * 0.07;
  if (falda) grupo.add(crearFalda(geo, filas, cols, base, mat.color));
  return { grupo, malla, uniforms, minY, maxY, base, escalaY, lado };
}

// Paredes laterales: hacen que el relieve se lea como una pieza física cortada del terreno.
function crearFalda(geo, filas, cols, base, colorBase) {
  const p = geo.attributes.position;
  const orillas = [
    Array.from({ length: cols }, (_, j) => j),                                  // norte
    Array.from({ length: filas }, (_, i) => i * cols + cols - 1),               // este
    Array.from({ length: cols }, (_, j) => (filas - 1) * cols + (cols - 1 - j)), // sur
    Array.from({ length: filas }, (_, i) => (filas - 1 - i) * cols),            // oeste
  ];
  const v = [];
  for (const o of orillas) {
    for (let k = 0; k < o.length - 1; k++) {
      const a = o[k], b = o[k + 1];
      const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a);
      const bx = p.getX(b), by = p.getY(b), bz = p.getZ(b);
      v.push(ax, ay, az, ax, base, az, bx, by, bz, bx, by, bz, ax, base, az, bx, base, bz);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  const c = colorBase.clone().multiplyScalar(0.62);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0, side: THREE.DoubleSide }));
  m.receiveShadow = true;
  return m;
}

/** Altura bilineal de la rejilla en coordenadas de la escena (x, z dentro de [-lado/2, lado/2]). */
function muestrear(rej, lado, x, z) {
  const filas = rej.z.length, cols = rej.z[0].length;
  const fj = THREE.MathUtils.clamp((x / lado + 0.5) * (cols - 1), 0, cols - 1);
  const fi = THREE.MathUtils.clamp((z / lado + 0.5) * (filas - 1), 0, filas - 1);
  const j0 = Math.floor(fj), i0 = Math.floor(fi), j1 = Math.min(j0 + 1, cols - 1), i1 = Math.min(i0 + 1, filas - 1);
  const tj = fj - j0, ti = fi - i0;
  const a = rej.z[i0][j0] * (1 - tj) + rej.z[i0][j1] * tj;
  const b = rej.z[i1][j0] * (1 - tj) + rej.z[i1][j1] * tj;
  return a * (1 - ti) + b * ti;
}

/**
 * El mismo relieve promediado en píxeles cuadrados de `resM` metros: una columna por píxel.
 * Devuelve el InstancedMesh y una función para hacerlo crecer desde la base (k de 0 a 1).
 */
export function crearColumnas(rej, { lado = 2, exag = 2, resM = 200, colorBase, base } = {}) {
  const kmLado = rej.km;
  const n = Math.max(2, Math.floor((kmLado * 1000) / resM));
  const celda = (resM / (kmLado * 1000)) * lado;
  const escalaY = exag / 1000 / (kmLado / lado);
  const inicio = -(n * celda) / 2;
  const sub = 6;
  const alturas = new Float32Array(n * n);
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      let s = 0;
      for (let u = 0; u < sub; u++) for (let w = 0; w < sub; w++) {
        const x = inicio + (b + (w + 0.5) / sub) * celda;
        const z = inicio + (a + (u + 0.5) / sub) * celda;
        s += muestrear(rej, lado, x, z);
      }
      alturas[a * n + b] = (s / (sub * sub)) * escalaY;
    }
  }
  const caja = new THREE.BoxGeometry(1, 1, 1);
  caja.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: colorBase ?? 0x9a948c, roughness: 0.9, metalness: 0 });
  const malla = new THREE.InstancedMesh(caja, mat, n * n);
  malla.castShadow = true;
  malla.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), e = new THREE.Vector3();
  const hueco = n > 20 ? 0.9 : 0.94;
  const fijar = (k) => {
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        const h = Math.max((alturas[a * n + b] - base) * k, 1e-4);
        p.set(inicio + (b + 0.5) * celda, base, inicio + (a + 0.5) * celda);
        e.set(celda * hueco, h, celda * hueco);
        m.compose(p, q, e);
        malla.setMatrixAt(a * n + b, m);
      }
    }
    malla.instanceMatrix.needsUpdate = true;
  };
  fijar(1);
  return { malla, fijar, n };
}
