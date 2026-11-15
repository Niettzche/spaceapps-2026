import hero from './assets/web_portada_960x960.png'
import menu from '../../assets/pantallas/menu_fondo.png'
import workshop from '../../assets/pantallas/taller_fondo.png'
import dunes from '../../assets/pantallas/sitio_samalayuca.png'
import moon from '../../assets/menu/planeta_luna.png'
import mars from '../../assets/menu/planeta_marte.png'
import wheel from '../../assets/entidades/rueda_malla.png'
import radiator from '../../assets/entidades/deco_radiador.png'
import solar from '../../assets/entidades/deco_panel_solar_grande.png'
import step1 from '../../assets/tutorial/tutorial_1.png'
import step2 from '../../assets/tutorial/tutorial_2.png'
import step3 from '../../assets/tutorial/tutorial_3.png'
import step4 from '../../assets/tutorial/tutorial_4.png'

const copy = {
  en: {
    title: 'Train on Earth.', title2: 'Land on the Moon / Mars.',
    intro: 'Earth analogs. Rover experiments.',
    play: 'Play MARSCEPTION', explore: 'Explore the evidence', slides: 'Seven-slide overview',
    caption: 'Original MARSCEPTION art. Illustrative scene.',
    alt: 'Original pixel art of a rover arriving at a base on Mars.',
    scope: 'Mexico + Atacama, Arizona, Arabia', scopeNote: '3 of 10 prioritized arid regions. Candidates need review.',
    stats: [['9/11', 'Known craters detected'], ['~78%', 'Balanced classification accuracy'], ['296', 'Arid candidates']],
    statsDetail: 'Separate checks: 9/11 documented Mexican craters detected; about 78% Moon/Mars balanced accuracy with spatial groups; 296 arid candidates across the search. These figures do not measure mission success.',
    featuresTitle: 'One rover. Different conditions.',
    features: [
      ['Workshop', 'LRV mesh wheel', 'Radiator / large solar panel', 'Part sources and game values remain separate. Read the source notes in the workshop.'],
      ['Level conditions', 'Temperature / pressure / sunlight', 'Real inputs. Declared game rules.', 'Each level carries source notes. Climate inputs guide the simulation; damage and performance remain game approximations.'],
      ['Explorer', 'Live API when available', 'Bundled catalog without the API', 'The game explorer can request live model results. If the service is unavailable, the bundled site catalog and core game remain usable.'],
      ['Living menu', 'Orbiting worlds / pixel art', 'Keyboard / touch / reduced motion', 'The game menu combines Mauricio’s artwork with moving planets. Motion can reduce according to the device preference.'],
    ],
    details: 'Sources and details',
    pathTitle: 'A design improves through testing',
    path: [['Choose an analog', 'Compare the evidence'], ['Build a rover', 'Parts within a budget'], ['Test and improve', 'Slip. Change wheels. Retry.'], ['Deliver supplies', 'Mars or Moon mission']],
    pathNote: 'Illustrative game art. Prices, part stats and scores are game values (P).',
    limitsTitle: 'Where the analogy breaks down',
    limits: ['Gravity', 'Vacuum / thin air', 'Radiation / polar cold'],
    limitsNote: 'The results compare your Earth test and destination run. The game models slip; soft-soil sinkage stays outside its scope.',
    sourcesTitle: 'Open data. Visible limits.',
    sourcesText: 'Every site keeps its measurements, units, sources and missing values.',
    ai: 'AI assisted code, documentation, art and terrain labeling. Labels received external source checks.',
    method: 'Methodology', disclosure: 'AI disclosure', repo: 'Source code',
    controls: 'Arrows: drive / brake. Esc: pause. I: data. M: sound. L: language.',
    oldVideo: 'Earlier illustrated overview',
  },
  es: {
    title: 'Entrena en la Tierra.', title2: 'Llega a la Luna / Marte.',
    intro: 'Análogos terrestres. Experimentos con rovers.',
    play: 'Jugar MARSCEPTION', explore: 'Explorar la evidencia', slides: 'Resumen en siete diapositivas',
    caption: 'Arte original de MARSCEPTION. Escena ilustrativa.',
    alt: 'Pixel art original de un rover llegando a una base en Marte.',
    scope: 'México + Atacama, Arizona y Arabia', scopeNote: '3 de 10 regiones áridas priorizadas. Candidatos por revisar.',
    stats: [['9/11', 'Cráteres conocidos detectados'], ['~78%', 'Exactitud balanceada del clasificador'], ['296', 'Candidatos áridos']],
    statsDetail: 'Verificaciones distintas: 9/11 cráteres mexicanos documentados detectados; cerca de 78% de exactitud balanceada Luna/Marte con grupos espaciales; 296 candidatos áridos. Estas cifras no miden el éxito de una misión.',
    featuresTitle: 'Un rover. Condiciones diferentes.',
    features: [
      ['Taller', 'Rueda de malla LRV', 'Radiador / panel solar grande', 'Las fuentes de las piezas y los valores de juego se declaran por separado. Consulta las notas del taller.'],
      ['Condiciones por nivel', 'Temperatura / presión / luz', 'Datos reales. Reglas de juego declaradas.', 'Cada nivel conserva sus fuentes. El clima alimenta la simulación; el daño y el desempeño siguen siendo aproximaciones del juego.'],
      ['Explorador', 'API en vivo cuando está disponible', 'Catálogo incluido sin API', 'El explorador del juego puede pedir resultados al modelo en vivo. Si el servicio no está disponible, el catálogo incluido y el juego básico siguen funcionando.'],
      ['Menú vivo', 'Mundos en órbita / pixel art', 'Teclado / táctil / movimiento reducido', 'El menú del juego combina el arte de Mauricio con planetas animados. El movimiento se reduce según la preferencia del dispositivo.'],
    ],
    details: 'Fuentes y detalles',
    pathTitle: 'El diseño mejora con las pruebas',
    path: [['Elegir un análogo', 'Comparar la evidencia'], ['Armar el rover', 'Piezas dentro del presupuesto'], ['Probar y mejorar', 'Patinar. Cambiar ruedas. Repetir.'], ['Entregar suministros', 'Misión a Marte o la Luna']],
    pathNote: 'Arte ilustrativo del juego. Precios, piezas y puntuación son valores de juego (P).',
    limitsTitle: 'Dónde se rompe la analogía',
    limits: ['Gravedad', 'Vacío / aire tenue', 'Radiación / frío polar'],
    limitsNote: 'Los resultados comparan la prueba terrestre con la misión. El juego modela patinaje; el hundimiento del suelo queda fuera de su alcance.',
    sourcesTitle: 'Datos abiertos. Límites visibles.',
    sourcesText: 'Cada ficha conserva medidas, unidades, fuentes y valores faltantes.',
    ai: 'IA en código, documentación, arte y etiquetado de terrenos. Las etiquetas se contrastaron con fuentes externas.',
    method: 'Metodología', disclosure: 'Uso de IA', repo: 'Código fuente',
    controls: 'Flechas: conducir / frenar. Esc: pausa. I: datos. M: sonido. L: idioma.',
    oldVideo: 'Resumen ilustrado anterior',
  },
}

