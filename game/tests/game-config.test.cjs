const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const TimeStep = require('phaser/src/core/TimeStep');

test('60 Hz cap is applied to the real Phaser configuration on high-refresh displays', () => {
  let config;
  const names = ['Boot','Menu','Expediente','Explorador','Taller','Prueba','Mision','Resultados'];
  const ctx = {
    Phaser: { Game: function(c) { config = c; }, Scale: { FIT: 0, CENTER_BOTH: 0 } },
    PRESUPUESTO_INICIAL: 1000, TICKETS_POR_PARTIDA: 3,
    ...Object.fromEntries(names.map(n => [n, class {}])),
  };
  const source = readFileSync(require('node:path').join(__dirname, '../src/main.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  vm.runInNewContext(source, ctx);
  assert.equal(config.fps.limit, 60);
  assert.equal(config.physics.matter.runner.isFixed, true);
  for (const hz of [60, 120, 144, 240]) {
    let updates = 0;
    const loop = new TimeStep({}, { ...config.fps, smoothStep: false });
    loop.callback = () => updates++;
    loop.lastTime = 0;
    for (let frame = 1; frame <= hz; frame++) loop.stepLimitFPS(frame * 1000 / hz);
    assert(updates > 0 && updates <= 60, `${hz} Hz produced ${updates} fixed physics steps in one second`);
  }
});
