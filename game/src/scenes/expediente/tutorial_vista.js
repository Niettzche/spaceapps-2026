// Dueño: frente expediente. Vista del tutorial rápido del Expediente (coach marks); la lógica está en tutorial_expediente.js.
// La vista es común a todos los tutoriales guiados (comun/tutorial_vista.js): aquí solo se fija la marca de «ya visto»
// del Expediente; el teclado es el de la escena (Enter, ← →, Esc).
import { abrirTutorial as abrirComun } from '../comun/tutorial_vista.js';
import { marcaTutorial } from '../comun/tutorial.js';
import { CLAVE_TUTORIAL } from './tutorial_expediente.js';

/**
 * Abre el tutorial encima de todo. `pasos`: de pasosTutorial(); `zonas(nombre)` → { x, y, w, h } o null;
 * `marca`: la del tutorial completo por defecto; la vista simple pasa la suya (vista_simple.js).
 * `alCerrar()` se llama al terminar o saltar (queda marcado como visto en ambos casos). Devuelve { cerrar, capa, paso() }.
 */
export function abrirTutorial(scene, { pasos, zonas, alCerrar, inicio = 0, marca = marcaTutorial(CLAVE_TUTORIAL) }) {
  return abrirComun(scene, { pasos, zonas, inicio, marca, alCerrar: () => alCerrar?.() });
}
