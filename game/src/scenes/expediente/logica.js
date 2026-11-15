// Dueño: frente expediente. Lógica pura (sin Phaser ni navegador) para poder probarla con `node --test`.
// Regla de oro: nunca inventar datos. Lo que falta se devuelve como null y la interfaz dice "sin dato".
// Bilingüe: los textos se arman al llamar a cada función (tr), nunca al cargar el módulo.

import { tr } from '../../i18n.js';
import { etiquetaVariable, etiquetaLimite, LIMITES } from './textos.js';

/** "sin dato" / "no data" en el idioma actual (función: el idioma puede cambiar durante la partida). */
export const sinDato = () => tr('sin dato', 'no data');

// Orden fijo de las dimensiones del modelo (AGENTS.md §6.2); las demás compartidas van después.
const ORDEN = ['forma', 'oscilacion_termica', 'precipitacion', 'ndvi', 'pendiente'];

// Fuente de la referencia de forma del destino (AGENTS.md §6.2: mismos datos con los que se entrenó el modelo).
const REF_FORMA = {
  luna: () => tr('Cráteres del polo sur lunar: LRO LOLA ldem_80s_80m, remuestreado a 200 m',
    'Lunar south pole craters: LRO LOLA ldem_80s_80m, resampled to 200 m'),
  marte: () => tr('Cráteres de Marte: HRSC+MOLA blend, 200 m', 'Mars craters: HRSC+MOLA blend, 200 m'),
};

// Unidades que se muestran distinto en inglés (el dato guarda la unidad en español y se compara así).
const UNIDADES_EN = { 'mm/día': 'mm/day', grados: 'degrees' };
export const unidadVisible = (u) => tr(u, UNIDADES_EN[u] ?? u);

/** ¿Es un tajo minero (análogo operativo, no geológico)? Lo dicen los datos del modelo en `proceso`. */
export function esMina(sitio) {
  return /tajo minero|mina a cielo abierto/i.test(sitio?.proceso || '');
}

export function esDemostracion(sitio) {
  return !!sitio && (sitio.estado === 'ilustrativo' || sitio.demo === true);
}

export function esCurado(sitio) {
  return !!sitio && sitio.prueba_util != null;
}

/** ¿Puede encabezar la lista? Solo si tiene similitud medida y no es de demostración. */
export function tieneSimilitudReal(sitio) {
  return !!sitio && !esDemostracion(sitio) && typeof sitio.similitud?.total === 'number' && Number.isFinite(sitio.similitud.total);
}

/**
 * Sitios cuyo gemelo es `destinoId`, por similitud total de mayor a menor.
 * Los `ilustrativo`, `demo: true` o sin similitud van siempre al final (nunca en primer lugar). Empate: por nombre.
 */
export function sitiosParaDestino(sitios, destinoId) {
  const total = (s) => (tieneSimilitudReal(s) ? s.similitud.total : -1);
  return sitios
    .filter((s) => s && s.destino_ref === destinoId)
    .slice()
    .sort((a, b) => (tieneSimilitudReal(b) - tieneSimilitudReal(a)) || (total(b) - total(a))
      || String(a.nombre).localeCompare(String(b.nombre)));
}

export function formatoNumero(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return sinDato();
  const abs = Math.abs(valor);
  const dec = abs === 0 ? 0 : abs >= 100 ? 1 : abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4;
  return String(Number(valor.toFixed(dec)));
}

/** "14.51 K" · "0.14" (unidad "-") · "sin dato". */
export function formatoValor(v) {
  if (!v || typeof v.valor !== 'number') return sinDato();
  const u = v.unidad && v.unidad !== '-' ? ` ${unidadVisible(v.unidad)}` : '';
  return `${formatoNumero(v.valor)}${u}`;
}

export function formatoPorcentaje(x) {
  return typeof x === 'number' && Number.isFinite(x) ? `${Math.round(x * 100)} %` : sinDato();
}

/**
 * Filas de la comparación 1 a 1 (Tierra a la izquierda, destino a la derecha).
 * - Solo entran variables que el destino también define (misma variable), más la forma si el sitio la trae.
 * - `mismaUnidad` = false cuando las unidades no coinciden: la interfaz lo advierte en vez de comparar.
 * Devuelve { filas, soloTierra } donde soloTierra son mediciones del sitio sin equivalente en el destino.
 */
