// Feedback por reglas: cada recomendación sale de eventos reales de la partida. Ver ESPECIFICACION.md §12.
import { usaPieza } from '../fisica/diseno.js';

/**
 * @param {object} resultado  Result (eventos, diseno, integridad_carga, ...)
 * @returns {Array<{ id, texto, evidencia, cambio? }>}  recomendaciones, de la más importante a la menos
 */
export function recomendar(resultado) {
  const ev = resultado.eventos ?? [];
  const contar = (tipo, detalle) => ev.filter((e) => e.tipo === tipo && (detalle === undefined || e.detalle === detalle)).length;
  const d = resultado.diseno ?? [];
  const recs = [];

  const patinaArena = contar('patinaje', 'arena');
  if (patinaArena > 0 && !usaPieza(d, 'rueda_ancha')) {
    recs.push({
      id: 'rueda_ancha',
      texto: 'Cambia a ruedas anchas para arena.',
      evidencia: `Tus ruedas patinaron ${patinaArena} ${patinaArena === 1 ? 'vez' : 'veces'} en arena.`,
      cambio: { ranuras: ['rueda_del', 'rueda_tras'], pieza: 'rueda_ancha' },
    });
  }
  const patinaRoca = contar('patinaje', 'roca');
  if (patinaRoca > 0 && !usaPieza(d, 'rueda_tacos')) {
    recs.push({
      id: 'rueda_tacos',
      texto: 'Prueba ruedas con tacos para roca.',
      evidencia: `Tus ruedas patinaron ${patinaRoca} ${patinaRoca === 1 ? 'vez' : 'veces'} en roca.`,
      cambio: { ranuras: ['rueda_del', 'rueda_tras'], pieza: 'rueda_tacos' },
    });
  }
  const sinFuerza = contar('sin_fuerza');
  if (sinFuerza > 0 && !usaPieza(d, 'motor_potente')) {
    recs.push({
      id: 'motor_potente',
      texto: 'Usa el motor potente para subir pendientes.',
      evidencia: `El robot se detuvo ${sinFuerza} ${sinFuerza === 1 ? 'vez' : 'veces'} acelerando sin patinar: le faltó fuerza.`,
      cambio: { ranuras: ['motor'], pieza: 'motor_potente' },
    });
  }
  const golpesCarga = contar('golpe_carga');
  if ((golpesCarga > 0 || contar('carga_perdida') > 0) && !usaPieza(d, 'soporte_amortiguado')) {
    recs.push({
      id: 'soporte_amortiguado',
      texto: 'Usa el soporte de carga amortiguado.',
      evidencia: contar('carga_perdida') > 0
        ? 'La carga se cayó del soporte.'
        : `La carga recibió ${golpesCarga} ${golpesCarga === 1 ? 'golpe' : 'golpes'} (integridad final ${Math.round(resultado.integridad_carga * 100)} %).`,
      cambio: { ranuras: ['carga'], pieza: 'soporte_amortiguado' },
    });
  }
  if (contar('energia_agotada') > 0) {
    if (!usaPieza(d, 'bateria_grande')) {
      recs.push({ id: 'bateria_grande', texto: 'Lleva la batería grande.', evidencia: 'Se acabó la energía antes de terminar.', cambio: { ranuras: ['bateria'], pieza: 'bateria_grande' } });
    } else if (usaPieza(d, 'motor_potente')) {
      recs.push({ id: 'motor_eficiente', texto: 'Cambia al motor eficiente: gasta la mitad.', evidencia: 'Se acabó la energía aun con la batería grande.', cambio: { ranuras: ['motor'], pieza: 'motor_eficiente' } });
    }
  }
  if (contar('chasis_destruido') > 0 && !usaPieza(d, 'chasis_reforzado')) {
    recs.push({ id: 'chasis_reforzado', texto: 'Usa el chasis reforzado.', evidencia: 'El chasis se destruyó por los golpes.', cambio: { ranuras: ['chasis'], pieza: 'chasis_reforzado' } });
  }
  if (contar('volcado') > 0) {
    recs.push({ id: 'manejo', texto: 'Baja la velocidad antes de las bajadas y los saltos.', evidencia: 'El robot volcó.' });
  }
  return recs;
}
