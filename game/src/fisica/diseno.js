// Diseño del robot para la física: resuelve ranuras y piezas (funciones puras). Ver docs/juego/ESPECIFICACION.md §3.
// Fuente única de las reglas del diseño: game/src/scenes/Taller/diseno.js (frente taller). Aquí solo se adaptan
// a lo que necesita la física (completar ranuras vacías, reportar inválidas); no se redefine ninguna regla.
import {
  RANURAS as RANURAS_TALLER,
  DISENO_POR_DEFECTO as DISENO_TALLER,
  comoDiseno,
  resumen,
} from '../scenes/Taller/diseno.js';

// Ranura → sistema de pieza que acepta (derivado de la tabla del taller). `modulo` es opcional.
export const RANURAS = Object.fromEntries(RANURAS_TALLER.map((r) => [r.id, r.sistema]));
export const RANURAS_OBLIGATORIAS = RANURAS_TALLER.filter((r) => r.obligatoria).map((r) => r.id);

// Cada ranura de rueda es un eje con 2 ruedas: el multiplicador sale de la tabla del taller.
const multiplicadorDe = (id) => RANURAS_TALLER.find((r) => r.id === id).multiplicador;
export const RUEDAS_POR_RANURA = multiplicadorDe('rueda_del');
if (multiplicadorDe('rueda_tras') !== RUEDAS_POR_RANURA) throw new Error('Taller: los dos ejes deben tener el mismo multiplicador');

// Diseño por defecto (para probar sin pasar por el taller): el mismo robot mínimo del taller (730 créditos).
export const DISENO_POR_DEFECTO = DISENO_TALLER;

// Masa de la carga (suministro), igual para todos los diseños. Es del frente juego, no del taller. (P)
export const MASA_CARGA_KG = 10;

/**
 * Resuelve un diseño [{ ranura, pieza }] contra el catálogo de piezas.
 * Completa las ranuras obligatorias que falten con el diseño por defecto y lo reporta en `completadas`.
 * Costo y masa (ruedas × 2) los calcula `resumen` del taller sobre el diseño ya completado.
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
  const disenoFinal = comoDiseno(Object.fromEntries(Object.entries(porRanura).map(([r, p]) => [r, p.id])));
  const { costo, masa } = resumen(disenoFinal, piezas);
  return { porRanura, diseno: disenoFinal, costo, masa, completadas, invalidas };
}

/** ¿Tiene el diseño esta pieza en alguna ranura? */
export const usaPieza = (diseno, idPieza) => (diseno ?? []).some((d) => d.pieza === idPieza);
