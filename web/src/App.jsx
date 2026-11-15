import { useCallback, useEffect, useMemo, useState } from 'react'
import { T } from './i18n'
import Game from './Game'
import MapView from './MapView'
import Sheet from './Sheet'
import Method from './Method'
import Sites, { SiteSheet } from './Sites'
import { ProjectHero, ProjectFooter } from './Project'
import ModelSheet from './ModelSheet'
import { resolveSiteLink } from './siteLink'

const modelSites = Object.values(import.meta.glob('../../data/sites/*.json', { eager: true, import: 'default' }))
const targets = Object.values(import.meta.glob('../../data/targets/*.json', { eager: true, import: 'default' }))

const D = import.meta.env.BASE_URL + 'data/'
const load = (f) => fetch(D + f).then((r) => { if (!r.ok) throw new Error(f); return r.json() })

export default function App() {
  const [lang, setLang] = useState('en')
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [siteId, setSiteId] = useState(null)
  const [focus, setFocus] = useState(null)
  const [modelId, setModelId] = useState(null)
  const [missingLink, setMissingLink] = useState(false)
  const t = T[lang]

  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => {
    let active = true
    // sitios.json is optional: without it the page still works, just without the shortlist.
    const sitios = load('sitios.json').catch(() => [])
    Promise.all([...['juego.json', 'crateres.json', 'fichas.json', 'referencia.json', 'marte_llanuras.json'].map(load), sitios])
      .then(([juego, crateres, fichas, ref, llanuras, sites]) => {
        if (!active) return
        const shortlist = Array.isArray(sites) ? sites : []
        setData({ juego, crateres, fichas, ref, llanuras, sites: shortlist })
        const link = resolveSiteLink(window.location.search, modelSites, shortlist, fichas)
        if (link?.kind === 'model') setModelId(link.id)
        if (link?.kind === 'site') setSiteId(link.id)
        if (link?.kind === 'sheet') setOpenId(link.id)
        setMissingLink(link?.kind === 'missing')
      })
      .catch(() => { if (active) setErr(true) })
    return () => { active = false }
  }, [attempt])

  const fichasById = useMemo(() => Object.fromEntries((data?.fichas || []).map((f) => [f.id, f])), [data])
  const sheet = openId ? fichasById[openId] : null
  const site = siteId ? data?.sites.find((s) => s.id === siteId) : null

  const showOnMap = useCallback((s) => {
    setFocus({ lon: s.lon, lat: s.lat, id: s.id, n: Date.now() })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('mapa')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [])
  const closeSite = useCallback(() => setSiteId(null), [])
  const closeModel = useCallback(() => setModelId(null), [])
  const modelSite = modelSites.find(s => s.id === modelId)

  return (
    <>
      <a className="skip-link" href="#contenido">{lang === 'en' ? 'Skip to content' : 'Ir al contenido'}</a>
      <header className="top">
        <a className="brand" href="#inicio">{t.brand}</a>
        <nav aria-label="Sections">
          <a href="#juego" onClick={() => document.getElementById('quiz')?.setAttribute('open', '')}>{t.nav_game}</a>
          {data?.sites.length > 0 && <a href="#sitios">{t.nav_sites}</a>}
          <a href="#mapa">{t.nav_map}</a>
          <a href="#metodo" onClick={() => document.getElementById('metodologia')?.setAttribute('open', '')}>{t.nav_method}</a>
          <a href="#mision">MARSCEPTION</a>
        </nav>
        <div className="lang" role="group" aria-label="Language">
          {['en', 'es'].map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'Español'}</button>
          ))}
        </div>
      </header>

      <main id="contenido">
      <ProjectHero lang={lang} />
      {missingLink && <p className="notice" role="status">{lang === 'en' ? 'The requested site is not in this catalog.' : 'El sitio solicitado no está en este catálogo.'}</p>}
      {err && <div className="notice" role="alert"><p>{t.nodata}</p><button className="ghost" onClick={() => { setErr(false); setAttempt((n) => n + 1) }}>{lang === 'en' ? 'Try again' : 'Reintentar'}</button></div>}
      {!data && !err && <p className="notice" role="status">{t.loading}</p>}
      {data && (
        <>
          <details className="explorer-detail" id="quiz"><summary>{lang === 'en' ? 'Terrain quiz / Earth, Moon or Mars?' : 'Quiz de terrenos / Tierra, Luna o Marte'}</summary><Game t={t} items={data.juego} imgBase={D + 'img/'} hasSheet={(id) => !!fichasById[id]} onOpen={setOpenId} /></details>
          <Sites t={t} sites={data.sites} imgBase={D} onOpen={setSiteId} onShowMap={showOnMap} />
          <MapView t={t} craters={data.crateres} plains={data.llanuras} sites={data.sites} hasSheet={(id) => !!fichasById[id]} onOpen={setOpenId} onOpenSite={setSiteId} activeId={openId} focus={focus} />
          <details className="explorer-detail" id="metodologia"><summary>{lang === 'en' ? 'Method / sources and validation' : 'Método / fuentes y validación'}</summary><Method t={t} refData={data.ref} craters={data.crateres} /></details>
        </>
      )}
      <ProjectFooter lang={lang} />
      </main>
      {sheet && <Sheet t={t} f={sheet} imgBase={D + 'img/'} onClose={() => setOpenId(null)} />}
      {site && <SiteSheet t={t} s={site} imgBase={D} onClose={closeSite} onShowMap={showOnMap} />}
      {modelSite && <ModelSheet site={modelSite} target={targets.find(t => t.id === modelSite.destino_ref)} lang={lang} onClose={closeModel} />}
    </>
  )
}
