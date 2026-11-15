// Dueño: frente expediente. «Por qué el modelo eligió este lugar» y modo «Descubrir» (AGENTS.md §6.4: tres formas de
// identificar lugares). Lógica pura (sin Phaser ni navegador) para probarla con `node --test`.
// Regla de oro (AGENTS.md §3.3): solo se leen campos que existen en data/sites (estado, prueba_util, proceso, novedoso,
// variables, similitud, nota). Lo que falta se devuelve como null y la interfaz dice «sin dato». Nada se calcula de más:
// la única cuenta propia es la distancia a la lista de análogos conocidos para un punto NUEVO del Explorador, con la
// misma regla que data/known_analogs.json («a menos de 50 km de uno de estos no es novedoso»).
import { tr, trDato } from '../../i18n.js';
import { esMina, esDemostracion, formatoNumero, sinDato } from './logica.js';
import { distanciaKm, formatoDistancia } from './catalogo.js';

/** Umbral del filtro de zonas áridas del detector (AGENTS.md §6.2: NDVI p90 < 0.35). */
export const UMBRAL_ARIDO = 0.35;
/** Radio de data/known_analogs.json para decir que un punto ya es un análogo conocido. */
export const RADIO_CONOCIDO_KM = 50;

/** ¿Tiene recorrido de prueba? Misma regla que data.js (SITIOS): los candidatos del modelo solo con perfil del DEM. */
export function tieneNivel(s) {
  return !!s && (s.estado !== 'candidato_modelo' || (Array.isArray(s.nivel?.perfil_elevacion_m) && s.nivel.perfil_elevacion_m.length >= 2));
}

// ---------- Tipo de lugar (de `proceso`, el texto que escribe el frente modelo) ----------

export const TIPOS = ['impacto', 'volcan', 'mina', 'dunas', 'sin_verificar'];

/** 'impacto' | 'volcan' | 'mina' | 'dunas' | 'sin_verificar'. Se lee de `proceso`; si no dice nada claro, sin verificar. */
export function tipoDeSitio(s) {
  const p = String(s?.proceso ?? '');
  if (esMina(s)) return 'mina';
  if (/^impacto\b/i.test(p)) return 'impacto';
  if (/volc[aá]n|vulcanismo|maar\)|\(maar|probable volc/i.test(p) && !/maar erosionado/i.test(p)) return 'volcan';
  if (/dunas|e[oó]lic/i.test(p)) return 'dunas';
  return 'sin_verificar';
}

/** Nombre corto del tipo (chips, filtros y lista). */
export function nombreTipo(tipo) {
  return {
    impacto: tr('Cráter de impacto', 'Impact crater'),
    volcan: tr('Volcán o maar', 'Volcano or maar'),
    // ≤ 19 caracteres: es el subtítulo de la lista de Descubrir (Expediente.js recorta a 19).
    mina: tr('Mina a tajo abierto', 'Open-pit mine'),
    dunas: tr('Dunas', 'Dunes'),
    sin_verificar: tr('Hueco sin verificar', 'Unverified hollow'),
    todos: tr('Todos', 'All'),
  }[tipo] ?? tipo;
}

// ---------- Cómo se encontró (AGENTS.md §6.4: curadas · búsqueda global en zonas áridas · propuestas) ----------

const PAISES = {
  MX: ['México', 'Mexico'], CL: ['Chile', 'Chile'], US: ['EE. UU.', 'USA'], SA: ['Arabia Saudita', 'Saudi Arabia'],
  DZ: ['Argelia', 'Algeria'], MR: ['Mauritania', 'Mauritania'], NA: ['Namibia', 'Namibia'], CA: ['Canadá', 'Canada'],
};
export const nombrePais = (c) => (PAISES[c] ? tr(PAISES[c][0], PAISES[c][1]) : c || null);

/** 'usuario' | 'control' | 'curado' | 'busqueda' | 'ilustrativo'. */
export function origenDeSitio(s) {
  if (!s) return null;
  if (s.estado === 'propuesto_usuario') return 'usuario';
  if (esDemostracion(s)) return 'ilustrativo';
  if (/control positivo/i.test(s.nota ?? '')) return 'control';
  if (s.estado === 'documentado' || s.prueba_util != null) return 'curado';
  return 'busqueda';
}

