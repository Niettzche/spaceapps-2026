// Pruebas de la regla de precarga del Boot. Correr desde game/:  node --test src/scenes/expediente/pruebas/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { planDePrecarga, bytesDeDataUri, extension, formatoBytes } from '../precarga.js';
import { FONDO_CARGA } from '../config.js';

const REGLA = { limiteBytes: 300 * 1024, extensionesExcluidas: ['gif', 'mp4', 'webm'] };

test('precarga: salta GIF, MP4 y WebM aunque sean chicos, y lo que pase del límite', () => {
  const lista = [
    { archivo: 'titulo/titulo.png', bytes: 11_900 },
    { archivo: 'fondos/grande.png', bytes: 300 * 1024 + 1 },
    { archivo: 'fondos/justo.png', bytes: 300 * 1024 }, // en el límite exacto sí se carga
    { archivo: 'gif/marsception.gif', bytes: 12_872_581 },
    { archivo: 'video/demo.MP4', bytes: 2_000 }, // la extensión no distingue mayúsculas
    { archivo: 'video/clip.webm', bytes: null },
    { archivo: 'ui/sin_medida.png', bytes: null }, // sin tamaño conocido: se carga (y se reporta "sin tamaño")
  ];
  const { cargar, saltar } = planDePrecarga(lista, REGLA);
  assert.deepEqual(cargar.map((a) => a.archivo), ['titulo/titulo.png', 'fondos/justo.png', 'ui/sin_medida.png']);
  assert.deepEqual(saltar.map((a) => [a.archivo, a.motivo]), [
    ['fondos/grande.png', 'tamaño'], ['gif/marsception.gif', 'formato'], ['video/demo.MP4', 'formato'], ['video/clip.webm', 'formato'],
  ]);
});

test('precarga: assets vacío o solo con archivos pesados no carga nada y no falla', () => {
  assert.deepEqual(planDePrecarga([], REGLA), { cargar: [], saltar: [] });
  const soloPesados = planDePrecarga([{ archivo: 'a.gif', bytes: 1 }, { archivo: 'b.mp4', bytes: 9e6 }], REGLA);
  assert.equal(soloPesados.cargar.length, 0);
  assert.equal(soloPesados.saltar.length, 2);
});

test('precarga: el fondo de la pantalla de carga se carga aunque pase del límite; el resto sigue la regla', () => {
  const lista = [
    { clave: 'pantallas/carga_fondo', archivo: 'pantallas/carga_fondo.png', bytes: 2_000_000 },
    { clave: 'fondos/grande', archivo: 'fondos/grande.png', bytes: 2_000_000 },
  ];
  const { cargar, saltar } = planDePrecarga(lista, { ...REGLA, siempre: [FONDO_CARGA.clave] });
  assert.deepEqual(cargar.map((a) => a.clave), ['pantallas/carga_fondo']);
  assert.deepEqual(saltar.map((a) => [a.clave, a.motivo]), [['fondos/grande', 'tamaño']]);
});

test('precarga: el fondo de carga existe en assets/ y el hueco de la barra cabe en la imagen', () => {
  const ruta = new URL(`../../../../../assets/${FONDO_CARGA.clave}.png`, import.meta.url);
  assert.ok(existsSync(ruta), 'falta assets/pantallas/carga_fondo.png');
  const png = readFileSync(ruta);
  const ancho = png.readUInt32BE(16); // cabecera IHDR del PNG
  const alto = png.readUInt32BE(20);
  assert.equal(ancho, FONDO_CARGA.ancho);
  const { x, y, w, h } = FONDO_CARGA.hueco;
  assert.ok(x >= 0 && y >= 0 && x + w <= ancho && y + h <= alto);
});

test('precarga: tamaño de las URL data: que Vite incrusta en el JS', () => {
  assert.equal(bytesDeDataUri('data:image/png;base64,iVBORw0KGgo='), 8); // 12 caracteres base64 con 1 de relleno = 8 bytes
  assert.equal(bytesDeDataUri('data:image/png;base64,AAAA'), 3);
  assert.equal(bytesDeDataUri('/assets/titulo-CfRr_YQ4.png'), null); // archivo aparte: se mide con HEAD
  assert.equal(extension('fx/fx_polvo.PNG'), 'png');
  assert.equal(formatoBytes(12_872_581), '12.3 MB');
  assert.equal(formatoBytes(null), 'tamaño desconocido');
});
