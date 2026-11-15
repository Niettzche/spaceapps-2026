// Feedback por reglas: cada recomendación sale de eventos reales de la partida. Ver ESPECIFICACION.md §12.
import { usaPieza } from '../fisica/diseno.js';
import { tr } from '../i18n.js';

// "1 vez / 3 veces" · "1 time / 3 times"
const veces = (n) => tr(`${n} ${n === 1 ? 'vez' : 'veces'}`, `${n} ${n === 1 ? 'time' : 'times'}`);

// Por encima de esta integridad final, los golpes a la carga no generan recomendación (valor de juego, P).
export const INTEGRIDAD_SIN_AVISO = 0.9;
/** Patinajes a partir de los cuales una batería agotada se atribuye primero al agarre (valor de juego, P). */
export const PATINAJES_CAUSA_ENERGIA = 5;

/**
 * Física 2 (?fisica=2): el peor evento `hundimiento` de la partida. Detalle «4 cm · 7.9 kPa · arena · ancha 4.7 kPa»
 * (robot.js). Devuelve { cm, kPa, superficie, kPaAncha } o null.
 */
export function leerHundimiento(eventos) {
  let peor = null;
  for (const e of eventos ?? []) {
    if (e.tipo !== 'hundimiento') continue;
    const m = /^(\d+) cm · ([\d.]+) kPa · (\w+)(?: · ancha ([\d.]+) kPa)?/.exec(e.detalle ?? '');
    if (!m) continue;
    const h = { cm: Number(m[1]), kPa: Number(m[2]), superficie: m[3], kPaAncha: m[4] ? Number(m[4]) : null };
    if (!peor || h.cm > peor.cm) peor = h;
  }
  return peor;
}

/** Línea explicable del hundimiento: «Tus ruedas se hundieron 4 cm: presión 7.9 kPa; con ruedas anchas sería 4.7 kPa.» */
export function textoHundimiento(h) {
  if (!h) return null;
  const ancha = h.kPaAncha != null
    ? tr(`; con ruedas anchas sería ${h.kPaAncha.toFixed(1)} kPa`, `; with wide wheels it would be ${h.kPaAncha.toFixed(1)} kPa`) : '';
  return tr(`Tus ruedas se hundieron ${h.cm} cm: presión ${h.kPa.toFixed(1)} kPa${ancha}.`,
    `Your wheels sank ${h.cm} cm: ground pressure ${h.kPa.toFixed(1)} kPa${ancha}.`);
}

/**
 * @param {object} resultado  Result (eventos, diseno, integridad_carga, ...)
 * @param {string} [motivo] Condición final del registro, si está disponible.
 * @returns {Array<{ id, texto, evidencia, cambio? }>}  recomendaciones, de la más importante a la menos
 */
