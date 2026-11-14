import { useMemo, useState } from 'react'

const BODIES = ['tierra', 'luna', 'marte']
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]] } return b }

// Two terrains per world. One of the Earth rounds is always a named crater, so the reveal has a story.
function deal(items) {
  const by = (c) => shuffle(items.filter((x) => x.cuerpo === c))
  const earth = by('tierra')
  const named = earth.filter((x) => x.lugar && x.lugar !== 'México')
  const pin = named.find((x) => x.lugar.includes('Pinacate')) || named[0]
  const other = earth.find((x) => x !== pin)
  return shuffle([pin, other, ...by('luna').slice(0, 2), ...by('marte').slice(0, 2)].filter(Boolean))
}

export default function Game({ t, items, imgBase, hasSheet, onOpen }) {
  const [rounds, setRounds] = useState(() => deal(items))
  const [i, setI] = useState(0)
  const [pick, setPick] = useState(null)
  const [score, setScore] = useState(0)
  const done = i >= rounds.length
  const cur = rounds[Math.min(i, rounds.length - 1)]
  const label = { tierra: t.earth, luna: t.moon, marte: t.mars }
  const id = useMemo(() => (cur.cuerpo === 'tierra' ? cur.img.replace('j_tierra_', '').replace('.png', '') : null), [cur])

  const answer = (b) => { if (pick) return; setPick(b); if (b === cur.cuerpo) setScore((s) => s + 1) }
  const restart = () => { setRounds(deal(items)); setI(0); setPick(null); setScore(0) }

  return (
    <section id="juego" className="game">
      <figure className="terrain">
        <img src={imgBase + cur.img} alt="" width="320" height="320" />
        <figcaption>12.8 km</figcaption>
      </figure>

      <div className="panel">
        {!done && (
          <>
            <h1>{t.q}</h1>
            <p className="lede">{t.q_sub}</p>
            <div className="answers">
              {BODIES.map((b) => (
                <button key={b} className={`ans ans-${b}`} disabled={!!pick} data-state={pick ? (b === cur.cuerpo ? 'right' : b === pick ? 'wrong' : 'off') : 'idle'} onClick={() => answer(b)}>
                  {label[b]}
                </button>
              ))}
            </div>
            <p className="count">{t.round(i + 1, rounds.length)}</p>

            <div className="reveal" aria-live="polite">
              {pick && (
                <>
                  <p className="verdict">{pick === cur.cuerpo ? t.right : t.wrong(t.on[cur.cuerpo])}</p>
                  <p className="place">{cur.lugar}{cur.tipo ? `. ${t.kind[cur.tipo]}.` : '.'}</p>
                  {cur.lugar?.includes('Pinacate') && <p className="story">{t.pinacate}</p>}
                  <dl className="facts">
                    <div><dt>{t.diam}</dt><dd>{cur.diam_km} km</dd></div>
                    <div><dt>{t.depth}</dt><dd>{cur.prof_m} m</dd></div>
                  </dl>
                  <div className="row">
                    <button className="primary" onClick={() => { setPick(null); setI(i + 1) }}>{i + 1 < rounds.length ? t.next : t.finish}</button>
                    {id && hasSheet(id) && <button className="ghost" onClick={() => onOpen(id)}>{t.see_sheet}</button>}
                  </div>
                </>
              )}
            </div>
          </>
        )}
        {done && (
          <>
            <h1>{t.score(score, rounds.length)}</h1>
            <p className="lede">{t.bridge}</p>
            <div className="row">
              <a className="primary" href="#mapa">{t.to_map}</a>
              <button className="ghost" onClick={restart}>{t.again}</button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
