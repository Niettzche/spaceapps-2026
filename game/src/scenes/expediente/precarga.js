// Dueño: frente expediente. Regla de qué arte de /assets precarga el Boot (lógica pura, probada con `node --test`).
// - Nunca se precargan formatos pesados (GIF, MP4, WebM): son video o animaciones de referencia, no arte del juego.
// - Nunca se precarga un archivo mayor al límite; si su tamaño no se puede medir, se carga y se avisa.
// Lo que se salta se reporta (consola y resumen del Boot) con su tamaño; cada escena puede cargarlo después si lo necesita.

export function extension(archivo) {
  const m = /\.([^./]+)$/.exec(String(archivo || ''));
  return m ? m[1].toLowerCase() : '';
}

/** Bytes de una URL `data:` (Vite incrusta en el JS los archivos ≤ 4 KB); null si no es `data:`. */
export function bytesDeDataUri(url) {
  const s = String(url || '');
  if (!s.startsWith('data:')) return null;
  const coma = s.indexOf(',');
  if (coma < 0) return null;
  const datos = s.slice(coma + 1);
  if (/;base64$/i.test(s.slice(0, coma))) {
    const relleno = datos.endsWith('==') ? 2 : datos.endsWith('=') ? 1 : 0;
    return Math.floor((datos.length * 3) / 4) - relleno;
  }
  try { return decodeURIComponent(datos).length; } catch { return datos.length; }
}

/**
 * Divide la lista de arte en lo que se precarga y lo que se salta.
 * Cada elemento: { archivo, bytes (número o null), ... }. Devuelve { cargar, saltar } con `motivo` en lo saltado:
 * 'formato' (extensión excluida) o 'tamaño' (mayor que el límite).
 */
export function planDePrecarga(lista, { limiteBytes, extensionesExcluidas }) {
  const excluidas = new Set(extensionesExcluidas.map((e) => e.toLowerCase()));
  const cargar = [];
  const saltar = [];
  for (const a of lista) {
    if (excluidas.has(extension(a.archivo))) saltar.push({ ...a, motivo: 'formato' });
    else if (typeof a.bytes === 'number' && a.bytes > limiteBytes) saltar.push({ ...a, motivo: 'tamaño' });
    else cargar.push(a);
  }
  return { cargar, saltar };
}

export function formatoBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 'tamaño desconocido';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Mide el tamaño de varios archivos SIN trabar el Boot: a lo más `concurrencia` peticiones a la vez y un plazo total.
 * `medir(item, esperaMs)` devuelve bytes o null. Lo que no alcanza a medirse se queda en null (y se carga: ver planDePrecarga).
 * Antes se pedían ~160 HEAD a la vez con 5 s cada uno, y la carga podía quedarse varios segundos en 0 %.
 * Devuelve cuántos se midieron y si se agotó el plazo.
 */
export async function medirConLimite(items, medir, { concurrencia = 6, plazoMs = 2500, esperaMs = 1500 } = {}) {
  const inicio = Date.now();
  let i = 0;
  let medidos = 0;
  let agotado = false;
  const trabajador = async () => {
    while (i < items.length) {
      const resta = plazoMs - (Date.now() - inicio);
      if (resta <= 0) { agotado = true; return; }
      const item = items[i++];
      const n = await medir(item, Math.min(esperaMs, resta));
      if (typeof n === 'number') { item.bytes = n; medidos++; }
    }
  };
  let reloj;
  const plazo = new Promise((r) => { reloj = setTimeout(() => { agotado = true; r(); }, plazoMs); });
  await Promise.race([Promise.all(Array.from({ length: Math.min(concurrencia, items.length) }, trabajador)), plazo]);
  clearTimeout(reloj);
  return { medidos, agotado: agotado && medidos < items.length };
}
