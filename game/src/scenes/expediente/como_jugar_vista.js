// Dueño: frente expediente. Vista de "Cómo jugar" dentro del Menú (la lógica está en como_jugar.js).
import { tr } from '../../i18n.js';
import { COLOR, texto, boton, panel } from './interfaz.js';
import { pantallasComoJugar, marcarComoJugarVisto } from './como_jugar.js';

// Página actual (se conserva si el Menú se reinicia al cambiar de idioma con L).
const estado = { pagina: 0 };
export function reiniciarPaginaComoJugar() { estado.pagina = 0; }

/**
 * Dibuja una pantalla de "Cómo jugar" dentro del Menú. `alTerminar` se llama al acabar la última pantalla o al saltar
 * (botón "Saltar" o Esc); en ambos casos queda marcado como visto.
 */
export function vistaComoJugar(scene, { presupuesto, alTerminar, redibujar, botonIdioma }) {
  const pantallas = pantallasComoJugar(presupuesto);
  const total = pantallas.length;
  estado.pagina = Math.min(Math.max(estado.pagina, 0), total - 1);
  const p = pantallas[estado.pagina];
  const ultima = estado.pagina === total - 1;
  const terminar = () => { marcarComoJugarVisto(); estado.pagina = 0; alTerminar(); };
  const ir = (paso) => {
    const nueva = estado.pagina + paso;
    if (nueva >= total) { terminar(); return; }
    estado.pagina = Math.max(0, nueva);
    redibujar();
  };

  texto(scene, 480, 40, tr('Cómo jugar', 'How to play'), { size: 28, origen: [0.5, 0.5] });
  texto(scene, 480, 74, `${estado.pagina + 1} / ${total}`, { size: 16, color: COLOR.tenue, origen: [0.5, 0.5] });
  panel(scene, 80, 96, 800, 286).setFillStyle(COLOR.panel, 0.9);
  // Viñeta de Mauricio (96×64 dibujada ×3) a la izquierda; sin arte, solo el texto centrado en el panel.
  const conImagen = !!p.imagen && scene.textures.exists(p.imagen);
  if (conImagen) {
    scene.add.rectangle(248, 239, 300, 204, 0x0b0d17).setStrokeStyle(2, COLOR.borde);
    scene.add.image(248, 239, p.imagen).setScale(3);
  }
  const cx = conImagen ? 640 : 480;
  const ancho = conImagen ? 420 : 700;
  texto(scene, cx, 130, p.titulo, { size: 22, color: COLOR.acento, origen: [0.5, 0.5], ancho, alinear: 'center' });
  // Keywords (2–3), una por renglón, 18 px; el número de créditos sale de config/world.js.
  p.claves.forEach((c, i) => {
    texto(scene, cx, 196 + i * 58, c, { size: 18, origen: [0.5, 0.5], ancho, alinear: 'center' });
  });

  const anterior = boton(scene, 230, 430, tr('◀ Anterior', '◀ Back'), () => ir(-1), { habilitado: estado.pagina > 0, size: 16 });
  const siguiente = boton(scene, 480, 430, ultima ? tr('¡A jugar!', "Let's play!") : tr('Siguiente ▶', 'Next ▶'), () => ir(1),
    { sugerido: true, size: 18 });
  const saltar = boton(scene, 730, 430, tr('Saltar', 'Skip'), terminar, { size: 16 });
  texto(scene, 480, 500, tr('← → pantalla · Enter sigue · Esc salta · L idioma',
    '← → screen · Enter continues · Esc skips · L language'), { size: 14, color: COLOR.muyTenue, origen: [0.5, 0.5] });

  scene.teclado.alEscape = terminar;
  scene.teclado.extra = {
    ...scene.teclado.extra,
    ArrowLeft: () => ir(-1), ArrowRight: () => ir(1),
  };
  const idiomaBoton = botonIdioma?.(); // mismo selector "Español / English" del menú principal
  scene.teclado.numerar([anterior, siguiente, saltar]);
  scene.teclado.poner([anterior, siguiente, saltar, idiomaBoton], siguiente);
}
