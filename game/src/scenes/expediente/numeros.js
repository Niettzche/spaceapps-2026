// Dueño: frente expediente. Vista "¿De dónde salen los números?" / "Where do the numbers come from?" dentro del Menú.
// Todo el contenido sale de AGENTS.md §5, §6 y §7 (fuentes, método, validación y límites). No agregar cifras que no
// estén documentadas allí o en model/VALIDATION.md.
import { COLOR, texto, boton, panel } from './interfaz.js';
import { idioma } from '../../i18n.js';

export const PAGINAS = {
  es: {
    titulo: '¿De dónde salen los números?',
    paginas: [
      {
        sub: '1 · Datos abiertos de la NASA y otras fuentes',
        lineas: [
          '# TIERRA',
          '· Oscilación térmica diaria y precipitación: NASA POWER (T2M_RANGE, PRECTOTCORR), climatología por punto.',
          '· Vegetación: MODIS MOD13Q1 (NDVI). Vegetación densa descarta el sitio.',
          '· Relieve, pendiente y forma de los cráteres: Copernicus DEM GLO-30 (ESA), a 200 m.',
          '# LUNA (polo sur)',
          '· Relieve: LRO LOLA (ldem_80s_80m). Temperatura de superficie: LRO Diviner.',
          '# MARTE (Jezero)',
          '· Relieve: HRSC + MOLA. Clima: MEDA (Perseverance) / REMS.',
          '',
          'Cada valor del Expediente muestra su fuente, fecha y unidad. Si un dato falta, dice "sin dato":',
          'nunca se rellena. Los sitios marcados ILUSTRATIVO son datos de demostración, no mediciones.',
        ],
      },
      {
        sub: '2 · Cómo se calcula la similitud',
        lineas: [
          '# FORMA (dimensión principal)',
          '· El mismo detector de depresiones tipo cráter corre, con el mismo código y a 200 m, sobre la Tierra,',
          '  el polo sur lunar y Marte.',
          '· Modelos explicables (árbol de decisión poco profundo y regresión logística) entrenados con cráteres',
          '  reales de la Luna y de Marte: ~78 % de exactitud balanceada fuera de pliegue',
          '  (76 % solo con profundidad/diámetro). La regla principal es profundidad / diámetro.',
          '# VARIABLES COMPLEMENTARIAS',
          '· s = exp(−|Tierra − destino| / escala). Si el destino está fuera del rango terrestre, se compara',
          '  contra el extremo de la Tierra y se avisa.',
          '· Total: media geométrica ponderada. Dato faltante: se omite y baja la confianza.',
          '',
          'No es una red neuronal: es un modelo explicable + un comparador transparente.',
        ],
      },
      {
        sub: '3 · Validación, límites y valores de juego',
        lineas: [
          '# VALIDACIÓN',
          '· El detector encuentra 9 de 11 cráteres mexicanos conocidos.',
          '· Controles negativos (selva húmeda, zonas agrícolas) deben quedar cerca de 0 %. Ver model/VALIDATION.md.',
          '# LO QUE LA TIERRA NO PUEDE PROBAR',
          '· Gravedad (Marte 3.71 m/s², Luna 1.62 m/s²): solo se simula en la misión, nunca en la prueba terrestre.',
          '· Presión atmosférica, radiación y el vacío lunar.',
          '# VALORES DE JUEGO',
          '· Precios, piezas, tickets, presupuesto y puntuación son valores de juego: no son evidencia científica.',
          '· El recorrido de prueba sale de un perfil real de elevación con exageración vertical declarada;',
          '  los obstáculos agregados para jugar se marcan como recreación.',
        ],
      },
    ],
    pagina: 'pág.',
    volver: 'Volver',
    ayuda: '◀ ▶ cambia de página · L cambia de idioma · Esc vuelve',
  },
  en: {
    titulo: 'Where do the numbers come from?',
    paginas: [
      {
        sub: '1 · NASA open data and other sources',
        lineas: [
          '# EARTH',
          '· Daily temperature range and precipitation: NASA POWER (T2M_RANGE, PRECTOTCORR), point climatology.',
          '· Vegetation: MODIS MOD13Q1 (NDVI). Dense vegetation rules a site out.',
          '· Terrain, slope and crater shape: Copernicus DEM GLO-30 (ESA), at 200 m.',
          '# MOON (south pole)',
          '· Terrain: LRO LOLA (ldem_80s_80m). Surface temperature: LRO Diviner.',
          '# MARS (Jezero)',
          '· Terrain: HRSC + MOLA. Weather: MEDA (Perseverance) / REMS.',
          '',
          'Every value in the Site File shows its source, date and unit. Missing data says "no data":',
          'it is never filled in. Sites tagged ILLUSTRATIVE are demo data, not measurements.',
        ],
      },
      {
        sub: '2 · How similarity is computed',
        lineas: [
          '# SHAPE (main dimension)',
          '· The same crater-like depression detector runs, with the same code and at 200 m, on Earth,',
          '  the lunar south pole and Mars.',
          '· Explainable models (shallow decision tree and logistic regression) trained on real Moon and Mars',
          '  craters: ~78 % out-of-fold balanced accuracy (76 % with depth/diameter alone). The main rule is depth / diameter.',
          '',
          '# COMPLEMENTARY VARIABLES',
          '· s = exp(−|Earth − destination| / scale). If the destination is outside the Earth range, it is',
          '  compared against Earth\'s extreme and flagged.',
          '· Total: weighted geometric mean. Missing data: the dimension is skipped and confidence drops.',
          '',
          'It is not a neural network: it is an explainable model + a transparent comparator.',
        ],
      },
      {
        sub: '3 · Validation, limits and game values',
        lineas: [
          '# VALIDATION',
          '· The detector finds 9 of 11 known Mexican craters.',
          '· Negative controls (rainforest, farmland) must score near 0 %. See model/VALIDATION.md.',
          '# WHAT EARTH CANNOT TEST',
          '· Gravity (Mars 3.71 m/s², Moon 1.62 m/s²): simulated only in the mission, never in the Earth test.',
          '· Atmospheric pressure, radiation and the lunar vacuum.',
          '# GAME VALUES',
          '· Prices, parts, tickets, budget and score are game values: they are not scientific evidence.',
          '· The test track comes from a real elevation profile with declared vertical exaggeration;',
          '  obstacles added for play are tagged as recreation.',
        ],
      },
    ],
    pagina: 'page',
    volver: 'Back',
    ayuda: '◀ ▶ change page · L switch language · Esc goes back',
  },
};

