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
export function vistaComoJugar(scene, { presupuesto, alTerminar, redibujar }) {
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

  texto(scene, 480, 60, tr('Cómo jugar', 'How to play'), { size: 28, origen: [0.5, 0.5] });
  texto(scene, 480, 96, `${estado.pagina + 1} / ${total}`, { size: 14, color: COLOR.tenue, origen: [0.5, 0.5] });
  panel(scene, 130, 130, 700, 230);
  texto(scene, 480, 180, p.titulo, { size: 22, color: COLOR.acento, origen: [0.5, 0.5], ancho: 640, alinear: 'center' });
  texto(scene, 480, 270, p.texto, { size: 18, origen: [0.5, 0.5], ancho: 620, alinear: 'center' });

  const anterior = boton(scene, 250, 420, tr('◀ Anterior', '◀ Back'), () => ir(-1), { habilitado: estado.pagina > 0 });
  const siguiente = boton(scene, 480, 420, ultima ? tr('¡A jugar!', "Let's play!") : tr('Siguiente ▶', 'Next ▶'), () => ir(1),
    { sugerido: true });
  const saltar = boton(scene, 710, 420, tr('Saltar', 'Skip'), terminar);
  texto(scene, 480, 490, tr('← → cambia de pantalla · Enter sigue · Esc salta · L: idioma',
    '← → change screen · Enter continues · Esc skips · L: language'), { size: 12, color: COLOR.muyTenue, origen: [0.5, 0.5] });

  scene.teclado.alEscape = terminar;
  scene.teclado.extra = {
    ...scene.teclado.extra,
    ArrowLeft: () => ir(-1), ArrowRight: () => ir(1),
  };
  scene.teclado.numerar([anterior, siguiente, saltar]);
  scene.teclado.poner([anterior, siguiente, saltar], siguiente);
}
