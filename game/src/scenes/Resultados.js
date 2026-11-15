import Phaser from 'phaser';
import { titulo, boton, nota, irA } from './ui.js';
import { PRESUPUESTO_INICIAL } from '../config/world.js';
import { DESTINOS } from '../data.js';
import { partida } from '../main.js';
import { recomendar } from '../feedback/reglas.js';
import { diagnosticar } from '../feedback/diagnostico.js';
import { puntuar } from '../feedback/puntuacion.js';
import { compararAnalogia } from '../feedback/analogia.js';
import { exponerParaPruebas } from '../fisica/depuracion.js';
import { sonarBoton } from '../fisica/sonido.js';
import { tr } from '../i18n.js';

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
const ESTILO = { fontFamily: 'monospace', fontSize: '14px', color: '#cfd6ff', wordWrap: { width: 820 } };

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
    { ...ESTILO, wordWrap: { width: 650 }, lineSpacing: 4 });
    if (esMision) {
      const p = puntuar(resultado, PRESUPUESTO_INICIAL);
      const estrellas = '★'.repeat(p.estrellas) + '☆'.repeat(3 - p.estrellas);
      this.add.text(896, 122, `${p.total} / 1000\n${estrellas}`, {
        ...ESTILO, fontSize: '22px', color: '#ffd166', align: 'right',
      }).setOrigin(1, 0);
    }

    const diagnostico = diagnosticar(registro);
    const recs = recomendar(resultado, motivo);
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
    const sugerida = esMision ? (exito ? 2 : 0) : (exito ? 2 : 0);
    const xs = [190, 480, 770];
    const ir = (escena) => { sonarBoton(); irA(this, escena); };
    opciones.forEach(([texto, escena], i) => {
      const b = boton(this, xs[i], yb, `${i + 1} · ${texto}${i === sugerida ? ' ⏎' : ''}`, () => ir(escena)).setFontSize(14);
      if (i === sugerida) b.setColor('#4cc38a');
    });
    this.input.keyboard.on('keydown', (ev) => {
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); mostrar(pagina - 1); return; }
      if (ev.key === 'ArrowRight') { ev.preventDefault(); mostrar(pagina + 1); return; }
      if (ev.key.toLowerCase() === 'a' && indiceAnalogia >= 0) { mostrar(indiceAnalogia); return; }
      const n = Number(ev.key);
      if (n >= 1 && n <= opciones.length) ir(opciones[n - 1][1]);
      else if (ev.key === 'Enter') ir(opciones[sugerida][1]);
    });
    const avisos = [tr('La puntuación es de juego, no evidencia científica.', 'The score is a game value, not scientific evidence.')];
    if (ilustrativo) avisos.push(tr('Terreno ilustrativo: no es un perfil medido.', 'Illustrative terrain: not a measured profile.'));
    nota(this, avisos.join(' '));
  }
}