/** Frase corta de cómo se encontró el lugar. */
export function textoOrigen(s) {
  const pais = nombrePais(s?.pais);
  switch (origenDeSitio(s)) {
    case 'usuario': return tr('Propuesto por un jugador · pendiente de revisión', 'Proposed by a player · pending review');
    case 'ilustrativo': return tr('Ilustrativo: datos de demostración', 'Illustrative: demo data');
    case 'control': return tr('Cráter conocido (control positivo)', 'Known crater (positive control)');
    case 'curado': return s.estado === 'documentado'
      ? tr('Curado: análogo documentado', 'Curated: documented analog')
      : tr('Curado por el equipo (sitio del juego)', 'Curated by the team (game site)');
    // Cortas: en la ficha de Descubrir van después del tipo, en una línea de 639 px.
    case 'busqueda': return s.pais === 'MX'
      ? tr('Zonas áridas de México (caso validado)', 'Arid-zone search · Mexico (validated)')
      : tr(`Zonas áridas del mundo · ${pais ?? sinDato()}`, `Global arid-zone search · ${pais ?? sinDato()}`);
    default: return sinDato();
  }
}

// ---------- Forma: lo que mide el detector y lo que dice el modelo explicable Luna contra Marte ----------

/** Gemelo de forma más cercano que escribe model/scan.py en `nota`: { nombre, mundo, diametroKm, profundidadM, dD } o null. */
export function gemeloForma(s) {
  const m = /Gemelo de forma más cercano: cráter de (.+?) \((Luna|Marte)\), (\d+(?:\.\d+)?) km, (\d+(?:\.\d+)?) m, d\/D (\d+(?:\.\d+)?)/.exec(s?.nota ?? '');
  if (!m) return null;
  return { nombre: m[1], mundo: m[2] === 'Luna' ? 'luna' : 'marte', diametroKm: Number(m[3]), profundidadM: Number(m[4]), dD: Number(m[5]) };
}

/**
 * Nombre del gemelo en el idioma actual (solo traduce «Cráter X», «Anillo» y «Polo sur»; el resto son nombres propios).
 * «Anillo 80-85°S» es una franja de latitud del polo sur lunar, no un anillo: se dice «cráter a 80-85°S».
 * Sin dos paréntesis seguidos: «Gusev (Spirit)» → «Gusev (Spirit, Marte)».
 */
export function nombreGemelo(g) {
  if (!g) return null;
  const mundo = g.mundo === 'luna' ? tr('Luna', 'Moon') : tr('Marte', 'Mars');
  const n = tr(g.nombre.replace(/^Anillo (.+)$/, 'cráter a $1'),
    g.nombre.replace(/^Cráter (.+)$/, '$1 crater').replace(/^Anillo (.+)$/, 'crater at $1').replace(/^Polo sur\b/, 'South pole'));
  return /\)$/.test(n) ? n.replace(/\)$/, `, ${mundo})`) : `${n} (${mundo})`;
}

// Tajos que las fuentes de los niveles ya verificaron (docs/taller/FUENTES_NIVELES.md): Cananea = Buenavista del Cobre (S137).
// Su `proceso` en data/sites (frente modelo) aún dice «Probable … por verificar»; aquí no se repite el «probable».
const TAJOS_VERIFICADOS = new Set(['mx0023']);

/** P(Luna) del modelo explicable, de la nota de `variables.forma` («P(Luna)=0.1507»). null si no está. */
export function probabilidadLuna(s) {
  const m = /P\(Luna\)=(\d+(?:\.\d+)?)/.exec(s?.variables?.forma?.nota ?? '');
  return m ? Number(m[1]) : null;
}

const valor = (s, k) => {
  const v = s?.variables?.[k]?.valor;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};
