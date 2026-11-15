import bayda from '../../assets/pantallas/sitio_g00266.png'
import tenoumer from '../../assets/pantallas/sitio_tenoumer.png'
import cananea from '../../assets/pantallas/sitio_mx0023.png'
import pinacate from '../../assets/pantallas/sitio_pinacate.png'
import pingualuit from '../../assets/pantallas/sitio_pingualuit.png'
import samalayuca from '../../assets/pantallas/sitio_samalayuca.png'

// Recommendations describe game balance, not certified equipment for field work.
// Sources: docs/juego/NIVELES_DESTACADOS.md and docs/taller/FUENTES_NIVELES.md.
const levels = [
  { id: 'g00266', name: 'Jabal Bayda', image: bayda,
    en: ['Tuff ring / loose terrain', 'Lapilli patches, volcanic bombs, gusts', 'Wide or mesh wheels', 'Comendite tuff ring. Loose patches use generic sand parameters (P), not measured lapilli.'],
    es: ['Anillo de toba / suelo suelto', 'Lapilli, bombas volcánicas y ráfagas', 'Ruedas anchas o de malla', 'Anillo de toba de comendita. Los parches usan arena genérica (P), no parámetros medidos de lapilli.'] },
  { id: 'tenoumer', name: 'Tenoumer', image: tenoumer,
    en: ['Sahara impact crater / rim crossing', 'Sand, ejecta blocks, dust devils', 'Mesh wheels + strapped support', 'A real impact crater; block sizes and spacing are game recreations (P). Wide-wheel outcomes vary.'],
    es: ['Impacto en el Sáhara / cruzar el borde', 'Arena, bloques de eyecta y remolinos', 'Ruedas de malla + soporte con correas', 'Cráter de impacto real; tamaños y separación de bloques recreados (P). La rueda ancha no siempre llega.'] },
  { id: 'mx0023', name: 'Cananea', image: cananea,
    en: ['Open pit / operational analogy', 'Ramps, loose talus, falling rocks', 'Wide or mesh wheels', 'Our proposed operational comparison for lunar resource work, not a published geological analog. Slopes and talus are simplified (P).'],
    es: ['Tajo / analogía operativa', 'Rampas, talud suelto y desprendimientos', 'Ruedas anchas o de malla', 'Comparación operativa propuesta para recursos lunares, no análogo geológico publicado. Rampas y talud simplificados (P).'] },
  { id: 'pinacate', name: 'Pinacate', image: pinacate,
    en: ['Basaltic field / Apollo 14 training', 'Recreated aa lava blocks', 'Reinforced or titanium chassis', 'NASA trained Apollo 14 here. Recreated blocks test protection and careful driving; lunar mare surfaces are regolith, not exposed aa blocks.'],
    es: ['Campo basáltico / entrenamiento Apolo 14', 'Bloques de lava aa recreados', 'Chasis reforzado o de titanio', 'La NASA entrenó aquí al Apolo 14. Los bloques prueban protección y conducción cuidadosa; los mares lunares tienen regolito, no bloques aa expuestos.'] },
  { id: 'pingualuit', name: 'Pingualuit', image: pingualuit,
    en: ['Arctic impact crater / cold terrain', 'Snow patches, ice, strong gusts', 'Wide or mesh wheels', 'Snow uses loose-sand behavior (P). It is not a validated Moon/Mars soil analog; the heater helps with the mild cold penalty but does not decide the outcome.'],
    es: ['Impacto ártico / terreno frío', 'Nieve, hielo y ráfagas fuertes', 'Ruedas anchas o de malla', 'La nieve usa arena suelta (P). No es un análogo validado del suelo lunar o marciano; el calentador ayuda, pero no decide el resultado.'] },
  { id: 'samalayuca', name: 'Samalayuca', image: samalayuca,
    en: ['Dunes / Martian aeolian processes', 'Loose sand and dune climbs', 'Wide wheels', 'Earth and Mars dunes share processes. Samalayuca is our proposed site; wind and dust events here are visual and preserve the golden-path balance.'],
    es: ['Dunas / procesos eólicos de Marte', 'Arena suelta y subida de dunas', 'Ruedas anchas', 'Las dunas terrestres y marcianas comparten procesos. Samalayuca es una propuesta nuestra; viento y remolinos son visuales para conservar el balance.'] },
  { id: 'mx0261', name: 'Rincón de Parangueo',
    image: import.meta.env.BASE_URL + 'data/img/MX0261.png', relief: true,
    en: ['Dry maar lake / lunar shape comparison', 'Salt crust, recreated mud, long climb', 'Medium or large battery', 'The game targets the lunar south pole by shape; salt is terrestrial. The evaporating-lake comparison with Mars is our proposal, with different salts.'],
    es: ['Maar seco / comparación de forma lunar', 'Costra salina, lodo recreado y subida larga', 'Batería mediana o grande', 'El juego apunta al polo sur lunar por la forma; la sal es terrestre. La comparación con lagos evaporados de Marte es propuesta nuestra, con sales distintas.'] },
]

export default function FeaturedLevels({ lang }) {
  const en = lang === 'en'
  return <section className="featured-levels" id="niveles" aria-labelledby="levels-title">
    <h2 id="levels-title">{en ? 'Seven Earth tests' : 'Siete pruebas terrestres'}</h2>
    <p>{en ? 'Different terrain. Different design choices.' : 'Terrenos distintos. Decisiones de diseño distintas.'}</p>
    <div className="levels-grid">{levels.map(level => {
      const [analogy, obstacles, part, note] = level[lang]
      return <article className="pixel-card" key={level.id}>
        <img className="feature-art" src={level.image} alt="" loading="lazy" width="320" height="180" />
        <p className="level-art-note">{level.relief ? (en ? 'Elevation-derived relief' : 'Relieve derivado del DEM') : (en ? 'Illustrative game art' : 'Arte ilustrativo del juego')}</p>
        <h3>{level.name}</h3><p className="feature-key">{analogy}</p>
        <dl><dt>{en ? 'Obstacles' : 'Obstáculos'}</dt><dd>{obstacles}</dd>
          <dt>{en ? 'Try in the game' : 'Prueba en el juego'}</dt><dd>{part}</dd></dl>
        <details><summary>{en ? 'Evidence and limits' : 'Evidencia y límites'}</summary><p>{note}</p></details>
        <a className="ghost" href={'?sitio=' + level.id + '&lang=' + lang}>{en ? 'Open site evidence' : 'Abrir ficha del sitio'}</a>
      </article>
    })}</div>
    <p className="art-note">{en ? 'Added obstacles are declared recreations. Parts and balance are game values (P); a recommendation does not certify real rover performance.' : 'Los obstáculos añadidos son recreaciones declaradas. Piezas y balance son valores de juego (P); una recomendación no certifica un rover real.'}</p>
    <a href="https://github.com/Niettzche/spaceapps-2026/blob/main/docs/juego/NIVELES_DESTACADOS.md">{en ? 'Level sources and game rules' : 'Fuentes y reglas de los niveles'}</a>
  </section>
}
