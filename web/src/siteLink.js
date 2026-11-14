export function resolveSiteLink(search, modelSites, sites = [], sheets = []) {
  const p = new URLSearchParams(search)
  const id = p.get('sitio')
  if (!id && !p.get('ficha')) return null
  const match = (items, value) => items.find(s => String(s.id).toLowerCase() === String(value).toLowerCase())
  if (id && match(modelSites, id)) return { kind: 'model', id: match(modelSites, id).id }
  if (id && match(sites, id)) return { kind: 'site', id: match(sites, id).id }
  const f = match(sheets, p.get('ficha') || id)
  return f ? { kind: 'sheet', id: f.id } : { kind: 'missing', id }
}
