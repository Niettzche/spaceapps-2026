// Ambiente de cada nivel (temperatura, aire, luz) con DATOS REALES y fuente, y las reglas de juego (P) que lo usan.
// Ver docs/juego/ESPECIFICACION.md §5b. AGENTS.md §5: temperatura y presión entran SOLO con una regla implementada y explicable:
//   a) Frío → batería: una batería fría entrega menos energía (la partida arranca con menos carga útil).
//   b) Calor del motor ↔ aire: el motor se calienta al acelerar y el aire lo enfría; sin aire (Luna) solo se enfría por
//      radiación. Si pasa del límite, el motor solo entrega la potencia que el ambiente alcanza a enfriar.
//   c) Luz: el panel solar recarga según la luz del lugar; con luz rasante (polo sur lunar) recarga mucho menos.
// Los VALORES DE DATOS llevan fuente (libro docs/taller/Space_Apps_Game_Data.xlsx o NASA POWER); los de las reglas son (P).
// Sin dato → null + nota (nunca se inventa).

import { tr } from '../i18n.js';

// ─── Datos de referencia (libro de datos del taller, hojas Weather, Mars, Moon, Equations) ──────────────────────────────
// Densidad del aire de la Tierra a nivel del mar: 1.217 kg/m³ (WX-002, NSSDCA Earth Fact Sheet, S03). Es la referencia "1 ×".
export const DENSIDAD_AIRE_TIERRA = 1.217;
const R_AIRE_KJ = 0.2869; // EQ-009 (NASA Glenn, S13): ρ = p / (0.2869 × (T + 273.1)), p en kPa, T en °C

const FUENTE_POWER = 'NASA POWER, climatología por punto v2.10 (MERRA-2), 2001–2025, anual (ANN): T2M, T2M_RANGE, T2M_MIN, T2M_MAX, PS; consulta 2026-11-14';
const FUENTE_POWER_EN = 'NASA POWER point climatology v2.10 (MERRA-2), 2001–2025, annual (ANN): T2M, T2M_RANGE, T2M_MIN, T2M_MAX, PS; queried 2026-11-14';

/**
 * Clima de los 4 sitios jugables (NASA POWER, mismo servicio que ciencia_datos/datos/clima_candidatos.csv, donde están
 * MX0008 = Pinacate, MX0207 y G00281 con los mismos valores; Samalayuca no está en ese CSV y se consultó con la misma API).
 * t2m = media anual (°C); rango = rango diario medio (°C); min/max = extremos del periodo (°C); ps = presión en superficie (kPa).
 */
export const CLIMA_SITIOS = {
  samalayuca: { t2m: 17.85, rango: 14.78, min: -14.51, max: 42.41, ps: 87.31, punto: [31.2636, -106.3953] },
  pinacate: { t2m: 22.3, rango: 14.51, min: -4.65, max: 48.41, ps: 96.96, punto: [31.8459, -113.3925] },
  mx0207: { t2m: 16.4, rango: 15.45, min: -7.03, max: 35.79, ps: 79.01, punto: [22.4145, -101.9109] },
  g00281: { t2m: 25.91, rango: 16.16, min: 0.59, max: 45.29, ps: 89.41, punto: [22.9018, 41.1412] },
};

