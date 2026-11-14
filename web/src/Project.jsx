const hero = import.meta.env.BASE_URL + 'data/img/j_tierra_MX0261.png'

const copy = {
  en: {
    title: 'Find Earth’s next training ground.',
    intro: 'Compare terrestrial terrain with the Moon and Mars. Explore crater-like landforms, inspect the evidence, and discover what a rover could test before leaving Earth.',
    explore: 'Explore the evidence', quiz: 'Try the terrain quiz',
    caption: 'Rincón de Parangueo, Mexico · elevation-derived relief from Copernicus DEM (ESA), rendered with synthetic light; not a photograph. 12.8 km across, source resolution 200 m.',
    scope: 'Mexico is our validated case study. The global search has covered Atacama, Arizona and Arabia: 3 of 10 prioritized arid regions, not the entire planet.',
    steps: [
      ['01 / DISCOVER', 'Start with terrain', 'One detector measures crater-like depressions across Earth, the lunar south pole and Mars at a shared resolution of source resolution 200 m.'],
      ['02 / COMPARE', 'Read the evidence', 'Compare depth and diameter, inspect candidate sites and see where gravity, atmosphere and radiation break the analogy.'],
      ['03 / EXPERIMENT', 'Prepare a mission', 'Misión Cero is the companion rover game: build, test on an Earth analog, then attempt a Moon or Mars delivery. Game balance is separate from scientific evidence.'],
    ],
    mission: 'From a place to a mission.',
    missionText: 'The explorer identifies candidate training terrain. The companion game turns that question into an experiment with robot design, terrain and gravity.',
    play: 'Open Misión Cero', pending: 'Game preview coming soon', pendingText: 'The rover game is being integrated. You can already explore the map and play the terrain quiz above.',
    sources: 'Open data. Explicit limits.',
    sourceText: 'The current terrain comparison uses these sources. A similar landform does not establish matching geology, environmental conditions or safe field access.',
    repo: 'Source code', ai: 'AI-assisted code and documentation. Candidate sites require scientific review.',
  },
  es: {
    title: 'La próxima misión empieza en la Tierra.',
    intro: 'Compara el terreno terrestre con la Luna y Marte. Explora formas tipo cráter, revisa la evidencia y descubre qué podría probar un rover antes de salir de la Tierra.',
    explore: 'Explorar la evidencia', quiz: 'Probar el quiz de terrenos',
    caption: 'Rincón de Parangueo, México · relieve del DEM Copernicus (ESA), con iluminación sintética; no es una fotografía. Ventana de 12.8 km, resolución de origen 200 m.',
    scope: 'México es nuestro caso validado. La búsqueda global cubre Atacama, Arizona y Arabia: 3 de 10 regiones áridas priorizadas, no todo el planeta.',
    steps: [
      ['01 / DESCUBRIR', 'Comenzar por el terreno', 'El mismo detector mide depresiones tipo cráter en la Tierra, el polo sur lunar y Marte a una resolución común de resolución de origen 200 m.'],
      ['02 / COMPARAR', 'Revisar la evidencia', 'Compara profundidad y diámetro, inspecciona candidatos y conoce dónde la gravedad, la atmósfera y la radiación rompen la analogía.'],
      ['03 / EXPERIMENTAR', 'Preparar una misión', 'Misión Cero es el juego de rovers complementario: construye, prueba en un análogo terrestre e intenta una entrega lunar o marciana. El balance del juego es independiente de la evidencia científica.'],
    ],
    mission: 'De un lugar a una misión.',
    missionText: 'El explorador identifica terrenos candidatos para entrenar. El juego complementario transforma esa pregunta en un experimento con diseño de robots, relieve y gravedad.',
    play: 'Abrir Misión Cero', pending: 'Próximamente: juego de rovers', pendingText: 'El juego de rovers está en integración. Ya puedes explorar el mapa y jugar el quiz de terrenos de arriba.',
    sources: 'Datos abiertos. Límites explícitos.',
    sourceText: 'La comparación actual del terreno utiliza estas fuentes. Una forma similar no demuestra que coincidan la geología o el ambiente, ni garantiza acceso seguro al sitio.',
    repo: 'Código fuente', ai: 'Código y documentación asistidos por IA. Los sitios candidatos requieren revisión científica.',
  },
}

const sources = [
  ['NASA · MODIS', 'https://modis.gsfc.nasa.gov/data/'],
  ['NASA · LRO / LOLA', 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm'],
  ['NASA / ESA · MOLA + HRSC', 'https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blend_dem_global_200m'],
  ['ESA · Copernicus DEM', 'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM'],
  ['NASA · GIBS', 'https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-standard-services/gibs'],
  ['Smithsonian · Global Volcanism Program', 'https://volcano.si.edu/'],
  ['OpenStreetMap', 'https://www.openstreetmap.org/copyright'],
]

export function ProjectHero({ lang }) {
  const c = copy[lang]
  return <>
    <section className="project-hero" id="inicio" aria-labelledby="project-title">
      <div className="hero-copy">
        <p className="eyebrow">NASA SPACE APPS 2026 · UDEM</p>
        <h1 id="project-title">{c.title}</h1>
        <p className="hero-intro">{c.intro}</p>
        <div className="row"><a className="primary" href="#mapa">{c.explore} ↗</a><a className="ghost" href="#juego">{c.quiz}</a></div>
        <p className="scope-note">{c.scope}</p>
      </div>
      <figure className="hero-visual"><img src={hero} alt="" fetchPriority="high" /><figcaption>{c.caption}</figcaption></figure>
    </section>
    <section className="project-steps" aria-label={lang === 'en' ? 'How to explore' : 'Cómo explorar'}>
      {c.steps.map(([number, title, text]) => <article key={number}><p className="eyebrow">{number}</p><h2>{title}</h2><p>{text}</p></article>)}
    </section>
  </>
}

export function ProjectFooter({ lang }) {
  const c = copy[lang]
  const configured = import.meta.env.VITE_GAME_URL
  const gameUrl = configured && /^(https?:\/\/|\/(?!\/)|\.\/)/i.test(configured) ? configured : null
  return <>
    <section className="mission-link" id="mision">
      <div><p className="eyebrow">MISIÓN CERO</p><h2>{c.mission}</h2><p>{c.missionText}</p></div>
      <div>{gameUrl ? <a className="primary" href={gameUrl}>{c.play} ↗</a> : <><strong>{c.pending}</strong><p>{c.pendingText}</p></>}</div>
    </section>
    <section className="project-sources" id="fuentes" aria-labelledby="sources-title">
      <h2 id="sources-title">{c.sources}</h2><p>{c.sourceText}</p>
      <p>{lang === 'en' ? 'Built with' : 'Herramientas'}: <a href="https://earthengine.google.com/">Google Earth Engine</a> · <a href="https://react.dev/">React</a> · <a href="https://vite.dev/">Vite</a> · <a href="https://maplibre.org/">MapLibre</a>.</p>
      <ul>{sources.map(([name, url]) => <li key={name}><a href={url} target="_blank" rel="noreferrer">{name} ↗</a></li>)}</ul>
    </section>
    <footer className="project-footer"><div><strong>Cráter Gemelo + Misión Cero · NASA Space Apps 2026</strong><p>{c.ai}</p></div><a href="https://github.com/Niettzche/spaceapps-2026">{c.repo} ↗</a></footer>
  </>
}