const estado = { pagina: 0 };

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

  texto(scene, 480, 40, T.titulo, { size: 24, origen: [0.5, 0.5] });
  texto(scene, 480, 74, p.sub, { size: 15, color: COLOR.acento, origen: [0.5, 0.5] });
  // Panel semitransparente detrás del texto: se lee mejor sobre el Marte del fondo.
  panel(scene, 24, 92, 912, p.lineas.length * 26 + 14).setFillStyle(COLOR.panel, 0.72);
  p.lineas.forEach((l, i) => {
    const encabezado = l.startsWith('# '); // "# " marca un encabezado de sección
    texto(scene, 40, 104 + i * 26, encabezado ? l.slice(2) : l, { size: encabezado ? 13 : 12, color: encabezado ? COLOR.foco : COLOR.texto });
  });

  const anterior = boton(scene, 300, 462, '◀', () => ir(-1), { size: 16 });
  texto(scene, 480, 462, `${T.pagina} ${estado.pagina + 1}/${total}`, { size: 13, color: COLOR.tenue, origen: [0.5, 0.5] });
  const siguiente = boton(scene, 660, 462, '▶', () => ir(1), { size: 16 });
  const atras = boton(scene, 480, 500, T.volver, volver, { size: 15 });
  const idiomaBoton = botonIdioma();
  texto(scene, 20, 536, T.ayuda, { size: 12, color: COLOR.muyTenue, origen: [0, 1] });

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
