import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seasonAt, createRealWorldContext, SEASONS } from '../src/world/realWorld.ts'
import { seasonalBlend, livingWorld, setWorldPersonality, interpretMoruExperience, skyEventAt } from '../src/world/livingWorld.ts'
import { refreshWorldTime, worldTime, phaseAt } from '../src/world/worldTime.ts'

test('local calendar seasons include year wrap, leap day, hemisphere and bounded progress', () => {
  for (const [month, season] of [[2,'spring'],[5,'summer'],[8,'autumn'],[11,'winter']]) {
    assert.deepEqual(seasonAt(new Date(2026,month,1)), { season, seasonProgress:0 })
  }
  assert.equal(seasonAt(new Date(2026,0,1)).season,'winter')
  assert.ok(seasonAt(new Date(2024,1,29)).seasonProgress > .98)
  assert.equal(seasonAt(new Date(2026,8,22),'south').season,'spring')
  const real = createRealWorldContext(new Date(2026,8,22,23,40))
  assert.equal(real.month,9); assert.equal(real.hour,23); assert.equal(real.minute,40)
  assert.ok(real.seasonProgress > .2 && real.seasonProgress < .3)
})
test('seasonal visual endpoints meet continuously across all four boundaries', () => {
  for (let i=0;i<4;i++) {
    const end=seasonalBlend(SEASONS[i],1), next=seasonalBlend(SEASONS[(i+1)%4],0)
    assert.equal(end.blend,1); assert.equal(next.blend,0); assert.deepEqual(end.to,next.from)
  }
  assert.ok(seasonalBlend('autumn',.15).blend < seasonalBlend('autumn',.55).blend)
})
test('clock overrides preserve calendar date and returning to real uses device time', () => {
  const date=new Date(2026,8,22,7,30)
  worldTime.override=0; worldTime.seasonOverride={season:'winter',progress:.8}; refreshWorldTime(date)
  assert.equal(worldTime.current.phase,'NIGHT'); assert.equal(worldTime.realWorld.month,9)
  assert.equal(worldTime.realWorld.season,'winter')
  worldTime.override=null;worldTime.seasonOverride=null;refreshWorldTime(date)
  assert.equal(worldTime.current.phase,'MORNING');assert.equal(worldTime.realWorld.season,'autumn')
  assert.equal(phaseAt(10.999),'MORNING');assert.equal(phaseAt(11),'DAY')
})
test('personality clamps inputs and growth is gradual while retaining the existing home', () => {
  setWorldPersonality({warmth:5,curiosity:-3,vitality:NaN})
  assert.equal(livingWorld.brain.warmth,1);assert.equal(livingWorld.brain.curiosity,0);assert.equal(livingWorld.brain.vitality,0)
  interpretMoruExperience('calm',0,1);const first=livingWorld.growth.richness
  assert.equal(livingWorld.growth.stage,'home')
  interpretMoruExperience('curious',7200,3)
  assert.ok(livingWorld.growth.richness > first && livingWorld.growth.richness < 1)
  assert.equal(livingWorld.growth.stage,'habitat');assert.equal(livingWorld.weather,null)
})
test('rare sky events stay silent in daylight and aurora is winter only', () => {
  let meteors=0, auroras=0
  for(let day=1;day<=28;day++) {
    const date=new Date(2026,0,day,0,0,0)
    assert.deepEqual(skyEventAt(date,'winter',0,.8),{shootingStar:false,aurora:false})
    assert.equal(skyEventAt(date,'summer',1,.8).aurora,false)
    const event=skyEventAt(date,'winter',1,.8);meteors+=Number(event.shootingStar);auroras+=Number(event.aurora)
  }
  assert.ok(meteors>0 && meteors<10);assert.ok(auroras>0 && auroras<10)
})
