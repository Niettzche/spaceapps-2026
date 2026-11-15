// Estadísticas del recorrido (funciones puras): lo que el robot va a enfrentar en un nivel.
// Se calculan sobre el MISMO perfil que arma la escena (perfilDeSitio / perfilDeDestino), así el Expediente
// muestra exactamente lo que se juega. Ver docs/juego/ESPECIFICACION.md §8.
import { tr, trDato } from '../i18n.js';
import { datosSuelo } from './suelos.js';

const NOMBRE_SUP = () => ({ arena: tr('arena', 'sand'), roca: tr('roca', 'rock'), compacto: tr('compacto', 'compact') });

/** Superficie en x (m) según los tramos del perfil. */
function superficieEn(perfil, x) {
  const t = perfil.superficies.find((s) => x >= s.desde && x < s.hasta);
  return (t ?? perfil.superficies[perfil.superficies.length - 1])?.tipo ?? 'compacto';
}

/**
 * @returns {{ largo_m, subida_m, bajada_m, pendMaxSubida, pendMaxBajada, pendMedia, superficies: {tipo: fraccion},
 *            critica: { pendiente, superficie, x_m, sentido: 'subida'|'bajada' } }}
 */
export function estadisticasNivel(perfil) {
  const { x_m: X, y_m: Y } = perfil;
  let subida = 0;
  let bajada = 0;
  let maxSub = 0;
  let maxBaj = 0;
  let suma = 0;
  let largoPend = 0;
  let critica = { pendiente: 0, superficie: superficieEn(perfil, 0), x_m: 0, sentido: 'subida' };
  // Pendiente sobre ventanas de 5 m: evita que un solo paso de 1 m de una recreación exagere el máximo.
  const PASO = 5;
  for (let i = 0; i < X.length - 1; i++) {
    const dy = Y[i + 1] - Y[i];
    if (dy > 0) subida += dy; else bajada -= dy;
  }
  for (let x = 0; x + PASO <= perfil.largo_m; x += 1) {
    const a = alturaLineal(X, Y, x);
    const b = alturaLineal(X, Y, x + PASO);
    const ang = (Math.atan2(b - a, PASO) * 180) / Math.PI;
    suma += Math.abs(ang);
    largoPend += 1;
    if (ang > maxSub) maxSub = ang;
    if (-ang > maxBaj) maxBaj = -ang;
    // La condición crítica es la subida más empinada (lo que más le cuesta al robot); si no hay subidas, la bajada.
    if (ang > critica.pendiente) critica = { pendiente: ang, superficie: superficieEn(perfil, x + PASO / 2), x_m: x, sentido: 'subida' };
  }
  if (critica.pendiente < 1 && maxBaj > 1) {
    for (let x = 0; x + PASO <= perfil.largo_m; x += 1) {
      const ang = (Math.atan2(alturaLineal(X, Y, x) - alturaLineal(X, Y, x + PASO), PASO) * 180) / Math.PI;
      if (ang >= maxBaj - 1e-9) { critica = { pendiente: ang, superficie: superficieEn(perfil, x + PASO / 2), x_m: x, sentido: 'bajada' }; break; }
    }
  }
  const superficies = {};
  for (const s of perfil.superficies) superficies[s.tipo] = (superficies[s.tipo] ?? 0) + (s.hasta - s.desde) / perfil.largo_m;
  return {
    largo_m: perfil.largo_m,
    subida_m: subida,
    bajada_m: bajada,
    pendMaxSubida: maxSub,
    pendMaxBajada: maxBaj,
    pendMedia: largoPend ? suma / largoPend : 0,
    superficies,
    critica,
  };
}

function alturaLineal(X, Y, x) {
  if (x <= X[0]) return Y[0];
  if (x >= X[X.length - 1]) return Y[Y.length - 1];
  let i = 0;
  while (X[i + 1] < x) i++;
  const t = (x - X[i]) / (X[i + 1] - X[i]);
  return Y[i] * (1 - t) + Y[i + 1] * t;
}

/** Texto corto del suelo y su agarre: dato medido (φ) o provisional (P). */
export function textoSuelo(mundo, tipo) {
  const d = datosSuelo(mundo, tipo);
  const nombre = NOMBRE_SUP()[tipo] ?? tipo;
  return d ? `${trDato(d, 'nombre') ?? nombre} φ ${d.phi[0]}–${d.phi[1]}°` : `${nombre} (${tr('agarre provisional', 'provisional grip')}, P)`;
}

/** Líneas para el Expediente: recorrido, desnivel, pendientes, suelos y condición crítica. */
export function lineasRecorrido(perfil, mundo) {
  const e = estadisticasNivel(perfil);
  const sup = Object.entries(e.superficies).sort((a, b) => b[1] - a[1])
    .map(([t, f]) => `${(NOMBRE_SUP()[t] ?? t)} ${Math.round(f * 100)} %`).join(' · ');
  const v = perfil.ventana;
  const origen = perfil.ilustrativo
    ? tr('terreno ilustrativo (sin perfil medido)', 'illustrative terrain (no measured profile)')
    : v && v.transecto_m > v.hasta_m - v.desde_m
      ? tr(`tramo real de ${Math.round(v.hasta_m - v.desde_m)} m de un transecto de ${(v.transecto_m / 1000).toFixed(1)} km`,
        `real ${Math.round(v.hasta_m - v.desde_m)} m stretch of a ${(v.transecto_m / 1000).toFixed(1)} km transect`)
      : tr('perfil medido', 'measured profile');
  const c = e.critica;
  const d = datosSuelo(mundo, c.superficie);
  const sueloCorto = `${NOMBRE_SUP()[c.superficie] ?? c.superficie} ${d ? `φ ${d.phi[0]}–${d.phi[1]}°` : '(P)'}`;
  const crit = c.pendiente >= 1
    ? tr(`Crítico: ${c.sentido === 'subida' ? 'subida' : 'bajada'} de ${c.pendiente.toFixed(0)}° · ${sueloCorto}`,
      `Critical: ${c.sentido === 'subida' ? 'climb' : 'descent'} of ${c.pendiente.toFixed(0)}° · ${sueloCorto}`)
    : tr('Crítico: casi plano; cuentan el agarre y la energía', 'Critical: almost flat; grip and energy matter');
  return [
    origen,
    tr(`Sube ${Math.round(e.subida_m)} m, baja ${Math.round(e.bajada_m)} m · pendiente máx. ${e.pendMaxSubida.toFixed(0)}° (media ${e.pendMedia.toFixed(0)}°)`,
      `Climbs ${Math.round(e.subida_m)} m, descends ${Math.round(e.bajada_m)} m · max slope ${e.pendMaxSubida.toFixed(0)}° (mean ${e.pendMedia.toFixed(0)}°)`),
    `${tr('Suelo', 'Ground')}: ${sup}`,
    crit,
  ];
}
