import { useEffect, useRef } from 'react'
import useSheet from './useSheet'

// Texts in sitios.json may be a plain string or { es, en }.
const tx = (v, lang) => (v == null ? '' : typeof v === 'string' ? v : v[lang] ?? v.es ?? v.en ?? '')

const ROLES = ['hallazgo principal', 'segundo hallazgo', 'control']
const EJES = ['forma', 'borde', 'material', 'gravedad', 'vacio', 'radiacion', 'temperatura', 'luz']
const LEVEL_CLASS = { funciona: 'ok', parcial: 'part', 'no aplica': 'na' }
// Typographic minus for negative values (rim heights below the surroundings).
const fmt = (v, d) => (v == null ? '—' : Number(v).toFixed(d).replace(/^-/, '−'))
const sortEjes = (list) => [...(list || [])].sort((a, b) => EJES.indexOf(a.eje) - EJES.indexOf(b.eje))

// Where the site sits between a Mars-like (0) and a Moon-like (1) crater, according to the Moon vs Mars model.
function SimBar({ t, p, compact }) {
  if (p == null) return null
  return (
    <div className={`sim${compact ? ' compact' : ''}`}>
      <div className="simtrack" role="img" aria-label={t.sim_aria(p.toFixed(2))}>
        <span className="simmark" style={{ left: `${p * 100}%` }}><b>{p.toFixed(2)}</b></span>
      </div>
      <div className="simends"><span>{t.mars}</span><span>{t.moon}</span></div>
    </div>
  )
}

function Cloud({ t, s }) {
  if (s.dentro_95 == null) return null
  return (
    <p className={`cloud ${s.dentro_95 ? 'in' : 'out'}`}>
      {s.dentro_95 ? t.in95 : t.out95}
      {s.dist != null && <span> · {t.dist(fmt(s.dist, 1))}</span>}
    </p>
  )
}

function Strip({ t, list }) {
  return (
    <ul className="strip" aria-label={t.breaks}>
      {sortEjes(list).map((r) => (
        <li key={r.eje} className={LEVEL_CLASS[r.nivel]} title={`${t.eje[r.eje] || r.eje}: ${t.nivel[r.nivel] || r.nivel}`}>
          <span className="sr">{t.eje[r.eje] || r.eje}: {t.nivel[r.nivel] || r.nivel}</span>
        </li>
      ))}
    </ul>
  )
}

function Card({ t, s, i, imgBase, onOpen, onShowMap }) {
  const m = s.medidas || {}
  return (
    <article className="card" style={{ '--i': i }}>
      <button className="cardimg" onClick={() => onOpen(s.id)} aria-label={`${t.open_site}: ${s.nombre}`}>
        {s.imagenes?.relieve ? <img src={imgBase + s.imagenes.relieve} alt="" width="320" height="320" loading="lazy" /> : <span className="noimg">{t.img_none}</span>}
      </button>
      <div className="cardbody">
        <h4>{s.nombre}</h4>
        <p className="meta"><i className={`dot ${s.tipo === 'mina' ? 'mina' : 'con_borde'}`} />{t.site_kind[s.tipo] || s.tipo} · {s.estado}</p>
        <dl className="nums">
          <div><dt>{t.diam}</dt><dd>{fmt(m.diam_km, 2)} km</dd></div>
          <div><dt>{t.depth}</dt><dd>{fmt(m.prof_m, 0)} m</dd></div>
          <div><dt>{t.ratio_short}</dt><dd>{fmt(m.prof_diam, 3)}</dd></div>
        </dl>
        <SimBar t={t} p={s.similitud?.P_Luna} compact />
        <Cloud t={t} s={s.similitud || {}} />
        <Strip t={t} list={s.se_rompe} />
        <div className="row">
          <button className="primary" onClick={() => onOpen(s.id)}>{t.open_site}</button>
          <button className="ghost" onClick={() => onShowMap(s)}>{t.show_map}</button>
        </div>
      </div>
    </article>
  )
}

