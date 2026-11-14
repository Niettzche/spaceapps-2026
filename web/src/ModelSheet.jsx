import useSheet from './useSheet'

export default function ModelSheet({ site, target, lang, onClose }) {
  const { ref, close, onBackdrop } = useSheet(onClose)
  const en = lang === 'en'
  const missing = en ? 'Not available' : 'Sin dato'
  const value = v => v?.valor == null ? missing : `${v.valor} ${v.unidad || ''}`
  const labels = { forma: en ? 'Shape' : 'Forma', oscilacion_termica: en ? 'Daily temperature range' : 'Oscilación térmica', precipitacion: en ? 'Precipitation' : 'Precipitación', ndvi: 'NDVI', pendiente: en ? 'Slope' : 'Pendiente' }
  return <dialog ref={ref} className="sheet" onClick={onBackdrop} aria-labelledby="model-site-title"><article>
    <header><div><h2 id="model-site-title">{site.nombre}</h2><p>{site.id} · {site.estado}</p></div><button className="ghost" onClick={close}>{en ? 'Close' : 'Cerrar'}</button></header>
    <p className="summary">{en ? 'Earth site compared with' : 'Sitio terrestre comparado con'} {target?.nombre || site.destino_ref}</p>
    <p>{en ? 'Similarity' : 'Similitud'}: {site.similitud?.total == null ? missing : `${Math.round(site.similitud.total * 100)} %`}</p>
    <p>{en ? 'Model score; not a probability of mission success.' : 'Puntaje del modelo; no es una probabilidad de éxito de misión.'}</p>
    <div className="tablewrap"><table><thead><tr><th>{en ? 'Variable' : 'Variable'}</th><th>{en ? 'Earth' : 'Tierra'}</th><th>{en ? 'Target' : 'Destino'}</th></tr></thead><tbody>
      {Object.entries(site.variables || {}).map(([key, v]) => <tr key={key}><th>{labels[key] || key}<br /><small>{v?.fuente || missing}{v?.fecha ? ` · ${v.fecha}` : ''}</small></th><td>{value(v)}</td><td>{value(target?.variables?.[key])}<br /><small>{target?.variables?.[key]?.fuente || ''}</small></td></tr>)}
    </tbody></table></div>
    <h3>{en ? 'Exploration use' : 'Uso para exploración'}</h3><p>{site.uso_exploracion || missing}</p>
    <h3>{en ? 'Limits' : 'Límites'}</h3><ul>{(site.limites || []).map(l => <li key={l}>{l}</li>)}</ul>
    {site.nota && <p>{site.nota}</p>}
    <p className="demo">{en ? 'Source notes retain their original language. Missing measurements are not estimated.' : 'Las notas conservan el idioma de origen. Las mediciones faltantes no se estiman.'}</p>
  </article></dialog>
}
