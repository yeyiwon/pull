import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync,existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
const root=new URL('../',import.meta.url)
const files=JSON.parse(readFileSync(new URL('scripts/runtime-public-files.json',root),'utf8'))
test('release manifest preserves Moru and excludes source/secret assets',()=>{
 assert.equal(new Set(files).size,files.length)
 assert.ok(files.filter(p=>p.endsWith('.glb')).every(p=>p.startsWith('moru/')), 'Only Moru GLBs belong in the procedural runtime')
 assert.equal(files.filter(p=>p==='moru/final/moru-base.glb'&&p.endsWith('.glb')).length,1)
 assert.equal(files.filter(p=>p.startsWith('moru/final/animations/')&&p.endsWith('.glb')).length,18)
 for(const p of files){assert.ok(!p.split('/').includes('..')&&!p.startsWith('/'));assert.ok(!/\.env|full-life|rescue|\.blend|worldlabs/i.test(p));assert.ok(existsSync(new URL(`public/${p}`,root)),p)}
})
test('archived environment GLBs remain preserved and excluded from production',()=>{
 const reviewed=JSON.parse(readFileSync(new URL('scripts/reviewed-environment-assets.json',root),'utf8'))
 for(const [p,record] of Object.entries(reviewed)){
  assert.ok(!files.includes(p.slice(7)))
  const data=readFileSync(new URL(p,root));assert.equal(data.length,record.bytes,p)
  assert.equal(createHash('sha256').update(data).digest('hex'),record.sha256,p)
 }
})
