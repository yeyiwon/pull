import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync,existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
const root=new URL('../',import.meta.url)
const files=JSON.parse(readFileSync(new URL('scripts/runtime-public-files.json',root),'utf8'))
test('release manifest preserves Moru and excludes source/secret assets',()=>{
 assert.equal(new Set(files).size,files.length)
 assert.ok(files.includes('moru/moru-walk.glb'))
 assert.equal(files.filter(p=>p.startsWith('moru/clips/')&&p.endsWith('.glb')).length,15)
 for(const p of files){assert.ok(!p.split('/').includes('..')&&!p.startsWith('/'));assert.ok(!/\.env|full-life|rescue|\.blend|worldlabs/i.test(p));assert.ok(existsSync(new URL(`public/${p}`,root)),p)}
})
test('shipped environment GLBs exactly match reviewed content',()=>{
 const reviewed=JSON.parse(readFileSync(new URL('scripts/reviewed-environment-assets.json',root),'utf8'))
 for(const [p,record] of Object.entries(reviewed)){
  assert.ok(files.includes(p.slice(7)))
  const data=readFileSync(new URL(p,root));assert.equal(data.length,record.bytes,p)
  assert.equal(createHash('sha256').update(data).digest('hex'),record.sha256,p)
 }
})