export function filasComparacion(sitio, destino) {
  const vt = sitio?.variables || {};
  const vd = destino?.variables || {};
  const sim = sitio?.similitud?.por_dimension || {};
  const claves = new Set(Object.keys(vd));
  if (vt.forma || 'forma' in sim) claves.add('forma');
  const ordenadas = [...ORDEN.filter((k) => claves.has(k)), ...[...claves].filter((k) => !ORDEN.includes(k)).sort()];

  const filas = ordenadas.map((clave) => {
    let tierra = vt[clave] || null;
    let dest = vd[clave] || null;
    if (clave === 'forma') {
      // La forma no es una medición del destino sino un puntaje contra la nube de cráteres Luna+Marte.
      // Del lado Tierra se muestra la medición que más pesa (profundidad/diámetro) si existe.
      tierra = vt.profundidad_diametro || vt.forma || null;
      // Un tajo minero es un análogo operativo, no un cráter: la columna del destino aclara que solo se compara su forma.
      const mina = esMina(sitio);
      dest = vd.forma || {
        valor: null,
        texto: mina ? tr('vs. cráteres Luna+Marte', 'vs. Moon+Mars craters') : tr('Cráteres Luna+Marte', 'Moon+Mars craters'),
        unidad: '-',
        fuente: REF_FORMA[destino?.mundo]?.() || tr('Cráteres reales de la Luna y Marte', 'Real craters of the Moon and Mars'),
        fecha: null,
        nota: mina
          ? tr('Es un tajo minero (excavación), no un cráter natural: solo se compara su forma con la de cráteres reales de la Luna y Marte.',
            'It is an open-pit mine (an excavation), not a natural crater: only its shape is compared with real Moon and Mars craters.')
          : tr('La forma se compara con un modelo explicable entrenado con cráteres de la Luna y Marte, no con un solo valor.',
            'Shape is compared with an explainable model trained on Moon and Mars craters, not with a single value.'),
      };
    }
    const mismaUnidad = !(tierra && dest && dest.valor != null && tierra.unidad !== dest.unidad);
    return {
      clave,
      etiqueta: clave === 'forma' && esMina(sitio) ? tr('Forma del tajo minero', 'Open-pit mine shape') : etiquetaVariable(clave),
      tierra,
      destino: dest,
      similitud: typeof sim[clave] === 'number' ? sim[clave] : null,
      mismaUnidad,
      detalleForma: clave === 'forma' ? vt.forma || null : null,
    };
  });

  const usadas = new Set([...ordenadas, 'forma', 'profundidad_diametro']);
  const soloTierra = Object.entries(vt)
    .filter(([k]) => !usadas.has(k))
    .map(([clave, v]) => ({ clave, etiqueta: etiquetaVariable(clave), variable: v }));
  return { filas, soloTierra };
}

/**
 * Lo que la Tierra no puede probar: une `no_reproducible_en_tierra` del destino con las claves cortas de
 * `limites` del sitio. Las entradas largas de `limites` (notas del cálculo) se devuelven aparte.
 */
export function limitesDe(sitio, destino) {
  const claves = [];
  const notas = [];
  const agregar = (k) => { if (!claves.includes(k)) claves.push(k); };
  (destino?.no_reproducible_en_tierra || []).forEach(agregar);
  (sitio?.limites || []).forEach((l) => {
    if (/^[a-z0-9_]+$/.test(l)) agregar(l);
    else notas.push(l);
  });
  // "presion" y "presion_atmosferica" son la misma cosa: deja una.
  const vistas = new Set();
  const noReproducible = claves
    .map((k) => ({ clave: k, etiqueta: etiquetaLimite(k) }))
    .filter((x) => (vistas.has(x.etiqueta) ? false : vistas.add(x.etiqueta)));
  return { noReproducible, notas, conocidas: Object.keys(LIMITES) };
}

// ---------- Tickets (AGENTS.md §4: 3 por partida, sin reposición; reiniciar los restaura) ----------

/**
 * Gasta un ticket para probar `sitioId`. Volver a probar un sitio ya pagado no cuesta (ajustar y volver a probar).
 * Devuelve { ok, gastado, tickets, desbloqueados, motivo }. No muta la entrada.
 */
