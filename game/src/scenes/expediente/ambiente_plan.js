// Planificador del fondo animado del Menú (función pura, sin Phaser: se prueba con node --test).
// Frente expediente. Todo lo que sale de aquí es ILUSTRACIÓN: planetas, Sol, cometas, asteroides y galaxias son arte,
// sin valor científico. Ver docs/estado/expediente.md (sección "Fondo del Menú").

// Cadencias en segundos (valor de diseño del arte, no de la ciencia).
export const CADENCIA_S = {
  asteroide: [4, 10],
  cometa: [15, 40],
  evento: [90, 240], // planeta o Sol que pasa detrás de Marte
  galaxia: [120, 240],
};
export const MAXIMO = { asteroides: 3, cometas: 1, eventos: 1, galaxias: 1 };
export const DURACION_EVENTO_S = [15, 25];
export const DURACION_GALAXIA_S = [70, 100];

// Lo que puede pasar detrás de Marte. MARTE NO ESTÁ EN LA LISTA (regla del fondo). El Sol es el más raro.
export const EVENTOS = [
  { id: 'mercurio', peso: 1 },
  { id: 'venus', peso: 1 },
  { id: 'tierra', peso: 1 },
  { id: 'jupiter', peso: 1 },
  { id: 'saturno', peso: 1 },
  { id: 'urano', peso: 1 },
  { id: 'neptuno', peso: 1 },
  { id: 'sol', peso: 0.4 },
];

// Galaxias de fondo. Las tres activas son las de la especificación; las opcionales quedan apagadas.
// Canis Major Dwarf es una galaxia discutida: la lista de "más cercanas" depende de la fuente (NASA APOD 2007-11-04;
// NASA Space Place, "Satellite galaxies").
export const GALAXIAS = [
  { id: 'enana_canis_major', nombre: 'Enana del Can Mayor', activa: true },
  { id: 'enana_sagitario', nombre: 'Enana de Sagitario', activa: true },
  { id: 'gran_nube_magallanes', nombre: 'Gran Nube de Magallanes', activa: true },
  { id: 'pequena_nube_magallanes', nombre: 'Pequeña Nube de Magallanes', activa: false },
  { id: 'andromeda', nombre: 'Andrómeda', activa: false },
];

// Destellos sobre Marte: plata casi siempre; de vez en cuando lavanda, turquesa o ámbar (colores de assets/paletas.json).
export const DESTELLOS = { plata: '#dfe6f2', lavanda: '#c9a7ff', turquesa: '#4ce8d8', ambar: '#ffd166' };
export const PROB_PLATA = 0.7;

// Zona del botón de la columna: el agujero negro evita aparecer aquí (no tapa clics ni texto).
export const ZONA_BOTONES = { x0: 360, y0: 150, x1: 600, y1: 520 };

/** Generador con semilla (mulberry32): mismo número → misma secuencia (?semilla=N). */
export function crearRng(semilla) {
  let s = (Number(semilla) >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número entre a y b (intervalo cerrado-abierto). */
export const entre = (rng, [a, b]) => a + (b - a) * rng();

/** Espera hasta el siguiente evento de una clave de CADENCIA_S, en milisegundos. */
export const esperaMs = (rng, clave) => entre(rng, CADENCIA_S[clave]) * 1000;

/** Planeta o Sol a partir de los pesos de EVENTOS. Nunca devuelve Marte. */
export function elegirEvento(rng, eventos = EVENTOS) {
  const total = eventos.reduce((a, e) => a + e.peso, 0);
  let r = rng() * total;
  for (const e of eventos) {
    r -= e.peso;
    if (r < 0) return e.id;
  }
  return eventos[eventos.length - 1].id;
}

/** Galaxia activa distinta de la anterior (si hay más de una activa). */
export function elegirGalaxia(rng, anterior = null, galaxias = GALAXIAS) {
  const activas = galaxias.filter((g) => g.activa);
  const candidatas = activas.length > 1 ? activas.filter((g) => g.id !== anterior) : activas;
  return candidatas[Math.floor(rng() * candidatas.length)].id;
}

/** Color del destello sobre Marte: plata con PROB_PLATA; si no, uno de los otros tres. */
export function elegirDestello(rng) {
  if (rng() < PROB_PLATA) return 'plata';
  const otros = ['lavanda', 'turquesa', 'ambar'];
  return otros[Math.floor(rng() * otros.length)];
}

/** Posición del agujero negro: al menos `margen` px del borde y fuera de la columna de botones (si cabe). */
export function posicionAgujero(rng, { ancho = 960, alto = 540, margen = 80, evitar = ZONA_BOTONES, intentos = 30 } = {}) {
  let p = null;
  for (let i = 0; i < intentos; i++) {
    p = { x: entre(rng, [margen, ancho - margen]), y: entre(rng, [margen + 40, alto - margen]) };
    const enZona = p.x > evitar.x0 - 40 && p.x < evitar.x1 + 40 && p.y > evitar.y0 - 40 && p.y < evitar.y1 + 40;
    if (!enZona) return p;
  }
  return p;
}

/**
 * Regla del agujero negro (por regla, siempre): al volver de un nivel hay MÁS resultados que al salir del Menú.
 * `guardado` es null la primera vez (solo fija la línea base); "Continuar" y "Nueva partida" no suman resultados.
 */
export function evaluarRegreso(guardado, actual) {
  return guardado !== null && actual > guardado;
}

/** Forma de un asteroide: polígono en coordenadas de −1 a 1 (6 a 10 variantes). Cada punto es [x, y]. */
export function variantesAsteroide(rng, cantidad = 8) {
  const variantes = [];
  for (let v = 0; v < cantidad; v++) {
    const n = 7 + Math.floor(rng() * 4);
    const puntos = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const r = 0.62 + rng() * 0.38;
      puntos.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    variantes.push(puntos);
  }
  return variantes;
}
