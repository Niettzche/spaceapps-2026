// Pruebas de las funciones puras del frente juego. Correr: node game/src/fisica/fisica.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolverDiseno, DISENO_POR_DEFECTO, RANURAS, RANURAS_OBLIGATORIAS, RUEDAS_POR_RANURA } from './diseno.js';
import * as taller from '../scenes/Taller/diseno.js';
import {
  SUPERFICIES, generarPerfil, perfilDesdeElevaciones, perfilDeSitio, perfilDeDestino, ventanaCritica, transectoEnSentido, metricasVentana, VENTANAS_JUEGO,
  superficieEn, alturaEn, pendienteMaxima, PLANO_FINAL_M,
} from './perfil.js';
import { danioCarga, danioChasis } from './danio.js';
import { gastoPorSegundo } from './energia.js';
import { puntuar } from '../feedback/puntuacion.js';
import { recomendar } from '../feedback/reglas.js';
import { setIdioma } from '../i18n.js';

// Las aserciones de texto están en español; en Node el idioma por defecto sale de navigator (puede ser 'en').
setIdioma('es');

const piezas = JSON.parse(readFileSync(new URL('../content/parts.json', import.meta.url)));
let n = 0;
const caso = (nombre, fn) => { fn(); n++; console.log('✓', nombre); };

