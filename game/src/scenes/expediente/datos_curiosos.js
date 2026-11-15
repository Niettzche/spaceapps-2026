// Dueño: frente expediente. Datos curiosos de la pantalla de carga (una línea que rota mientras carga).
// Regla: NINGÚN número se escribe a mano aquí; todos llegan de datos del repo (Boot.js pasa sus valores):
// - gravedades: game/src/config/world.js (Tierra 9.81, Marte 3.71, Luna 1.62 m/s², AGENTS.md §5)
// - presión de Jezero y sombras del polo sur lunar: ambienteDeDestino() de game/src/fisica/ambiente.js (MEDA; LRO Diviner)
// - cráteres mexicanos encontrados por el detector: AGENTS.md §6.3 (informe/validacion_detector.pdf)
// - número de sitios: data/sites/
// Un dato sin valor (null/undefined) no se muestra. Lógica pura para probarla con `node --test`.

// Presión atmosférica estándar al nivel del mar (constante física, 101.325 kPa) para comparar la de Jezero.
export const PRESION_ESTANDAR_TIERRA_KPA = 101.325;

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const pct = (a, b) => Math.round((a / b) * 100);

/**
 * Lista de datos curiosos { es, en } a partir de valores del repo. Se omite el que no tenga sus valores.
 * @param {{ gravedad?: {tierra,marte,luna}, presionJezeroKPa?: number, sombraLunaC?: number,
 *           detector?: {encontrados, conocidos}, sitios?: number }} v
 */
export function datosCuriosos(v = {}) {
  const g = v.gravedad || {};
  const lista = [];
  if (num(g.tierra) && num(g.marte)) {
    lista.push({ es: `En Marte pesas ${pct(g.marte, g.tierra)} % de lo que pesas en la Tierra (${g.marte} contra ${g.tierra} m/s²).`,
      en: `On Mars you weigh ${pct(g.marte, g.tierra)} % of your Earth weight (${g.marte} vs ${g.tierra} m/s²).` });
  }
  if (num(g.tierra) && num(g.luna)) {
    lista.push({ es: `En la Luna la gravedad es ${pct(g.luna, g.tierra)} % de la terrestre: ${g.luna} m/s².`,
      en: `On the Moon gravity is ${pct(g.luna, g.tierra)} % of Earth's: ${g.luna} m/s².` });
  }
  if (num(v.presionJezeroKPa)) {
    const p = ((v.presionJezeroKPa / PRESION_ESTANDAR_TIERRA_KPA) * 100).toFixed(1);
    lista.push({ es: `El aire de Jezero (Marte) empuja con ${Math.round(v.presionJezeroKPa * 1000)} Pa: ${p} % de la presión de la Tierra (MEDA).`,
      en: `Jezero's air (Mars) pushes with ${Math.round(v.presionJezeroKPa * 1000)} Pa: ${p} % of Earth's pressure (MEDA).` });
  }
  if (num(v.sombraLunaC)) {
    lista.push({ es: `Las sombras permanentes del polo sur lunar llegan a ${v.sombraLunaC} °C (LRO Diviner).`,
      en: `Permanent shadows at the lunar south pole reach ${v.sombraLunaC} °C (LRO Diviner).` });
  }
  if (num(v.detector?.encontrados) && num(v.detector?.conocidos)) {
    lista.push({ es: `El detector encontró ${v.detector.encontrados} de ${v.detector.conocidos} cráteres mexicanos conocidos.`,
      en: `The detector found ${v.detector.encontrados} of ${v.detector.conocidos} known Mexican craters.` });
  }
  if (num(v.sitios) && v.sitios > 0) {
    lista.push({ es: `El catálogo del modelo tiene ${v.sitios} sitios de la Tierra comparados con la Luna o Marte.`,
      en: `The model catalog has ${v.sitios} Earth sites compared with the Moon or Mars.` });
  }
  return lista;
}

/** Índice del dato que toca a los `ms` milisegundos, cambiando cada `periodoMs`. -1 si la lista está vacía. */
export function datoEnTurno(lista, ms, periodoMs = 4000) {
  if (!lista?.length) return -1;
  return Math.floor(Math.max(0, ms) / periodoMs) % lista.length;
}
