import useSheet from './useSheet'

// Bars are drawn on a shared scale so the Mexican crater and its lunar twin can be compared by length.
function Pair({ label, a, b, unit, digits = 0 }) {
  const max = Math.max(a, b) || 1
  const f = (v) => v.toFixed(digits)
  return (
    <div className="pair">
      <span className="plabel">{label}</span>
      <span className="bar mx" style={{ '--w': `${(a / max) * 100}%` }}><em>{f(a)} {unit}</em></span>
      <span className="bar mn" style={{ '--w': `${(b / max) * 100}%` }}><em>{f(b)} {unit}</em></span>
    </div>
  )
}

export default function Sheet({ t, f, imgBase, onClose }) {
  const { ref, close, onBackdrop } = useSheet(onClose)

  const g = f.gemelo
  const mine = f.tipo === 'mina'
  const named = !!f.nombre
  const breaks = [
    mine ? t.b_mine : f.tipo === 'con_borde' ? t.b_origin : t.b_sink,
    f.ndvi != null && (f.ndvi >= 0.3 ? t.b_veg(f.ndvi) : t.b_arid(f.ndvi)),
    t.b_scale,
    t.b_gravity,
  ].filter(Boolean)

  return (
    <dialog ref={ref} className="sheet" onClick={onBackdrop}>
      <article>
        <header>
          <div>
            <h2>{f.nombre || `${f.lat.toFixed(3)}°, ${f.lon.toFixed(3)}°`}</h2>
            <p className="kind"><i className={`dot ${f.tipo}`} />{t.kind[f.tipo]}</p>
            <p className="status">{mine || (named && !f.conocido) ? t.unverified : f.conocido ? t.known : t.new_}</p>
          </div>
          <button className="ghost" onClick={close}>{t.close}</button>
        </header>

        <div className="twins">
          <figure><img src={`${imgBase}${f.id}.png`} alt="" width="320" height="320" /><figcaption>{t.here}<span>{f.lat.toFixed(3)}°, {f.lon.toFixed(3)}°</span></figcaption></figure>
          <figure><img src={`${imgBase}${f.id}_luna.png`} alt="" width="320" height="320" /><figcaption>{t.twin}<span>{g.lat.toFixed(2)}°, {g.lon.toFixed(1)}°</span></figcaption></figure>
        </div>

        <h3>{t.how_well}</h3>
        <div className="pairs">
          <Pair label={t.diam} a={f.diam_km} b={g.diam_km} unit="km" digits={2} />
          <Pair label={t.depth} a={f.prof_m} b={g.prof_m} unit="m" />
          <Pair label={t.ratio} a={f.prof_diam} b={g.prof_m / (g.diam_km * 1000)} unit="" digits={3} />
        </div>
        <p className="pct">{t.pct(f.pct_lunar)}</p>

        <h3>{t.breaks}</h3>
        <ul className="breaks">{breaks.map((b, i) => <li key={i}>{b}</li>)}</ul>

        <h3>{t.use}</h3>
        <p>{mine ? t.use_mine : t.use_nat}</p>
        <p><a href={`https://www.google.com/maps/@${f.lat},${f.lon},3500m/data=!3m1!1e3`} target="_blank" rel="noreferrer">{t.open_sat}</a></p>
      </article>
    </dialog>
  )
}