caso('diseño por defecto cuesta 730 (ruedas × 2)', () => assert.equal(resolverDiseno(DISENO_POR_DEFECTO, piezas).costo, 730));
caso('ranura vacía se completa y se reporta', () => {
  const r = resolverDiseno([{ ranura: 'chasis', pieza: 'chasis_reforzado' }], piezas);
  assert.equal(r.porRanura.chasis.id, 'chasis_reforzado');
  assert.ok(r.completadas.includes('motor'));
});
caso('fuente única: ranuras, obligatorias, × 2 y diseño por defecto = los del taller', () => {
  assert.deepEqual(Object.keys(RANURAS), taller.RANURAS.map((r) => r.id));
  for (const r of taller.RANURAS) assert.equal(RANURAS[r.id], r.sistema);
  assert.deepEqual(RANURAS_OBLIGATORIAS, taller.RANURAS.filter((r) => r.obligatoria).map((r) => r.id));
  assert.equal(RUEDAS_POR_RANURA, 2);
  assert.equal(DISENO_POR_DEFECTO, taller.DISENO_POR_DEFECTO);
});
caso('costo y masa coinciden con el resumen del taller (masa por defecto 59)', () => {
  assert.equal(resolverDiseno(DISENO_POR_DEFECTO, piezas).masa, 59);
  const d = DISENO_POR_DEFECTO.map((x) => (x.ranura === 'rueda_del' ? { ...x, pieza: 'rueda_ancha' } : x)).concat({ ranura: 'modulo', pieza: 'panel_solar' });
  const r = resolverDiseno(d, piezas);
  const t = taller.resumen(d, piezas);
  assert.equal(r.costo, t.costo);
  assert.equal(r.masa, t.masa);
});
caso('atributos que lee robot.js existen en parts.json', () => {
  const tiene = (sistema, campos) => piezas.filter((p) => p.sistema === sistema).forEach((p) => campos.forEach((c) => assert.equal(typeof p[c], 'number', `${p.id}.${c}`)));
  tiene('movilidad', ['masa', 'radio_m']);
  for (const p of piezas.filter((x) => x.sistema === 'movilidad')) for (const s of SUPERFICIES) assert.equal(typeof p.agarre[s], 'number', `${p.id}.agarre.${s}`);
  tiene('estructura', ['masa', 'resistencia']);
  tiene('potencia', ['masa', 'fuerza', 'consumo']);
  tiene('energia', ['masa', 'capacidad']);
  tiene('carga', ['masa', 'proteccion']);
});
caso('pieza en ranura equivocada es inválida', () => assert.equal(resolverDiseno([{ ranura: 'motor', pieza: 'rueda_ancha' }], piezas).invalidas.length, 1));
caso('perfil generado es determinista', () => assert.deepEqual(generarPerfil({ tipo: 'dunas', semilla: 7 }).y_m, generarPerfil({ tipo: 'dunas', semilla: 7 }).y_m));
caso('dunas: cara empinada > 25° (separa rueda estándar de ancha)', () => assert.ok(pendienteMaxima(generarPerfil({ tipo: 'dunas', semilla: 3 })) > 25));
caso('perfil real: paso, exageración y planos de inicio/fin', () => {
  const p = perfilDesdeElevaciones([100, 110, 105], { paso_m: 10, exageracion: 2, fuente: 'test' });
  assert.equal(p.ilustrativo, false);
  assert.equal(alturaEn(p, 18 + 10), 20);
  assert.equal(superficieEn(p, 1), 'compacto');
});
caso('nivel con formato de niveles.json (superficie_tramos, desde_m)', () => {
  const p = perfilDeSitio({ id: 'x', nivel: { perfil_elevacion_m: [0, 1, 2, 3], paso_m: 30, superficie_tramos: [{ desde_m: 0, hasta_m: 60, tipo: 'roca' }, { desde_m: 60, hasta_m: 90, tipo: 'arena' }] } });
  assert.equal(p.ilustrativo, false);
  assert.equal(superficieEn(p, 18 + 10), 'roca');
  assert.equal(superficieEn(p, 18 + 70), 'arena');
});
caso('transecto largo: ventana real de 250 m sin deformar', () => {
  const elev = Array.from({ length: 101 }, (_, i) => Math.sin(i / 5) * 3);
  const p = perfilDesdeElevaciones(elev, { paso_m: 30 });
  assert.equal(p.ventana.hasta_m - p.ventana.desde_m, 250);
  assert.match(p.nota, /tramo real de 250 m/);
});
caso('caras de duna recreadas solo en arena y declaradas', () => {
  const elev = Array.from({ length: 101 }, () => 0);
  const arena = perfilDesdeElevaciones(elev, { paso_m: 30, superficies: [{ desde: 0, hasta: 3000, tipo: 'arena' }], dunasRecreadas: true });
  const roca = perfilDesdeElevaciones(elev, { paso_m: 30, superficies: [{ desde: 0, hasta: 3000, tipo: 'roca' }], dunasRecreadas: true });
  assert.ok(pendienteMaxima(arena) > 28 && arena.recreacion.length === 1 && /recreadas/.test(arena.nota));
  assert.ok(pendienteMaxima(roca) < 1 && roca.recreacion.length === 0);
});
// Cráter sintético de 30 m por punto: llano, pared oeste que baja (20° ×8, con un escalón de 45°), fondo, pared este de 45° ×6, llano.
const crater = (() => {
  const grados = [0, 0, 0, 0, 0, 0, 0, 0, -45, -20, -20, -20, -20, -20, -20, -20, -20, 0, 0, 0, 0, 0, 0, 0, 0, 45, 45, 45, 45, 45, 45, 0, 0, 0, 0, 0, 0, 0, 0];
  const elev = [0];
  for (const g of grados) elev.push(elev.at(-1) + 30 * Math.tan((g * Math.PI) / 180));
  return { elev, total: 30 * grados.length };
})();
caso('ventana crítica: sale del cráter por la pared transitable, recorriendo el transecto al revés', () => {
  const sup = [{ desde: 0, hasta: crater.total, tipo: 'arena' }];
  const v = ventanaCritica(crater.elev, 30, sup, { largo: 250 });
  assert.equal(v.sentido, 'vuelta'); // en los datos la pared oeste es bajada; para subirla hay que ir de este a oeste
  assert.ok(v.transitable && v.max_subida <= 30 && v.max_bajada <= 30);
  assert.ok(v.desde_m >= 270 && v.hasta_m <= 510 + 250, `${v.desde_m}-${v.hasta_m}`);
  assert.ok(Math.abs(v.subida_m - 8 * 30 * Math.tan((20 * Math.PI) / 180)) < 1e-6, `${v.subida_m}`); // las 8 rampas de 20°
  // Con un límite de 50° gana la pared este (más metros de subida), en el sentido de los datos.
  const empinada = ventanaCritica(crater.elev, 30, sup, { largo: 250, maxSubida: 50, maxBajada: 50 });
  assert.equal(empinada.sentido, 'ida');
  assert.ok(empinada.max_subida > 44);
});
caso('ventana crítica: la superficie difícil suma criticidad', () => {
  // Dos subidas iguales de 10°; la segunda es roca. Con superficie difícil = roca gana la segunda; con arena, la primera.
  const grados = [...Array(9).fill(10), ...Array(9).fill(0), ...Array(9).fill(10)];
  const elev = [0];
  for (const g of grados) elev.push(elev.at(-1) + 30 * Math.tan((g * Math.PI) / 180));
  const sup = [{ desde: 0, hasta: 540, tipo: 'arena' }, { desde: 540, hasta: 810, tipo: 'roca' }];
  assert.ok(ventanaCritica(elev, 30, sup, { largo: 250, superficieDificil: 'roca' }).desde_m >= 540);
  assert.ok(ventanaCritica(elev, 30, sup, { largo: 250, superficieDificil: 'arena' }).hasta_m <= 280);
});
caso('transecto en sentido inverso: elevaciones y superficies espejadas', () => {
  const o = transectoEnSentido([0, 1, 5], 10, [{ desde: 0, hasta: 5, tipo: 'roca' }, { desde: 5, hasta: 20, tipo: 'arena' }], 'vuelta');
  assert.deepEqual(o.elevaciones, [5, 1, 0]);
  assert.deepEqual(o.superficies, [{ desde: 0, hasta: 15, tipo: 'arena' }, { desde: 15, hasta: 20, tipo: 'roca' }]);
  const m = metricasVentana([0, 10, 0], 10, 0, 20, [{ desde: 0, hasta: 20, tipo: 'roca' }], 'roca');
  assert.ok(Math.abs(m.subida_m - 10) < 1e-9 && Math.abs(m.bajada_m - 10) < 1e-9 && Math.abs(m.max_subida - 45) < 1e-9 && m.fraccion_dificil === 1);
});
caso('perfil con ventana fija en sentido inverso: sube, se declara y no recrea dunas en una pared', () => {
  const sup = [{ desde: 0, hasta: crater.total, tipo: 'arena' }];
  const p = perfilDesdeElevaciones(crater.elev, { paso_m: 30, superficies: sup, ventana: { desde_m: 270, hasta_m: 510, sentido: 'vuelta' }, dunasRecreadas: true, descripcion: ['salida del cráter', 'out of the crater'] });
  assert.equal(p.ventana.sentido, 'vuelta');
  assert.equal(p.largo_m, 18 + 240 + PLANO_FINAL_M);
  assert.ok(p.y_m.at(-1) - p.y_m[0] > 80, 'el tramo sube');
  assert.match(p.nota, /del m 510 al m 270, sentido inverso del transecto\) de un transecto de 1\.2 km, sube 87 m, pendiente máx\. 20° de subida: salida del cráter/);
  assert.ok(pendienteMaxima(p) < 21, `sin caras de duna sobre la pared de 20°: ${pendienteMaxima(p)}`);
});
caso('niveles reales: ventana fija de VENTANAS_JUEGO, sin paredes de más de 33° en el DEM', () => {
  const leer = (ruta) => JSON.parse(readFileSync(new URL(`../../../data/${ruta}.json`, import.meta.url)));
  const esperado = { mx0207: 'ida', g00281: 'vuelta', samalayuca: 'vuelta', pinacate: 'vuelta', polo_sur_lunar: 'ida', jezero: 'vuelta' };
  for (const [id, sentido] of Object.entries(esperado)) {
    const datos = ['jezero', 'polo_sur_lunar'].includes(id) ? leer(`targets/${id}`) : leer(`sites/${id}`);
    const p = datos.mundo ? perfilDeDestino(datos) : perfilDeSitio(datos);
    const v = VENTANAS_JUEGO[id];
    assert.equal(p.ventana.sentido, sentido, id);
    assert.equal(p.ventana.desde_m, v.desde_m, id);
    assert.equal(p.ventana.hasta_m, v.hasta_m, id);
    assert.ok(p.ventana.pendiente_max_subida <= 33, `${id}: ${p.ventana.pendiente_max_subida}`);
    assert.ok(p.ventana.subida_m > 10, `${id}: sube ${p.ventana.subida_m}`);
    assert.match(p.nota, new RegExp(`sube ${Math.round(p.ventana.subida_m)} m`));
  }
  // Si el transecto de los datos cambia de largo, la ventana fija no se usa (se cae a la regla general).
  const mina = leer('sites/mx0207');
  const corto = perfilDeSitio({ ...mina, nivel: { ...mina.nivel, perfil_elevacion_m: mina.nivel.perfil_elevacion_m.slice(0, 80) } });
  assert.notEqual(corto.ventana.desde_m, VENTANAS_JUEGO.mx0207.desde_m);
  assert.equal(corto.ventana.pieza_clave, null);
});
caso('misión ilustrativa: arena, inclinación media = pendiente típica del destino, sin paredes de más de 25°', () => {
  for (const [mundo, g] of [['luna', 8.63], ['marte', 3.56]]) {
    const p = perfilDeDestino({ id: mundo, mundo, variables: { pendiente: { valor: g, fuente: 'test' } } });
    const jugable = p.largo_m - 18 - 30;
    const subidaMedia = (Math.atan2(p.y_m.at(-1) - p.y_m[0], jugable) * 180) / Math.PI;
    assert.ok(p.ilustrativo && Math.abs(subidaMedia - g) < 1, `${mundo}: ${subidaMedia}`);
    assert.ok(pendienteMaxima(p) < 25, `${mundo}: ${pendienteMaxima(p)}`);
    assert.equal(superficieEn(p, 30), 'arena');
    assert.match(p.nota, /pendiente típica medida/);
  }
});
caso('daño: bajo el umbral no daña; protección reduce', () => {
  assert.equal(danioChasis(3), 0);
  assert.ok(danioCarga(4, 0.8) < danioCarga(4, 0.4));
});
caso('energía: detenido no gasta', () => assert.equal(gastoPorSegundo({ consumo: 1 }, 80, 0), 0));
caso('puntuación: máximo 1000, sin entrega 0', () => {
  assert.equal(puntuar({ entrega: true, integridad_carga: 1, energia_restante: 1, costo: 0 }, 1000).total, 1000);
  assert.equal(puntuar({ entrega: false, integridad_carga: 1, energia_restante: 1, costo: 0 }, 1000).total, 0);
});
caso('feedback: patinaje en arena con rueda estándar → rueda ancha', () => {
  const recs = recomendar({ eventos: [{ t: 1, tipo: 'patinaje', detalle: 'arena' }], diseno: DISENO_POR_DEFECTO, integridad_carga: 1 });
  assert.equal(recs[0].id, 'rueda_ancha');
});
caso('feedback: no recomienda lo que ya tiene', () => {
  const d = DISENO_POR_DEFECTO.map((x) => (x.ranura.startsWith('rueda') ? { ...x, pieza: 'rueda_ancha' } : x));
  assert.equal(recomendar({ eventos: [{ t: 1, tipo: 'patinaje', detalle: 'arena' }], diseno: d, integridad_carga: 1 }).length, 0);
});
console.log(`${n} casos OK`);

