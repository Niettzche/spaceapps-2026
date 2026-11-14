import { useEffect, useMemo, useState } from 'react'
import { T } from './i18n'
import Game from './Game'
import MapView from './MapView'
import Sheet from './Sheet'
import Method from './Method'

const D = import.meta.env.BASE_URL + 'data/'
const load = (f) => fetch(D + f).then((r) => { if (!r.ok) throw new Error(f); return r.json() })

export default function App() {
  const [lang, setLang] = useState(() => (navigator.language || 'en').startsWith('es') ? 'es' : 'en')
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)
  const [openId, setOpenId] = useState(null)
  const t = T[lang]

  useEffect(() => { document.documentElement.lang = lang }, [lang])
  useEffect(() => {
    Promise.all(['juego.json', 'crateres.json', 'fichas.json', 'referencia.json', 'marte_llanuras.json'].map(load))
      .then(([juego, crateres, fichas, ref, llanuras]) => setData({ juego, crateres, fichas, ref, llanuras }))
      .catch(() => setErr(true))
  }, [])

  const fichasById = useMemo(() => Object.fromEntries((data?.fichas || []).map((f) => [f.id, f])), [data])
  const sheet = openId ? fichasById[openId] : null

  return (
    <>
      <header className="top">
        <a className="brand" href="#juego">{t.brand}</a>
        <nav aria-label="Sections">
          <a href="#juego">{t.nav_game}</a>
          <a href="#mapa">{t.nav_map}</a>
          <a href="#metodo">{t.nav_method}</a>
        </nav>
        <div className="lang" role="group" aria-label="Language">
          {['en', 'es'].map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'en' ? 'English' : 'Español'}</button>
          ))}
        </div>
      </header>

      {err && <p className="notice">{t.nodata}</p>}
      {!data && !err && <p className="notice">{t.loading}</p>}
      {data && (
        <main>
          <Game t={t} items={data.juego} imgBase={D + 'img/'} hasSheet={(id) => !!fichasById[id]} onOpen={setOpenId} />
          <MapView t={t} craters={data.crateres} plains={data.llanuras} hasSheet={(id) => !!fichasById[id]} onOpen={setOpenId} activeId={openId} />
          <Method t={t} refData={data.ref} craters={data.crateres} />
        </main>
      )}
      {sheet && <Sheet t={t} f={sheet} imgBase={D + 'img/'} onClose={() => setOpenId(null)} />}
    </>
  )
}
