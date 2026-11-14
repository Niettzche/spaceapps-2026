import { useCallback, useEffect, useMemo, useState } from 'react'
import { T } from './i18n'
import Game from './Game'
import MapView from './MapView'
import Sheet from './Sheet'
import Method from './Method'
import Sites, { SiteSheet } from './Sites'
import { ProjectHero, ProjectFooter } from './Project'

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
  const t = T[lang]

  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => {
    let active = true
    // sitios.json is optional: without it the page still works, just without the shortlist.
    const sitios = load('sitios.json').catch(() => [])
    Promise.all([...['juego.json', 'crateres.json', 'fichas.json', 'referencia.json', 'marte_llanuras.json'].map(load), sitios])
      .then(([juego, crateres, fichas, ref, llanuras, sites]) => { if (active) setData({ juego, crateres, fichas, ref, llanuras, sites: Array.isArray(sites) ? sites : [] }) })
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

  return (
    <>
      <a className="skip-link" href="#contenido">{lang === 'en' ? 'Skip to content' : 'Ir al contenido'}</a>
      <header className="top">
        <a className="brand" href="#inicio">{t.brand}</a>
        <nav aria-label="Sections">
          <a href="#juego">{t.nav_game}</a>
          {data?.sites.length > 0 && <a href="#sitios">{t.nav_sites}</a>}
          <a href="#mapa">{t.nav_map}</a>
          <a href="#metodo">{t.nav_method}</a>
          <a href="#mision">Misión Cero</a>
        </nav>
        <div className="lang" role="group" aria-label="Language">
          {['en', 'es'].map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'Español'}</button>
          ))}
        </div>
      </header>

      <main id="contenido">
      <ProjectHero lang={lang} />
      {err && <div className="notice" role="alert"><p>{t.nodata}</p><button className="ghost" onClick={() => { setErr(false); setAttempt((n) => n + 1) }}>{lang === 'en' ? 'Try again' : 'Reintentar'}</button></div>}
      {!data && !err && <p className="notice" role="status">{t.loading}</p>}
      {data && (
        <>
          <Game t={t} items={data.juego} imgBase={D + 'img/'} hasSheet={(id) => !!fichasById[id]} onOpen={setOpenId} />
          <Sites t={t} sites={data.sites} imgBase={D} onOpen={setSiteId} onShowMap={showOnMap} />
          <MapView t={t} craters={data.crateres} plains={data.llanuras} sites={data.sites} hasSheet={(id) => !!fichasById[id]} onOpen={setOpenId} onOpenSite={setSiteId} activeId={openId} focus={focus} />
          <Method t={t} refData={data.ref} craters={data.crateres} />
        </>
      )}
      <ProjectFooter lang={lang} />
      </main>
      {sheet && <Sheet t={t} f={sheet} imgBase={D + 'img/'} onClose={() => setOpenId(null)} />}
      {site && <SiteSheet t={t} s={site} imgBase={D} onClose={closeSite} onShowMap={showOnMap} />}
    </>
  )
}
