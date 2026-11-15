import Phaser from 'phaser';
import { titulo, boton, nota, irA } from './ui.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { recomendar } from '../feedback/reglas.js';
import { puntuar } from '../feedback/puntuacion.js';
import { compararAnalogia } from '../feedback/analogia.js';
import { exponerParaPruebas } from '../fisica/depuracion.js';
import { sonarBoton } from '../fisica/sonido.js';
import { tr } from '../i18n.js';

// Dueño: frente juego. Resultado de la prueba o la misión: puntuación visible, recomendaciones por reglas y reintentar.
// Ver ESPECIFICACION.md §11–§12.
// Se evalúa al crear la escena (el idioma puede cambiar después de cargar el módulo).
const MOTIVOS = () => tr({
  meta: 'Llegó a la meta con chasis y carga.',
  entrega: 'Entregó el suministro.',
  chasis_destruido: 'El chasis se destruyó.',
  carga_perdida: 'La carga se cayó.',
  volcado: 'El robot volcó.',
  energia_agotada: 'Se acabó la energía.',
  atascado: 'Quedó atascado: no avanzó en 15 s.',
  carga_danada: 'Llegó, pero la carga está por debajo del mínimo.',
  abandono: 'Se abandonó el recorrido.',
}, {
  meta: 'Reached the finish with chassis and payload.',
  entrega: 'Delivered the supplies.',
  chasis_destruido: 'The chassis was destroyed.',
  carga_perdida: 'The payload fell off.',
  volcado: 'The robot flipped over.',
  energia_agotada: 'The battery ran out.',
  atascado: 'Got stuck: no progress in 15 s.',
  carga_danada: 'Arrived, but the payload is below the minimum.',
  abandono: 'The run was abandoned.',
});
const ESTILO = { fontFamily: 'monospace', fontSize: '14px', color: '#cfd6ff', wordWrap: { width: 820 } };

export default class Resultados extends Phaser.Scene {
  constructor() {
    super('Resultados');
    exponerParaPruebas('Resultados', this);
  }

