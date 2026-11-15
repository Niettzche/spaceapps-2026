// Dueño: frente taller. Reglas del diseño del robot, sin Phaser (se prueban con node).
// Contrato con el frente juego (docs/juego/ESPECIFICACION.md §3):
//   partida.diseno = [{ ranura, pieza }]; cada ranura de rueda es un eje y cobra 2 × costo y 2 × masa.
// Todos los números que salen de aquí son VALORES DE JUEGO, no datos de ingeniería.
import { gastoPorSegundo } from '../../fisica/energia.js'; // misma regla de energía que la física (sin ciclo de imports)
import { factorFrio, potenciaPermitida, recargaPanel, REGLAS } from '../../fisica/ambiente.js'; // mismas reglas de ambiente

export const RANURAS = [
  { id: 'chasis', nombre: 'Chasis', nombre_en: 'Chassis', sistema: 'estructura', obligatoria: true, multiplicador: 1 },
  { id: 'rueda_del', nombre: 'Eje delantero', nombre_en: 'Front axle', sistema: 'movilidad', obligatoria: true, multiplicador: 2 },
  { id: 'rueda_tras', nombre: 'Eje trasero', nombre_en: 'Rear axle', sistema: 'movilidad', obligatoria: true, multiplicador: 2 },
  { id: 'motor', nombre: 'Motor', nombre_en: 'Motor', sistema: 'potencia', obligatoria: true, multiplicador: 1 },
  { id: 'bateria', nombre: 'Batería', nombre_en: 'Battery', sistema: 'energia', obligatoria: true, multiplicador: 1 },
  { id: 'carga', nombre: 'Soporte de carga', nombre_en: 'Cargo mount', sistema: 'carga', obligatoria: true, multiplicador: 1 },
  { id: 'modulo', nombre: 'Módulo', nombre_en: 'Module', sistema: 'modulo', obligatoria: false, multiplicador: 1 },
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
 * masa: solo el robot (la física suma la carga aparte; no cambiar este significado).
 * agarre: PROMEDIO de los dos ejes por superficie. En la física cada rueda usa su propio agarre, así que los dos ejes aportan;
 *   agarre_ejes da el valor de cada eje y ejes_distintos avisa que mezclar ruedas es menos seguro (p. ej. dos anchas en arena).
 * autonomia_s: segundos a acelerador pleno con la regla de energía de la física (fisica/energia.js), con la masa del robot
 *   más `masaCarga` (la carga que se entrega, MASA_CARGA_KG del frente juego).
 */
export function resumen(diseno, catalogo, { masaCarga = 0 } = {}) {
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
  const agarreDe = (p, s) => (p && p.agarre && typeof p.agarre[s] === 'number' ? p.agarre[s] : null);
  const agarre = {};
  const agarreEjes = { del: {}, tras: {} };
  for (const s of SUPERFICIES) {
    const d = agarreDe(del, s);
    const t = agarreDe(tras, s);
    agarreEjes.del[s] = d;
    agarreEjes.tras[s] = t;
    agarre[s] = d != null && t != null ? Math.round(((d + t) / 2) * 100) / 100 : null;
  }
  const ejesDistintos = Boolean(del && tras && del.id !== tras.id);
  const chasis = pieza('chasis');
  const motor = pieza('motor');
  const bateria = pieza('bateria');
  const carga = pieza('carga');
  const modulo = pieza('modulo');
  const consumo = motor ? motor.consumo ?? null : null;
  const capacidad = bateria ? bateria.capacidad ?? null : null;
  const masaConCarga = masa + masaCarga;
  const gasto = motor && consumo != null ? gastoPorSegundo(motor, masaConCarga, 1) : null;
  return {
    costo,
    masa,
    masa_con_carga: masaConCarga,
    agarre,
    agarre_ejes: agarreEjes,
    ejes_distintos: ejesDistintos,
    resistencia: chasis ? chasis.resistencia ?? null : null,
    fuerza: motor ? motor.fuerza ?? null : null,
    consumo,
    capacidad,
    proteccion: carga ? carga.proteccion ?? null : null,
    // Módulo opcional (una sola bahía): panel solar, calentador de batería o radiador del motor. 0 = sin ese efecto.
    modulo: modulo ? modulo.id : null,
    panel: modulo && modulo.capacidad ? modulo.capacidad : 0,
    aislamiento: modulo ? modulo.aislamiento_termico ?? 0 : 0,
    radiador: modulo ? modulo.radiador ?? 0 : 0,
    fuerza_por_masa: motor && masaConCarga > 0 ? motor.fuerza / masaConCarga : null,
    autonomia_s: capacidad != null && gasto ? capacidad / gasto : null,
  };
}

/**
 * Lo que el ambiente le hace a ESTE diseño en un lugar (ambiente de fisica/ambiente.js), con las mismas reglas que la física:
 *   bateria: fracción de la batería útil al arrancar por el frío (con el calentador, si lo lleva) y sin calentador;
 *   potencia_caliente: potencia que conserva el motor al llegar al límite de temperatura (con y sin radiador);
 *   recarga_s: unidades de batería por segundo que recarga el panel con la luz del lugar.
 * Todo es regla de juego (P); el ambiente (temperatura, aire, luz) sí es dato con fuente.
 */
export function efectosEn(res, amb) {
  if (!res || !amb) return null;
  const tmin = amb.temperatura_min_C;
  const consumo = res.consumo ?? 1;
  const motor = (radiador) => potenciaPermitida(REGLAS.motor.limite_C, consumo, amb, REGLAS.motor, radiador);
  return {
    bateria: factorFrio(tmin, REGLAS.frio, res.aislamiento),
    bateria_sin_modulo: factorFrio(tmin, REGLAS.frio, 0),
    potencia_caliente: motor(res.radiador),
    potencia_caliente_sin_modulo: motor(0),
    recarga_s: res.panel ? recargaPanel({ capacidad: res.panel }, amb) : 0,
  };
}

/**
 * Errores que impiden salir del taller. Lista vacía = diseño válido.
 * Los mensajes salen en español; con `{ en: true }` salen en inglés (el Taller lo pide según el idioma del juego).
 * No se usa i18n.js aquí a propósito: así las pruebas en node no dependen del idioma del sistema.
 */
export function validar(diseno, catalogo, presupuesto, { en = false } = {}) {
  const t = (es, ing) => (en ? ing : es);
  const nom = (o) => (en && o.nombre_en ? o.nombre_en : o.nombre);
  const porId = Object.fromEntries(catalogo.map((p) => [p.id, p]));
  const errores = [];
  const vistas = new Set();
  for (const e of diseno || []) {
    const r = ranura(e.ranura);
    if (!r) { errores.push(t(`Ranura desconocida: ${e.ranura}`, `Unknown slot: ${e.ranura}`)); continue; }
    if (vistas.has(r.id)) errores.push(t(`Ranura repetida: ${r.nombre}`, `Repeated slot: ${nom(r)}`));
    vistas.add(r.id);
    const p = porId[e.pieza];
    if (!p) errores.push(t(`Pieza inexistente en ${r.nombre}: ${e.pieza}`, `Unknown part in ${nom(r)}: ${e.pieza}`));
    else if (p.sistema !== r.sistema) errores.push(t(`${p.nombre} no va en ${r.nombre}`, `${nom(p)} does not fit in ${nom(r)}`));
  }
  for (const r of RANURAS) {
    if (r.obligatoria && !vistas.has(r.id)) errores.push(t(`Falta: ${r.nombre}`, `Missing: ${nom(r)}`));
  }
  const { costo } = resumen(diseno, catalogo); // el costo no depende de la carga
  if (costo > presupuesto) {
    errores.push(t(`Excede el presupuesto por ${costo - presupuesto} créditos`, `Over budget by ${costo - presupuesto} credits`));
  }
  return errores;
}
