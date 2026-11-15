// Dueño: frente taller. Piezas y tipos de robot del libro de Leo (docs/taller/Space_Apps_Game_Data.xlsx) que el juego
// MUESTRA pero no deja usar: no tienen mecánica en la física o no tienen referencia espacial verificada. Así "todas" las
// filas del Excel se ven en el Taller sin inventar física (AGENTS.md §3.3). No están en parts.json a propósito: la física
// y la validación solo conocen piezas jugables.
//
// razon: 'sin_referencia' (Gap en el libro), 'otra_mision' (el robot sirve para otro tipo de misión, no para llevar la carga
// por un recorrido lateral) o 'sin_mecanica' (el juego no simula ese efecto todavía).

export const RAZONES = {
  sin_referencia: { es: 'sin referencia espacial verificada', en: 'no verified space reference', corto: 'sin fuente', corto_en: 'no source' },
  otra_mision: { es: 'otro tipo de misión', en: 'a different kind of mission', corto: 'otra misión', corto_en: 'other job' },
  sin_mecanica: { es: 'el juego aún no simula este efecto', en: 'the game does not simulate this yet', corto: 'no simulada', corto_en: 'not modeled' },
};

export const BLOQUEADAS = [
  { id: 'orugas', excel: 'RT-002', estado: 'Gap', razon: 'sin_referencia', icono: 'iconos/ico_suelo',
    nombre: 'Orugas', nombre_en: 'Tracks', detalle: 'El libro no tiene un robot espacial con orugas (Gap): faltan referencia y parámetros de suelo.',
    detalle_en: 'The workbook has no tracked space robot (Gap): reference and soil parameters are missing.' },
  { id: 'patas', excel: 'RT-003', estado: 'Gap', razon: 'sin_referencia', icono: 'iconos/ico_pendiente',
    nombre: 'Patas', nombre_en: 'Legs', detalle: 'Caminante con patas: sin referencia espacial en el libro (Gap); todos sus números serían inventados.',
    detalle_en: 'Legged walker: no space reference in the workbook (Gap); every number would be made up.' },
  { id: 'rappel', excel: 'RT-004 · AB-006', estado: 'Verified', razon: 'otra_mision', icono: 'iconos/ico_subida',
    nombre: 'Rappel (Axel)', nombre_en: 'Rappel (Axel)', detalle: 'Axel de JPL baja acantilados y cuevas colgado de un cable (S17): es para bajar paredes, no para cruzar un recorrido.',
    detalle_en: 'JPL Axel rappels cliffs and caves on a tether (S17): it descends walls, it does not cross a route.' },
  { id: 'rotor', excel: 'RT-005 · AB-007', estado: 'Verified', razon: 'otra_mision', icono: 'iconos/ico_aire',
    nombre: 'Rotor (Ingenuity)', nombre_en: 'Rotor (Ingenuity)', detalle: 'Ingenuity (1.8 kg) explora volando, no lleva carga y no vuela en la Luna sin aire (S16, S53).',
    detalle_en: 'Ingenuity (1.8 kg) scouts by flying, carries no payload and cannot fly on the airless Moon (S16, S53).' },
  { id: 'serpiente', excel: 'RT-006 · AB-008', estado: 'Draft', razon: 'otra_mision', icono: 'iconos/ico_suelo',
    nombre: 'Serpiente (EELS)', nombre_en: 'Snake (EELS)', detalle: 'EELS es un concepto para hielo, cuevas y grietas (S49, Draft): otro tipo de misión.',
    detalle_en: 'EELS is a concept for ice, caves and crevasses (S49, Draft): a different kind of mission.' },
  { id: 'direccion_independiente', excel: 'AB-001', estado: 'Verified', razon: 'sin_mecanica', icono: 'iconos/rueda_estandar',
    nombre: 'Dirección independiente', nombre_en: 'Independent steering', detalle: 'VIPER gira cada rueda por separado (S34); la prueba es de lado (2D) y no hay giros que mejorar.',
    detalle_en: 'VIPER steers each wheel on its own (S34); the test is side-on (2D), so there are no turns to improve.' },
  { id: 'sellos_polvo', excel: 'AB-003 · MT-007', estado: 'Verified', razon: 'sin_mecanica', icono: 'iconos/ico_aire',
    nombre: 'Sellos antipolvo', nombre_en: 'Dust seals', detalle: 'VIPER sella sus motores contra el polvo lunar (S34); el juego no simula desgaste por polvo.',
    detalle_en: 'VIPER seals its wheel motors against lunar dust (S34); the game does not simulate dust wear.' },
  { id: 'sensor_sol', excel: 'AB-009', estado: 'Verified', razon: 'sin_mecanica', icono: 'iconos/ico_luz',
    nombre: 'Ruta con sol', nombre_en: 'Sun-chasing route', detalle: 'En el polo sur lunar, planear la ruta acorta la noche de ~354 h a ~36 h (S33); el recorrido del juego es fijo.',
    detalle_en: 'At the lunar south pole, route planning cuts the night from ~354 h to ~36 h (S33); the game route is fixed.' },
  { id: 'hibernacion', excel: 'AB-010', estado: 'Draft', razon: 'sin_mecanica', icono: 'iconos/ico_luz',
    nombre: 'Hibernación', nombre_en: 'Hibernation', detalle: 'Opportunity calló en una tormenta de polvo en 2018 (S51, S52); el juego no tiene tormentas.',
    detalle_en: 'Opportunity went silent in a 2018 dust storm (S51, S52); the game has no storms.' },
  { id: 'blindaje', excel: 'AB-011 · MT-009', estado: 'Draft', razon: 'sin_mecanica', icono: 'iconos/ico_radiacion',
    nombre: 'Blindaje de radiación', nombre_en: 'Radiation shield', detalle: 'Los materiales con hidrógeno protegen mejor (S40); la radiación es un límite declarado, no se simula.',
    detalle_en: 'Hydrogen-rich materials shield better (S40); radiation is a declared limit, not simulated.' },
  { id: 'rueda_goma', excel: 'MT-012', estado: 'Gap', razon: 'sin_referencia', icono: 'iconos/rueda_estandar',
    nombre: 'Rueda de goma', nombre_en: 'Rubber tire', detalle: 'Llanta de hule para pruebas en la Tierra: sin fuente en el libro (Gap) y no apta para el espacio.',
    detalle_en: 'Rubber tire for Earth tests: no source in the workbook (Gap) and not flight-proven.' },
];
