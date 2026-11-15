import Phaser from 'phaser';
import { GRAVEDAD, UMBRAL_INTEGRIDAD } from '../config/world.js';
import { PIEZAS } from '../data.js';
import { partida } from '../main.js';
import { Recorrido } from '../fisica/recorrido.js';
import { perfilDeSitio } from '../fisica/perfil.js';
import { DISENO_POR_DEFECTO } from '../fisica/diseno.js';
import { exponerParaPruebas } from '../fisica/depuracion.js';
import { cargarArte } from '../fisica/aspecto.js';
import { tr } from '../i18n.js';
import { nombreSitio } from '../fisica/nombres_en.js';
import { tocarMusica } from '../audio/musica.js';

// Dueño: frente juego. Prueba terrestre: perfil del sitio (real o ilustrativo declarado) con gravedad de la Tierra.
// El análogo nunca simula la gravedad del destino. Pasa si llega a la meta con chasis y carga. Ver ESPECIFICACION.md §9.
export default class Prueba extends Phaser.Scene {
  constructor() {
    super('Prueba');
    exponerParaPruebas('Prueba', this);
    exponerParaPruebas('partida', partida);
  }

  preload() {
    cargarArte(this); // solo los PNG de /assets que existen (fisica/aspecto.js)
  }

  create() {
    tocarMusica('tierra'); // prueba terrestre: música de la Tierra (audio/musica.js)
    const sitio = partida.sitio;
    const diseno = partida.diseno?.length ? partida.diseno : DISENO_POR_DEFECTO;
    const sitioId = sitio?.id ?? null;
    const intentos = partida.resultados.filter((r) => r.tipo === 'prueba' && r.resultado.sitio === sitioId).length + 1;

    this.recorrido = new Recorrido(this, {
      perfil: perfilDeSitio(sitio),
      mundo: 'tierra',
      gravedad: GRAVEDAD.tierra,
      diseno,
      piezas: PIEZAS,
      modo: 'prueba',
      titulo: tr(`Prueba terrestre · ${sitio?.nombre ?? 'sin sitio elegido'}`, `Earth test · ${sitio ? nombreSitio(sitio) : 'no site chosen'}`),
      subtitulo: tr(`Gravedad de la Tierra (${GRAVEDAD.tierra} m/s²) · intento ${intentos}`, `Earth gravity (${GRAVEDAD.tierra} m/s²) · attempt ${intentos}`),
      sitioId,
      destinoId: partida.destino,
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