/** Destinos: valores del libro de datos con su ID de fila y fuente. */
const AMBIENTE_DESTINOS = {
  jezero: {
    mundo: 'marte',
    temperatura_min_C: -83, temperatura_max_C: -22, // WX-016: aire en Jezero, soles 43–44 (MEDA)
    presion_kPa: 0.718, // WX-014: 718 Pa medidos (MEDA)
    densidad_aire_kg_m3: 0.016, // MR-010: densidad media en superficie, 0.016 ± 0.006
    luz: 'directa',
    irradiancia_rel: 0.431, // WX-007: 586.2 W/m² en Marte / 1361 en la Tierra (antes del polvo)
    nota: null,
    nota_en: null,
    fuentes: [
      'WX-016, WX-014: NASA, primer reporte del clima en Jezero (MEDA), 2021-04-06: −83 a −22 °C, 718 Pa',
      'MR-010, WX-007: NASA NSSDCA Mars Fact Sheet (2025-05-19): aire 0.016 kg/m³, sol 586.2 W/m²',
    ],
    fuentes_en: [
      'WX-016, WX-014: NASA, first Jezero weather report (MEDA), 2021-04-06: −83 to −22 °C, 718 Pa',
      'MR-010, WX-007: NASA NSSDCA Mars Fact Sheet (2025-05-19): air 0.016 kg/m³, sunlight 586.2 W/m²',
    ],
  },
  polo_sur_lunar: {
    mundo: 'luna',
    temperatura_min_C: -53, temperatura_max_C: null, // WX-035 / MN-013: borde iluminado junto a sombras permanentes, ~220 K casi constante
    presion_kPa: 3e-13, // MN-016: ~3e-15 bar de noche (exosfera; fila Draft del libro)
    densidad_aire_kg_m3: 0, // EQ-010: vacío (aproximación del libro: sin enfriamiento por aire)
    luz: 'rasante',
    irradiancia_rel: 1, // MN-008: 1361 W/m² (sin atmósfera), pero el Sol va casi al ras del horizonte
    nota: 'Superficie (no hay aire). Ruta por el borde iluminado; las sombras permanentes llegan a 25 K (−248 °C, MN-012) y no están en el recorrido. La amplitud de verano medida por Diviner en 85–90°S es de 176 K (data/targets).',
    nota_en: 'Surface (there is no air). Route along the sunlit rim; permanent shadows reach 25 K (−248 °C, MN-012) and are not on the route. Diviner summer amplitude at 85–90°S is 176 K (data/targets).',
    fuentes: [
      'WX-035 / MN-013: UCLA Diviner (LRO), borde iluminado ~220 K',
      'MN-016 / EQ-010: NASA NSSDCA Moon Fact Sheet (revisión anterior, Draft): ~3e-15 bar; vacío',
      'Luz rasante: data/targets/polo_sur_lunar.json (no_reproducible_en_tierra); S33 NASA NTRS 20240004621',
    ],
    fuentes_en: [
      'WX-035 / MN-013: UCLA Diviner (LRO), sunlit rim ~220 K',
      'MN-016 / EQ-010: NASA NSSDCA Moon Fact Sheet (older revision, Draft): ~3e-15 bar; vacuum',
      'Grazing light: data/targets/polo_sur_lunar.json (no_reproducible_en_tierra); S33 NASA NTRS 20240004621',
    ],
  },
};

/** Respaldo por mundo cuando el destino no está en la tabla (valores globales del libro de datos). */
const AMBIENTE_MUNDO = {
  marte: { temperatura_min_C: -128, temperatura_max_C: 27, presion_kPa: 0.636, densidad_aire_kg_m3: 0.016, luz: 'directa', irradiancia_rel: 0.431,
    fuentes: ['MR-016, MR-008, MR-010 (NASA JPL / NSSDCA): Marte global'], fuentes_en: ['MR-016, MR-008, MR-010 (NASA JPL / NSSDCA): Mars global'] },
  luna: { temperatura_min_C: -173, temperatura_max_C: 127, presion_kPa: 3e-13, densidad_aire_kg_m3: 0, luz: 'directa', irradiancia_rel: 1,
    fuentes: ['WX-031 (Diviner): ecuador lunar; MN-016 / EQ-010: vacío'], fuentes_en: ['WX-031 (Diviner): lunar equator; MN-016 / EQ-010: vacuum'] },
  // Tierra sin dato del sitio: referencia a nivel del mar (WX-001, WX-002, WX-003).
  tierra: { temperatura_min_C: 10, temperatura_max_C: 20, presion_kPa: 101.4, densidad_aire_kg_m3: DENSIDAD_AIRE_TIERRA, luz: 'directa', irradiancia_rel: 1,
    fuentes: ['WX-001, WX-002, WX-003: NSSDCA Earth Fact Sheet, referencia a nivel del mar (sin dato del sitio)'],
    fuentes_en: ['WX-001, WX-002, WX-003: NSSDCA Earth Fact Sheet, sea-level reference (no site data)'] },
};

const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

