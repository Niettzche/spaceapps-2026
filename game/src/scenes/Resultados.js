import Phaser from 'phaser';
import { titulo, boton, nota, irA } from './ui.js';
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
});
const ESTILO = { fontFamily: 'monospace', fontSize: '15px', color: '#cfd6ff', wordWrap: { width: 820 } };

export default class Resultados extends Phaser.Scene {
  constructor() {
    super('Resultados');
    exponerParaPruebas('Resultados', this);
  }

  create() {
    const registro = partida.resultados[partida.resultados.length - 1];
    if (!registro) {
      titulo(this, tr('Resultados', 'Results'), tr('Todavía no hay pruebas ni misiones.', 'No tests or missions yet.'));
      boton(this, 480, 440, tr('Menú', 'Menu'), () => { sonarBoton(); irA(this, 'Menu'); });
      return;
    }
    const { tipo, exito, motivo, resultado, ilustrativo } = registro;
    const esMision = tipo === 'mision';
    const encabezado = esMision
      ? (exito ? tr('Misión cumplida', 'Mission accomplished') : tr('Misión fallida', 'Mission failed'))
      : (exito ? tr('Prueba superada', 'Test passed') : tr('La prueba falló', 'Test failed'));
    titulo(this, encabezado, MOTIVOS()[motivo] ?? motivo);

    // Fondo sólido: el arte del marco nunca determina el contraste del texto.
    this.add.rectangle(480, 284, 864, 228, 0x101827, 0.98).setStrokeStyle(2, 0x526782);
    const carga = Math.round(resultado.integridad_carga * 100);
    const energia = Math.round(resultado.energia_restante * 100);
    this.add.text(64, 126, tr(
      `Distancia ${resultado.distancia_m} m · carga ${carga} % · energía ${energia} %\nCosto ${resultado.costo} créditos · intento ${resultado.intentos}`,
      `Distance ${resultado.distancia_m} m · payload ${carga} % · energy ${energia} %\nCost ${resultado.costo} credits · attempt ${resultado.intentos}`),
    { ...ESTILO, wordWrap: { width: 600 }, lineSpacing: 4 });
    if (esMision) {
      const p = puntuar(resultado, PRESUPUESTO_INICIAL);
      // Puntuación arriba a la derecha: número + estrellas de arte (assets/ui/ui_estrella_*.png, 16 × 16 × 2); si no hay arte, texto.
      this.add.text(896, 118, `${p.total} / 1000`, { ...ESTILO, fontSize: '22px', color: '#ffd166' }).setOrigin(1, 0);
      if (this.textures.exists('ui/ui_estrella_llena') && this.textures.exists('ui/ui_estrella_vacia')) {
        for (let i = 0; i < 3; i++) {
          this.add.image(896 - (2 - i) * 38, 160, i < p.estrellas ? 'ui/ui_estrella_llena' : 'ui/ui_estrella_vacia').setOrigin(1, 0.5).setScale(2);
        }
      } else {
        this.add.text(896, 146, '★'.repeat(p.estrellas) + '☆'.repeat(3 - p.estrellas), { ...ESTILO, fontSize: '22px', color: '#ffd166' }).setOrigin(1, 0);
      }
      // Mejor marca por destino (guardada en el navegador) y cuánto falta para la siguiente estrella.
      if (resultado.entrega) {
        const marcas = leerMarcas();
        const previa = marcas[resultado.destino];
        let txt;
        if (previa == null || p.total > previa) {
          marcas[resultado.destino] = p.total;
          guardarMarcas(marcas);
          txt = previa == null ? tr('Primera marca en este destino', 'First record for this destination') : tr(`¡Nueva marca! (antes ${previa})`, `New record! (was ${previa})`);
        } else {
          txt = tr(`Tu marca: ${previa}`, `Your record: ${previa}`);
        }
        const meta = p.estrellas < 2 ? ESTRELLAS.dos : p.estrellas < 3 ? ESTRELLAS.tres : null;
        if (meta) txt += tr(` · faltan ${meta - p.total} para ${'★'.repeat(p.estrellas + 1)}`, ` · ${meta - p.total} to ${'★'.repeat(p.estrellas + 1)}`);
        this.add.text(818, 158, txt, { ...ESTILO, fontSize: '12px', color: '#4cc38a', align: 'right' }).setOrigin(1, 0.5);
      }
    }

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
      const p = puntuar(resultado, PRESUPUESTO_INICIAL);
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
    let pagina = 0;
    const contenido = this.add.container(0, 0);
    const contador = this.add.text(480, 418, '', { ...ESTILO, fontSize: '16px' }).setOrigin(0.5);
    const mostrar = (indice) => {
      pagina = (indice + paginas.length) % paginas.length;
      contenido.removeAll(true);
      const p = paginas[pagina];
      const encabezado = this.add.text(68, 186, p.titulo, { ...ESTILO, fontSize: '18px', color: '#ffffff', wordWrap: { width: 820 } });
      const texto = this.add.text(68, encabezado.y + encabezado.height + 14, p.texto, {
        ...ESTILO, fontSize: '16px', color: '#ffd166', lineSpacing: 5, wordWrap: { width: 820 },
      });
      contenido.add([encabezado, texto]);
      if (p.evidencia) contenido.add(this.add.text(68, texto.y + texto.height + 14, p.evidencia, {
        ...ESTILO, fontSize: '16px', color: '#e1e8f0', lineSpacing: 5, wordWrap: { width: 820 },
      }));
      contador.setText(`${pagina + 1} / ${paginas.length}`);
    };
    const navegar = (x, texto, accion) => {
      this.add.rectangle(x, 421, 232, 38, 0x20314a).setStrokeStyle(1, 0x526782)
        .setInteractive({ useHandCursor: true }).on('pointerdown', () => { sonarBoton(); accion(); });
      this.add.text(x, 421, texto, { ...ESTILO, color: '#ffffff' }).setOrigin(0.5);
    };
    navegar(186, tr('← Consejo anterior', '← Previous advice'), () => mostrar(pagina - 1));
    navegar(774, tr('Siguiente consejo →', 'Next advice →'), () => mostrar(pagina + 1));
    if (indiceAnalogia >= 0) {
      this.add.text(480, 443, tr('A · Ver límites de la analogía', 'A · View analogy limits'), { ...ESTILO, color: '#80e0dc' })
        .setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => mostrar(indiceAnalogia));
    }
    mostrar(0);

