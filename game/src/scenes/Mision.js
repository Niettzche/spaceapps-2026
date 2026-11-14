import Phaser from 'phaser';
import { UMBRAL_INTEGRIDAD } from '../config/world.js';
import { DESTINOS, PIEZAS } from '../data.js';
import { partida } from '../main.js';
import { Recorrido } from '../fisica/recorrido.js';
import { perfilDeDestino } from '../fisica/perfil.js';
import { DISENO_POR_DEFECTO } from '../fisica/diseno.js';
import { exponerParaPruebas } from '../fisica/depuracion.js';
import { cargarArte } from '../fisica/aspecto.js';

// Dueño: frente juego. Misión en el destino elegido (Luna o Marte) con su gravedad real: entregar el suministro.
// Victoria: carga en la zona con integridad ≥ UMBRAL_INTEGRIDAD y robot detenido 2 s. Ver ESPECIFICACION.md §10.
export default class Mision extends Phaser.Scene {
  constructor() {
    super('Mision');
    exponerParaPruebas('Mision', this);
  }

  preload() {
    cargarArte(this); // solo los PNG de /assets que existen (fisica/aspecto.js)
  }

  create() {
    const destino = DESTINOS[partida.destino] ?? DESTINOS.jezero;
    const diseno = partida.diseno?.length ? partida.diseno : DISENO_POR_DEFECTO;
    const intentos = partida.resultados.filter((r) => r.tipo === 'mision' && r.resultado.destino === destino.id).length + 1;

    this.recorrido = new Recorrido(this, {
      perfil: perfilDeDestino(destino),
      mundo: destino.mundo,
      gravedad: destino.gravedad_ms2,
      diseno,
      piezas: PIEZAS,
      modo: 'mision',
      titulo: `Misión · ${destino.nombre}`,
      subtitulo: `Gravedad ${destino.gravedad_ms2} m/s² · entrega con carga ≥ ${Math.round(UMBRAL_INTEGRIDAD * 100)} % y robot detenido 2 s · intento ${intentos}`,
      sitioId: partida.sitio?.id ?? null,
      destinoId: destino.id,
      intentos,
      umbralIntegridad: UMBRAL_INTEGRIDAD,
      alTerminar: (registro) => {
        partida.resultados.push(registro);
        this.scene.start('Resultados');
      },
    });
    this.events.once('shutdown', () => this.recorrido.destruir());
  }

  update(time, delta) {
    this.recorrido?.actualizar(time, delta);
  }
}
