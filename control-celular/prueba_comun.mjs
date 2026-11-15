// Ayuda de las pruebas: si el relay de prueba NO está en 8787 (RELAY=http://localhost:8790), la página del juego carga
// el puente desde ese relay y nunca habla con un relay en 8787 (que puede ser el de otra persona usando el control).
export async function puenteDePrueba(pagina, RELAY) {
  if (new URL(RELAY).port === '8787') return;
  const codigo = (await (await fetch(`${RELAY}/puente.js`)).text())
    .replace("document.currentScript?.src ?? 'http://localhost:8787/puente.js'", JSON.stringify(`${RELAY}/puente.js`));
  await pagina.route(/:8787\//, (r) => (new URL(r.request().url()).pathname === '/puente.js'
    ? r.fulfill({ body: codigo, contentType: 'text/javascript' }) : r.abort()));
}
