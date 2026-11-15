// Enlace de los niveles destacados con el recorrido (fisica/recorrido.js): un solo objeto con ganchos pequeños para que la
// integración con otras ramas sea fácil. Sin configuración (otros sitios), no hace nada.
//   const nd = new NivelDestacado(scene, o, terreno)   → antes del robot (agarre y superficie de los parches)
//   nd.crear(robot)                                    → después del robot (cuerpos, viento, eventos)
//   nd.factorAgarre(x_m) · nd.superficie(x_m) · nd.actualizar(dt, x_m) · nd.nota() · nd.filaEntrena() · nd.destruir()
import { tr } from '../i18n.js';
import { configDeNivel } from '../content/niveles_destacados.js';
import { generarElementos, crearElementos, factorParcheEn, superficieParcheEn, notaElementos } from './elementos_nivel.js';
import { Viento, textoViento } from './viento.js';
import { EventosFondo, notaEventos } from './eventos_fondo.js';
import { sprite, hayArte } from './aspecto.js';

const reducido = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export class NivelDestacado {
  constructor(scene, o, terreno) {
    this.scene = scene;
    this.o = o;
    this.terreno = terreno;
    this.cfg = configDeNivel({ modo: o.modo, sitioId: o.sitioId, destinoId: o.destinoId });
    this.semilla = (o.modo === 'prueba' ? o.sitioId : o.destinoId) ?? o.mundo;
    // En las misiones no se agregan bloques ni parches: el camino dorado está calibrado sin ellos.
    this.elementos = this.cfg && o.modo === 'prueba' ? generarElementos(o.perfil, this.cfg, this.semilla) : [];
  }

  get activo() { return Boolean(this.cfg); }

  crear(robot, ambiente) {
    if (!this.cfg) return;
    this.robot = robot;
    this.ambiente = ambiente;
    this.vistas = crearElementos(this.scene, this.o.perfil, this.terreno, this.elementos, { mundo: this.o.mundo, sprite, hayArte, robot });
    this.viento = new Viento(this.scene, { robot, ambiente, semilla: this.semilla, particula: this.cfg.viento?.particula ?? null, reducido: reducido() });
    this.eventos = new EventosFondo(this.scene, {
      tipos: this.cfg.eventos, semilla: this.semilla, robot, perfil: this.o.perfil, terreno: this.terreno, ambiente, sprite, hayArte, reducido: reducido(),
    });
  }

  factorAgarre(x_m) { return factorParcheEn(this.elementos, x_m); }
  superficie(x_m) { return superficieParcheEn(this.elementos, x_m); }

  /** dt en segundos de la física; x_m = avance del robot (m del perfil). */
  actualizar(dt, x_m) {
    if (!this.cfg) return;
    this.viento?.actualizar(dt);
    this.eventos?.actualizar(dt, x_m);
  }

  /** Nota para el panel de datos (tecla I): qué entrena, elementos recreados, viento y eventos. */
  nota(masaKg) {
    if (!this.cfg) return null;
    const c = this.cfg;
    return [
      c.entrena ? `${tr('Qué entrena', 'What it trains')}: ${tr(c.entrena.es, c.entrena.en)}.` : null,
      c.analogia ? tr(c.analogia.es, c.analogia.en) : null,
      notaElementos(this.elementos) && `${notaElementos(this.elementos)}.`,
      textoViento(this.ambiente, masaKg, this.o.gravedad),
      notaEventos(c.eventos),
    ].filter(Boolean).join(' ');
  }

  /** Fila de las instrucciones: «Entrena: …» (solo pruebas de sitios destacados). */
  filaEntrena() {
    if (!this.cfg?.entrena) return null;
    return { texto: `${tr('Entrena', 'Trains')}: ${tr(this.cfg.entrena.es, this.cfg.entrena.en)}`, icono: 'iconos/ico_suelo', respaldo: '★' };
  }

  destruir() {
    this.vistas?.destruir();
    this.viento?.destruir();
    this.eventos?.destruir();
  }
}