export function recomendar(resultado, motivo) {
  const ev = resultado.eventos ?? [];
  const contar = (tipo, detalle) => ev.filter((e) => e.tipo === tipo && (detalle === undefined || e.detalle === detalle)).length;
  const d = resultado.diseno ?? [];
  const recs = [];
  // Atasco en reversa o sin salir del inicio (recorrido.js, `atasco_reversa`): el robot no probó el terreno; no se culpa a
  // las piezas. Se recomienda avanzar. Respaldo si falta el evento: atascado a menos de 3 m del inicio.
  if (motivo === 'atascado' && (contar('atasco_reversa') > 0 || (resultado.distancia_m ?? Infinity) < 3)) {
    return [{
      id: 'avanzar',
      texto: tr('Acelera hacia adelante (→ o D): el robot se quedó en el inicio.', 'Drive forward (→ or D): the rover stayed at the start.'),
      evidencia: tr(`Avanzó ${Math.round(resultado.distancia_m ?? 0)} m; el atasco fue en reversa o contra la pared del inicio, no por las piezas.`,
        `It moved ${Math.round(resultado.distancia_m ?? 0)} m; it got stuck in reverse or against the start wall, not because of its parts.`),
    }];
  }

  const patinaArena = contar('patinaje', 'arena');
  if (patinaArena > 0 && !usaPieza(d, 'rueda_ancha')) {
    recs.push({
      id: 'rueda_ancha',
      texto: tr('Cambia a ruedas anchas para arena.', 'Switch to wide sand wheels.'),
      evidencia: tr(`Tus ruedas patinaron ${veces(patinaArena)} en arena.`, `Your wheels slipped ${veces(patinaArena)} on sand.`),
      cambio: { ranuras: ['rueda_del', 'rueda_tras'], pieza: 'rueda_ancha' },
    });
  }
  // Física 2: el hundimiento explica el patinaje con números (presión = peso / área de contacto).
  const hund = leerHundimiento(ev);
  const recAncha = recs.find((r) => r.id === 'rueda_ancha');
  if (hund && recAncha && hund.kPaAncha != null) recAncha.evidencia += ` ${textoHundimiento(hund)}`;
  else if (hund && hund.kPaAncha != null && hund.superficie === 'arena' && !usaPieza(d, 'rueda_ancha')) {
    recs.push({
      id: 'rueda_ancha',
      texto: tr('Cambia a ruedas anchas: reparten el peso y se hunden menos.', 'Switch to wide wheels: they spread the weight and sink less.'),
      evidencia: textoHundimiento(hund),
      cambio: { ranuras: ['rueda_del', 'rueda_tras'], pieza: 'rueda_ancha' },
    });
  }
  const patinaRoca = contar('patinaje', 'roca');
  if (patinaRoca > 0 && !usaPieza(d, 'rueda_tacos')) {
    recs.push({
      id: 'rueda_tacos',
      texto: tr('Prueba ruedas con tacos para roca.', 'Try lugged wheels for rock.'),
      evidencia: tr(`Tus ruedas patinaron ${veces(patinaRoca)} en roca.`, `Your wheels slipped ${veces(patinaRoca)} on rock.`),
      cambio: { ranuras: ['rueda_del', 'rueda_tras'], pieza: 'rueda_tacos' },
    });
  }
  const sinFuerza = contar('sin_fuerza');
  if (sinFuerza > 0 && !usaPieza(d, 'motor_potente')) {
    recs.push({
      id: 'motor_potente',
      texto: tr('Usa el motor potente para subir pendientes.', 'Use the powerful motor to climb slopes.'),
      evidencia: tr(`El robot se detuvo ${veces(sinFuerza)} acelerando sin patinar: le faltó fuerza.`,
        `The robot stalled ${veces(sinFuerza)} while accelerating without slipping: it lacked force.`),
      cambio: { ranuras: ['motor'], pieza: 'motor_potente' },
    });
  }
  const golpesCarga = contar('golpe_carga');
  // Con el daño por sacudidas casi todo recorrido registra algún golpe_carga: solo se recomienda si el daño importa.
  const cargaDanada = golpesCarga > 0 && (resultado.integridad_carga ?? 1) < INTEGRIDAD_SIN_AVISO;
  if ((cargaDanada || ['carga_perdida', 'carga_danada'].includes(motivo) || contar('carga_perdida') > 0) && !usaPieza(d, 'soporte_amortiguado')) {
    recs.push({
      id: 'soporte_amortiguado',
      texto: tr('Usa el soporte de carga amortiguado.', 'Use the cushioned payload mount.'),
      evidencia: motivo === 'carga_perdida' || contar('carga_perdida') > 0
        ? tr('La carga se cayó del soporte.', 'The payload fell off its mount.')
        : cargaDanada
          ? tr(`La carga recibió ${golpesCarga} ${golpesCarga === 1 ? 'golpe' : 'golpes'} (integridad final ${Math.round(resultado.integridad_carga * 100)} %).`,
            `The payload took ${golpesCarga} ${golpesCarga === 1 ? 'hit' : 'hits'} (final integrity ${Math.round(resultado.integridad_carga * 100)} %).`)
          : tr('La carga llegó por debajo de la integridad requerida.', 'The payload arrived below the required integrity.'),
      cambio: { ranuras: ['carga'], pieza: 'soporte_amortiguado' },
    });
  }
  // Rueda de Nitinol (AB-004): con el soporte amortiguado ya puesto y la carga aún dañada, la llanta superelástica absorbe
  // parte de las sacudidas (parts.json `amortiguacion`, P).
  if (cargaDanada && usaPieza(d, 'soporte_amortiguado') && !usaPieza(d, 'rueda_nitinol')) {
    recs.push({
      id: 'rueda_nitinol',
      texto: tr('Prueba ruedas de Nitinol: su llanta absorbe sacudidas.', 'Try Nitinol wheels: their tire absorbs jolts.'),
      evidencia: tr(`La carga recibió ${golpesCarga} ${golpesCarga === 1 ? 'golpe' : 'golpes'} aun con el soporte amortiguado.`,
        `The payload took ${golpesCarga} ${golpesCarga === 1 ? 'hit' : 'hits'} even with the cushioned mount.`),
      cambio: { ranuras: ['rueda_del', 'rueda_tras'], pieza: 'rueda_nitinol' },
    });
  }
  // Auto-rescate (AB-002): patinó varias veces aunque ya lleva las ruedas que recomendaríamos y la bahía del módulo está libre.
  const patinajes = patinaArena + patinaRoca;
  const conModulo = d.some((x) => x.ranura === 'modulo' && x.pieza);
  // Solo si el intento falló por atasco o energía: tras una prueba superada no se agrega ruido al camino dorado.
  const fallo = ['atascado', 'energia_agotada'].includes(motivo);
  if (fallo && patinajes >= 3 && !conModulo && !recs.some((r) => r.id === 'rueda_ancha' || r.id === 'rueda_tacos')) {
    recs.push({
      id: 'auto_rescate',
      texto: tr('Pon el auto-rescate en el módulo: zafa al robot cuando se atasca.', 'Fit the self-rescue module: it frees the robot when it gets stuck.'),
      evidencia: tr(`Tus ruedas patinaron ${veces(patinajes)} aun siendo las adecuadas para el suelo.`,
        `Your wheels slipped ${veces(patinajes)} even though they suit the ground.`),
      cambio: { ranuras: ['modulo'], pieza: 'auto_rescate' },
    });
  }
  if (motivo === 'energia_agotada' || contar('energia_agotada') > 0) {
    // Batería fría (ambiente.js, regla a): el robot registra `bateria_fria` al arrancar si el frío le quitó carga útil.
    const fria = ev.find((e) => e.tipo === 'bateria_fria');
    if (fria && !usaPieza(d, 'calentador_bateria')) {
      recs.push({
        id: 'calentador_bateria',
        texto: tr('Pon el calentador de batería en el módulo.', 'Fit the battery heater in the module bay.'),
        evidencia: tr(`El frío dejó la batería al ${fria.detalle} al arrancar y la energía se acabó.`,
          `The cold left the battery at ${fria.detalle} at the start and the energy ran out.`),
        cambio: { ranuras: ['modulo'], pieza: 'calentador_bateria' },
      });
    }
    if (!usaPieza(d, 'bateria_grande')) {
      recs.push({ id: 'bateria_grande', texto: tr('Lleva la batería grande.', 'Bring the large battery.'), evidencia: tr('Se acabó la energía antes de terminar.', 'The battery ran out before the end.'), cambio: { ranuras: ['bateria'], pieza: 'bateria_grande' } });
    } else if (usaPieza(d, 'motor_potente')) {
      recs.push({ id: 'motor_eficiente', texto: tr('Cambia al motor eficiente: gasta la mitad.', 'Switch to the efficient motor: it uses half the energy.'), evidencia: tr('Se acabó la energía aun con la batería grande.', 'The battery ran out even with the large battery.'), cambio: { ranuras: ['motor'], pieza: 'motor_eficiente' } });
    }
  }
  // Motor sobrecalentado (ambiente.js): sin aire que lo enfríe, el motor potente se calienta el doble que el eficiente.
  const calor = contar('sobrecalentamiento');
  if (calor > 0) {
    const evidencia = tr(`El motor pasó del límite de temperatura ${veces(calor)} y perdió potencia.`,
      `The motor went over its temperature limit ${veces(calor)} and lost power.`);
    if (usaPieza(d, 'motor_potente')) {
      recs.push({ id: 'motor_eficiente_calor', texto: tr('Usa el motor eficiente: se calienta la mitad.', 'Use the efficient motor: it heats up half as much.'), evidencia, cambio: { ranuras: ['motor'], pieza: 'motor_eficiente' } });
    } else if (!usaPieza(d, 'radiador')) {
      // Sin aire el motor solo se enfría por radiación: el radiador agrega enfriamiento (parts.json `radiador`, P).
      recs.push({ id: 'radiador', texto: tr('Pon el radiador del motor en el módulo.', 'Fit the motor radiator in the module bay.'), evidencia, cambio: { ranuras: ['modulo'], pieza: 'radiador' } });
    } else if (usaPieza(d, 'motor_equilibrado')) {
      recs.push({ id: 'motor_eficiente_calor', texto: tr('Usa el motor eficiente: se calienta menos.', 'Use the efficient motor: it heats up less.'), evidencia, cambio: { ranuras: ['motor'], pieza: 'motor_eficiente' } });
    } else {
      recs.push({ id: 'pausas_motor', texto: tr('Maneja con pausas: suelta el acelerador para que el motor se enfríe.', 'Drive with pauses: release the throttle so the motor cools down.'), evidencia });
    }
  }
  if ((motivo === 'chasis_destruido' || contar('chasis_destruido') > 0) && !usaPieza(d, 'chasis_reforzado')) {
    recs.push({ id: 'chasis_reforzado', texto: tr('Usa el chasis reforzado.', 'Use the reinforced chassis.'), evidencia: tr('El chasis se destruyó por los golpes.', 'The chassis was destroyed by impacts.'), cambio: { ranuras: ['chasis'], pieza: 'chasis_reforzado' } });
  }
  if (contar('volcado') > 0) {
    recs.push({ id: 'manejo', texto: tr('Baja la velocidad antes de las bajadas y los saltos.', 'Slow down before descents and jumps.'), evidencia: tr('El robot volcó.', 'The robot flipped over.') });
  }
  // El auto-rescate se activó: se informa (sin cambio de pieza) que cada rescate gastó energía.
  const rescates = contar('auto_rescate');
  if (rescates > 0) {
    recs.push({
      id: 'auto_rescate_uso',
      texto: tr('El auto-rescate te sacó de un atasco; cada rescate gasta batería.', 'Self-rescue got you unstuck; each rescue drains the battery.'),
      evidencia: tr(`Se activó ${veces(rescates)}.`, `It fired ${veces(rescates)}.`),
    });
  }
  // Física 2: el suelo no dio el empuje que pedían la pendiente y la resistencia (H = A·c + W·tan φ). Solo informa.
  const empuje = ev.filter((e) => e.tipo === 'empuje_insuficiente');
  if (empuje.length && fallo) {
    recs.push({
      id: 'empuje_suelo',
      texto: tr('El suelo no dio suficiente empuje para esa pendiente: más área de contacto (rueda ancha) o menos peso ayudan.',
        'The ground could not give enough thrust for that slope: more contact area (wide wheel) or less weight helps.'),
      evidencia: tr(`Empuje del suelo menor que la resistencia ${veces(empuje.length)} (${empuje[0].detalle}).`,
        `Ground thrust below the resistance ${veces(empuje.length)} (${empuje[0].detalle}).`),
    });
  }
  // La condición que terminó el intento tiene prioridad sobre problemas secundarios.
  // Excepción: si se acabó la energía patinando mucho, la causa de fondo es el agarre (patinar gasta batería sin avanzar):
  // primero las ruedas, luego la batería. Así «Aplicar y al taller» cambia las ruedas (camino dorado lunar).
  const patinoMucho = patinaArena + patinaRoca >= PATINAJES_CAUSA_ENERGIA;
  const prioridad = {
    energia_agotada: patinoMucho ? ['rueda_ancha', 'rueda_tacos', 'bateria_grande', 'motor_eficiente', 'calentador_bateria'] : ['bateria_grande', 'motor_eficiente', 'calentador_bateria'],
    chasis_destruido: ['chasis_reforzado'],
    carga_perdida: ['soporte_amortiguado'],
    carga_danada: ['soporte_amortiguado'],
    volcado: ['manejo'],
  }[motivo] ?? [];
  const rango = (r) => (prioridad.includes(r.id) ? prioridad.indexOf(r.id) : prioridad.length);
  return recs.sort((x, y) => rango(x) - rango(y));
}