/** Ambiente de un sitio terrestre con su clima de NASA POWER (o la referencia de la Tierra si no hay dato). */
export function ambienteDeSitio(sitioId) {
  const c = CLIMA_SITIOS[sitioId];
  if (!c) {
    return { id: sitioId ?? null, mundo: 'tierra', ...AMBIENTE_MUNDO.tierra, extremos_C: null, referencia: true,
      nota: 'Sin clima del sitio: se usa la referencia de la Tierra a nivel del mar.', nota_en: 'No site climate: Earth sea-level reference is used.' };
  }
  // Día típico ≈ media ± rango diario / 2 (aproximación declarada); los extremos del periodo van aparte (informativos).
  return {
    id: sitioId,
    mundo: 'tierra',
    temperatura_min_C: r1(c.t2m - c.rango / 2),
    temperatura_max_C: r1(c.t2m + c.rango / 2),
    extremos_C: [c.min, c.max],
    presion_kPa: c.ps,
    densidad_aire_kg_m3: r3(c.ps / (R_AIRE_KJ * (c.t2m + 273.1))), // EQ-009 con la presión y la temperatura media del sitio
    luz: 'directa',
    irradiancia_rel: 1,
    nota: 'Día típico = T2M ± T2M_RANGE/2 (aprox.). Densidad del aire calculada con EQ-009 (NASA Glenn) a partir de PS y T2M.',
    nota_en: 'Typical day = T2M ± T2M_RANGE/2 (approx.). Air density computed with EQ-009 (NASA Glenn) from PS and T2M.',
    fuentes: [`${FUENTE_POWER}; punto ${c.punto.join(', ')}`],
    fuentes_en: [`${FUENTE_POWER_EN}; point ${c.punto.join(', ')}`],
  };
}

/** Ambiente de un destino (data/targets). */
export function ambienteDeDestino(destinoId, mundo) {
  const d = AMBIENTE_DESTINOS[destinoId];
  if (d) return { id: destinoId, extremos_C: null, ...d };
  const w = AMBIENTE_MUNDO[mundo];
  if (!w) return null;
  return { id: destinoId ?? null, mundo, extremos_C: null, ...w, nota: 'Valores globales del mundo (sin dato del lugar).', nota_en: 'Global values for the world (no local data).' };
}

/** Ambiente del nivel: la prueba usa el sitio terrestre; la misión, el destino. */
export function ambienteDe({ modo, mundo, sitioId, destinoId }) {
  return modo === 'prueba' || mundo === 'tierra' ? ambienteDeSitio(sitioId) : ambienteDeDestino(destinoId, mundo);
}

// ─── Reglas de juego (P) ─────────────────────────────────────────────────────────────────────────────────────────────
export const REGLAS = {
  // a) Frío → batería. Por debajo de 0 °C la capacidad útil baja 0.2 % por °C, con piso de 85 %. (P)
  // Se usa la temperatura MÍNIMA del nivel. Calefactor de batería: no implementado.
  frio: { desde_C: 0, perdida_por_C: 0.002, piso: 0.85 },
  // b) Motor. dT/dt = CALOR × |acelerador| × consumo − k × (T − T_ambiente), k = RADIACION + AIRE × ρ / ρ_Tierra. (P)
  // Con el motor eficiente a fondo, la Tierra lo deja ~25–30 °C sobre el ambiente; sin aire, el equilibrio pasa de 500 °C.
  motor: { calor: 4, radiacion: 0.004, aire: 0.1, limite_C: 100, histeresis_C: 5, potencia_minima: 0.2, aviso_C: 10 },
  // c) Luz → panel solar: recarga por segundo = capacidad del panel × 0.0025 × luz. Luz rasante = 20 % (P).
  luz: { recarga_por_capacidad: 0.0025, rasante: 0.2 },
};

/** a) Fracción de la batería utilizable con la temperatura mínima del nivel (1 = sin pérdida). */
export function factorFrio(tMinC, reglas = REGLAS.frio) {
  if (tMinC == null) return 1;
  const perdida = Math.max(0, reglas.desde_C - tMinC) * reglas.perdida_por_C;
  return Math.max(reglas.piso, 1 - perdida);
}

/** Temperatura del ambiente que ve el motor: media del día típico (o la mínima si no hay máxima). */
export function temperaturaAmbienteMotor(amb) {
  if (!amb) return 20;
  const { temperatura_min_C: a, temperatura_max_C: b } = amb;
  if (a != null && b != null) return (a + b) / 2;
  return a ?? b ?? 20;
}

