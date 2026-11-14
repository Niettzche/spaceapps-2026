import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const COLORS = { con_borde: '#1f6f78', mina: '#c7921a', sin_borde: '#6f7378' }
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/ASTER_GDEM_Greyscale_Shaded_Relief/default/GoogleMapsCompatible_Level12/{z}/{y}/{x}.jpg'

export default function MapView({ t, craters, plains, hasSheet, onOpen, activeId }) {
  const el = useRef(null)
  const map = useRef(null)
  const [show, setShow] = useState({ con_borde: true, mina: true, sin_borde: true, llanuras: false })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const m = new maplibregl.Map({
      container: el.current,
      style: { version: 8, sources: { base: { type: 'raster', tiles: [GIBS], tileSize: 256, maxzoom: 12, attribution: 'NASA GIBS · ASTER GDEM (NASA/METI)' } }, layers: [{ id: 'base', type: 'raster', source: 'base', paint: { 'raster-saturation': -1, 'raster-contrast': 0.15 } }] },
      center: [-102.5, 24], zoom: 4.3, minZoom: 3.5, maxZoom: 12, cooperativeGestures: true, attributionControl: { compact: true },
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.on('load', () => {
      const fc = { type: 'FeatureCollection', features: craters.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lon, c.lat] }, properties: { ...c, sheet: hasSheet(c.id) ? 1 : 0 } })) }
      m.addSource('craters', { type: 'geojson', data: fc })
      m.addSource('plains', { type: 'geojson', data: { type: 'FeatureCollection', features: plains.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: p })) } })
      m.addLayer({ id: 'plains', type: 'circle', source: 'plains', layout: { visibility: 'none' }, paint: { 'circle-radius': 7, 'circle-color': '#8e3b24', 'circle-opacity': 0.75, 'circle-stroke-color': '#f3f1ec', 'circle-stroke-width': 1 } })
      m.addLayer({ id: 'dots', type: 'circle', source: 'craters', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, ['case', ['==', ['get', 'sheet'], 1], 4.5, 2.2], 10, ['case', ['==', ['get', 'sheet'], 1], 11, 6]],
        'circle-color': ['match', ['get', 't'], 'con_borde', COLORS.con_borde, 'mina', COLORS.mina, COLORS.sin_borde],
        'circle-opacity': ['case', ['==', ['get', 'sheet'], 1], 0.95, 0.6],
        'circle-stroke-color': '#f3f1ec', 'circle-stroke-width': ['case', ['==', ['get', 'sheet'], 1], 1.6, 0],
      } })
      m.on('click', 'dots', (e) => { const p = e.features[0].properties; if (p.sheet) onOpen(p.id) })
      m.on('mouseenter', 'dots', (e) => { m.getCanvas().style.cursor = e.features[0].properties.sheet ? 'pointer' : '' })
      m.on('mouseleave', 'dots', () => { m.getCanvas().style.cursor = '' })
      setReady(true)
    })
    map.current = m
    return () => m.remove()
  }, [])

  useEffect(() => {
    const m = map.current
    if (!ready) return
    const on = ['con_borde', 'mina', 'sin_borde'].filter((k) => show[k])
    m.setFilter('dots', ['in', ['get', 't'], ['literal', on]])
    m.setLayoutProperty('plains', 'visibility', show.llanuras ? 'visible' : 'none')
  }, [show, ready])

  useEffect(() => {
    if (!ready || !activeId) return
    const c = craters.find((x) => x.id === activeId)
    if (c) map.current.easeTo({ center: [c.lon, c.lat], zoom: Math.max(map.current.getZoom(), 9), duration: 900 })
  }, [activeId, ready])

  const n = (k) => craters.filter((c) => c.t === k).length
  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }))

  return (
    <section id="mapa" className="mapsec">
      <div className="maphead">
        <h2>{t.map_title}</h2>
        <p>{t.map_sub}</p>
        <div className="chips">
          {['con_borde', 'mina', 'sin_borde'].map((k) => (
            <button key={k} aria-pressed={show[k]} onClick={() => toggle(k)}><i style={{ background: COLORS[k] }} />{t.kind_short[k]} <b>{n(k)}</b></button>
          ))}
          <button aria-pressed={show.llanuras} onClick={() => toggle('llanuras')}><i style={{ background: '#8e3b24' }} />{t.mars_layer} <b>{plains.length}</b></button>
        </div>
        <p className="hint">{t.pick}</p>
      </div>
      <div ref={el} className="map" />
    </section>
  )
}