  create() {
    const registro = partida.resultados[partida.resultados.length - 1];
    if (!registro) {
      titulo(this, tr('Resultados', 'Results'), tr('Todavía no hay pruebas ni misiones.', 'No tests or missions yet.'));
      boton(this, 480, 440, tr('Menú', 'Menu'), () => { sonarBoton(); irA(this, 'Menu'); });
      return;
    }
    const { tipo, exito, motivo, resultado, ilustrativo } = registro;
    const esMision = tipo === 'mision';
    const encabezado = esMision
      ? (exito ? tr('Misión cumplida', 'Mission accomplished') : tr('Misión fallida', 'Mission failed'))
      : (exito ? tr('Prueba superada', 'Test passed') : tr('La prueba falló', 'Test failed'));
    titulo(this, encabezado, MOTIVOS()[motivo] ?? motivo);

    // Marco de arte (assets/ui/ui_panel.png, 9 partes de 16 × 16) detrás del contenido; las esquinas se escalan × 3 enteras.
    if (this.textures.exists('ui/ui_panel')) this.add.nineslice(480, 282, 'ui/ui_panel', undefined, 306, 104, 5, 5, 5, 5).setScale(3).setDepth(-1);

    let y = 130;
    const linea = (texto, color = '#cfd6ff') => { this.add.text(70, y, texto, { ...ESTILO, color }); y += 22; };
    const lineaChica = (texto, color = '#9aa4c7') => {
      const t = this.add.text(70, y, texto, { ...ESTILO, fontSize: '12px', color });
      y += t.height + 3;
    };
    const carga = Math.round(resultado.integridad_carga * 100);
    const energia = Math.round(resultado.energia_restante * 100);
    linea(tr(`Distancia ${resultado.distancia_m} m · carga ${carga} % · energía ${energia} % · costo ${resultado.costo} créditos · intento ${resultado.intentos}`,
      `Distance ${resultado.distancia_m} m · payload ${carga} % · energy ${energia} % · cost ${resultado.costo} credits · attempt ${resultado.intentos}`));

    if (esMision) {
      const p = puntuar(resultado, PRESUPUESTO_INICIAL);
      // Estrellas de arte (assets/ui/ui_estrella_*.png, 16 × 16 × 3); si no hay arte, texto.
      if (this.textures.exists('ui/ui_estrella_llena') && this.textures.exists('ui/ui_estrella_vacia')) {
        this.add.text(890, 124, `${p.total}`, { ...ESTILO, fontSize: '28px', color: '#ffd166' }).setOrigin(1, 0);
        for (let i = 0; i < 3; i++) {
          this.add.image(890 - (2 - i) * 52, 182, i < p.estrellas ? 'ui/ui_estrella_llena' : 'ui/ui_estrella_vacia').setOrigin(1, 0.5).setScale(3);
        }
      } else {
        const estrellas = '★'.repeat(p.estrellas) + '☆'.repeat(3 - p.estrellas);
        this.add.text(890, 130, `${p.total}\n${estrellas}`, { ...ESTILO, fontSize: '28px', color: '#ffd166', align: 'right' }).setOrigin(1, 0);
      }
      const d = p.desglose;
      if (resultado.entrega) {
        linea(tr(`Entrega ${d.entrega} + carga ${d.integridad} + energía ${d.energia} + ahorro ${d.ahorro}`,
          `Delivery ${d.entrega} + payload ${d.integridad} + energy ${d.energia} + savings ${d.ahorro}`), '#9aa4c7');
      }
    }

    // Misión: qué probó la Tierra y qué no (comparando con la última prueba terrestre de esta partida).
    if (esMision) {
      y += 6;
      linea(tr('Dónde se rompe la analogía:', 'Where the analogy breaks down:'), '#ffffff');
      const prueba = [...partida.resultados].reverse().find((r) => r.tipo === 'prueba');
      const destino = DESTINOS[resultado.destino] ?? DESTINOS[partida.destino];
      for (const l of compararAnalogia(prueba, registro, destino)) lineaChica(`• ${l}`);
    }

    y += 10;
    const recs = recomendar(resultado);
    const encabezadoRecs = recs.length
      ? tr('Recomendaciones (según lo que pasó en este intento):', 'Recommendations (based on what happened in this attempt):')
      : (exito ? tr('Sin problemas que corregir en este intento.', 'Nothing to fix in this attempt.')
        : tr('Sin una recomendación de piezas: revisa el manejo.', 'No part to recommend: check your driving.'));
    linea(encabezadoRecs, '#ffffff');
    for (const r of recs.slice(0, esMision ? 2 : 4)) {
      linea(`• ${r.texto}`, '#ffd166');
      linea(`   ${r.evidencia}`, '#9aa4c7');
    }

    // Botones con atajo de teclado (1, 2, 3) y Enter = siguiente paso sugerido del camino dorado.
    const yb = 470;
    const opciones = esMision
      ? [[tr('Reintentar misión', 'Retry mission'), 'Mision'], [tr('Volver al taller', 'Back to workshop'), 'Taller'], [tr('Menú', 'Menu'), 'Menu']]
      : [[tr('Volver al taller', 'Back to workshop'), 'Taller'], [tr('Probar otra vez', 'Test again'), 'Prueba'],
        [exito ? tr('Lanzar misión', 'Launch mission') : tr('Lanzar misión sin superar', 'Launch mission anyway'), 'Mision']];
    const sugerida = esMision ? (exito ? 2 : 0) : (exito ? 2 : 0);
    const xs = [190, 480, 770];
    const ir = (escena) => { sonarBoton(); irA(this, escena); };
    opciones.forEach(([texto, escena], i) => {
      const b = boton(this, xs[i], yb, `${i + 1} · ${texto}${i === sugerida ? ' ⏎' : ''}`, () => ir(escena));
      if (i === sugerida) b.setColor('#4cc38a');
    });
    this.input.keyboard.on('keydown', (ev) => {
      const n = Number(ev.key);
      if (n >= 1 && n <= opciones.length) ir(opciones[n - 1][1]);
      else if (ev.key === 'Enter') ir(opciones[sugerida][1]);
    });
    const avisos = [tr('La puntuación es de juego, no evidencia científica.', 'The score is a game value, not scientific evidence.')];
    if (ilustrativo) avisos.push(tr('Terreno ilustrativo: no es un perfil medido.', 'Illustrative terrain: not a measured profile.'));
    nota(this, avisos.join(' '));
  }
}