    // Botones con atajo de teclado (1, 2, 3) y Enter = siguiente paso sugerido del camino dorado.
    const yb = 470;
    const opciones = esMision
      ? [[tr('Reintentar misión', 'Retry mission'), 'Mision'], [tr('Volver al taller', 'Back to workshop'), 'Taller'], [tr('Menú', 'Menu'), 'Menu']]
      : [[tr('Volver al taller', 'Back to workshop'), 'Taller'], [tr('Probar otra vez', 'Test again'), 'Prueba'],
        [exito ? tr('Lanzar misión', 'Launch mission') : tr('Lanzar misión sin superar', 'Launch mission anyway'), 'Mision']];
    let sugerida = esMision ? (exito ? 2 : 0) : (exito ? 2 : 0);
    // "Aplicar y al taller": la primera recomendación con cambio de pieza se aplica al diseño y se abre el taller.
    const aplicable = recs.find((r) => r.cambio);
    if (aplicable) {
      const pieza = PIEZAS.find((x) => x.id === aplicable.cambio.pieza);
      const nombre = pieza ? trDato(pieza, 'nombre') : aplicable.cambio.pieza;
      const ejes = aplicable.cambio.ranuras.length > 1 ? tr(' (ambos ejes)', ' (both axles)') : '';
      const i = opciones.findIndex(([, escena]) => escena === 'Taller');
      opciones[i] = [tr('Aplicar y al taller', 'Apply & to workshop'), 'Taller', () => aplicarCambio(aplicable.cambio)];
      if (!exito) sugerida = i;
      this.add.text(xs0(i), yb + 26, tr(`aplica: ${nombre}${ejes}`, `applies: ${nombre}${ejes}`), { ...ESTILO, fontSize: '11px', color: '#4cc38a' }).setOrigin(0.5);
    }
    const xs = [190, 480, 770];
    const ir = (escena, antes) => { sonarBoton(); antes?.(); irA(this, escena); };
    opciones.forEach(([texto, escena, antes], i) => {
      const b = boton(this, xs[i], yb, `${i + 1} · ${texto}${i === sugerida ? ' ⏎' : ''}`, () => ir(escena, antes)).setFontSize(15);
      if (i === sugerida) b.setColor('#4cc38a');
    });
    this.input.keyboard.on('keydown', (ev) => {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); mostrar(pagina - 1); return; }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); mostrar(pagina + 1); return; }
      if (ev.key.toLowerCase() === 'a' && indiceAnalogia >= 0) { mostrar(indiceAnalogia); return; }
      const n = Number(ev.key);
      if (n >= 1 && n <= opciones.length) ir(opciones[n - 1][1], opciones[n - 1][2]);
      else if (ev.key === 'Enter') ir(opciones[sugerida][1], opciones[sugerida][2]);
    });
    const avisos = [tr('La puntuación es de juego, no evidencia científica.', 'The score is a game value, not scientific evidence.')];
    if (ilustrativo) avisos.push(tr('Terreno ilustrativo: no es un perfil medido.', 'Illustrative terrain: not a measured profile.'));
    nota(this, avisos.join(' '));
  }
}

const xs0 = (i) => [190, 480, 770][i];

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
