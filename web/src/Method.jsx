import { useMemo } from 'react'

const W = 640, H = 380, PAD = { l: 52, r: 16, t: 14, b: 40 }
const XR = [0.5, 12], YR = [15, 400]
const lx = (d) => PAD.l + ((Math.log(d) - Math.log(XR[0])) / (Math.log(XR[1]) - Math.log(XR[0]))) * (W - PAD.l - PAD.r)
const ly = (p) => H - PAD.b - ((Math.log(p) - Math.log(YR[0])) / (Math.log(YR[1]) - Math.log(YR[0]))) * (H - PAD.t - PAD.b)

function Scatter({ t, refData, craters }) {
  const mines = useMemo(() => craters.filter((c) => c.t === 'mina'), [craters])
  const rest = useMemo(() => craters.filter((c) => c.t !== 'mina'), [craters])
  const mars = useMemo(() => Object.values(refData.marte).flat(), [refData])
  const inR = ([d, p]) => d >= XR[0] && d <= XR[1] && p >= YR[0] && p <= YR[1]
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.m3}>
        {[0.6, 1, 2, 5, 10].map((d) => <g key={d}><line x1={lx(d)} x2={lx(d)} y1={PAD.t} y2={H - PAD.b} className="grid" /><text x={lx(d)} y={H - PAD.b + 16} textAnchor="middle">{d}</text></g>)}
        {[20, 50, 100, 200, 300].map((p) => <g key={p}><line x1={PAD.l} x2={W - PAD.r} y1={ly(p)} y2={ly(p)} className="grid" /><text x={PAD.l - 8} y={ly(p) + 4} textAnchor="end">{p}</text></g>)}
        <text x={(W + PAD.l) / 2} y={H - 4} textAnchor="middle" className="axis">{t.diam} (km)</text>
        <text transform={`translate(13 ${(H - PAD.b) / 2 + PAD.t}) rotate(-90)`} textAnchor="middle" className="axis">{t.depth} (m)</text>
        {refData.luna_polo.filter(inR).map(([d, p], i) => <circle key={'l' + i} cx={lx(d)} cy={ly(p)} r="2" className="pt moon" />)}
        {mars.filter(inR).map(([d, p], i) => <circle key={'m' + i} cx={lx(d)} cy={ly(p)} r="2.4" className="pt mars" />)}
        {rest.filter((c) => inR([c.d, c.p])).map((c) => <circle key={c.id} cx={lx(c.d)} cy={ly(c.p)} r="2.6" className="pt mx" />)}
        {mines.filter((c) => inR([c.d, c.p])).map((c) => <circle key={c.id} cx={lx(c.d)} cy={ly(c.p)} r="4.2" className="pt mine" />)}
      </svg>
      <figcaption>
        <span><i className="k moon" />{t.legend_moon}</span><span><i className="k mars" />{t.legend_mars}</span>
        <span><i className="k mx" />{t.legend_mx}</span><span><i className="k mine" />{t.legend_mine}</span>
      </figcaption>
    </figure>
  )
}

export default function Method({ t, refData, craters }) {
  const val = refData.validacion
  const found = val.filter((v) => v.detectado === 'sí').length
  return (
    <section id="metodo" className="method">
      <h2>{t.method_title}</h2>
      <div className="cols">
        <div>
          <h3>{t.m1}</h3><p>{t.m1p}</p>
          <h3>{t.m4}</h3>
          <ul><li>{t.m4a}</li><li>{t.m4b}</li><li>{t.m4c}</li><li>{t.m4d}</li></ul>
          <h3>{t.m5}</h3>
          <ul><li>{t.m5a}</li><li>{t.m5b}</li><li>{t.m5c}</li><li>{t.m5d}</li></ul>
        </div>
        <div>
          <h3>{t.m3}</h3><p>{t.m3p}</p>
          <Scatter t={t} refData={refData} craters={craters} />
          <h3>{t.m2}</h3><p>{t.m2p(found, val.length)}</p>
          <div className="tablewrap">
            <table>
              <thead><tr>{t.th.map((h, i) => <th key={h} className={i > 1 && i < 4 ? 'num' : ''}>{h}</th>)}</tr></thead>
              <tbody>
                {val.map((v) => (
                  <tr key={v['cráter']}>
                    <td>{v['cráter']}</td><td>{v.detectado === 'sí' ? t.yes : t.no}</td>
                    <td className="num">{v['diám. km'] != null ? `${v['diám. km']} km` : ''}</td>
                    <td className="num">{v['prof. m'] != null ? `${v['prof. m']} m` : ''}</td>
                    <td>{v['pasa filtro'] == null ? '' : v['pasa filtro'] === 'sí' ? t.yes : t.no}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <h3>{t.data}</h3><p className="data">{t.data_p}</p>
    </section>
  )
}