// Agarre real del suelo (suelos.js)
import { agarreSuelo, rangoAgarreSuelo, sueloProvisional, notaSuelo, AGARRE_PROVISIONAL, USAR_SUELO_TIERRA } from './suelos.js';
caso('suelo: Marte drift tan(18°) ≈ 0.325; roca de Marte con tope 1; sin dato = provisional (P)', () => {
  assert.ok(Math.abs(agarreSuelo('marte', 'arena') - Math.tan((18 * Math.PI) / 180)) < 1e-9);
  assert.equal(agarreSuelo('marte', 'roca'), 1);
  const [a, b] = rangoAgarreSuelo('luna', 'arena');
  assert.ok(a > 0.57 && b < 1.2);
  assert.equal(agarreSuelo('tierra', 'roca'), AGARRE_PROVISIONAL);
  assert.equal(sueloProvisional('tierra', 'compacto'), true);
  assert.equal(sueloProvisional('luna', 'roca'), true);
});
caso('suelo: arena de duna de la Tierra = tan(31°) con fuente (BM-004), o provisional si se desactiva', () => {
  if (USAR_SUELO_TIERRA) {
    assert.ok(Math.abs(agarreSuelo('tierra', 'arena') - Math.tan((31 * Math.PI) / 180)) < 1e-9); // ≈ 0.601
    assert.equal(sueloProvisional('tierra', 'arena'), false);
  } else {
    assert.equal(agarreSuelo('tierra', 'arena'), AGARRE_PROVISIONAL);
  }
  const nota = notaSuelo('tierra', [{ tipo: 'arena' }, { tipo: 'roca' }]);
  assert.ok(nota.includes('roca: agarre provisional (P)'));
  assert.equal(notaSuelo('tierra', []), null);
});
console.log(`${n} casos OK (con suelos)`);

