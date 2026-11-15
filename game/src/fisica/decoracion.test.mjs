import test from 'node:test';
import assert from 'node:assert/strict';
import { Decoracion as Ambiente, tipoDecoracion as tipoAmbiente } from './decoracion.js';

function escena() {
  const trazos = [];
  const g = new Proxy({}, { get: (_, nombre) => (...args) => { trazos.push([nombre, ...args]); return g; } });
  // Solo se proporciona add.graphics: cualquier dependencia de física falla la prueba.
  return { scene: { add: { graphics: () => g } }, trazos };
}

test('aves solo en los sitios terrestres previstos, sin fauna en Marte o Luna', () => {
  assert.equal(tipoAmbiente('tierra', 'samalayuca'), 'aves');
  assert.equal(tipoAmbiente('tierra', 'pinacate'), 'aves');
  assert.equal(tipoAmbiente('tierra', 'desconocido'), null);
  assert.equal(tipoAmbiente('marte', 'samalayuca'), 'polvo');
  assert.equal(tipoAmbiente('luna', 'pinacate'), 'roca_espacial');
});

test('dibujar los tres ambientes no requiere Matter, robot ni telemetría', () => {
  for (const mundo of ['tierra', 'marte', 'luna']) {
    const { scene, trazos } = escena();
    const a = new Ambiente(scene, { mundo, sitioId: 'samalayuca' });
    a.actualizar(16);
    assert.ok(trazos.some(([nombre]) => nombre === 'clear'));
    assert.ok(trazos.some(([nombre]) => ['strokePath', 'lineBetween', 'fillPoints'].includes(nombre)));
    a.destruir();
    assert.equal(a.g, null);
    assert.equal(trazos.at(-1)[0], 'destroy');
    a.destruir(); // limpieza idempotente
  }
});

test('movimiento reducido congela el ambiente y un delta grande no provoca saltos', () => {
  const { scene } = escena();
  const quieto = new Ambiente(scene, { mundo: 'tierra', sitioId: 'samalayuca', movimientoReducido: true });
  quieto.actualizar(9000);
  assert.equal(quieto.t, 0);
  const normal = new Ambiente(scene, { mundo: 'marte' });
  normal.actualizar(9000);
  assert.equal(normal.t, 0.1);
  normal.actualizar(-100);
  assert.equal(normal.t, 0.1);
});
