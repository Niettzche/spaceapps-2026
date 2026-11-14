// Dueño: frente expediente. Vista "¿De dónde salen los números?" dentro del Menú (provisional; se completa en la fase 2).
import { COLOR, texto, boton } from './interfaz.js';

export function vistaNumeros(scene, volver) {
  texto(scene, 480, 60, '¿De dónde salen los números?', { size: 26, origen: [0.5, 0.5] });
  texto(scene, 480, 250, 'Pantalla en construcción.', { size: 14, color: COLOR.tenue, origen: [0.5, 0.5] });
  scene.teclado.poner([boton(scene, 480, 480, 'Volver', volver)]);
}