// Dónde se rompe la analogía (feedback/analogia.js)
import { compararAnalogia } from '../feedback/analogia.js';
caso('analogía: gravedad, patinaje y límites del destino', () => {
  const prueba = { resultado: { distancia_m: 250, energia_restante: 0.4, eventos: [{ t: 1, tipo: 'patinaje', detalle: 'arena' }] } };
  const mision = { resultado: { distancia_m: 250, energia_restante: 0.2, eventos: [{ t: 1, tipo: 'patinaje' }, { t: 4, tipo: 'patinaje' }] } };
  const luna = { mundo: 'luna', gravedad_ms2: 1.62, no_reproducible_en_tierra: ['gravedad', 'vacio', 'radiacion'] };
  const l = compararAnalogia(prueba, mision, luna);
  assert.ok(l[0].includes('1.62') && l.some((x) => x.includes('1 momentos en la prueba, 2 en la misión')));
  assert.ok(l.some((x) => x.includes('vacío, radiación')) && l.some((x) => x.includes('regolito')));
  assert.ok(compararAnalogia(null, mision, luna).some((x) => x.includes('Sin una prueba')));
});
console.log(`${n} casos OK (con analogía)`);

// Textos en inglés (i18n.js): mismas funciones, idioma cambiado al llamarlas.
caso('inglés: analogía, recomendaciones y notas de perfil y suelo', () => {
  setIdioma('en');
  try {
    const prueba = { resultado: { distancia_m: 250, energia_restante: 0.4, eventos: [{ t: 1, tipo: 'patinaje', detalle: 'arena' }] } };
    const mision = { resultado: { distancia_m: 250, energia_restante: 0.2, eventos: [{ t: 1, tipo: 'patinaje' }, { t: 4, tipo: 'patinaje' }] } };
    const luna = { mundo: 'luna', gravedad_ms2: 1.62, no_reproducible_en_tierra: ['gravedad', 'vacio', 'radiacion'] };
    const l = compararAnalogia(prueba, mision, luna);
    assert.match(l[0], /^Gravity: Earth 9\.81 → destination 1\.62 m\/s²/);
    assert.ok(l.some((x) => x.includes('1 moments in the test, 2 in the mission')));
    assert.ok(l.some((x) => x.includes('vacuum, radiation')) && l.some((x) => x.includes('loose regolith')));
    const recs = recomendar({ eventos: [{ t: 1, tipo: 'patinaje', detalle: 'arena' }, { t: 2, tipo: 'patinaje', detalle: 'arena' }], diseno: DISENO_POR_DEFECTO, integridad_carga: 1 });
    assert.equal(recs[0].texto, 'Switch to wide sand wheels.');
    assert.equal(recs[0].evidencia, 'Your wheels slipped 2 times on sand.');
    const elev = Array.from({ length: 101 }, () => 0);
    const p = perfilDesdeElevaciones(elev, { paso_m: 30, superficies: [{ desde: 0, hasta: 3000, tipo: 'arena' }], dunasRecreadas: true, fuente: 'DEM, muestreo a 30 m; rumbo 90°' });
    assert.match(p.nota, /^Measured profile \(DEM, sampled at 30 m; bearing 90°\) · real 250 m stretch \(from m \d+ to m \d+\) of a 3\.0 km transect, climbs 0 m, max 0° uphill · /);
    assert.ok(p.nota.includes('recreated dune faces') && p.nota.endsWith('flat start and finish = recreation'));
    assert.match(generarPerfil({ tipo: 'dunas' }).nota, /^Illustrative generated terrain \(dunes\)/);
    const suelo = notaSuelo('tierra', [{ tipo: 'arena' }, { tipo: 'roca' }]);
    assert.ok(suelo.startsWith('Soil: sand') && suelo.endsWith(' · rock: provisional grip (P)'));
  } finally {
    setIdioma('es');
  }
});
console.log(`${n} casos OK (con inglés)`);