const sources = [
  ['NASA MODIS', 'https://modis.gsfc.nasa.gov/data/'],
  ['NASA POWER', 'https://power.larc.nasa.gov/'],
  ['NASA LRO / LOLA', 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm'],
  ['NASA MOLA + ESA HRSC', 'https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blend_dem_global_200m'],
  ['ESA Copernicus DEM', 'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM'],
  ['NASA GIBS', 'https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-standard-services/gibs'],
  ['Smithsonian GVP', 'https://volcano.si.edu/'],
  ['OpenStreetMap', 'https://www.openstreetmap.org/copyright'],
]
const REPO = 'https://github.com/Niettzche/spaceapps-2026'
function gameUrl(lang) {
  const value = import.meta.env.VITE_GAME_URL || import.meta.env.BASE_URL + 'game/'
  if (!/^(https?:\/\/|\/(?!\/)|\.\/)/i.test(value)) return null
  try {
    const url = new URL(value, 'https://local.invalid' + import.meta.env.BASE_URL)
    url.searchParams.set('lang', lang)
    return /^https?:\/\//i.test(value) ? url.href : url.pathname + url.search + url.hash
  } catch { return null }
}
export function ProjectHero({ lang }) {
  const c = copy[lang], game = gameUrl(lang)
  const featureImages = [workshop, dunes, step1, menu]
  return <>
    <section className="project-hero" id="inicio" aria-labelledby="project-title" style={{ '--menu-art': 'url("' + menu + '")' }}>
      <div className="hero-copy">
        <p className="eyebrow">MARSCEPTION / NASA SPACE APPS 2026</p>
        <h1 id="project-title">{c.title}<br /><span>{c.title2}</span></h1>
        <p className="hero-intro">{c.intro}</p>
        <div className="row">
          {game && <a className="primary" href={game}>{c.play}</a>}
          <a className="ghost" href="#mapa">{c.explore}</a>
          <a className="ghost" href={import.meta.env.BASE_URL + 'media/marsception_slides.pdf'}>{c.slides}</a>
        </div>
        <p className="scope-note"><strong>{c.scope}</strong><br />{c.scopeNote}</p>
      </div>
      <figure className="hero-visual">
        <div className="live-worlds" aria-hidden="true"><i className="world mars" style={{ backgroundImage: 'url("' + mars + '")' }} /><i className="world moon" style={{ backgroundImage: 'url("' + moon + '")' }} /></div>
        <img src={hero} alt={c.alt} fetchPriority="high" width="960" height="960" />
        <figcaption>{c.caption}</figcaption>
      </figure>
    </section>
    <section className="model-stats" aria-label={lang === 'en' ? 'Separate model checks' : 'Verificaciones distintas del modelo'}>
      <div className="stat-grid">{c.stats.map(([value, label]) => <div key={value}><strong>{value}</strong><span>{label}</span></div>)}</div>
      <details><summary>{c.details}</summary><p>{c.statsDetail}</p><a href={REPO + '/blob/main/model/VALIDATION.md'}>{c.method}</a></details>
    </section>
    <section className="feature-section" id="caracteristicas">
      <h2>{c.featuresTitle}</h2>
      <div className="feature-grid">{c.features.map(([title, key, detail, more], i) => <article className="pixel-card" key={title}>
        <img className="feature-art" src={featureImages[i]} alt="" loading="lazy" />
        <h3>{title}</h3><p className="feature-key">{key}</p><p>{detail}</p>
        {i === 0 && <div className="part-icons" aria-hidden="true">{[wheel, radiator, solar].map(src => <img key={src} src={src} alt="" />)}</div>}
        <details><summary>{c.details}</summary><p>{more}</p>{i === 0 && <a href={REPO + '/blob/main/docs/taller/PIEZAS.md'}>{c.method}</a>}</details>
      </article>)}</div>
    </section>
    <section className="golden-path"><h2>{c.pathTitle}</h2><div className="path-grid">
      {[step1, step2, step3, step4].map((src, i) => <article key={src}><img src={src} alt="" loading="lazy" width="96" height="64" /><h3><span>{i + 1}</span> {c.path[i][0]}</h3><p>{c.path[i][1]}</p></article>)}
    </div><p className="art-note">{c.pathNote}</p></section>
  </>
}
export function ProjectFooter({ lang }) {
  const c = copy[lang], game = gameUrl(lang)
  return <>
    <section className="mission-link" id="mision">
      <div><h2>{c.limitsTitle}</h2><ul className="limit-chips">{c.limits.map(x => <li key={x}>{x}</li>)}</ul><details><summary>{c.details}</summary><p>{c.limitsNote}</p><a href={REPO + '/blob/main/docs/METHODOLOGY_EN.md'}>{c.method}</a></details></div>
      <div>{game && <a className="primary" href={game}>{c.play}</a>}<p>{c.controls}</p></div>
    </section>
    <section className="project-sources" id="fuentes">
      <h2>{c.sourcesTitle}</h2><p>{c.sourcesText}</p>
      <ul>{sources.map(([name, url]) => <li key={name}><a href={url} target="_blank" rel="noreferrer">{name}</a></li>)}</ul>
      <div className="row"><a className="ghost" href={REPO + '/blob/main/docs/METHODOLOGY_EN.md'}>{c.method}</a><a className="ghost" href={REPO + '/blob/main/docs/USO_IA.md'}>{c.disclosure}</a></div>
      <details><summary>{lang === 'en' ? 'Tools and credits' : 'Herramientas y créditos'}</summary><p>Earth Engine / Python / React / Vite / MapLibre / Phaser / Matter.js</p><p>{c.ai}</p><p>Pixel art: Mauricio. Pixel art effects built with pixelfx (MIT License, © 2026 Patch and Hugo Duprez).</p></details>
      <details><summary>{c.oldVideo}</summary><video controls preload="none" aria-label={c.oldVideo}><source src={import.meta.env.BASE_URL + 'media/mision-cero-30s-en.mp4'} type="video/mp4" /><track kind="captions" src={import.meta.env.BASE_URL + 'media/mision-cero-30s-en.vtt'} srcLang="en" label="English" default /></video></details>
    </section>
    <footer className="project-footer"><strong>MARSCEPTION / NASA Space Apps 2026</strong><a href={REPO}>{c.repo}</a></footer>
  </>
}
