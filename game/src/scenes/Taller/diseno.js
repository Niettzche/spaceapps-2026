// Dueño: frente taller. Reglas del diseño del robot, sin Phaser (se prueban con node).
// Contrato con el frente juego (docs/juego/ESPECIFICACION.md §3):
//   partida.diseno = [{ ranura, pieza }]; cada ranura de rueda es un eje y cobra 2 × costo y 2 × masa.
// Todos los números que salen de aquí son VALORES DE JUEGO, no datos de ingeniería.

export const RANURAS = [
  { id: 'chasis', nombre: 'Chasis', sistema: 'estructura', obligatoria: true, multiplicador: 1 },
  { id: 'rueda_del', nombre: 'Eje delantero', sistema: 'movilidad', obligatoria: true, multiplicador: 2 },
  { id: 'rueda_tras', nombre: 'Eje trasero', sistema: 'movilidad', obligatoria: true, multiplicador: 2 },
  { id: 'motor', nombre: 'Motor', sistema: 'potencia', obligatoria: true, multiplicador: 1 },
  { id: 'bateria', nombre: 'Batería', sistema: 'energia', obligatoria: true, multiplicador: 1 },
  { id: 'carga', nombre: 'Soporte de carga', sistema: 'carga', obligatoria: true, multiplicador: 1 },
  { id: 'modulo', nombre: 'Módulo', sistema: 'modulo', obligatoria: false, multiplicador: 1 },
];

// Robot mínimo del camino dorado ("Taller: ruedas estándar"): 730 de 1,000 créditos.
export const DISENO_POR_DEFECTO = [
  { ranura: 'chasis', pieza: 'chasis_ligero' },
  { ranura: 'rueda_del', pieza: 'rueda_estandar' },
  { ranura: 'rueda_tras', pieza: 'rueda_estandar' },
  { ranura: 'motor', pieza: 'motor_eficiente' },
  { ranura: 'bateria', pieza: 'bateria_chica' },
  { ranura: 'carga', pieza: 'soporte_basico' },
];

const SUPERFICIES = ['arena', 'roca', 'compacto'];

export function ranura(id) {
  return RANURAS.find((r) => r.id === id) || null;
}

/** Piezas del catálogo que caben en una ranura. */
export function piezasPara(idRanura, catalogo) {
  const r = ranura(idRanura);
  return r ? catalogo.filter((p) => p.sistema === r.sistema) : [];
}

/** Costo que cobra una pieza puesta en una ranura (ruedas × 2). */
export function costoEnRanura(idRanura, pieza) {
  const r = ranura(idRanura);
  return pieza ? pieza.costo * (r ? r.multiplicador : 1) : 0;
}

/** Diseño como mapa { ranura: idPieza }, ignorando entradas vacías. */
export function comoMapa(diseno) {
  const m = {};
  for (const e of diseno || []) if (e && e.ranura && e.pieza) m[e.ranura] = e.pieza;
  return m;
}

/** Mapa { ranura: idPieza } → partida.diseno, en el orden de RANURAS y sin ranuras vacías. */
export function comoDiseno(mapa) {
  return RANURAS.filter((r) => mapa[r.id]).map((r) => ({ ranura: r.id, pieza: mapa[r.id] }));
}

/**
 * Propiedades del robot que salen del diseño (valores de juego).
 * agarre: el MENOR de los dos ejes por superficie (el eje que peor agarra limita al robot).
 * autonomia_s: segundos a acelerador pleno con la regla de energía del frente juego (§6):
 *   gasto por segundo = consumo × (1 + masa_total / 100).
 */
export function resumen(diseno, catalogo) {
  const porId = Object.fromEntries(catalogo.map((p) => [p.id, p]));
  const m = comoMapa(diseno);
  const pieza = (id) => porId[m[id]] || null;
  let costo = 0;
  let masa = 0;
  for (const r of RANURAS) {
    const p = pieza(r.id);
    if (!p) continue;
    costo += p.costo * r.multiplicador;
    masa += p.masa * r.multiplicador;
  }
  const del = pieza('rueda_del');
  const tras = pieza('rueda_tras');
  const agarre = {};
  for (const s of SUPERFICIES) {
    const v = [del, tras].filter((p) => p && p.agarre && typeof p.agarre[s] === 'number').map((p) => p.agarre[s]);
    agarre[s] = v.length === 2 ? Math.min(...v) : null;
  }
  const chasis = pieza('chasis');
  const motor = pieza('motor');
  const bateria = pieza('bateria');
  const carga = pieza('carga');
  const consumo = motor ? motor.consumo ?? null : null;
  const capacidad = bateria ? bateria.capacidad ?? null : null;
  const gasto = consumo != null ? consumo * (1 + masa / 100) : null;
  return {
    costo,
    masa,
    agarre,
    resistencia: chasis ? chasis.resistencia ?? null : null,
    fuerza: motor ? motor.fuerza ?? null : null,
    consumo,
    capacidad,
    proteccion: carga ? carga.proteccion ?? null : null,
    fuerza_por_masa: motor && masa > 0 ? motor.fuerza / masa : null,
    autonomia_s: capacidad != null && gasto ? capacidad / gasto : null,
  };
}

/** Errores que impiden salir del taller. Lista vacía = diseño válido. */
export function validar(diseno, catalogo, presupuesto) {
  const porId = Object.fromEntries(catalogo.map((p) => [p.id, p]));
  const errores = [];
  const vistas = new Set();
  for (const e of diseno || []) {
    const r = ranura(e.ranura);
    if (!r) { errores.push(`Ranura desconocida: ${e.ranura}`); continue; }
    if (vistas.has(r.id)) errores.push(`Ranura repetida: ${r.nombre}`);
    vistas.add(r.id);
    const p = porId[e.pieza];
    if (!p) errores.push(`Pieza inexistente en ${r.nombre}: ${e.pieza}`);
    else if (p.sistema !== r.sistema) errores.push(`${p.nombre} no va en ${r.nombre}`);
  }
  for (const r of RANURAS) {
    if (r.obligatoria && !vistas.has(r.id)) errores.push(`Falta: ${r.nombre}`);
  }
  const { costo } = resumen(diseno, catalogo);
  if (costo > presupuesto) errores.push(`Excede el presupuesto por ${costo - presupuesto} créditos`);
  return errores;
}
