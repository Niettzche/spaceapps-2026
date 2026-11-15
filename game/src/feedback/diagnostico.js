import { tr } from '../i18n.js';

/** Explica la condición final; no infiere falta de agarre solo por haberse detenido. */
export function diagnosticar({ motivo, exito, resultado = {} }) {
  const eventos = resultado.eventos ?? [];
  const patinaje = eventos.filter((e) => e.tipo === 'patinaje').length;
  const fuerza = eventos.filter((e) => e.tipo === 'sin_fuerza').length;
  switch (motivo) {
    case 'energia_agotada': return {
      detalle: tr('La batería se agotó antes de completar el recorrido.', 'The battery ran out before completing the route.'),
      consejo: tr('Revisa la batería y el consumo del motor en el taller. Evita acelerar sin avanzar.', 'Check battery capacity and motor consumption in the workshop. Avoid accelerating without moving.'),
    };
    case 'atascado': return {
      detalle: patinaje
        ? tr(`Sin avance durante 15 s; se registraron ${patinaje} eventos de patinaje.`, `No progress for 15 s; ${patinaje} wheel-slip events were recorded.`)
        : fuerza
          ? tr(`Sin avance durante 15 s; se registraron ${fuerza} eventos de falta de fuerza.`, `No progress for 15 s; ${fuerza} insufficient-force events were recorded.`)
          : tr('Sin avance durante 15 s. No hay eventos suficientes para atribuirlo a la tracción.', 'No progress for 15 s. There are not enough events to attribute this to traction.'),
      consejo: patinaje
        ? tr('Ajusta las ruedas al suelo indicado en los consejos y vuelve a probar.', 'Match your wheels to the ground shown in the advice, then test again.')
        : fuerza
          ? tr('Revisa la fuerza del motor y la masa del robot antes de repetir la subida.', 'Check motor force and rover mass before retrying the climb.')
          : tr('Prueba retroceder para tomar impulso y revisa la pendiente y el diseño en el taller.', 'Try reversing to gain momentum; review the slope and your design in the workshop.'),
    };
    case 'caida': return {
      detalle: tr('El robot se salió del terreno.', 'The rover fell off the terrain.'),
      consejo: tr('Vuelve a probar; si se repite, avísanos: es un error del nivel, no de tu diseño.', 'Try again; if it happens again, tell us: it is a level bug, not your design.'),
    };
    case 'volcado': return {
      detalle: tr('El robot quedó volcado.', 'The rover overturned.'),
      consejo: tr('Suelta el acelerador antes de los saltos y las bajadas. Prueba un diseño más estable.', 'Release the throttle before jumps and descents. Test a more stable design.'),
    };
    case 'carga_perdida':
    case 'carga_danada': return {
      detalle: motivo === 'carga_perdida'
        ? tr('La carga se desprendió del robot.', 'The payload detached from the rover.')
        : tr('La carga llegó con menos integridad de la requerida.', 'The payload arrived below the required integrity.'),
      consejo: tr('Reduce la velocidad sobre rocas y aterrizajes; revisa la protección del soporte de carga.', 'Slow down over rocks and landings; check the payload mount protection.'),
    };
    case 'chasis_destruido': return {
      detalle: tr('El chasis perdió su integridad.', 'The chassis lost its integrity.'),
      consejo: tr('Frena antes de los impactos y revisa la resistencia del chasis en el taller.', 'Slow down before impacts and check chassis durability in the workshop.'),
    };
    case 'abandono': return {
      detalle: tr('Saliste del recorrido; no se diagnosticó una avería.', 'You left the route; no failure was diagnosed.'),
      consejo: tr('Reintenta cuando estés listo o ajusta el robot en el taller.', 'Retry when ready or adjust your rover in the workshop.'),
    };
    default: return exito ? {
      detalle: tr('Completaste el objetivo de este recorrido.', 'You completed this route’s objective.'),
      consejo: tr('Revisa los eventos y la batería restante antes del siguiente intento.', 'Review events and remaining battery before your next attempt.'),
    } : {
      detalle: tr('No hay un diagnóstico registrado para este final.', 'No diagnosis was recorded for this ending.'),
      consejo: tr('Revisa los datos del intento y vuelve a probar; no se atribuye una causa sin evidencia.', 'Review the run data and test again; no cause is attributed without evidence.'),
    };
  }
}
