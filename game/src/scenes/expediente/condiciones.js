// Dueño: frente expediente. Condiciones del sitio de la Tierra y del destino (aire, luz y qué hacen en el juego) para la
// vista "Condiciones" del Expediente. NO calcula ni inventa nada: solo junta lo que devuelven las funciones del frente
// juego en fisica/ambiente.js (ambienteDeSitio, ambienteDeDestino y lineasAmbiente), que citan su fuente.
// Lógica pura (sin Phaser) para poder probarla con `node --test`.
import { ambienteDeSitio, ambienteDeDestino, lineasAmbiente } from '../../fisica/ambiente.js';
import { tr, trDato } from '../../i18n.js';

const MUNDO = () => ({ tierra: tr('Tierra', 'Earth'), marte: tr('Marte', 'Mars'), luna: tr('Luna', 'Moon') });

/**
 * Columnas de la vista "Condiciones": Tierra (sitio) a la izquierda y destino a la derecha.
 * Cada una: { titulo, lineas } con `lineas` = lineasAmbiente(...) tal cual ([] si no hay datos del lado).
 */
export function columnasCondiciones(sitio, destino) {
  const nombreSitio = sitio ? trDato(sitio, 'nombre') ?? sitio.id : null;
  const nombreDestino = destino ? trDato(destino, 'nombre') ?? destino.id : null;
  const ambTierra = sitio ? ambienteDeSitio(sitio.id) : null;
  const ambDestino = destino ? ambienteDeDestino(destino.id, destino.mundo) : null;
  return {
    tierra: {
      titulo: `${MUNDO().tierra.toUpperCase()} · ${nombreSitio ?? tr('sin sitio', 'no site')}`,
      lineas: lineasAmbiente(ambTierra),
      referencia: Boolean(ambTierra?.referencia), // sin clima del sitio: lineasAmbiente lo dice en su nota
    },
    destino: {
      titulo: `${(MUNDO()[destino?.mundo] ?? destino?.mundo ?? '').toUpperCase()} · ${nombreDestino ?? tr('sin destino', 'no destination')}`,
      lineas: lineasAmbiente(ambDestino),
      referencia: false,
    },
  };
}