/** b) Coeficiente de enfriamiento del motor (1/s): radiación + aire (∝ densidad). */
export function enfriamientoMotor(amb, reglas = REGLAS.motor) {
  const rho = amb?.densidad_aire_kg_m3 ?? DENSIDAD_AIRE_TIERRA;
  return reglas.radiacion + reglas.aire * (rho / DENSIDAD_AIRE_TIERRA);
}

/** Nueva temperatura del motor tras dt segundos con el acelerador efectivo `a` y el `consumo` del motor. */
export function pasoTemperaturaMotor(T, { a, consumo, dt, amb, reglas = REGLAS.motor }) {
  const k = enfriamientoMotor(amb, reglas);
  const tAmb = temperaturaAmbienteMotor(amb);
  return T + (reglas.calor * Math.abs(a) * consumo - k * (T - tAmb)) * dt;
}

/** Temperatura de equilibrio del motor con acelerador `a` constante. */
export function temperaturaEquilibrio(a, consumo, amb, reglas = REGLAS.motor) {
  return temperaturaAmbienteMotor(amb) + (reglas.calor * Math.abs(a) * consumo) / enfriamientoMotor(amb, reglas);
}

/**
 * Potencia permitida (0..1) cuando el motor está sobrecalentado: la que el ambiente alcanza a enfriar
 * (calor = enfriamiento), con un mínimo para no dejar al robot inmóvil.
 */
export function potenciaPermitida(T, consumo, amb, reglas = REGLAS.motor) {
  if (T < reglas.limite_C) return 1;
  const enfria = enfriamientoMotor(amb, reglas) * (T - temperaturaAmbienteMotor(amb));
  return Math.min(1, Math.max(reglas.potencia_minima, enfria / (reglas.calor * Math.max(consumo, 1e-6))));
}

/** c) Fracción de luz que recibe el panel: irradiancia relativa a la Tierra × geometría (rasante = 20 %, P). */
export function factorLuz(amb, reglas = REGLAS.luz) {
  if (!amb) return 1;
  return (amb.irradiancia_rel ?? 1) * (amb.luz === 'rasante' ? reglas.rasante : 1);
}

/** Recarga del panel solar (unidades de batería por segundo). */
export function recargaPanel(panel, amb, reglas = REGLAS.luz) {
  if (!panel?.capacidad) return 0;
  return panel.capacidad * reglas.recarga_por_capacidad * factorLuz(amb, reglas);
}

// ─── Textos (bilingües) ────────────────────────────────────────────────────────────────────────────────────────────
const NOMBRE_MUNDO = () => ({ tierra: tr('Tierra', 'Earth'), marte: tr('Marte', 'Mars'), luna: tr('Luna', 'Moon') });
const num = (v, d = 0) => (v == null ? '—' : String(Number(v.toFixed(d))).replace('-', '−'));
const fmtDensidad = (rho) => (rho === 0 ? '0' : rho < 0.1 ? rho.toFixed(3) : rho.toFixed(2));

function textoTemperatura(amb) {
  const { temperatura_min_C: a, temperatura_max_C: b } = amb;
  if (a == null && b == null) return tr('temperatura sin dato', 'temperature: no data');
  if (b == null || a === b) return `${num(a)} °C`;
  return tr(`${num(a)} a ${num(b)} °C`, `${num(a)} to ${num(b)} °C`);
}

/** % de la densidad del aire de la Tierra a nivel del mar. */
export const porcentajeAire = (amb) => (amb?.densidad_aire_kg_m3 ?? 0) / DENSIDAD_AIRE_TIERRA * 100;

function textoAire(amb) {
  const rho = amb.densidad_aire_kg_m3;
  if (rho == null) return tr('aire sin dato', 'air: no data');
  if (rho === 0) return tr('sin aire (vacío): el motor solo se enfría por radiación', 'no air (vacuum): the motor only cools by radiation');
  const pct = porcentajeAire(amb);
  if (pct < 10) {
    return tr(`aire ${fmtDensidad(rho)} kg/m³ (${Math.max(1, Math.round(pct))} % de la Tierra): el motor se enfría poco`,
      `air ${fmtDensidad(rho)} kg/m³ (${Math.max(1, Math.round(pct))} % of Earth's): the motor barely cools`);
  }
  return tr(`aire ${fmtDensidad(rho)} kg/m³: enfría bien el motor`, `air ${fmtDensidad(rho)} kg/m³: cools the motor well`);
}

