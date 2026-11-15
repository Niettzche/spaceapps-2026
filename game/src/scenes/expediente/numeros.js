// Dueño: frente expediente. Vista "¿De dónde salen los números?" / "Where do the numbers come from?" dentro del Menú.
// Tarjetas con keyword + fuente y 3 cifras grandes (DISENO.md §3). Lo largo va a una línea de detalle por página.
// Todo el contenido sale de AGENTS.md §5–§7, docs/METODOLOGIA.md y model/VALIDATION.md. No agregar cifras que no estén
// documentadas allí. Cifras verificadas el 15 nov 2026:
//   9/11 cráteres mexicanos conocidos (METODOLOGIA.md, informe del detector) · ~78 % exactitud balanceada Luna/Marte con
//   grupos espaciales (METODOLOGIA.md; VALIDATION.md: 78 %) · 296 candidatos áridos, México + Atacama, Arizona y Arabia
//   (VALIDATION.md) · controles negativos 3 de 3 (VALIDATION.md).
import { COLOR, texto, boton, panel, conFondo, cajaArte, tituloPlaca } from './interfaz.js';
import { idioma } from '../../i18n.js';

// Tipos de página: 'fuentes' (tarjetas por cuerpo: keyword → fuente), 'cifras' (3 cifras grandes + keywords),
// 'limites' (chips de lo que la Tierra no puede probar + tarjetas de valores de juego).
export const PAGINAS = {
  es: {
    titulo: '¿De dónde salen los números?',
    paginas: [
      {
        tipo: 'fuentes',
        sub: '1 · Datos abiertos',
        tarjetas: [
          { titulo: 'TIERRA', filas: [['Clima', 'NASA POWER'], ['Vegetación', 'MODIS NDVI'], ['Relieve 200 m', 'Copernicus DEM']] },
          { titulo: 'LUNA · polo sur', filas: [['Relieve', 'LRO LOLA'], ['Temperatura', 'LRO Diviner']] },
          { titulo: 'MARTE · Jezero', filas: [['Relieve', 'HRSC + MOLA'], ['Clima', 'MEDA / REMS']] },
        ],
        detalle: 'Cada valor: fuente, fecha y unidad · sin dato = no se rellena · ILUSTRATIVO = demostración',
      },
      {
        tipo: 'cifras',
        sub: '2 · El modelo y su validación',
        cifras: [
          ['9/11', 'cráteres conocidos', 'detectados en México'],
          ['~78 %', 'exactitud', 'Luna contra Marte'],
          ['296', 'candidatos áridos', 'México, Atacama, Arizona, Arabia'],
        ],
        claves: ['Árbol + regresión logística', 'No es red neuronal', 'Clave: profundidad / diámetro', 'Controles negativos 3/3'],
        detalle: 'Forma a 200 m (mismo código en Tierra, Luna y Marte) · resto: exp(−|Tierra − destino| / escala)',
      },
      {
        tipo: 'limites',
        sub: '3 · Lo que la Tierra no puede probar',
        chips: ['GRAVEDAD', 'PRESIÓN', 'RADIACIÓN', 'VACÍO LUNAR'],
        nota: 'Gravedad solo en la misión: Marte 3.71 · Luna 1.62 m/s²',
        tarjetas: [
          { titulo: 'VALORES DE JUEGO', filas: [['Precios · piezas', 'no son evidencia'], ['Tickets · puntos', 'no son evidencia']] },
          { titulo: 'RECORRIDO', filas: [['Perfil', 'DEM real'], ['Relieve', 'exageración declarada'], ['Obstáculos', 'recreación']] },
        ],
        detalle: 'Detalle y fuentes: docs/METODOLOGIA.md y model/VALIDATION.md',
      },
    ],
    pagina: 'pág.',
    volver: 'Volver',
    ayuda: '◀ ▶ página · L idioma · Esc volver',
  },
  en: {
    titulo: 'Where do the numbers come from?',
    paginas: [
      {
        tipo: 'fuentes',
        sub: '1 · Open data',
        tarjetas: [
          { titulo: 'EARTH', filas: [['Climate', 'NASA POWER'], ['Vegetation', 'MODIS NDVI'], ['Terrain 200 m', 'Copernicus DEM']] },
          { titulo: 'MOON · south pole', filas: [['Terrain', 'LRO LOLA'], ['Temperature', 'LRO Diviner']] },
          { titulo: 'MARS · Jezero', filas: [['Terrain', 'HRSC + MOLA'], ['Climate', 'MEDA / REMS']] },
        ],
        detalle: 'Every value: source, date and unit · no data = never filled in · ILLUSTRATIVE = demo',
      },
      {
        tipo: 'cifras',
        sub: '2 · The model and its validation',
        cifras: [
          ['9/11', 'known craters', 'detected in Mexico'],
          ['~78 %', 'accuracy', 'Moon vs. Mars'],
          ['296', 'arid candidates', 'Mexico, Atacama, Arizona, Arabia'],
        ],
        claves: ['Tree + logistic regression', 'Not a neural network', 'Key: depth / diameter', 'Negative controls 3/3'],
        detalle: 'Shape at 200 m (same code on Earth, Moon and Mars) · rest: exp(−|Earth − target| / scale)',
      },
      {
        tipo: 'limites',
        sub: '3 · What Earth cannot test',
        chips: ['GRAVITY', 'PRESSURE', 'RADIATION', 'LUNAR VACUUM'],
        nota: 'Gravity only in the mission: Mars 3.71 · Moon 1.62 m/s²',
        tarjetas: [
          { titulo: 'GAME VALUES', filas: [['Prices · parts', 'not evidence'], ['Tickets · score', 'not evidence']] },
          { titulo: 'TEST TRACK', filas: [['Profile', 'real DEM'], ['Relief', 'declared exaggeration'], ['Obstacles', 'recreation']] },
        ],
        detalle: 'Details and sources: docs/METODOLOGIA.md and model/VALIDATION.md',
      },
    ],
    pagina: 'page',
    volver: 'Back',
    ayuda: '◀ ▶ page · L language · Esc back',
  },
};

