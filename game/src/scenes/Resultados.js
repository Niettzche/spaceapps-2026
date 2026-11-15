import Phaser from 'phaser';
import { ajustarAncho } from './comun/fuente.js';
import { titulo, nota, irA } from './ui.js';
import * as K from './comun/pixel.js'; // botones, chips, panel e íconos de arte (DISENO.md §2)
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { DESTINOS, PIEZAS } from '../data.js';
import { partida } from '../main.js';
import { recomendar } from '../feedback/reglas.js';
import { diagnosticar } from '../feedback/diagnostico.js';
import { puntuar, ESTRELLAS } from '../feedback/puntuacion.js';
import { compararAnalogia } from '../feedback/analogia.js';
import { exponerParaPruebas } from '../fisica/depuracion.js';
import { sonarBoton } from '../fisica/sonido.js';
import { tr, trDato } from '../i18n.js';
import { personalizacionActual } from './Taller/personalizacion.js'; // nombre del robot (cosmético, frente taller)

// Dueño: frente juego. Resultado de la prueba o la misión: puntuación visible, recomendaciones por reglas y reintentar.
// Ver ESPECIFICACION.md §11–§12.
// Se evalúa al crear la escena (el idioma puede cambiar después de cargar el módulo).
const MOTIVOS = () => tr({
  meta: 'Llegó a la meta con chasis y carga.',
  entrega: 'Entregó el suministro.',
  chasis_destruido: 'El chasis se destruyó.',
  carga_perdida: 'La carga se cayó.',
  volcado: 'El robot volcó.',
  energia_agotada: 'Se acabó la energía.',
  atascado: 'Quedó atascado: no avanzó en 15 s.',
  carga_danada: 'Llegó, pero la carga está por debajo del mínimo.',
  abandono: 'Se abandonó el recorrido.',
  caida: 'El robot se cayó del terreno.',
}, {
  meta: 'Reached the finish with chassis and payload.',
  entrega: 'Delivered the supplies.',
  chasis_destruido: 'The chassis was destroyed.',
  carga_perdida: 'The payload fell off.',
  volcado: 'The robot flipped over.',
  energia_agotada: 'The battery ran out.',
  atascado: 'Got stuck: no progress in 15 s.',
  carga_danada: 'Arrived, but the payload is below the minimum.',
  abandono: 'The run was abandoned.',
  caida: 'The robot fell off the terrain.',
});
// Fuente pixel del juego (comun/fuente.js) en todos los textos: K.txt devuelve BitmapText ×2 o más (respaldo monospace).
const T = (scene, x, y, s, o = {}) => K.txt(scene, x, y, s, { size: 15, color: '#cfd6ff', ...o });

export default class Resultados extends Phaser.Scene {
  constructor() {
    super('Resultados');
    exponerParaPruebas('Resultados', this);
  }

