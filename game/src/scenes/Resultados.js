import Phaser from 'phaser';
import { titulo, boton, nota, irA } from './ui.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { recomendar } from '../feedback/reglas.js';
import { puntuar } from '../feedback/puntuacion.js';
import { compararAnalogia } from '../feedback/analogia.js';
import { exponerParaPruebas } from '../fisica/depuracion.js';

// Dueño: frente juego. Resultado de la prueba o la misión: puntuación visible, recomendaciones por reglas y reintentar.
// Ver ESPECIFICACION.md §11–§12.
const MOTIVOS = {
  meta: 'Llegó a la meta con chasis y carga.',
  entrega: 'Entregó el suministro.',
  chasis_destruido: 'El chasis se destruyó.',
  carga_perdida: 'La carga se cayó.',
  volcado: 'El robot volcó.',
  energia_agotada: 'Se acabó la energía.',
  atascado: 'Quedó atascado: no avanzó en 15 s.',
  carga_danada: 'Llegó, pero la carga está por debajo del mínimo.',
  abandono: 'Se abandonó el recorrido.',
};
const ESTILO = { fontFamily: 'monospace', fontSize: '14px', color: '#cfd6ff', wordWrap: { width: 820 } };

export default class Resultados extends Phaser.Scene {
  constructor() {
    super('Resultados');
    exponerParaPruebas('Resultados', this);
  }

  create() {
    const registro = partida.resultados[partida.resultados.length - 1];
    if (!registro) {
      titulo(this, 'Resultados', 'Todavía no hay pruebas ni misiones.');
      boton(this, 480, 440, 'Menú', () => irA(this, 'Menu'));
      return;
    }
    const { tipo, exito, motivo, resultado, ilustrativo } = registro;
    const esMision = tipo === 'mision';
    titulo(this, esMision ? (exito ? 'Misión cumplida' : 'Misión fallida') : (exito ? 'Prueba superada' : 'La prueba falló'), MOTIVOS[motivo] ?? motivo);

    let y = 130;
    const linea = (texto, color = '#cfd6ff') => { this.add.text(70, y, texto, { ...ESTILO, color }); y += 22; };
    const lineaChica = (texto, color = '#9aa4c7') => {
      const t = this.add.text(70, y, texto, { ...ESTILO, fontSize: '12px', color });
      y += t.height + 3;
    };
    linea(`Distancia ${resultado.distancia_m} m · carga ${Math.round(resultado.integridad_carga * 100)} % · energía ${Math.round(resultado.energia_restante * 100)} % · costo ${resultado.costo} créditos · intento ${resultado.intentos}`);

    if (esMision) {
      const p = puntuar(resultado, PRESUPUESTO_INICIAL);
      const estrellas = '★'.repeat(p.estrellas) + '☆'.repeat(3 - p.estrellas);
      this.add.text(890, 130, `${p.total}\n${estrellas}`, { ...ESTILO, fontSize: '28px', color: '#ffd166', align: 'right' }).setOrigin(1, 0);
      if (resultado.entrega) linea(`Entrega ${p.desglose.entrega} + carga ${p.desglose.integridad} + energía ${p.desglose.energia} + ahorro ${p.desglose.ahorro}`, '#9aa4c7');
    }

    // Misión: qué probó la Tierra y qué no (comparando con la última prueba terrestre de esta partida).
    if (esMision) {
      y += 6;
      linea('Dónde se rompe la analogía:', '#ffffff');
      const prueba = [...partida.resultados].reverse().find((r) => r.tipo === 'prueba');
      const destino = DESTINOS[resultado.destino] ?? DESTINOS[partida.destino];
      for (const l of compararAnalogia(prueba, registro, destino)) lineaChica(`• ${l}`);
    }

    y += 10;
    const recs = recomendar(resultado);
    linea(recs.length ? 'Recomendaciones (según lo que pasó en este intento):' : (exito ? 'Sin problemas que corregir en este intento.' : 'Sin una recomendación de piezas: revisa el manejo.'), '#ffffff');
    for (const r of recs.slice(0, esMision ? 2 : 4)) {
      linea(`• ${r.texto}`, '#ffd166');
      linea(`   ${r.evidencia}`, '#9aa4c7');
    }

    // Botones con atajo de teclado (1, 2, 3) y Enter = siguiente paso sugerido del camino dorado.
    const yb = 470;
    const opciones = esMision
      ? [['Reintentar misión', 'Mision'], ['Volver al taller', 'Taller'], ['Menú', 'Menu']]
      : [['Volver al taller', 'Taller'], ['Probar otra vez', 'Prueba'], [exito ? 'Lanzar misión' : 'Lanzar misión sin superar', 'Mision']];
    const sugerida = esMision ? (exito ? 2 : 0) : (exito ? 2 : 0);
    const xs = [190, 480, 770];
    opciones.forEach(([texto, escena], i) => {
      const b = boton(this, xs[i], yb, `${i + 1} · ${texto}${i === sugerida ? ' ⏎' : ''}`, () => irA(this, escena));
      if (i === sugerida) b.setColor('#4cc38a');
    });
    this.input.keyboard.on('keydown', (ev) => {
      const n = Number(ev.key);
      if (n >= 1 && n <= opciones.length) irA(this, opciones[n - 1][1]);
      else if (ev.key === 'Enter') irA(this, opciones[sugerida][1]);
    });
    const avisos = ['La puntuación es de juego, no evidencia científica.'];
    if (ilustrativo) avisos.push('Terreno ilustrativo: no es un perfil medido.');
    nota(this, avisos.join(' '));
  }
}