// Marks a card grid so its cards rise in once, the first time it scrolls into view.
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0) return // already on screen: no entrance
    el.dataset.reveal = 'wait'
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      el.dataset.reveal = 'in'
      io.disconnect()
    }, { rootMargin: '0px 0px -60px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

function Group({ t, rol, list, imgBase, onOpen, onShowMap }) {
  const ref = useReveal()
  return (
    <div className="group">
      <h3>{t.rol[rol]}</h3>
      <p className="grouplede">{t.rol_p[rol]}</p>
      <div className="cards" ref={ref}>
        {list.map((s, i) => <Card key={s.id} t={t} s={s} i={i} imgBase={imgBase} onOpen={onOpen} onShowMap={onShowMap} />)}
      </div>
    </div>
  )
}

export default function Sites({ t, sites, imgBase, onOpen, onShowMap }) {
  if (!sites.length) return null
  const demo = sites.some((s) => s.demo)
  return (
    <section id="sitios" className="sites">
      <div className="siteshead">
        <h2>{t.sites_title}</h2>
        <p>{t.sites_sub(sites.length)}</p>
        {demo && <p className="demo" role="note"><b>{t.demo_title}.</b> {t.demo_p}</p>}
        <p className="legend">
          {['funciona', 'parcial', 'no aplica'].map((n) => <span key={n}><i className={`sw ${LEVEL_CLASS[n]}`} />{t.nivel[n]}</span>)}
          <span className="legend-note">{t.strip_note}</span>
        </p>
      </div>
      {ROLES.map((rol) => {
        const list = sites.filter((s) => s.rol === rol)
        if (!list.length) return null
        return <Group key={rol} t={t} rol={rol} list={list} imgBase={imgBase} onOpen={onOpen} onShowMap={onShowMap} />
      })}
    </section>
  )
}

export function SiteSheet({ t, s, imgBase, onClose, onShowMap }) {
  const { ref, close, onBackdrop } = useSheet(onClose)
  const m = s.medidas || {}
  const g = s.gemelo || {}
  const sim = s.similitud || {}
  const gRatio = g.prof_m != null && g.diam_km ? g.prof_m / (g.diam_km * 1000) : null
  const body = g.cuerpo === 'marte' ? 'marte' : 'luna'
  const rows = [
    [t.diam, fmt(m.diam_km, 2) + ' km', fmt(g.diam_km, 2) + ' km'],
    [t.depth, fmt(m.prof_m, 0) + ' m', fmt(g.prof_m, 0) + ' m'],
    [t.ratio, fmt(m.prof_diam, 3), fmt(gRatio, 3)],
    [t.rim, m.borde_m == null ? '—' : `${fmt(m.borde_m, 0)} m`, '—'],
  ]
  const where = (la, lo) => (la == null ? '' : `${la.toFixed(3)}°, ${lo.toFixed(3)}°`)

  return (
    <dialog ref={ref} className="sheet sitesheet" aria-labelledby={`site-${s.id}`} onClick={onBackdrop}>
      <article>
        <div className="sheetbar">
          <p className="rolechip">{t.rol[s.rol] || s.rol}{s.demo && <span className="demochip">{t.demo_title}</span>}</p>
          <button className="ghost" onClick={close}>{t.close}</button>
        </div>
        <div className="sitehead">
          <h2 id={`site-${s.id}`}>{s.nombre}</h2>
          <p className="kind"><i className={`dot ${s.tipo === 'mina' ? 'mina' : 'con_borde'}`} />{t.site_kind[s.tipo] || s.tipo} · {s.estado}</p>
        </div>

        <p className="summary">{tx(s.resumen, t.lang)}</p>

        <div className="twins">
          <figure>
            {s.imagenes?.relieve ? <img src={imgBase + s.imagenes.relieve} alt="" width="320" height="320" /> : <span className="noimg">{t.img_none}</span>}
            <figcaption>{t.here}<span>{where(s.lat, s.lon)}</span></figcaption>
          </figure>
          <figure className={body}>
            {s.imagenes?.gemelo ? <img src={imgBase + s.imagenes.gemelo} alt="" width="320" height="320" /> : <span className="noimg">{t.img_none}</span>}
            <figcaption>{t.twin_of[body]}<span>{g.nombre || t.unnamed} · {where(g.lat, g.lon)}</span></figcaption>
          </figure>
        </div>
        {s.imagenes?.satelite && (
          <figure className="sat"><img src={imgBase + s.imagenes.satelite} alt="" loading="lazy" /><figcaption>{t.sat_caption}</figcaption></figure>
        )}

        <h3>{t.side_by_side}</h3>
        <div className="tablewrap">
          <table className="cmp">
            <thead><tr><th>{t.measure}</th><th className="num">{t.here}</th><th className="num">{t.twin_short[body]}</th></tr></thead>
            <tbody>{rows.map(([k, a, b]) => <tr key={k}><td>{k}</td><td className="num">{a}</td><td className="num">{b}</td></tr>)}</tbody>
          </table>
        </div>

        <h3>{t.how_well}</h3>
        <p className="simlabel">{t.sim_label}</p>
        <SimBar t={t} p={sim.P_Luna} />
        <Cloud t={t} s={sim} />
        {sim.pct_lunar != null && <p className="pct">{t.pct(sim.pct_lunar)}</p>}

        <h3>{t.artemis_title}</h3>
        <ul className="uses">
          {(s.artemis || []).map((a, i) => <li key={i}><b>{t.uso[a.uso] || a.uso}.</b> {tx(a.texto, t.lang)}</li>)}
        </ul>

        <h3>{t.breaks}</h3>
        <ul className="rompe">
          {sortEjes(s.se_rompe).map((r) => (
            <li key={r.eje}>
              <span className="eje">{t.eje[r.eje] || r.eje}</span>
              <span className={`lvl ${LEVEL_CLASS[r.nivel]}`}><i className={`sw ${LEVEL_CLASS[r.nivel]}`} />{t.nivel[r.nivel] || r.nivel}</span>
              <span className="nota">{tx(r.nota, t.lang)}</span>
            </li>
          ))}
        </ul>

        <div className="row">
          <button className="primary" onClick={() => close().then(() => onShowMap(s))}>{t.show_map}</button>
          <a className="ghost" href={`https://www.google.com/maps/@${s.lat},${s.lon},3500m/data=!3m1!1e3`} target="_blank" rel="noreferrer">{t.open_sat}</a>
        </div>
      </article>
    </dialog>
  )
}