/** Resumen de una línea para las instrucciones: "Marte: −83 a −22 °C · aire 0.016 kg/m³ (1 % de la Tierra): el motor se enfría poco". */
export function resumenAmbiente(amb) {
  if (!amb) return null;
  return `${NOMBRE_MUNDO()[amb.mundo] ?? amb.mundo}: ${textoTemperatura(amb)} · ${textoAire(amb)}`;
}

/** Efecto de las reglas en este nivel (corto): batería útil, motor y luz. */
export function efectosAmbiente(amb) {
  if (!amb) return null;
  const f = factorFrio(amb.temperatura_min_C);
  const partes = [];
  partes.push(f < 1
    ? tr(`batería fría: arranca al ${Math.round(f * 100)} %`, `cold battery: starts at ${Math.round(f * 100)} %`)
    : tr('batería sin pérdida por frío', 'no cold loss in the battery'));
  partes.push(tr(`motor: límite ${REGLAS.motor.limite_C} °C`, `motor: limit ${REGLAS.motor.limite_C} °C`));
  if (amb.luz === 'rasante') partes.push(tr('luz rasante: el panel solar recarga 20 %', 'grazing light: the solar panel recharges 20 %'));
  return partes.join(' · ');
}

/** Línea para el panel de datos (tecla I): datos, efecto (P) y fuentes. */
export function notaAmbiente(amb) {
  if (!amb) return null;
  const fuentes = (tr(amb.fuentes, amb.fuentes_en) ?? amb.fuentes ?? []).join('; ');
  return tr(`Ambiente: ${resumenAmbiente(amb)}. Reglas (P): ${efectosAmbiente(amb)}. Fuente: ${fuentes}.`,
    `Environment: ${resumenAmbiente(amb)}. Rules (P): ${efectosAmbiente(amb)}. Source: ${fuentes}.`);
}

/**
 * Líneas para el Expediente (ficha del sitio): condiciones reales del lugar y qué hacen en el juego.
 * @returns {string[]}
 */
export function lineasAmbiente(amb) {
  if (!amb) return [];
  const lineas = [];
  const ext = amb.extremos_C
    ? tr(` (extremos ${num(amb.extremos_C[0], 1)} / ${num(amb.extremos_C[1], 1)} °C)`, ` (extremes ${num(amb.extremos_C[0], 1)} / ${num(amb.extremos_C[1], 1)} °C)`)
    : '';
  lineas.push(`${tr('Temperatura', 'Temperature')}: ${textoTemperatura(amb)}${ext}`);
  const p = amb.presion_kPa;
  const presion = p == null ? tr('sin dato', 'no data') : p < 1e-6 ? tr('~0 (vacío)', '~0 (vacuum)') : `${p < 10 ? p.toFixed(3) : p.toFixed(1)} kPa`;
  const rho = amb.densidad_aire_kg_m3;
  const aire = rho == null ? tr('sin dato', 'no data')
    : rho === 0 ? tr('sin aire: el motor solo se enfría por radiación', 'no air: the motor only cools by radiation')
      : tr(`aire ${fmtDensidad(rho)} kg/m³ (${Math.max(1, Math.round(porcentajeAire(amb)))} % del de la Tierra a nivel del mar)`,
        `air ${fmtDensidad(rho)} kg/m³ (${Math.max(1, Math.round(porcentajeAire(amb)))} % of Earth's at sea level)`);
  lineas.push(`${tr('Presión', 'Pressure')}: ${presion} · ${aire}`);
  lineas.push(`${tr('Luz', 'Light')}: ${amb.luz === 'rasante'
    ? tr('rasante (Sol casi en el horizonte)', 'grazing (Sun almost on the horizon)')
    : tr('directa', 'direct')} · ${tr('panel solar al', 'solar panel at')} ${Math.round(factorLuz(amb) * 100)} %`);
  lineas.push(`${tr('En el juego (P)', 'In the game (P)')}: ${efectosAmbiente(amb)}`);
  const nota = tr(amb.nota, amb.nota_en);
  if (nota) lineas.push(nota);
  lineas.push(`${tr('Fuente', 'Source')}: ${(tr(amb.fuentes, amb.fuentes_en) ?? []).join('; ')}`);
  return lineas;
}
