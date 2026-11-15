// El modelo de forma de model/forma.py, hecho en el navegador con los parámetros que exporta preparar_datos.py
// (nube.json → modelo). Sin red ni IA: una regresión logística con 3 variables y una distancia a la nube Luna+Marte.
// preparar_datos.py comprueba que estos parámetros reproducen model/forma.puntuar, y modelo_forma.test.mjs que esta
// cuenta en JavaScript da lo mismo que Python en 548 cráteres.

/** Variables del modelo a partir de las medidas: log10 del diámetro (km), profundidad/diámetro y borde/diámetro. */
export function aVariables(diamKm, profM, bordeM) {
  return [Math.log10(diamKm), profM / (diamKm * 1000), bordeM / (diamKm * 1000)];
}

/**
 * Puntaje de forma de un cráter, igual que model/forma.puntuar.
 * - pLuna: probabilidad de que su forma sea de la Luna y no de Marte (regresión logística, variables estandarizadas).
 * - aportes: cuánto empuja cada variable hacia la Luna (+) o Marte (−), en log-odds (model/forma.explicar).
 * - dist: distancia de Mahalanobis robusta al cuadrado a la nube Luna+Marte; dentro = dentro del 95 % de esa nube.
 * - formaLuna / formaMarte: lo que el juego usa como similitud de forma con el polo sur lunar y con Jezero.
 */
export function puntuarForma(m, x) {
  const aportes = x.map((v, i) => m.coef_luna[i] * ((v - m.media[i]) / m.escala[i]));
  const logit = m.intercepto_luna + aportes.reduce((a, b) => a + b, 0);
  const pLuna = 1 / (1 + Math.exp(-logit));
  const u = x.map((v, i) => (v - m.nube_media[i]) / m.nube_escala[i] - m.nube_centro[i]);
  let dist = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) dist += u[i] * m.nube_precision[i][j] * u[j];
  const dentro = dist <= m.corte95;
  const fNube = dentro ? 1 : Math.exp(-(dist - m.corte95) / m.corte95);
  return { pLuna, logit, aportes, dist, dentro, fNube, formaLuna: pLuna * fNube, formaMarte: (1 - pLuna) * fNube };
}

/** Profundidad/diámetro donde P(Luna) = 50 % para un diámetro y un borde dados (la frontera en la gráfica). */
export function fronteraProfDiam(m, logDiam, bordeRel) {
  const z0 = (logDiam - m.media[0]) / m.escala[0];
  const z2 = (bordeRel - m.media[2]) / m.escala[2];
  return m.media[1] - (m.escala[1] / m.coef_luna[1]) * (m.intercepto_luna + m.coef_luna[0] * z0 + m.coef_luna[2] * z2);
}