// Estadísticas del recorrido (fisica/estadisticas.js)
import { estadisticasNivel } from './estadisticas.js';
caso('estadísticas: subida, bajada y condición crítica de un perfil simple', () => {
  const p = perfilDesdeElevaciones([0, 0, 10, 10, 0], { paso_m: 20, superficies: [{ desde: 0, hasta: 80, tipo: 'roca' }] });
  const e = estadisticasNivel(p);
  assert.ok(Math.abs(e.subida_m - 10) < 0.5 && Math.abs(e.bajada_m - 10) < 0.5);
  assert.ok(e.pendMaxSubida > 20 && e.critica.sentido === 'subida' && e.critica.superficie === 'roca');
});
console.log(`${n} casos OK (con estadísticas)`);

// Ambiente (fisica/ambiente.js) y obstáculos recreados (fisica/obstaculos.js). Ver ESPECIFICACION §5b.
import {
  ambienteDe, ambienteDeSitio, ambienteDeDestino, factorFrio, temperaturaEquilibrio, pasoTemperaturaMotor, potenciaPermitida,
  enfriamientoMotor, factorLuz, recargaPanel, lineasAmbiente, resumenAmbiente, REGLAS, DENSIDAD_AIRE_TIERRA,
} from './ambiente.js';
import { generarObstaculos, factorAgarreEn, notaObstaculos, REGLAS_OBSTACULOS } from './obstaculos.js';
caso('ambiente: datos con fuente de los 4 sitios jugables y los 2 destinos', () => {
  const sama = ambienteDeSitio('samalayuca');
  // Fuente única: docs/taller/AMBIENTE.md (NASA POWER; densidad derivada).
  assert.deepEqual([sama.temperatura_min_C, sama.temperatura_max_C, sama.temperatura_media_C], [0.3, 36.2, 17.9]);
  assert.deepEqual(sama.extremos_C, [-14.5, 42.4]);
  assert.equal(sama.presion_kPa, 87.31);
  assert.equal(sama.densidad_aire_kg_m3, 1.045);
  // Comprobación de la densidad derivada: gas ideal con PS y T2M (R = 287.05 J/kg·K).
  assert.ok(Math.abs(87310 / (287.05 * (17.9 + 273.15)) - sama.densidad_aire_kg_m3) < 0.002);
  for (const id of ['samalayuca', 'pinacate', 'mx0207', 'g00281']) {
    const a = ambienteDeSitio(id);
    assert.ok(a.fuentes[0].startsWith('docs/taller/AMBIENTE.md') && a.fuentes[0].includes('NASA POWER') && !a.referencia, id);
    assert.ok(a.densidad_aire_kg_m3 > 0.9 && a.densidad_aire_kg_m3 < 1.2, id);
  }
  const jez = ambienteDeDestino('jezero', 'marte');
  assert.deepEqual([jez.temperatura_min_C, jez.temperatura_max_C, jez.temperatura_media_C, jez.presion_kPa, jez.densidad_aire_kg_m3], [-83, -22, -55, 0.718, 0.017]);
  const luna = ambienteDeDestino('polo_sur_lunar', 'luna');
  assert.equal(luna.densidad_aire_kg_m3, 0);
  assert.equal(luna.luz, 'rasante');
  assert.equal(luna.temperatura_max_C, null); // sin dato de máxima en la ruta: null, no se inventa
  assert.deepEqual([luna.temperatura_min_C, luna.temperatura_sombra_C], [-53, -248]); // la misión usa el borde iluminado
  // Sin dato del sitio → referencia de la Tierra declarada.
  const otro = ambienteDeSitio('mx0000');
  assert.ok(otro.referencia && otro.densidad_aire_kg_m3 === DENSIDAD_AIRE_TIERRA);
  assert.equal(ambienteDe({ modo: 'prueba', mundo: 'tierra', sitioId: 'pinacate' }).id, 'pinacate');
  assert.equal(ambienteDe({ modo: 'mision', mundo: 'marte', destinoId: 'jezero' }).id, 'jezero');
});
caso('ambiente: batería fría (−0.03 %/°C bajo 0 °C, piso 97 %)', () => {
  assert.equal(factorFrio(15), 1);
  assert.equal(factorFrio(0), 1);
  assert.ok(Math.abs(factorFrio(-53) - 0.9841) < 1e-9); // Luna, borde iluminado
  assert.ok(Math.abs(factorFrio(-83) - 0.9751) < 1e-9); // Marte (dos soles de MEDA)
  assert.equal(factorFrio(-200), REGLAS.frio.piso); // muy frío → piso 97 %
  assert.equal(factorFrio(null), 1);
  for (const id of ['samalayuca', 'pinacate', 'mx0207', 'g00281']) assert.equal(factorFrio(ambienteDeSitio(id).temperatura_min_C), 1, id);
});
caso('ambiente: el aire enfría el motor (Tierra) y su falta no (Marte, Luna)', () => {
  const eficiente = piezas.find((p) => p.id === 'motor_eficiente');
  const potente = piezas.find((p) => p.id === 'motor_potente');
  const sitios = ['samalayuca', 'pinacate', 'mx0207', 'g00281'].map(ambienteDeSitio);
  // En la Tierra, ni el motor potente a fondo llega al límite.
  for (const a of sitios) assert.ok(temperaturaEquilibrio(1, potente.consumo, a) < REGLAS.motor.limite_C, a.id);
  const jez = ambienteDeDestino('jezero', 'marte');
  const luna = ambienteDeDestino('polo_sur_lunar', 'luna');
  assert.ok(enfriamientoMotor(sitios[0]) > 10 * enfriamientoMotor(jez));
  assert.ok(enfriamientoMotor(jez) > enfriamientoMotor(luna) && enfriamientoMotor(luna) === REGLAS.motor.radiacion);
  for (const a of [jez, luna]) assert.ok(temperaturaEquilibrio(1, eficiente.consumo, a) > REGLAS.motor.limite_C, a.id);
  // Paso de tiempo: a fondo en la Luna, el motor eficiente pasa el límite en ~1 min; el potente, en menos de la mitad.
  const tiempoAlLimite = (motor) => {
    let T = -53;
    for (let t = 0; t < 600; t += 0.1) {
      T = pasoTemperaturaMotor(T, { a: 1, consumo: motor.consumo, dt: 0.1, amb: luna });
      if (T >= REGLAS.motor.limite_C) return t;
    }
    return Infinity;
  };
  const te = tiempoAlLimite(eficiente);
  const tp = tiempoAlLimite(potente);
  assert.ok(te > 50 && te < 90, `eficiente ${te}`);
  assert.ok(tp < te / 2, `potente ${tp}`);
  // Sobrecalentado: solo la potencia que el ambiente alcanza a enfriar (con mínimo).
  assert.equal(potenciaPermitida(50, eficiente.consumo, luna), 1);
  const pl = potenciaPermitida(100, eficiente.consumo, luna);
  assert.ok(pl >= REGLAS.motor.potencia_minima && pl < 0.5);
  assert.equal(potenciaPermitida(100, eficiente.consumo, sitios[0]), 1);
});
caso('ambiente: luz rasante reduce la recarga del panel solar', () => {
  const panel = piezas.find((p) => p.id === 'panel_solar');
  const luna = ambienteDeDestino('polo_sur_lunar', 'luna');
  const tierra = ambienteDeSitio('samalayuca');
  assert.equal(factorLuz(tierra), 1);
  assert.equal(factorLuz(luna), REGLAS.luz.rasante);
  assert.ok(Math.abs(factorLuz(ambienteDeDestino('jezero', 'marte')) - 0.431) < 1e-9);
  assert.ok(recargaPanel(panel, luna) < recargaPanel(panel, tierra) / 4);
  assert.equal(recargaPanel(null, tierra), 0);
});
caso('ambiente: textos bilingües para el Expediente y las instrucciones', () => {
  const jez = ambienteDeDestino('jezero', 'marte');
  assert.equal(resumenAmbiente(jez), 'Marte: −83 a −22 °C (dos soles, MEDA) · aire 0.017 kg/m³ (1 % de la Tierra): el motor se enfría poco');
  const l = lineasAmbiente(ambienteDeDestino('polo_sur_lunar', 'luna'));
  assert.ok(l[0] === 'Temperatura: −53 °C (borde iluminado)' && l.some((x) => x.startsWith('Luz: rasante')) && l.at(-1).startsWith('Fuente: docs/taller/AMBIENTE.md: LRO Diviner'));
  assert.ok(lineasAmbiente(ambienteDeSitio('pinacate'))[0].includes('extremos −4.7 / 48.4 °C'));
  setIdioma('en');
  try {
    assert.ok(resumenAmbiente(jez).startsWith('Mars: −83 to −22 °C (2 sols, MEDA) · air 0.017 kg/m³ (1 % of Earth'));
    assert.ok(lineasAmbiente(jez).at(-1).startsWith('Source: docs/taller/AMBIENTE.md: MEDA'));
  } finally {
    setIdioma('es');
  }
});
caso('obstáculos: deterministas, fuera de los planos y declarados', () => {
  const sama = perfilDeSitio(JSON.parse(readFileSync(new URL('../../../data/sites/samalayuca.json', import.meta.url))));
  const a = generarObstaculos(sama, { mundo: 'tierra', semilla: 'samalayuca' });
  assert.deepEqual(a, generarObstaculos(sama, { mundo: 'tierra', semilla: 'samalayuca' }));
  assert.ok(a.length > 0 && a.every((o) => o.recreacion && o.tipo === 'arena_blanda')); // todo arena: solo arena blanda
  for (const o of a) assert.ok(o.desde_m >= 18 && o.hasta_m <= sama.largo_m - 30);
  assert.equal(factorAgarreEn(a, a[0].desde_m + 1), REGLAS_OBSTACULOS.arenaBlanda.agarre);
  assert.equal(factorAgarreEn(a, 5), 1);
  assert.ok(notaObstaculos(a).startsWith('obstáculos recreados ('));
  for (const id of ['jezero', 'polo_sur_lunar']) {
    const d = JSON.parse(readFileSync(new URL(`../../../data/targets/${id}.json`, import.meta.url)));
    const p = perfilDeDestino(d);
    const rocas = generarObstaculos(p, { mundo: d.mundo, semilla: id });
    assert.ok(rocas.length >= 2 && rocas.length <= 12, `${id}: ${rocas.length}`); // la ventana crítica lunar es una pared: en pendiente fuerte no se ponen rocas
    for (const o of rocas) assert.ok(o.tipo === 'roca' && o.radio_m >= 0.15 && o.radio_m <= 0.3 && o.x_m > 18 && o.x_m < p.largo_m - 30);
  }
  // Pinacate ya trae "bloques de roca recreados" en el perfil: no se duplican.
  const pin = perfilDeSitio(JSON.parse(readFileSync(new URL('../../../data/sites/pinacate.json', import.meta.url))));
  assert.equal(generarObstaculos(pin, { mundo: 'tierra', semilla: 'pinacate' }).filter((o) => o.tipo === 'roca').length, 0);
});
caso('feedback: sobrecalentamiento → línea de analogía y recomendación', () => {
  const ev = (tipo, n = 1) => Array.from({ length: n }, (_, i) => ({ t: i, tipo, detalle: '100 °C' }));
  const prueba = { resultado: { sitio: 'samalayuca', eventos: [], distancia_m: 250, energia_restante: 0.4 } };
  const mision = { resultado: { destino: 'polo_sur_lunar', eventos: ev('sobrecalentamiento', 2), distancia_m: 250, energia_restante: 0.1 } };
  const lineas = compararAnalogia(prueba, mision, { id: 'polo_sur_lunar', mundo: 'luna', gravedad_ms2: 1.62, no_reproducible_en_tierra: [] });
  assert.ok(lineas.some((l) => l.startsWith('El motor se calentó 2 veces en la misión y ninguna en la prueba: el aire de la Tierra (1.045 kg/m³) lo enfría')));
  assert.ok(lineas.some((l) => l.startsWith('Frío: la mínima medida en el destino fue −53 °C (borde iluminado)')));
  // Motor eficiente sin radiador → radiador en el módulo (taller); con radiador → manejar con pausas.
  const recE = recomendar({ eventos: ev('sobrecalentamiento'), diseno: [{ ranura: 'motor', pieza: 'motor_eficiente' }] });
  assert.ok(recE.some((r) => r.id === 'radiador' && r.cambio.ranuras[0] === 'modulo'));
  const recR = recomendar({ eventos: ev('sobrecalentamiento'), diseno: [{ ranura: 'motor', pieza: 'motor_eficiente' }, { ranura: 'modulo', pieza: 'radiador' }] });
  assert.ok(recR.some((r) => r.id === 'pausas_motor'));
  const recP = recomendar({ eventos: ev('sobrecalentamiento'), diseno: [{ ranura: 'motor', pieza: 'motor_potente' }] });
  assert.ok(recP.some((r) => r.id === 'motor_eficiente_calor' && r.cambio.pieza === 'motor_eficiente'));
});
console.log(`${n} casos OK (con ambiente y obstáculos)`);