export function usarTicket({ tickets, desbloqueados = [] }, sitioId) {
  if (desbloqueados.includes(sitioId)) return { ok: true, gastado: false, tickets, desbloqueados };
  if (!(tickets > 0)) return { ok: false, gastado: false, tickets, desbloqueados, motivo: 'sin_tickets' };
  return { ok: true, gastado: true, tickets: tickets - 1, desbloqueados: [...desbloqueados, sitioId] };
}

/**
 * Repara tickets y sitios pagados leídos de un guardado. En una partida cada ticket gastado paga exactamente un
 * sitio y nunca se reponen, así que siempre tickets + pagados ≤ `max`. Además, el sitio en juego ya fue pagado
 * (solo `elegirSitio` lo fija). Corrige guardados viejos (sin `desbloqueados`), editados a mano o con valores no
 * enteros, negativos o mayores que `max`, que antes se mostraban tal cual (p. ej. "5/5" o un sitio que se volvía a cobrar).
 */
export function conciliarTickets({ tickets, desbloqueados = [], sitio = null }, max) {
  const pagados = [...new Set((Array.isArray(desbloqueados) ? desbloqueados : []).filter((x) => typeof x === 'string' && x))];
  if (typeof sitio === 'string' && sitio && !pagados.includes(sitio)) pagados.push(sitio);
  const t = Number.isFinite(tickets) ? Math.trunc(tickets) : 0;
  return { tickets: Math.max(0, Math.min(t, max - pagados.length)), desbloqueados: pagados };
}

// ---------- Guardado (formato del localStorage) ----------

export const VERSION_GUARDADO = 1;

export function serializarPartida(partida, desbloqueados = [], fecha = new Date().toISOString()) {
  return {
    version: VERSION_GUARDADO,
    fecha,
    destino: partida.destino,
    presupuesto: partida.presupuesto,
    tickets: partida.tickets,
    diseno: Array.isArray(partida.diseno) ? partida.diseno : [],
    sitio: partida.sitio?.id ?? null,
    resultados: Array.isArray(partida.resultados) ? partida.resultados : [],
    desbloqueados,
  };
}

/** Valida un guardado; devuelve null si está corrupto o es de otra versión. */
export function leerGuardado(texto, { destinos = null, maxTickets = null } = {}) {
  let g;
  try { g = JSON.parse(texto); } catch { return null; }
  if (!g || g.version !== VERSION_GUARDADO || typeof g.destino !== 'string') return null;
  if (destinos && !destinos[g.destino]) return null;
  if (typeof g.tickets !== 'number' || typeof g.presupuesto !== 'number') return null;
  const sitio = typeof g.sitio === 'string' && g.sitio ? g.sitio : null;
  const desbloqueados = Array.isArray(g.desbloqueados) ? g.desbloqueados.filter((x) => typeof x === 'string') : [];
  return {
    ...g,
    diseno: Array.isArray(g.diseno) ? g.diseno : [],
    resultados: Array.isArray(g.resultados) ? g.resultados : [],
    sitio,
    ...(typeof maxTickets === 'number' ? conciliarTickets({ tickets: g.tickets, desbloqueados, sitio }, maxTickets) : { desbloqueados }),
  };
}

// ---------- Explorador ----------

/** Página servida desde la máquina local (desarrollo): ahí sí puede existir la API por defecto en localhost:8000. */
export function esHostLocal(host) {
  const h = String(host ?? '').toLowerCase().replace(/^\[|\]$/g, '');
  return h === '' || h === 'localhost' || h.endsWith('.localhost') || h === '::1' || /^127\./.test(h) || h === '0.0.0.0';
}

/** Sin VITE_API_URL y fuera de localhost (la demo pública) la API no existe: no vale la pena esperar a que conteste. */
export function apiSinPublicar({ configurada, host }) {
  return !configurada && !esHostLocal(host);
}