  create() {
    const registro = partida.resultados[partida.resultados.length - 1];
    if (!registro) {
      titulo(this, tr('Resultados', 'Results'), tr('Todavía no hay pruebas ni misiones.', 'No tests or missions yet.'));
      K.boton(this, 480, 440, tr('Menú', 'Menu'), () => irA(this, 'Menu'));
      return;
    }
    const { tipo, exito, motivo, resultado, ilustrativo } = registro;
    const esMision = tipo === 'mision';
    const encabezado = esMision
      ? (exito ? tr('Misión cumplida', 'Mission accomplished') : tr('Misión fallida', 'Mission failed'))
      : (exito ? tr('Prueba superada', 'Test passed') : tr('La prueba falló', 'Test failed'));
    titulo(this, encabezado, MOTIVOS()[motivo] ?? motivo);

    // Datos del intento como chips de dato (cian) en una fila (DISENO.md §2.3: keywords, no frases).
    const carga = Math.round(resultado.integridad_carga * 100);
    const energia = Math.round(resultado.energia_restante * 100);
    const nombreRobot = personalizacionActual().nombre;
    K.filaChips(this, 40, 120, [
      { texto: `${resultado.distancia_m} m`, tipo: 'cian' },
      { texto: tr(`carga ${carga} %`, `payload ${carga} %`), tipo: 'cian' },
      { texto: tr(`energía ${energia} %`, `energy ${energia} %`), tipo: 'cian' },
      { texto: tr(`${resultado.costo} créditos`, `${resultado.costo} credits`), tipo: 'cian' },
      { texto: tr(`intento ${resultado.intentos}`, `attempt ${resultado.intentos}`), tipo: 'cian' },
      ...(nombreRobot ? [{ texto: `«${nombreRobot}»`, color: K.P.texto }] : []),
    ], 630);

    // Columna derecha: puntuación grande con estrellas (misión) y la viñeta del final (Mauricio, #77).
    const COL = 790;
    const p = esMision ? puntuar(resultado, PRESUPUESTO_INICIAL) : null;
    if (esMision) {
      T(this, COL + 4, 136, `${p.total}`, { size: 40, color: '#ffd166', origen: [1, 0.5] });
      T(this, COL + 10, 146, '/ 1000', { size: 18, color: K.P.sec, origen: [0, 0.5] });
      // Estrellas de arte (assets/ui/ui_estrella_*.png, 16 × 16 × 3); si no hay arte, texto ★/☆ (la e2e acepta los dos).
      if (this.textures.exists('ui/ui_estrella_llena') && this.textures.exists('ui/ui_estrella_vacia')) {
        for (let i = 0; i < 3; i++) {
          this.add.image(COL + (i - 1) * 56, 184, i < p.estrellas ? 'ui/ui_estrella_llena' : 'ui/ui_estrella_vacia').setScale(3);
        }
      } else {
        T(this, COL, 184, '★'.repeat(p.estrellas) + '☆'.repeat(3 - p.estrellas), { size: 36, color: '#ffd166', origen: [0.5, 0.5] });
      }
      // Mejor marca por destino (guardada en el navegador) y cuánto falta para la siguiente estrella.
      if (resultado.entrega) {
        const marcas = leerMarcas();
        const previa = marcas[resultado.destino];
        let txt;
        if (previa == null || p.total > previa) {
          marcas[resultado.destino] = p.total;
          guardarMarcas(marcas);
          txt = previa == null ? tr('Primera marca en este destino', 'First record here') : tr(`¡Nueva marca! (antes ${previa})`, `New record! (was ${previa})`);
        } else {
          txt = tr(`Tu marca: ${previa}`, `Your record: ${previa}`);
        }
        const meta = p.estrellas < 2 ? ESTRELLAS.dos : p.estrellas < 3 ? ESTRELLAS.tres : null;
        if (meta) txt += tr(`\nfaltan ${meta - p.total} para ${'★'.repeat(p.estrellas + 1)}`, `\n${meta - p.total} to ${'★'.repeat(p.estrellas + 1)}`);
        T(this, COL, 212, txt, { size: 14, color: '#4cc38a', alinear: 'center', origen: [0.5, 0] });
      }
    }
    const claveVineta = `pantallas/resultado_${motivo}`;
    if (this.textures.exists(claveVineta)) {
      // 96 × 64 de arte: × 2 bajo la puntuación (misión) o × 3 sola (prueba).
      if (esMision) this.add.image(COL, 320, claveVineta).setScale(2);
      else this.add.image(COL, 266, claveVineta).setScale(3);
    }

    // Tarjetas (diagnóstico, consejos, puntuación, dónde se rompe la analogía) en el panel de la izquierda.
    const diagnostico = diagnosticar(registro);
    const recs = recomendar(resultado, motivo);
    this.recs = recs; // para la e2e: las recomendaciones van en tarjetas, no en líneas sueltas
    const paginas = [{
      titulo: exito ? tr('Qué ocurrió · siguiente paso', 'What happened · next step') : tr('Por qué terminó · qué puedes hacer', 'Why it ended · what you can do'),
      texto: diagnostico.detalle,
      evidencia: diagnostico.consejo,
    }, ...recs.map((r) => ({
      titulo: tr('Consejo basado en este intento', 'Advice based on this run'),
      texto: r.texto, evidencia: r.evidencia,
    }))];
    let indiceAnalogia = -1;
    if (esMision) {
      if (resultado.entrega) {
        const d = p.desglose;
        paginas.push({ titulo: tr('Cómo se calculó la puntuación', 'How the score was calculated'),
          texto: tr(`Entrega ${d.entrega} + carga ${d.integridad} + energía ${d.energia} + ahorro ${d.ahorro}`,
            `Delivery ${d.entrega} + payload ${d.integridad} + energy ${d.energia} + savings ${d.ahorro}`),
          evidencia: tr('Valores de juego, no certificación de una misión real.', 'Game values, not certification of a real mission.') });
      }
      const prueba = [...partida.resultados].reverse().find((r) => r.tipo === 'prueba');
      const destino = DESTINOS[resultado.destino] ?? DESTINOS[partida.destino];
      indiceAnalogia = paginas.length;
      for (const l of compararAnalogia(prueba, registro, destino)) paginas.push({
        titulo: tr('Dónde se rompe la analogía', 'Where the analogy breaks down'), texto: l,
      });
    }
    const PX = 40, PY = 156, PW = 590, PH = 226;
    K.panel(this, PX, PY, PW, PH);
    const anchoTexto = PW - 48;
    let pagina = 0;
    const contenido = this.add.container(0, 0);
    const contador = T(this, PX + PW / 2, 402, '', { size: 16, origen: [0.5, 0.5] });
    const mostrar = (indice) => {
      pagina = (indice + paginas.length) % paginas.length;
      contenido.removeAll(true);
      const pg = paginas[pagina];
      const enc = T(this, PX + 24, PY + 16, pg.titulo, { size: 18, color: '#ffffff', ancho: anchoTexto });
      const texto = T(this, PX + 24, enc.y + enc.height + 8, pg.texto, { size: 16, color: '#ffd166', ancho: anchoTexto });
      contenido.add([enc, texto]);
      if (pg.evidencia) {
        // Fuente ×2: si la evidencia no cabe en la tarjeta se recorta con «…» (completa en la página web y el detalle I).
        const ev = T(this, PX + 24, texto.y + texto.height + 8, pg.evidencia, { size: 16, color: '#e1e8f0', ancho: anchoTexto });
        const libre = PY + PH - 10 - ev.y;
        if (ev.height > libre) {
          const lineas = ev.getWrappedText ? ev.getWrappedText(pg.evidencia) : [pg.evidencia];
          const caben = Math.max(1, Math.floor((libre + 2) / 24));
          if (lineas.length > caben) ev.setText(`${lineas.slice(0, caben).join('\n').replace(/\s*\S*$/, '')}…`);
        }
        contenido.add(ev);
      }
      contador.setText(`${pagina + 1} / ${paginas.length}`);
    };
    const nav = { size: 15, alto: 36, reservaFoco: false, color: '#ffffff' };
    K.boton(this, PX, 402, tr('← Consejo anterior', '← Previous advice'), () => mostrar(pagina - 1), { ...nav, origen: [0, 0.5] });
    K.boton(this, PX + PW, 402, tr('Siguiente consejo →', 'Next advice →'), () => mostrar(pagina + 1), { ...nav, origen: [1, 0.5] });
    if (indiceAnalogia >= 0) {
      K.boton(this, COL, 402, tr('A · Límites de la analogía', 'A · Analogy limits'), () => mostrar(indiceAnalogia), { ...nav, size: 14, color: K.P.dato });
    }
    mostrar(0);

    // Botones con atajo de teclado (1, 2, 3) y Enter = siguiente paso sugerido del camino dorado.
    const yb = 490;
    const opciones = esMision
      ? [[tr('Reintentar misión', 'Retry mission'), 'Mision'], [tr('Volver al taller', 'Back to workshop'), 'Taller'], [tr('Menú', 'Menu'), 'Menu']]
      : [[tr('Volver al taller', 'Back to workshop'), 'Taller'], [tr('Probar otra vez', 'Test again'), 'Prueba'],
        [exito ? tr('Lanzar misión', 'Launch mission') : tr('Lanzar misión sin superar', 'Launch mission anyway'), 'Mision']];
    let sugerida = esMision ? (exito ? 2 : 0) : (exito ? 2 : 0);
    // "Aplicar y al taller": la primera recomendación con cambio de pieza se aplica al diseño y se abre el taller.
    const aplicable = recs.find((r) => r.cambio);
    let aplica = null;
    if (aplicable) {
      const pieza = PIEZAS.find((x) => x.id === aplicable.cambio.pieza);
      const nombre = pieza ? trDato(pieza, 'nombre') : aplicable.cambio.pieza;
      const ejes = aplicable.cambio.ranuras.length > 1 ? tr(' (ambos ejes)', ' (both axles)') : '';
      const i = opciones.findIndex(([, escena]) => escena === 'Taller');
      opciones[i] = [tr('Aplicar y al taller', 'Apply & to workshop'), 'Taller', () => aplicarCambio(aplicable.cambio)];
      if (!exito) sugerida = i;
      aplica = tr(`aplica: ${nombre}${ejes}`, `applies: ${nombre}${ejes}`);
    }
    // Un consejo visible (DISENO.md §3 Resultados): el que se puede aplicar o, si no hay, el primero; el resto en las tarjetas.
    const consejo = aplicable ?? recs[0] ?? null;
    const textoConsejo = consejo ? consejo.texto : diagnostico.consejo;
    const iconoConsejo = consejo?.cambio ? `iconos/${consejo.cambio.pieza}` : null;
    K.icono(this, PX + 16, 446, iconoConsejo, { escala: 2, respaldo: '▸', color: '#ffd166', size: 22 });
    const tConsejo = T(this, PX + 40, 446, textoConsejo, { size: consejo ? 18 : 16, color: '#ffd166', origen: [0, 0.5] });
    if (aplica) {
      const x = tConsejo.x + tConsejo.width + 14;
      const ch = K.chip(this, x, 446 - 17, aplica, { tipo: 'cian' });
      if (x + ch.ancho > 920) { ch.objs.forEach((o) => o.destroy()); tConsejo.setText(`${textoConsejo} (${aplica})`); }
    }
    ajustarAncho(tConsejo, 920 - tConsejo.x);

    const xs = [170, 480, 795];
    const ir = (escena, antes) => { antes?.(); irA(this, escena); };
    this.botones = opciones.map(([texto, escena, antes], i) => K.boton(this, xs[i], yb, texto, () => ir(escena, antes), {
      size: 16, alto: 42, numero: i + 1, sugerido: i === sugerida, reservaFoco: false,
    }));
    this.input.keyboard.on('keydown', (ev) => {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); mostrar(pagina - 1); return; }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); mostrar(pagina + 1); return; }
      if (ev.key.toLowerCase() === 'a' && indiceAnalogia >= 0) { mostrar(indiceAnalogia); return; }
      const n = Number(ev.key);
      if (n >= 1 && n <= opciones.length) { sonarBoton(); ir(opciones[n - 1][1], opciones[n - 1][2]); }
      else if (ev.key === 'Enter') { sonarBoton(); ir(opciones[sugerida][1], opciones[sugerida][2]); }
    });
    const avisos = [tr('La puntuación es de juego, no evidencia científica.', 'The score is a game value, not scientific evidence.')];
    if (ilustrativo) avisos.push(tr('Terreno ilustrativo: no es un perfil medido.', 'Illustrative terrain: not a measured profile.'));
    nota(this, avisos.join(' '));
  }
}

/** Pone la pieza recomendada en las ranuras indicadas del diseño actual (el taller valida presupuesto al abrir). */
function aplicarCambio(cambio) {
  const ultimo = [...partida.resultados].reverse().find((r) => r.resultado?.diseno?.length);
  const base = partida.diseno?.length ? partida.diseno : ultimo?.resultado.diseno ?? [];
  const mapa = Object.fromEntries(base.map((d) => [d.ranura, d.pieza]));
  for (const r of cambio.ranuras) mapa[r] = cambio.pieza;
  partida.diseno = Object.entries(mapa).map(([ranura, pieza]) => ({ ranura, pieza }));
}

const CLAVE_MARCAS = 'marsception.marcas';
function leerMarcas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_MARCAS)) || {}; } catch { return {}; }
}
function guardarMarcas(m) {
  try { localStorage.setItem(CLAVE_MARCAS, JSON.stringify(m)); } catch { /* sin almacenamiento */ }
}