const estado = { pagina: 0 };

/** Tarjeta con título y filas «keyword → fuente» (keyword tenue arriba, fuente grande debajo). */
function tarjeta(scene, x, y, w, h, { titulo, filas }) {
  cajaArte(scene, 'ui/ui_tarjeta', x, y, w, h, { alfa: 0.94 });
  texto(scene, x + w / 2, y + 24, titulo, { size: 18, color: COLOR.foco, origen: [0.5, 0.5] });
  filas.forEach(([clave, fuente], i) => {
    const fy = y + 58 + i * 54;
    texto(scene, x + w / 2, fy, clave, { size: 14, color: COLOR.muyTenue, origen: [0.5, 0.5] });
    texto(scene, x + w / 2, fy + 24, fuente, { size: 18, origen: [0.5, 0.5], ancho: w - 20, alinear: 'center' });
  });
}

function paginaFuentes(scene, p) {
  const w = 280, sep = 26, x0 = 480 - (3 * w + 2 * sep) / 2;
  p.tarjetas.forEach((t, i) => tarjeta(scene, x0 + i * (w + sep), 104, w, 220, t));
}

function paginaCifras(scene, p) {
  const w = 292, sep = 18, x0 = 480 - (3 * w + 2 * sep) / 2;
  p.cifras.forEach(([cifra, clave, sub], i) => {
    const x = x0 + i * (w + sep);
    cajaArte(scene, 'ui/ui_tarjeta', x, 100, w, 162, { alfa: 0.94 });
    texto(scene, x + w / 2, 138, cifra, { size: 40, color: COLOR.acento, origen: [0.5, 0.5] });
    texto(scene, x + w / 2, 180, clave, { size: 18, origen: [0.5, 0.5] });
    texto(scene, x + w / 2, 200, sub, { size: 14, color: COLOR.muyTenue, origen: [0.5, 0], ancho: w - 16, alinear: 'center' });
  });
  // Keywords del método como chips (2 por fila).
  p.claves.forEach((c, i) => {
    const cx = i % 2 ? 480 + 216 : 480 - 216, cy = 286 + Math.floor(i / 2) * 42;
    cajaArte(scene, 'ui/ui_panel', cx - 200, cy - 18, 400, 36, { alfa: 0.94 });
    texto(scene, cx, cy, c, { size: 16, origen: [0.5, 0.5] });
  });
}

