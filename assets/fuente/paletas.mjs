// Paletas por mundo (oscuro → claro). Se exportan también a assets/paletas.json para que los efectos de pixelfx
// usen los mismos colores (opción `palette` de cualquier efecto).
export const PALETAS = {
  base: {
    contorno: ['#0e0c16'],
    metal: ['#2e3648', '#4a5468', '#9aa6ba', '#d0d8e6', '#ffffff'],
    acento: ['#a8301a', '#f2701f', '#ffd23c', '#fff08a'],
    borde_luz: ['#108088', '#4ce8d8'],
  },
  tierra: {
    // cálida y arenosa (Samalayuca)
    arena: ['#4a2a1c', '#7e4a2a', '#a4663a', '#c4844a', '#dca462', '#f6d698'],
    cielo: ['#141026', '#2a1a48', '#5a2a5a', '#a8405a', '#e0703a', '#ffb45a', '#ffe29a'],
    dunas_lejos: ['#3a1c34', '#5e2c3e', '#8a4446', '#b86a4e'],
    dunas_cerca: ['#1e0e12', '#3a1a18', '#5e2c1e', '#8a4626', '#d0722e', '#ffa040'],
    polvo: ['#5e3a24', '#8a5a36', '#b8844e', '#dcae74', '#f6d698'],
  },
  marte: {
    // óxido (Jezero)
    cielo: ['#1e0e10', '#3e1a16', '#6e3222', '#a4583a', '#d08a5c', '#ecc08c'],
    lejos: ['#2e1210', '#4e1e16', '#74301e', '#a04a2a'],
    cerca: ['#140806', '#2a0e0a', '#4a1a10', '#702a16', '#b4441e', '#f0763a'],
    polvo: ['#4a1e12', '#7a3420', '#a85232', '#d07c4e', '#ecb07c'],
  },
  luna: {
    // gris de alto contraste, cielo negro, luz rasante (polo sur)
    cielo: ['#000000', '#05040a', '#0c0a16'],
    roca: ['#07070a', '#16161c', '#2c2c36', '#4a4a56', '#7c7c8a', '#b4b4c0', '#e8e8f0'],
    polvo: ['#2c2c36', '#4a4a56', '#7c7c8a', '#b4b4c0', '#e8e8f0'],
  },
};
