// Dueño: frente expediente. Lógica pura (sin Phaser ni navegador) para poder probarla con `node --test`.
// Regla de oro: nunca inventar datos. Lo que falta se devuelve como null y la interfaz dice "sin dato".

import { etiquetaVariable, etiquetaLimite, LIMITES } from './textos.js';

export const SIN_DATO = 'sin dato';

// Orden fijo de las dimensiones del modelo (AGENTS.md §6.2); las demás compartidas van después.
const ORDEN = ['forma', 'oscilacion_termica', 'precipitacion', 'ndvi', 'pendiente'];

// Fuente de la referencia de forma del destino (AGENTS.md §6.2: mismos datos con los que se entrenó el modelo).
const REF_FORMA = {
  luna: 'Cráteres del polo sur lunar: LRO LOLA ldem_80s_80m, remuestreado a 200 m',
  marte: 'Cráteres de Marte: HRSC+MOLA blend, 200 m',
};

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
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return SIN_DATO;
  const abs = Math.abs(valor);
  const dec = abs === 0 ? 0 : abs >= 100 ? 1 : abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4;
  return String(Number(valor.toFixed(dec)));
}

/** "14.51 K" · "0.14" (unidad "-") · "sin dato". */
export function formatoValor(v) {
  if (!v || typeof v.valor !== 'number') return SIN_DATO;
  const u = v.unidad && v.unidad !== '-' ? ` ${v.unidad}` : '';
  return `${formatoNumero(v.valor)}${u}`;
}

export function formatoPorcentaje(x) {
  return typeof x === 'number' && Number.isFinite(x) ? `${Math.round(x * 100)} %` : SIN_DATO;
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
        texto: mina ? 'vs. cráteres Luna+Marte' : 'Cráteres Luna+Marte',
        unidad: '-',
        fuente: REF_FORMA[destino?.mundo] || 'Cráteres reales de la Luna y Marte',
        fecha: null,
        nota: mina
          ? 'Es un tajo minero (excavación), no un cráter natural: solo se compara su forma con la de cráteres reales de la Luna y Marte.'
          : 'La forma se compara con un modelo explicable entrenado con cráteres de la Luna y Marte, no con un solo valor.',
      };
    }
    const mismaUnidad = !(tierra && dest && dest.valor != null && tierra.unidad !== dest.unidad);
    return {
      clave,
      etiqueta: clave === 'forma' && esMina(sitio) ? 'Forma del tajo minero' : etiquetaVariable(clave),
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
export function leerGuardado(texto, { destinos = null } = {}) {
  let g;
  try { g = JSON.parse(texto); } catch { return null; }
  if (!g || g.version !== VERSION_GUARDADO || typeof g.destino !== 'string') return null;
  if (destinos && !destinos[g.destino]) return null;
  if (typeof g.tickets !== 'number' || typeof g.presupuesto !== 'number') return null;
  return {
    ...g,
    diseno: Array.isArray(g.diseno) ? g.diseno : [],
    resultados: Array.isArray(g.resultados) ? g.resultados : [],
    desbloqueados: Array.isArray(g.desbloqueados) ? g.desbloqueados.filter((x) => typeof x === 'string') : [],
    sitio: typeof g.sitio === 'string' ? g.sitio : null,
  };
}

// ---------- Explorador ----------

function numero(txt) {
  const s = String(txt ?? '').trim().replace(',', '.');
  if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

/** Valida latitud y longitud en grados decimales. */
export function validarCoordenadas(latTxt, lonTxt) {
  const lat = numero(latTxt);
  const lon = numero(lonTxt);
  if (Number.isNaN(lat)) return { ok: false, error: 'Latitud no válida: usa grados decimales, por ejemplo 31.84.' };
  if (Number.isNaN(lon)) return { ok: false, error: 'Longitud no válida: usa grados decimales, por ejemplo -113.39.' };
  if (lat < -90 || lat > 90) return { ok: false, error: 'La latitud debe estar entre -90 y 90.' };
  if (lon < -180 || lon > 180) return { ok: false, error: 'La longitud debe estar entre -180 y 180.' };
  return { ok: true, lat, lon };
}

// En el teléfono no se depende del signo menos (el teclado decimal de iOS no lo tiene): el usuario escribe solo
// los grados y elige el hemisferio (N/S, E/O). Aquí se convierte a grados con signo antes de llamar a /score.
export const HEMISFERIOS = { lat: ['N', 'S'], lon: ['E', 'O'] };

/** Valida grados sin signo + hemisferio y devuelve { ok, lat, lon } con signo (S y O son negativos). */
export function validarCoordenadasHemisferio({ lat, latHem, lon, lonHem }) {
  const conSigno = (t) => /^\s*[-+]/.test(String(t ?? ''));
  if (conSigno(lat) || conSigno(lon)) {
    return { ok: false, error: 'Escribe solo los grados, sin signo, y elige el hemisferio (N/S y E/O) en la lista.' };
  }
  const a = numero(lat);
  const o = numero(lon);
  if (Number.isNaN(a)) return { ok: false, error: 'Latitud no válida: usa grados decimales, por ejemplo 31.84.' };
  if (Number.isNaN(o)) return { ok: false, error: 'Longitud no válida: usa grados decimales, por ejemplo 113.39.' };
  if (!HEMISFERIOS.lat.includes(latHem)) return { ok: false, error: 'Elige el hemisferio de la latitud: N o S.' };
  if (!HEMISFERIOS.lon.includes(lonHem)) return { ok: false, error: 'Elige el hemisferio de la longitud: E u O.' };
  if (a > 90) return { ok: false, error: 'La latitud va de 0 a 90 grados (y luego N o S).' };
  if (o > 180) return { ok: false, error: 'La longitud va de 0 a 180 grados (y luego E u O).' };
  const lat2 = latHem === 'S' && a !== 0 ? -a : a;
  const lon2 = lonHem === 'O' && o !== 0 ? -o : o;
  return { ok: true, lat: lat2, lon: lon2 };
}

/** Grados con signo → grados sin signo + hemisferio (para rellenar el formulario con un sitio del catálogo). */
export function aHemisferio(lat, lon) {
  return { lat: Math.abs(lat), latHem: lat < 0 ? 'S' : 'N', lon: Math.abs(lon), lonHem: lon < 0 ? 'O' : 'E' };
}

/** "31.84° N, 113.39° O" */
export function formatoCoordenada(lat, lon) {
  const h = aHemisferio(lat, lon);
  return `${h.lat}° ${h.latHem}, ${h.lon}° ${h.lonHem}`;
}

/** ¿Se puede proponer el sitio? Solo si la API lo permite Y la similitud total alcanza el umbral. */
export function puedeProponer(respuesta, umbral) {
  const t = respuesta?.similitud?.total;
  return respuesta?.puede_proponer === true && typeof t === 'number' && t >= umbral;
}

export function validarNombrePropuesta(nombre) {
  const n = String(nombre ?? '').trim();
  if (n.length < 3) return { ok: false, error: 'Escribe un nombre de al menos 3 caracteres.' };
  if (n.length > 80) return { ok: false, error: 'El nombre no puede pasar de 80 caracteres.' };
  return { ok: true, nombre: n };
}

export function recortar(txt, n) {
  const s = String(txt ?? '');
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
