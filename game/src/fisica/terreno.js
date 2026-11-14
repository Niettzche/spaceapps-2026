// Construye el terreno de Matter y su dibujo provisional a partir de un perfil (fisica/perfil.js).
import Phaser from 'phaser';
import { m } from './escala.js';
import { FRICCION_ESTATICA } from './robot.js';

const M = Phaser.Physics.Matter.Matter;

// Colores provisionales hasta tener los tiles de arte (docs/juego/ASSETS_ARTE.md).
export const COLOR_SUPERFICIE = {
  tierra: { arena: 0xd9b26f, roca: 0x6f6872, compacto: 0xa07c55 },
  marte: { arena: 0xc8774a, roca: 0x7a4a3a, compacto: 0xa35d3f },
  luna: { arena: 0x9a9a9e, roca: 0x6c6c72, compacto: 0x84848a },
};

const GROSOR_M = 6; // grosor del suelo bajo el punto más bajo, para que nada lo atraviese

/**
 * Crea los cuerpos estáticos del terreno (un cuadrilátero convexo por tramo) y lo dibuja.
 * Devuelve { cuerpos, xMundo(x_m), yMundo(y_m), ancho, arriba, abajo, dibujo }.
 */
export function construirTerreno(scene, perfil, { mundo = 'tierra', origenX = 0, baseY = 360 } = {}) {
  const xMundo = (x) => origenX + m(x);
  const yMundo = (y) => baseY - m(y);
  const puntos = perfil.x_m.map((x, i) => ({ x: xMundo(x), y: yMundo(perfil.y_m[i]) }));
  const abajo = Math.max(...puntos.map((p) => p.y)) + m(GROSOR_M);
  const arriba = Math.min(...puntos.map((p) => p.y));

  const cuerpos = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    const verts = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }, { x: b.x, y: abajo }, { x: a.x, y: abajo }];
    const c = M.Vertices.centre(verts);
    const cuerpo = M.Bodies.fromVertices(c.x, c.y, [verts], {
      isStatic: true,
      label: 'suelo',
      friction: 1, // Matter usa min(fricción A, B): el agarre lo pone la rueda
      frictionStatic: FRICCION_ESTATICA, // y max(frictionStatic A, B): debe ser bajo en ambos
      restitution: 0,
    });
    cuerpos.push(cuerpo);
  }
  M.Composite.add(scene.matter.world.localWorld, cuerpos);

  // Dibujo provisional: relleno por tramo de superficie + borde superior más claro.
  const g = scene.add.graphics();
  const colores = COLOR_SUPERFICIE[mundo] ?? COLOR_SUPERFICIE.tierra;
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i];
    const b = puntos[i + 1];
    const xMedio = (perfil.x_m[i] + perfil.x_m[i + 1]) / 2;
    const tipo = perfil.superficies.find((s) => xMedio >= s.desde && xMedio < s.hasta)?.tipo ?? 'compacto';
    const color = colores[tipo];
    g.fillStyle(color, 1);
    g.fillPoints([a, b, { x: b.x, y: abajo + m(40) }, { x: a.x, y: abajo + m(40) }], true);
    g.lineStyle(3, Phaser.Display.Color.ValueToColor(color).lighten(25).color, 1);
    g.lineBetween(a.x, a.y, b.x, b.y);
  }

  return { cuerpos, xMundo, yMundo, ancho: xMundo(perfil.largo_m) - origenX, arriba, abajo, dibujo: g };
}
