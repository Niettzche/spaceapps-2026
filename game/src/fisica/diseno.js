// Diseño del robot: ranuras, piezas, costo y masa (funciones puras). Ver docs/juego/ESPECIFICACION.md §3.

// Ranura → sistema de pieza que acepta. `modulo` es opcional.
export const RANURAS = {
  chasis: 'estructura',
  rueda_del: 'movilidad',
  rueda_tras: 'movilidad',
  motor: 'potencia',
  bateria: 'energia',
  carga: 'carga',
  modulo: 'modulo',
};
export const RANURAS_OBLIGATORIAS = ['chasis', 'rueda_del', 'rueda_tras', 'motor', 'bateria', 'carga'];

// Cada ranura de rueda es un eje con 2 ruedas: cobra y pesa el doble.
export const RUEDAS_POR_RANURA = 2;

// Diseño por defecto (para probar sin pasar por el taller).
export const DISENO_POR_DEFECTO = [
  { ranura: 'chasis', pieza: 'chasis_ligero' },
  { ranura: 'rueda_del', pieza: 'rueda_estandar' },
  { ranura: 'rueda_tras', pieza: 'rueda_estandar' },
  { ranura: 'motor', pieza: 'motor_eficiente' },
  { ranura: 'bateria', pieza: 'bateria_chica' },
  { ranura: 'carga', pieza: 'soporte_basico' },
];

// Masa de la carga (suministro), igual para todos los diseños. (P)
export const MASA_CARGA_KG = 10;

const esRueda = (ranura) => ranura === 'rueda_del' || ranura === 'rueda_tras';

/**
 * Resuelve un diseño [{ ranura, pieza }] contra el catálogo de piezas.
 * Completa las ranuras obligatorias que falten con el diseño por defecto y lo reporta en `completadas`.
 * Devuelve { porRanura, diseno, costo, masa, completadas, invalidas }.
 */
export function resolverDiseno(diseno, piezas) {
  const catalogo = Object.fromEntries(piezas.map((p) => [p.id, p]));
  const porRanura = {};
  const invalidas = [];
  for (const { ranura, pieza } of diseno ?? []) {
    const p = catalogo[pieza];
    if (!p || RANURAS[ranura] !== p.sistema) invalidas.push({ ranura, pieza });
    else porRanura[ranura] = p;
  }
  const completadas = [];
  for (const ranura of RANURAS_OBLIGATORIAS) {
    if (!porRanura[ranura]) {
      const defecto = DISENO_POR_DEFECTO.find((d) => d.ranura === ranura);
      porRanura[ranura] = catalogo[defecto.pieza];
      completadas.push(ranura);
    }
  }
  let costo = 0;
  let masa = 0;
  for (const [ranura, p] of Object.entries(porRanura)) {
    const n = esRueda(ranura) ? RUEDAS_POR_RANURA : 1;
    costo += p.costo * n;
    masa += p.masa * n;
  }
  const disenoFinal = Object.entries(porRanura).map(([ranura, p]) => ({ ranura, pieza: p.id }));
  return { porRanura, diseno: disenoFinal, costo, masa, completadas, invalidas };
}

/** ¿Tiene el diseño esta pieza en alguna ranura? */
export const usaPieza = (diseno, idPieza) => (diseno ?? []).some((d) => d.pieza === idPieza);
