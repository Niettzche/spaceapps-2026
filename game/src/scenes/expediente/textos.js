// Dueño: frente expediente. Etiquetas legibles para claves de los contratos de datos (data/schema/).
// Solo traducen nombres: nunca agregan valores. Una clave desconocida se muestra "humanizada".

export const VARIABLES = {
  forma: 'Forma del cráter',
  oscilacion_termica: 'Oscilación térmica diaria',
  precipitacion: 'Precipitación',
  ndvi: 'Vegetación (NDVI)',
  pendiente: 'Pendiente media',
  diametro: 'Diámetro',
  profundidad: 'Profundidad',
  profundidad_diametro: 'Profundidad / diámetro',
  borde: 'Altura del borde',
  ndvi_p90: 'NDVI percentil 90',
};

export const ESTADOS = {
  documentado: { texto: 'DOCUMENTADO', color: '#06d6a0' },
  candidato_modelo: { texto: 'CANDIDATO DEL MODELO', color: '#ffd166' },
  propuesto_usuario: { texto: 'PROPUESTO POR USUARIO', color: '#9aa4c7' },
  ilustrativo: { texto: 'ILUSTRATIVO', color: '#ef476f' },
  // No es un estado del contrato: se muestra en lugar del estado cuando el sitio es un tajo minero (esMina).
  mina: { texto: 'ANÁLOGO OPERATIVO (MINA)', color: '#f2701f' },
};

export const LIMITES = {
  gravedad: 'Gravedad',
  presion: 'Presión atmosférica',
  presion_atmosferica: 'Presión atmosférica',
  radiacion: 'Radiación',
  vacio: 'Vacío',
  iluminacion_polar_rasante: 'Iluminación polar rasante',
};

export const PRUEBAS = { agarre: 'agarre', relieve: 'relieve', energia: 'energía' };

export const MUNDOS = { marte: 'Marte', luna: 'Luna' };

export function humanizar(clave) {
  const s = String(clave).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const etiquetaVariable = (k) => VARIABLES[k] || humanizar(k);
export const etiquetaLimite = (k) => LIMITES[k] || humanizar(k);