function paginaLimites(scene, p) {
  // Chips rojos (no solo color: texto en mayúsculas dentro de un marco).
  const w = 196, sep = 14, x0 = 480 - (p.chips.length * w + (p.chips.length - 1) * sep) / 2;
  p.chips.forEach((c, i) => {
    const cx = x0 + i * (w + sep) + w / 2;
    const ch = cajaArte(scene, 'ui/ui_chip_rojo', cx - w / 2, 102, w, 40, { escala: 2 });
    if (!scene.textures.exists('ui/ui_chip_rojo')) ch.setFillStyle(0x2a0f18, 0.92).setStrokeStyle(2, 0xff7a93);
    texto(scene, cx, 122, c, { size: 18, color: COLOR.alerta, origen: [0.5, 0.5] });
  });
  conFondo(scene, texto(scene, 480, 166, p.nota, { size: 16, color: COLOR.texto, origen: [0.5, 0.5] }));
  const tw = 380, tsep = 30, tx0 = 480 - (2 * tw + tsep) / 2;
  p.tarjetas.forEach((t, i) => tarjeta(scene, tx0 + i * (tw + tsep), 188, tw, 216, t));
}

/**
 * Lo llama el Menú. `volver`: regresa al menú principal; `redibujar`: vuelve a crear la vista completa (fondo y
 * estrellas incluidos) en la página actual; `botonIdioma`: crea el selector "Español / English" del menú principal
 * (la tecla L la atiende el Menú).
 */
export function vistaNumeros(scene, { volver, redibujar, botonIdioma }) {
  const T = PAGINAS[idioma()] || PAGINAS.es;
  const total = T.paginas.length;
  estado.pagina = Math.min(estado.pagina, total - 1);
  const p = T.paginas[estado.pagina];
  const ultima = estado.pagina === total - 1;
  const ir = (paso) => { estado.pagina = (estado.pagina + paso + total) % total; redibujar(); };

  tituloPlaca(scene, 372, 30, T.titulo, { size: 26, padY: 8 }); // a la izquierda: el selector de idioma ocupa la esquina derecha
  conFondo(scene, texto(scene, 480, 74, p.sub, { size: 18, color: COLOR.acento, origen: [0.5, 0.5] }), { margen: 6 });
  if (p.tipo === 'fuentes') paginaFuentes(scene, p);
  else if (p.tipo === 'cifras') paginaCifras(scene, p);
  else paginaLimites(scene, p);
  // Detalle: 1 línea (lo largo vive en docs/METODOLOGIA.md y en la página web).
  conFondo(scene, texto(scene, 480, 418, p.detalle, { size: 14, color: COLOR.muyTenue, origen: [0.5, 0.5], ancho: 900, alinear: 'center' }));

  const anterior = boton(scene, 330, 462, '◀', () => ir(-1), { size: 16 });
  conFondo(scene, texto(scene, 480, 462, `${T.pagina} ${estado.pagina + 1}/${total}`, { size: 16, color: COLOR.tenue, origen: [0.5, 0.5] }));
  const siguiente = boton(scene, 630, 462, '▶', () => ir(1), { size: 16 });
  const atras = boton(scene, 480, 508, T.volver, volver, { size: 16 });
  const idiomaBoton = botonIdioma();
  conFondo(scene, texto(scene, 16, 530, T.ayuda, { size: 14, color: COLOR.muyTenue, origen: [0, 1] }), { margen: 6 });

  scene.teclado.extra = {
    ...scene.teclado.extra,
    ArrowLeft: () => ir(-1), ArrowRight: () => ir(1), PageUp: () => ir(-1), PageDown: () => ir(1),
  };
  // Atajos 1–3 y opción sugerida (⏎), como en el menú principal: ▶ mientras quedan páginas; en la última, Volver.
  scene.teclado.numerar([anterior, siguiente, atras]);
  const sugerido = ultima ? atras : siguiente;
  sugerido.setSugerido(true);
  scene.teclado.poner([anterior, siguiente, atras, idiomaBoton], sugerido);
}
