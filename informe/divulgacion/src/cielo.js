// Cielo pixel art de la portada (assets/titulo/titulo_fondo.png, ampliado en píxeles enteros) con estrellas que titilan y alguna
// estrella fugaz, para usarlo de fondo en otras secciones. `bajar` corre el arte hacia abajo (fracción de su alto) para que Marte
// asome desde el borde inferior y las cifras queden sobre el espacio.
const reducido = matchMedia('(prefers-reduced-motion: reduce)');

export function montarCielo(seccion, { bajar = 0.3 } = {}) {
  const cont = document.createElement('div');
  cont.className = 'cielo';
  cont.setAttribute('aria-hidden', 'true');
  cont.innerHTML = `<img class="cielo-fondo" src="${import.meta.env.BASE_URL}arte/titulo_fondo.png" width="320" height="180" alt="">`
    + '<canvas class="cielo-estrellas" width="320" height="180"></canvas><div class="cielo-velo"></div>';
  seccion.prepend(cont);
  cont.style.setProperty('--bajar', String(bajar));

  const escalar = () => {
    const w = seccion.clientWidth, h = seccion.clientHeight;
    cont.style.setProperty('--k', String(Math.max(Math.ceil(w / 320), Math.ceil(h / 180), 2)));
  };
  new ResizeObserver(escalar).observe(seccion);
  escalar();

  // Estrellas a 1 px de arte, en la misma rejilla que el fondo
  const g = cont.querySelector('canvas').getContext('2d');
  let s = 23;
  const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const estrellas = Array.from({ length: 80 }, () => ({
    x: Math.floor(azar() * 320), y: Math.floor(azar() * 120), fase: azar() * Math.PI * 2, vel: 0.6 + azar() * 1.8,
    color: azar() < 0.3 ? [207, 196, 255] : [255, 255, 255], cruz: azar() < 0.1,
  }));
  let fugaz = null, proxima = 3;
  const pintar = (t, dt) => {
    g.clearRect(0, 0, 320, 180);
    for (const e of estrellas) {
      const nivel = Math.round((0.5 + 0.5 * Math.sin(t * e.vel + e.fase)) * 3) / 3;
      if (!nivel) continue;
      g.fillStyle = `rgba(${e.color},${0.25 + 0.75 * nivel})`;
      g.fillRect(e.x, e.y, 1, 1);
      if (e.cruz && nivel === 1) {
        g.fillStyle = `rgba(${e.color},0.45)`;
        g.fillRect(e.x - 1, e.y, 1, 1); g.fillRect(e.x + 1, e.y, 1, 1); g.fillRect(e.x, e.y - 1, 1, 1); g.fillRect(e.x, e.y + 1, 1, 1);
      }
    }
    proxima -= dt;
    if (!fugaz && proxima <= 0) { fugaz = { x: 170 + azar() * 140, y: 4 + azar() * 40, v: 150 + azar() * 60, vida: 0 }; proxima = 5 + azar() * 7; }
    if (fugaz) {
      fugaz.vida += dt;
      const d = fugaz.v * fugaz.vida, hx = Math.round(fugaz.x - d), hy = Math.round(fugaz.y + d * 0.45);
      for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(255,240,220,${Math.max(0, 0.95 - i * 0.11)})`; g.fillRect(hx + i * 2, hy - Math.round(i * 0.9), 1, 1); }
      if (hx < -20 || hy > 140) fugaz = null;
    }
  };

  let visible = false, corriendo = false, ultimo = 0, acumulado = 0;
  const ciclo = (ahora) => {
    if (!visible || document.hidden) { corriendo = false; return; }
    const dt = Math.min((ahora - ultimo) / 1000, 0.1);
    ultimo = ahora; acumulado += dt;
    if (acumulado >= 1 / 20) { pintar(ahora / 1000, acumulado); acumulado = 0; }   // 20 cuadros por segundo, como el juego
    requestAnimationFrame(ciclo);
  };
  const arrancar = () => { if (visible && !corriendo && !reducido.matches) { corriendo = true; ultimo = performance.now(); requestAnimationFrame(ciclo); } };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; arrancar(); }).observe(seccion);
  document.addEventListener('visibilitychange', arrancar);
  pintar(0, 0);
}
