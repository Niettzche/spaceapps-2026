// Ambiente de cada nivel (temperatura, aire, luz) con DATOS REALES y fuente, y las reglas de juego (P) que lo usan.
// Ver docs/juego/ESPECIFICACION.md §5b. AGENTS.md §5: temperatura y presión entran SOLO con una regla implementada y explicable:
//   a) Frío → batería: una batería fría entrega menos energía (la partida arranca con menos carga útil).
//   b) Calor del motor ↔ aire: el motor se calienta al acelerar y el aire lo enfría; sin aire (Luna) solo se enfría por
//      radiación. Si pasa del límite, el motor solo entrega la potencia que el ambiente alcanza a enfriar.
//   c) Luz: el panel solar recarga según la luz del lugar; con luz rasante (polo sur lunar) recarga mucho menos.
// Los VALORES DE DATOS salen de una sola tabla: docs/taller/AMBIENTE.md (frente taller; hoja "Ambiente" del libro
// docs/taller/Space_Apps_Game_Data.xlsx, filas AM-001…AM-037), que cita la fuente original de cada fila. Los de las reglas son (P).
// Sin dato → null + nota (nunca se inventa).

import { tr } from '../i18n.js';

// Densidad del aire de la Tierra a nivel del mar: 1.217 kg/m³ (WX-002, NSSDCA Earth Fact Sheet, S03). Es la referencia "1 ×".
export const DENSIDAD_AIRE_TIERRA = 1.217;

const TABLA = 'docs/taller/AMBIENTE.md';
const POWER_ES = 'NASA POWER (S75 datos diarios 2015–2024: típicas; S74 climatología 2001–2025: extremos, media, PS); densidad derivada (gas ideal)';
const POWER_EN = 'NASA POWER (S75 daily data 2015–2024: typical; S74 climatology 2001–2025: extremes, mean, PS); density derived (ideal gas)';

/**
 * Sitios jugables, copiados de docs/taller/AMBIENTE.md (valores de la celda de NASA POWER, no del punto exacto).
 * min/max = típicas (mín. diaria media del mes más frío / máx. diaria media del mes más caluroso); ext = extremas;
 * media = T2M; ps = presión superficial (kPa); rho = densidad del aire derivada (kg/m³).
 */
export const CLIMA_SITIOS = {
  samalayuca: { min: 0.3, max: 36.2, ext: [-14.5, 42.4], media: 17.9, ps: 87.31, rho: 1.045 },
  pinacate: { min: 7.1, max: 39.7, ext: [-4.7, 48.4], media: 22.3, ps: 96.96, rho: 1.143 },
  mx0207: { min: 4.5, max: 30.3, ext: [-7.0, 35.8], media: 16.4, ps: 79.01, rho: 0.951 },
  g00281: { min: 9.6, max: 42.1, ext: [0.6, 45.3], media: 25.9, ps: 89.41, rho: 1.042 },
};

/** Destinos, de docs/taller/AMBIENTE.md (+ luz e irradiancia del libro de datos). */
const AMBIENTE_DESTINOS = {
  jezero: {
    mundo: 'marte',
    temperatura_min_C: -83, temperatura_max_C: -22, // muestra de dos soles (43–44), MEDA (S22)
    etiqueta_temp: 'dos soles, MEDA', etiqueta_temp_en: '2 sols, MEDA',
    temperatura_media_C: -55, // MEDA, Rodríguez-Manfredi et al. 2023 (S21; S23)
    presion_kPa: 0.718, // 718 Pa, MEDA (S22)
    densidad_aire_kg_m3: 0.017, // derivada de 718 Pa y −55 °C (CO₂, gas ideal); Mars Fact Sheet: 0.016 ± 0.006
    luz: 'directa',
    irradiancia_rel: 0.431, // WX-007 del libro: 586.2 W/m² en Marte / 1361 en la Tierra (antes del polvo)
    nota: 'Temperaturas de dos soles de primavera, no una climatología anual.',
    nota_en: 'Temperatures from two spring sols, not an annual climatology.',
    fuentes: [`${TABLA}: MEDA/Perseverance (S22, 2021-04-06; S21, S23); densidad derivada`, 'luz: WX-007 (NSSDCA Mars Fact Sheet)'],
    fuentes_en: [`${TABLA}: MEDA/Perseverance (S22, 2021-04-06; S21, S23); density derived`, 'light: WX-007 (NSSDCA Mars Fact Sheet)'],
  },
  polo_sur_lunar: {
    mundo: 'luna',
    // DECISIÓN (juego): la misión usa el borde iluminado (−53 °C, ~220 K casi constante), porque la región candidata de Artemis
    // es iluminada y la ruta va al sol. La sombra permanente (−248 °C) es dato de la tabla pero no está en el recorrido.
    temperatura_min_C: -53, temperatura_max_C: null, temperatura_media_C: -53,
    etiqueta_temp: 'borde iluminado', etiqueta_temp_en: 'sunlit rim',
    temperatura_sombra_C: -248,
    presion_kPa: 3e-13, // 3×10⁻¹⁰ Pa de noche (NASA Moon Fact Sheet, S02)
    densidad_aire_kg_m3: 0, // vacío (S02)
    luz: 'rasante',
    irradiancia_rel: 1, // MN-008: 1361 W/m² (sin atmósfera), pero el Sol va casi al ras del horizonte
    nota: 'Superficie (no hay aire). La misión usa el borde iluminado (−53 °C); las sombras permanentes (−248 °C) no están en la ruta.',
    nota_en: 'Surface (there is no air). The mission uses the sunlit rim (−53 °C); permanent shadows (−248 °C) are not on the route.',
    fuentes: [`${TABLA}: LRO Diviner, UCLA (S07); NASA Moon Fact Sheet (S02)`, 'luz rasante: data/targets/polo_sur_lunar.json (no_reproducible_en_tierra)'],
    fuentes_en: [`${TABLA}: LRO Diviner, UCLA (S07); NASA Moon Fact Sheet (S02)`, 'grazing light: data/targets/polo_sur_lunar.json (no_reproducible_en_tierra)'],
  },
};