const conSigno = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${formatoNumero(Math.abs(x))}`;
const pct = (x) => `${Math.round(x * 100)} %`;

// ---------- Tarjeta «¿Por qué el modelo eligió este lugar?» ----------

/**
 * Filas de la tarjeta: [{ clave, titulo, valor, color, glifo, iconos }]. `color`: 'bien' | 'riesgo' | 'dato' | 'sec'.
 * `entrena`: frase de NIVELES_DESTACADOS[id].entrena ({ es, en }) o null.
 */
export function porQueModelo(s, { entrena = null } = {}) {
  if (!s) return [];
  const filas = [];
  filas.push({ clave: 'origen', titulo: tr('CÓMO SE ENCONTRÓ', 'HOW IT WAS FOUND'), valor: textoOrigen(s), color: 'dato', glifo: 'mision', iconos: ['iconos/ico_mision'] });
  const tipo = tipoDeSitio(s);
  const probable = tipo !== 'sin_verificar' && !TAJOS_VERIFICADOS.has(s.id) && /probable/i.test(s.proceso ?? '')
    ? tr(' (probable, sin confirmar)', ' (likely, unconfirmed)') : '';
  filas.push({ clave: 'tipo', titulo: tr('QUÉ ES', 'WHAT IT IS'), valor: `${nombreTipo(tipo)}${probable}`, color: tipo === 'sin_verificar' ? 'sec' : 'dato', glifo: 'dato', iconos: ['iconos/ico_suelo'] });

  // Forma: d/D del sitio frente al gemelo de forma (regla principal del árbol Luna contra Marte) y la salida del modelo.
  const dD = valor(s, 'profundidad_diametro');
  const g = gemeloForma(s);
  const pL = probabilidadLuna(s);
  let forma = sinDato();
  let colorForma = 'sec';
  if (dD != null) {
    forma = `d/D ${formatoNumero(dD)}`;
    if (g) forma += ` · ${tr('gemelo', 'twin')}: ${nombreGemelo(g)} d/D ${formatoNumero(g.dD)}`;
    colorForma = 'dato';
  } else if (tipo === 'dunas' || !s.variables?.forma) {
    forma = tr('no aplica: no es un cráter (solo clima y relieve)', 'n/a: not a crater (climate and terrain only)');
  }
  filas.push({ clave: 'forma', titulo: tr('FORMA (d/D)', 'SHAPE (d/D)'), valor: forma, color: colorForma, glifo: 'forma', iconos: ['iconos/ico_forma'] });
  if (pL != null) {
    const luna = pL >= 0.5;
    filas.push({
      clave: 'modelo',
      titulo: tr('MODELO LUNA/MARTE', 'MOON/MARS MODEL'),
      valor: luna ? tr(`forma ${pct(pL)} lunar`, `shape ${pct(pL)} Moon-like`)
        : tr(`forma ${pct(1 - pL)} marciana`, `shape ${pct(1 - pL)} Mars-like`),
      color: 'dato', glifo: 'confianza', iconos: ['iconos/ico_similitud'],
    });
  }
  const borde = valor(s, 'borde_levantado');
  filas.push({
    clave: 'borde',
    titulo: tr('BORDE LEVANTADO', 'RAISED RIM'),
    valor: borde == null ? sinDato()
      : borde > 0 ? tr(`sí, ${conSigno(borde)} m sobre el entorno: borde de cráter`, `yes, ${conSigno(borde)} m above surroundings: crater rim`)
        : tr(`no (${conSigno(borde)} m): hueco sin borde`, `no (${conSigno(borde)} m): hollow without a rim`),
    color: borde == null ? 'sec' : borde > 0 ? 'bien' : 'sec',
    glifo: 'pendiente', iconos: ['iconos/ico_subida'],
  });
  // Filtro árido del detector: NDVI p90 < 0.35. Sin p90 se dice, y se muestra el NDVI medio si lo hay (no es el filtro).
  const p90 = valor(s, 'ndvi_p90');
  const ndvi = valor(s, 'ndvi');
  let arido; let colorArido;
  if (p90 != null) {
    const pasa = p90 < UMBRAL_ARIDO;
    arido = pasa ? tr(`pasa: NDVI p90 ${formatoNumero(p90)} < ${UMBRAL_ARIDO} (casi sin plantas)`, `passes: NDVI p90 ${formatoNumero(p90)} < ${UMBRAL_ARIDO} (almost no plants)`)
      : tr(`no pasa: NDVI p90 ${formatoNumero(p90)} ≥ ${UMBRAL_ARIDO}`, `fails: NDVI p90 ${formatoNumero(p90)} ≥ ${UMBRAL_ARIDO}`);
    colorArido = pasa ? 'bien' : 'riesgo';
  } else {
    arido = ndvi != null ? tr(`NDVI p90 sin dato · NDVI medio ${formatoNumero(ndvi)}`, `NDVI p90 no data · mean NDVI ${formatoNumero(ndvi)}`) : sinDato();
    colorArido = 'sec';
  }
  filas.push({ clave: 'arido', titulo: tr('ZONA ÁRIDA (MODIS)', 'ARID FILTER (MODIS)'), valor: arido, color: colorArido, glifo: 'planta', iconos: ['iconos/ico_vegetacion'] });
  filas.push({
    clave: 'novedoso',
    titulo: tr('¿NOVEDOSO?', 'NOVEL?'),
    valor: s.novedoso === true ? tr('SÍ: no está en la lista de análogos conocidos', 'YES: not on the list of known analogs')
      : s.novedoso === false ? tr('no: ya es un análogo conocido (o está junto a uno)', 'no: already a known analog (or next to one)')
        // Un control positivo es, por definición, un cráter conocido.
        : origenDeSitio(s) === 'control' ? tr('no: cráter conocido', 'no: known crater')
          : tr('sin verificar', 'not verified'),
    color: s.novedoso === true ? 'bien' : 'sec',
    glifo: 'novedoso', iconos: ['iconos/ico_novedoso'],
  });
  if (entrena) {
    filas.push({ clave: 'entrena', titulo: tr('QUÉ ENTRENA', 'WHAT IT TRAINS'), valor: tr(entrena.es, entrena.en ?? entrena.es), color: 'texto', glifo: 'mision', iconos: ['iconos/ico_prueba'] });
  }
  return filas;
}

/** Chips cortos (3–4) para la ficha de Descubrir: d/D, borde, árido, novedoso. Solo lo que hay. */
export function chipsPorQue(s) {
  const out = [];
  const dD = valor(s, 'profundidad_diametro');
  if (dD != null) out.push({ texto: `d/D ${formatoNumero(dD)}`, color: 'dato' });
  const borde = valor(s, 'borde_levantado');
  if (borde != null) out.push({ texto: borde > 0 ? tr(`BORDE ${conSigno(borde)} m`, `RIM ${conSigno(borde)} m`) : tr('SIN BORDE', 'NO RIM'), color: borde > 0 ? 'bien' : 'sec' });
  const p90 = valor(s, 'ndvi_p90');
  if (p90 != null) out.push({ texto: p90 < UMBRAL_ARIDO ? tr('ÁRIDO ✓', 'ARID ✓') : tr('NO ÁRIDO', 'NOT ARID'), color: p90 < UMBRAL_ARIDO ? 'bien' : 'riesgo' });
  if (s?.novedoso === true) out.push({ texto: tr('NOVEDOSO', 'NOVEL'), color: 'bien' });
  return out;
}

// ---------- Modo «Descubrir»: todos los candidatos del destino, con filtros ----------

/**
 * Sitios del destino ya ordenados (sitiosParaDestino) → filtrados. `filtros`: { jugables, novedosos, tipo ('todos' | TIPOS) }.
 * `jugable(s)`: la regla de la escena (por defecto, tieneNivel).
 */
export function filtrarDescubrir(sitios, { jugables = false, novedosos = false, tipo = 'todos' } = {}, jugable = tieneNivel) {
  return (sitios || []).filter((s) => (!jugables || jugable(s)) && (!novedosos || s.novedoso === true)
    && (tipo === 'todos' || tipoDeSitio(s) === tipo));
}

/** Cuántos hay de cada cosa (para la línea de resumen y para no ofrecer tipos vacíos). */
export function resumenDescubrir(sitios, jugable = tieneNivel) {
  const porTipo = Object.fromEntries(TIPOS.map((t) => [t, 0]));
  let jug = 0; let nov = 0; const paises = new Set();
  for (const s of sitios || []) {
    porTipo[tipoDeSitio(s)] += 1;
    if (jugable(s)) jug += 1;
    if (s.novedoso === true) nov += 1;
    if (s.pais) paises.add(s.pais);
  }
  return { total: (sitios || []).length, jugables: jug, novedosos: nov, porTipo, paises: paises.size };
}

/** Siguiente tipo del ciclo «Tipo: …» (solo tipos con sitios). */
export function siguienteTipo(actual, porTipo) {
  const ciclo = ['todos', ...TIPOS.filter((t) => (porTipo?.[t] ?? 0) > 0)];
  const i = ciclo.indexOf(actual);
  return ciclo[(i + 1) % ciclo.length];
}

/**
 * Nombre corto para la lista: «Depresión tipo cráter MX0000» → «Depresión MX0000» (o «Tajo MX0000» si su tipo es mina,
 * para que el nombre no contradiga el subtítulo); los demás, tal cual.
 */
export function nombreCorto(s) {
  const n = trDato(s ?? {}, 'nombre') ?? s?.id ?? '';
  const m = /^(?:Depresión tipo cráter|Crater-like depression) (\S+)/.exec(n);
  if (m) return tipoDeSitio(s) === 'mina' ? tr(`Tajo ${m[1]}`, `Pit ${m[1]}`) : tr(`Depresión ${m[1]}`, `Depression ${m[1]}`);
  return n;
}

// ---------- Minimapa: proyección equirectangular simple ----------

/** Máscara RLE ('1'/'0' + largo por fila, como assets/fuente/datos/tierra_mapa.txt) → filas de booleanos. */
export function decodificarMascara(m) {
  return (m?.filas ?? []).map((r) => {
    const out = [];
    for (const t of r.split(',')) if (t) out.push(...Array(Number(t.slice(1))).fill(t[0] === '1'));
    return out;
  });
}

/** (lat, lon) → (x, y) dentro de la caja { x, y, w, h } que cubre lon [l0, l1] y lat [a0 (arriba), a1 (abajo)]. null si cae fuera. */
export function proyectar(lat, lon, caja, { lon: [l0, l1] = [-180, 180], lat: [a0, a1] = [90, -90] } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const fx = (lon - l0) / (l1 - l0);
  const fy = (lat - a0) / (a1 - a0);
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
  return { x: caja.x + fx * caja.w, y: caja.y + fy * caja.h };
}

// ---------- Explorador: un punto nuevo de la API, con el formato de la tarjeta ----------

/** Análogo conocido más cercano a `punto` (data/known_analogs.json): { analogo, distanciaKm } o null. */
export function conocidoMasCercano(punto, conocidos) {
  let mejor = null;
  for (const a of conocidos?.analogos ?? conocidos ?? []) {
    if (!Number.isFinite(a?.lat) || !Number.isFinite(a?.lon)) continue;
    const d = distanciaKm(punto, a);
    if (!mejor || d < mejor.distanciaKm) mejor = { analogo: a, distanciaKm: d };
  }
  return mejor;
}

/**
 * Filas de la tarjeta para un punto que respondió la API (/score): mismo formato que porQueModelo.
 * La API mide clima, vegetación y pendiente, no la forma: eso se dice tal cual.
 */
export function porQuePunto(datos, punto, conocidos) {
  const vars = datos?.variables ?? {};
  const ndvi = typeof vars.ndvi?.valor === 'number' ? vars.ndvi.valor : (typeof vars.ndvi === 'number' ? vars.ndvi : null);
  const vetado = datos?.similitud?.vetado === true;
  const cerca = conocidoMasCercano(punto, conocidos);
  const conocido = cerca && cerca.distanciaKm < RADIO_CONOCIDO_KM;
  return [
    { clave: 'origen', titulo: tr('CÓMO SE ENCONTRÓ', 'HOW IT WAS FOUND'), valor: tr('Tu coordenada · consulta en vivo a la API del modelo', 'Your coordinate · live query to the model API'), color: 'dato', glifo: 'mision', iconos: ['iconos/ico_mision'] },
    { clave: 'forma', titulo: tr('FORMA (d/D)', 'SHAPE (d/D)'), valor: tr('sin dato: la API no mide la forma de un punto cualquiera (solo el detector)', 'no data: the API does not measure the shape of an arbitrary point (only the detector does)'), color: 'sec', glifo: 'forma', iconos: ['iconos/ico_forma'] },
    {
      clave: 'arido',
      titulo: tr('VEGETACIÓN (MODIS)', 'VEGETATION (MODIS)'),
      valor: vetado ? tr(`VETADO: NDVI ${ndvi != null ? formatoNumero(ndvi) : sinDato()}, demasiadas plantas`, `VETOED: NDVI ${ndvi != null ? formatoNumero(ndvi) : sinDato()}, too many plants`)
        : ndvi != null ? tr(`NDVI medio ${formatoNumero(ndvi)} (no es el p90 del filtro)`, `mean NDVI ${formatoNumero(ndvi)} (not the filter's p90)`) : sinDato(),
      color: vetado ? 'riesgo' : ndvi != null ? 'dato' : 'sec', glifo: 'planta', iconos: ['iconos/ico_vegetacion'],
    },
    {
      clave: 'novedoso',
      titulo: tr('¿NOVEDOSO?', 'NOVEL?'),
      valor: !cerca ? sinDato()
        : conocido ? tr(`no: a ${formatoDistancia(cerca.distanciaKm)} de ${cerca.analogo.nombre}`, `no: ${formatoDistancia(cerca.distanciaKm)} from ${cerca.analogo.nombre}`)
          : tr(`posible: ningún análogo conocido a < ${RADIO_CONOCIDO_KM} km (el más cercano, a ${formatoDistancia(cerca.distanciaKm)}; sin verificar)`,
            `possible: no known analog within ${RADIO_CONOCIDO_KM} km (nearest ${formatoDistancia(cerca.distanciaKm)} away; not verified)`),
      color: cerca && !conocido ? 'bien' : 'sec', glifo: 'novedoso', iconos: ['iconos/ico_novedoso'],
    },
  ];
}
