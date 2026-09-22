import {test} from 'node:test'
import assert from 'node:assert/strict'
import {livingWorld,fantasyEventAt} from '../src/world/livingWorld.ts'
import {worldTime,refreshWorldTime} from '../src/world/worldTime.ts'
import {environmentState as env,updateEnvironmentState} from '../src/world/environmentState.ts'
import {ambientMix} from '../src/world/ambient.ts'
const tick=(seconds)=>{for(let i=0;i<seconds*60;i++)updateEnvironmentState(1/60)}
test('mock rain wets the world and leaves moisture after it stops',()=>{
 worldTime.override=0;worldTime.seasonOverride={season:'summer',progress:1};refreshWorldTime(new Date(2026,6,12,0))
 livingWorld.weather={type:'rain'};tick(20)
 assert.ok(env.rain>.6&&env.wetness>.6&&env.cloudiness>.6)
 livingWorld.weather=null;const wet=env.wetness;tick(2)
 assert.ok(env.wetness>wet*.95&&env.rain<.3)
})
test('snow accumulates and melts gradually; independent wind override remains bounded',()=>{
 livingWorld.weather={type:'snow'};livingWorld.snowMode='heavy';livingWorld.windOverride=.8;tick(45)
 assert.ok(env.snow>.95&&env.snowAmount>.95&&env.wind>.79)
 livingWorld.weather=null;tick(5)
 assert.ok(env.snow>.95);assert.ok(env.snowAmount<.01)
 assert.ok(Object.values(env).filter(v=>typeof v==='number').every(Number.isFinite))
 livingWorld.windOverride=null;worldTime.override=null;worldTime.seasonOverride=null
})
test('rare discoveries are deterministic and ambience prepares channels without playback',()=>{
 const date=new Date(2026,6,12,0)
 assert.equal(fantasyEventAt(date,'summer',true),fantasyEventAt(date,'summer',true))
 const outdoors=ambientMix('summer',1,.8,.5,false),inside=ambientMix('summer',1,.8,.5,true)
 assert.ok(inside.rain<outdoors.rain&&inside.fireplace>0&&outdoors.insects>0)
})
