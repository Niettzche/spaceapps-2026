// Gravedad real (m/s²). La gravedad del destino SOLO se usa en la misión, nunca en el análogo terrestre.
// Marte: gravedad ecuatorial de NASA JPL, https://ssd.jpl.nasa.gov/planets/phys_par.html
// La Mars Fact Sheet publica 3.73 m/s² como media; se conserva 3.71 como convención uniforme de la demo.
export const GRAVEDAD = { tierra: 9.81, marte: 3.71, luna: 1.62 };
// Escala del juego: cuántas unidades de gravedad de Matter equivalen a 1 m/s² (valor de juego, ajustar).
export const ESCALA_GRAVEDAD = 0.1;
export const PRESUPUESTO_INICIAL = 1000; // créditos (P)
export const TICKETS_POR_PARTIDA = 3;     // (P)
export const UMBRAL_INTEGRIDAD = 0.6;     // entrega válida (P)
