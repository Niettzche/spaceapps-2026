import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSiteLink } from './siteLink.js'
test('Expediente links open canonical sites, legacy sheets or an explicit missing state', () => {
  assert.deepEqual(resolveSiteLink('?sitio=samalayuca', [{id:'samalayuca'}]), {kind:'model',id:'samalayuca'})
  assert.deepEqual(resolveSiteLink('?sitio=mx0008&ficha=MX0008', [], [], [{id:'MX0008'}]), {kind:'sheet',id:'MX0008'})
  assert.deepEqual(resolveSiteLink('?sitio=pinacate', [], [{id:'pinacate'}]), {kind:'site',id:'pinacate'})
  assert.equal(resolveSiteLink('?sitio=unknown', []).kind, 'missing')
  assert.equal(resolveSiteLink('', []), null)
})