// Robustez del camino dorado (docs/juego/FISICA_V2.md §5.2): tope de las caras de duna y paso seguro sobre rocas.
import { velocidadPasoRoca, PASO_ROCA } from './danio.js';
caso('caras de duna recreadas: pendiente total ≤ 30° (borde inferior del ángulo de reposo), también sobre una base que sube', () => {
  // Base que sube 8° (≤ pendienteBaseMax 10°): sin el tope, cara + base pasaban de 35°.
  const elev = Array.from({ length: 101 }, (_, i) => i * 30 * Math.tan((8 * Math.PI) / 180));
  const p = perfilDesdeElevaciones(elev, { paso_m: 30, superficies: [{ desde: 0, hasta: 3000, tipo: 'arena' }], dunasRecreadas: true });
  assert.ok(p.recreacion.some((r) => r.tipo === 'cara_duna'), 'hay dunas recreadas');
  assert.ok(pendienteMaxima(p) <= 30.5, `pendiente máxima ${pendienteMaxima(p)}`);
  for (const id of ['samalayuca']) { // todo arena (g00263 tiene además paredes de roca con bloques recreados)
    const s = perfilDeSitio(JSON.parse(readFileSync(new URL(`../../../data/sites/${id}.json`, import.meta.url))));
    assert.ok(pendienteMaxima(s) <= 30.5, `${id}: ${pendienteMaxima(s)}`);
  }
});
caso('paso seguro sobre roca (misión): crece con √g y con la pared del soporte; Marte ≈ 2.9 m/s con soporte básico', () => {
  const marte = velocidadPasoRoca({ g: 3.71, radio_m: 0.5, alto_m: 0.24, pared_m: 0.25 });
  assert.ok(marte > 2.7 && marte < 3.1, `Marte ${marte}`);
  const luna = velocidadPasoRoca({ g: 1.62, radio_m: 0.5, alto_m: 0.24, pared_m: 0.25 });
  assert.ok(Math.abs(luna / marte - Math.sqrt(1.62 / 3.71)) < 1e-9, 'escala con √g');
  assert.ok(velocidadPasoRoca({ g: 3.71, radio_m: 0.5, alto_m: 0.24, pared_m: 0.45 }) > marte, 'soporte más alto = más rápido');
  assert.ok(velocidadPasoRoca({ g: 3.71, radio_m: 0.5, alto_m: 0.1, pared_m: 0.25 }) > marte, 'roca más baja = más rápido');
  assert.equal(PASO_ROCA.k, 1.5);
});
console.log(`${n} casos OK (con robustez)`);