function numero(txt) {
  const s = String(txt ?? '').trim().replace(',', '.');
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

/** Valida latitud y longitud en grados decimales. */
export function validarCoordenadas(latTxt, lonTxt) {
  const lat = numero(latTxt);
  const lon = numero(lonTxt);
  if (Number.isNaN(lat)) return { ok: false, error: tr('Latitud no válida: usa grados decimales, por ejemplo 31.84.', 'Invalid latitude: use decimal degrees, e.g. 31.84.') };
  if (Number.isNaN(lon)) return { ok: false, error: tr('Longitud no válida: usa grados decimales, por ejemplo -113.39.', 'Invalid longitude: use decimal degrees, e.g. -113.39.') };
  if (lat < -90 || lat > 90) return { ok: false, error: tr('La latitud debe estar entre -90 y 90.', 'Latitude must be between -90 and 90.') };
  if (lon < -180 || lon > 180) return { ok: false, error: tr('La longitud debe estar entre -180 y 180.', 'Longitude must be between -180 and 180.') };
  return { ok: true, lat, lon };
}

// En el teléfono no se depende del signo menos (el teclado decimal de iOS no lo tiene): el usuario escribe solo
// los grados y elige el hemisferio (N/S, E/O). Aquí se convierte a grados con signo antes de llamar a /score.
export const HEMISFERIOS = { lat: ['N', 'S'], lon: ['E', 'O'] };

/** Valida grados sin signo + hemisferio y devuelve { ok, lat, lon } con signo (S y O son negativos). */
export function validarCoordenadasHemisferio({ lat, latHem, lon, lonHem }) {
  const conSigno = (t) => /^\s*[-+]/.test(String(t ?? ''));
  if (conSigno(lat) || conSigno(lon)) {
    return { ok: false, error: tr('Escribe solo los grados, sin signo, y elige el hemisferio (N/S y E/O) en la lista.', 'Type only the degrees, without a sign, and pick the hemisphere (N/S and E/W) from the list.') };
  }
  const a = numero(lat);
  const o = numero(lon);
  if (Number.isNaN(a)) return { ok: false, error: tr('Latitud no válida: usa grados decimales, por ejemplo 31.84.', 'Invalid latitude: use decimal degrees, e.g. 31.84.') };
  if (Number.isNaN(o)) return { ok: false, error: tr('Longitud no válida: usa grados decimales, por ejemplo 113.39.', 'Invalid longitude: use decimal degrees, e.g. 113.39.') };
  if (!HEMISFERIOS.lat.includes(latHem)) return { ok: false, error: tr('Elige el hemisferio de la latitud: N o S.', 'Pick the latitude hemisphere: N or S.') };
  if (!HEMISFERIOS.lon.includes(lonHem)) return { ok: false, error: tr('Elige el hemisferio de la longitud: E u O.', 'Pick the longitude hemisphere: E or W.') };
  if (a > 90) return { ok: false, error: tr('La latitud va de 0 a 90 grados (y luego N o S).', 'Latitude goes from 0 to 90 degrees (then N or S).') };
  if (o > 180) return { ok: false, error: tr('La longitud va de 0 a 180 grados (y luego E u O).', 'Longitude goes from 0 to 180 degrees (then E or W).') };
  const lat2 = latHem === 'S' && a !== 0 ? -a : a;
  const lon2 = lonHem === 'O' && o !== 0 ? -o : o;
  return { ok: true, lat: lat2, lon: lon2 };
}

/** Grados con signo → grados sin signo + hemisferio (para rellenar el formulario con un sitio del catálogo). */
export function aHemisferio(lat, lon) {
  return { lat: Math.abs(lat), latHem: lat < 0 ? 'S' : 'N', lon: Math.abs(lon), lonHem: lon < 0 ? 'O' : 'E' };
}

/** Letra del hemisferio para mostrar: el valor interno es "O" (oeste); en inglés se muestra "W". */
export const letraHemisferio = (h) => (h === 'O' ? tr('O', 'W') : h);

/** "31.84° N, 113.39° O" (en inglés: "31.84° N, 113.39° W") */
export function formatoCoordenada(lat, lon) {
  const h = aHemisferio(lat, lon);
  return `${h.lat}° ${h.latHem}, ${h.lon}° ${letraHemisferio(h.lonHem)}`;
}

/** ¿Se puede proponer el sitio? Solo si la API lo permite Y la similitud total alcanza el umbral. */
export function puedeProponer(respuesta, umbral) {
  const t = respuesta?.similitud?.total;
  return respuesta?.puede_proponer === true && typeof t === 'number' && t >= umbral;
}

export function validarNombrePropuesta(nombre) {
  const n = String(nombre ?? '').trim();
  if (n.length < 3) return { ok: false, error: tr('Escribe un nombre de al menos 3 caracteres.', 'Type a name with at least 3 characters.') };
  if (n.length > 80) return { ok: false, error: tr('El nombre no puede pasar de 80 caracteres.', 'The name cannot be longer than 80 characters.') };
  return { ok: true, nombre: n };
}

export function recortar(txt, n) {
  const s = String(txt ?? '');
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
