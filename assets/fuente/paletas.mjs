// Paletas por mundo (oscuro → claro). Se exportan también a assets/paletas.json para que los efectos de pixelfx
// usen los mismos colores (opción `palette` de cualquier efecto).
export const PALETAS = {
  // pantalla de título (sale del GIF de MARSCEPTION; ver docs/juego/ASSETS_ARTE.md §1)
  titulo: {
    espacio: ['#0d051c', '#180630', '#240d43', '#2e0d6b', '#40188a', '#5a2aa6'],
    marte: ['#2a0e0e', '#4e1c16', '#7a3424', '#a8593e', '#bc6240', '#d88a5a', '#f0b07a'],
    borde_luz: ['#7a4cff', '#c9a7ff'],
    logo: ['#ffffff', '#f0e8ff', '#d4c0ff', '#b090ff', '#8a60e8'],
    tierra: '#4ce8d8', luna: '#c8c8d4', rojo: '#ff5a4a', lavanda: '#b9a6ff', estrella: '#cfc4ff',
  },
  base: {
    contorno: ['#0e0c16'],
    metal: ['#2e3648', '#4a5468', '#9aa6ba', '#d0d8e6', '#ffffff'],
    acento: ['#a8301a', '#f2701f', '#ffd23c', '#fff08a'],
    borde_luz: ['#108088', '#4ce8d8'],
  },
  tierra: {
    // cálida y arenosa (Samalayuca)
    arena: ['#4a2a1c', '#7e4a2a', '#a4663a', '#c4844a', '#dca462', '#f6d698'],
    roca: ['#141012', '#2a2024', '#43363a', '#624e4c', '#8a6e62', '#b8967e'],      // basalto (Pinacate)
    compacto: ['#3a281c', '#5e432e', '#866244', '#a88058', '#c8a070', '#e6c898'],  // costra de caliche
    cielo: ['#141026', '#2a1a48', '#5a2a5a', '#a8405a', '#e0703a', '#ffb45a', '#ffe29a'],
    dunas_lejos: ['#3a1c34', '#5e2c3e', '#8a4446', '#b86a4e'],
    dunas_cerca: ['#1e0e12', '#3a1a18', '#5e2c1e', '#8a4626', '#d0722e', '#ffa040'],
    polvo: ['#5e3a24', '#8a5a36', '#b8844e', '#dcae74', '#f6d698'],
    // desierto genérico: tarde dorada
    cielo_tarde: ['#2a3a6a', '#3e5a8a', '#6a86a8', '#a8b4b4', '#e0c89a', '#f6dca8', '#fff4d4'],
    sierra: ['#4a3a56', '#6a4e66', '#8e6a72', '#b48a80'],
    desierto_cerca: ['#24140e', '#4a2c1a', '#74482a', '#9e6a3e', '#c48e56', '#e6b878'],
    salar: ['#a89a8a', '#c8bca8', '#e2d8c6', '#f4eee2'],
    // campo de lava (Pinacate): cielo claro con bruma, conos de ceniza óxido apagado
    cielo_lava: ['#3a4e7a', '#5a74a0', '#8a9eb8', '#b8c0c4', '#dcd2c0', '#f0e2c8'],
    conos: ['#2a1a1e', '#4a2a28', '#6e3e32', '#94563e', '#b8744e'],
  },
  marte: {
    // óxido (Jezero)
    arena: ['#34140e', '#5e2616', '#8a3c22', '#b05630', '#cc7444', '#e8a068'],
    roca: ['#1a0a08', '#341410', '#56241a', '#7a3824', '#a65232', '#d07a4c'],
    compacto: ['#2e120c', '#4e2216', '#743622', '#9a4e2e', '#c06c40', '#de9662'],
    cielo: ['#1e0e10', '#3e1a16', '#6e3222', '#a4583a', '#d08a5c', '#ecc08c'],
    lejos: ['#2e1210', '#4e1e16', '#74301e', '#a04a2a'],
    cerca: ['#140806', '#2a0e0a', '#4a1a10', '#702a16', '#b4441e', '#f0763a'],
    polvo: ['#4a1e12', '#7a3420', '#a85232', '#d07c4e', '#ecb07c'],
  },
  luna: {
    // gris de alto contraste, cielo negro, luz rasante (polo sur)
    cielo: ['#000000', '#05040a', '#0c0a16'],
    roca: ['#07070a', '#16161c', '#2c2c36', '#4a4a56', '#7c7c8a', '#b4b4c0', '#e8e8f0'],
    arena: ['#121218', '#24242c', '#3c3c48', '#5c5c6a', '#8a8a98', '#c4c4d0'],     // regolito
    polvo: ['#2c2c36', '#4a4a56', '#7c7c8a', '#b4b4c0', '#e8e8f0'],
  },
};