/** Respaldo cuando el lugar no está en la tabla (valores globales del libro de datos, declarados). */
const AMBIENTE_MUNDO = {
  marte: { temperatura_min_C: -128, temperatura_max_C: 27, temperatura_media_C: -53, presion_kPa: 0.636, densidad_aire_kg_m3: 0.016, luz: 'directa', irradiancia_rel: 0.431,
    fuentes: ['MR-016, MR-008, MR-010 (NASA JPL / NSSDCA): Marte global'], fuentes_en: ['MR-016, MR-008, MR-010 (NASA JPL / NSSDCA): Mars global'] },
  luna: { temperatura_min_C: -173, temperatura_max_C: 127, presion_kPa: 3e-13, densidad_aire_kg_m3: 0, luz: 'directa', irradiancia_rel: 1,
    fuentes: ['WX-031 (Diviner): ecuador lunar; MN-016 / EQ-010: vacío'], fuentes_en: ['WX-031 (Diviner): lunar equator; MN-016 / EQ-010: vacuum'] },
  // Tierra sin dato del sitio: referencia a nivel del mar (WX-001, WX-002, WX-003).
  tierra: { temperatura_min_C: 10, temperatura_max_C: 20, temperatura_media_C: 15, presion_kPa: 101.4, densidad_aire_kg_m3: DENSIDAD_AIRE_TIERRA, luz: 'directa', irradiancia_rel: 1,
    fuentes: ['WX-001, WX-002, WX-003: NSSDCA Earth Fact Sheet, referencia a nivel del mar (sin dato del sitio)'],
    fuentes_en: ['WX-001, WX-002, WX-003: NSSDCA Earth Fact Sheet, sea-level reference (no site data)'] },
};

/** Ambiente de un sitio terrestre (docs/taller/AMBIENTE.md) o la referencia de la Tierra si no está en la tabla. */
export function ambienteDeSitio(sitioId) {
  const c = CLIMA_SITIOS[sitioId];
  if (!c) {
    return { id: sitioId ?? null, mundo: 'tierra', ...AMBIENTE_MUNDO.tierra, extremos_C: null, referencia: true,
      nota: 'Sin clima del sitio: se usa la referencia de la Tierra a nivel del mar.', nota_en: 'No site climate: Earth sea-level reference is used.' };
  }
  return {
    id: sitioId,
    mundo: 'tierra',
    temperatura_min_C: c.min, // típicas: las que usa la regla del frío
    temperatura_max_C: c.max,
    temperatura_media_C: c.media, // la que usa el motor
    extremos_C: c.ext, // informativos
    presion_kPa: c.ps,
    densidad_aire_kg_m3: c.rho,
    luz: 'directa',
    irradiancia_rel: 1,
    nota: 'Valores de la celda de NASA POWER (~0.5° × 0.625°), no de una estación en el sitio.',
    nota_en: 'Values for the NASA POWER grid cell (~0.5° × 0.625°), not a station at the site.',
    fuentes: [`${TABLA}: ${POWER_ES}`],
    fuentes_en: [`${TABLA}: ${POWER_EN}`],
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
  // a) Frío → batería. Por debajo de 0 °C la capacidad útil baja 0.03 % por °C, con piso de 97 %. (P)
  // Pérdida chica a propósito: los rovers reales calientan sus baterías (el calor del MMRTG mantiene la electrónica
  // entre −40 y +50 °C, ver PIEZAS.md §5), así que el frío cuesta poco. Antes 0.2 %/°C y piso 85 %: dejaba las misiones
  // del camino dorado sin energía a 12 m de la meta. Se usa la temperatura MÍNIMA del nivel.
  frio: { desde_C: 0, perdida_por_C: 0.0003, piso: 0.97 },
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

/** Temperatura del ambiente que ve el motor: la media del lugar (si falta, media de mín. y máx., o la mínima). */
export function temperaturaAmbienteMotor(amb) {
  if (!amb) return 20;
  if (amb.temperatura_media_C != null) return amb.temperatura_media_C;
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
const fmtDensidad = (rho) => (rho === 0 ? '0' : rho.toFixed(3)); // 3 decimales: 1.045, 0.017 (auditoría 2 de Leo)

function textoTemperatura(amb) {
  const { temperatura_min_C: a, temperatura_max_C: b } = amb;
  if (a == null && b == null) return tr('temperatura sin dato', 'temperature: no data');
  const etiqueta = amb.etiqueta_temp ? ` (${tr(amb.etiqueta_temp, amb.etiqueta_temp_en)})` : '';
  if (b == null || a === b) return `${num(a)} °C${etiqueta}`;
  return tr(`${num(a)} a ${num(b)} °C${etiqueta}`, `${num(a)} to ${num(b)} °C${etiqueta}`);
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

/** Resumen de una línea para las instrucciones: "Marte: −83 a −22 °C (dos soles, MEDA) · aire 0.017 kg/m³ (1 % de la Tierra): el motor se enfría poco". */
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
