import Phaser from 'phaser';
import { titulo, boton, nota, irA } from './ui.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { partida } from '../main.js';
import { recomendar } from '../feedback/reglas.js';
import { puntuar } from '../feedback/puntuacion.js';
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
    linea(`Distancia ${resultado.distancia_m} m · carga ${Math.round(resultado.integridad_carga * 100)} % · energía ${Math.round(resultado.energia_restante * 100)} % · costo ${resultado.costo} créditos · intento ${resultado.intentos}`);

    if (esMision) {
      const p = puntuar(resultado, PRESUPUESTO_INICIAL);
      const estrellas = '★'.repeat(p.estrellas) + '☆'.repeat(3 - p.estrellas);
      this.add.text(890, 130, `${p.total}\n${estrellas}`, { ...ESTILO, fontSize: '28px', color: '#ffd166', align: 'right' }).setOrigin(1, 0);
      if (resultado.entrega) linea(`Entrega ${p.desglose.entrega} + carga ${p.desglose.integridad} + energía ${p.desglose.energia} + ahorro ${p.desglose.ahorro}`, '#9aa4c7');
    }

    y += 10;
    const recs = recomendar(resultado);
    linea(recs.length ? 'Recomendaciones (según lo que pasó en este intento):' : (exito ? 'Sin problemas que corregir en este intento.' : 'Sin una recomendación de piezas: revisa el manejo.'), '#ffffff');
    for (const r of recs.slice(0, 4)) {
      linea(`• ${r.texto}`, '#ffd166');
      linea(`   ${r.evidencia}`, '#9aa4c7');
    }

    const yb = 440;
    if (esMision) {
      boton(this, 250, yb, 'Reintentar misión', () => irA(this, 'Mision'));
      boton(this, 520, yb, 'Volver al taller', () => irA(this, 'Taller'));
      boton(this, 760, yb, 'Menú', () => irA(this, 'Menu'));
    } else {
      boton(this, 210, yb, 'Volver al taller', () => irA(this, 'Taller'));
      boton(this, 460, yb, 'Probar otra vez', () => irA(this, 'Prueba'));
      boton(this, 730, yb, exito ? 'Lanzar misión' : 'Lanzar misión sin superar', () => irA(this, 'Mision'));
    }
    const avisos = ['La puntuación es de juego, no evidencia científica.'];
    if (ilustrativo) avisos.push('Terreno ilustrativo: no es un perfil medido.');
    nota(this, avisos.join(' '));
  }
}
