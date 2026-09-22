import test from 'node:test'
import assert from 'node:assert/strict'
import {musicBaseline} from '../src/audio/musicBaseline.ts'
import {catalog} from '../src/audio/catalog.ts'
import {audioPlan} from '../src/audio/AudioDirector.ts'
test('v0.5 provides all 24 replaceable semantic slots and retains Home/SFX without Nuu',()=>{
 assert.equal(Object.keys(musicBaseline.slots).length,24)
 assert.equal(new Set(Object.values(musicBaseline.slots)).size,24)
 for(const season of ['spring','summer','autumn','winter'])for(const [hour,time]of [[5,'dawn'],[7,'morning'],[11,'day'],[17,'sunset'],[19,'evening'],[22,'night']]){
  const slot=`${season}_${time}`,record=musicBaseline.recordings[musicBaseline.slots[slot]]
  assert.ok(record.asset.url.startsWith('/audio/v05/'))
  assert.equal(catalog.assets[slot].url,record.asset.url)
  assert.equal(record.timing.crossfadeSeconds,3);assert.equal(record.timing.phraseBars,1)
  assert.equal(record.asset.frames/record.asset.sampleRate,record.asset.duration)
  assert.equal(audioPlan({season,hour,inside:false,weather:'clear',wind:0,x:0,z:1,seasonProgress:.5}).music,slot)
 }
 assert.ok(catalog.assets.home_day.url.startsWith('/audio/v02/'))
 assert.ok(catalog.families.moru_jump);assert.ok(!Object.keys(catalog.families).some(k=>k.includes('nuu')))
})
