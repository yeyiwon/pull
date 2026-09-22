import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync, readdirSync } from 'node:fs'
import { AudioManager,chooseVariant } from '../src/audio/AudioManager.ts'
import { audioPlan,timeSlot,nextPhrase } from '../src/audio/AudioDirector.ts'
import { catalog } from '../src/audio/catalog.ts'
import { footSurface } from '../src/audio/worldAudio.ts'
import { BRIDGE,streamCenter } from '../src/world/terrain.ts'
import { homeWorldPoint } from '../src/world/homeSpace.ts'
import { createPlayer,movePlayer } from '../src/world/locomotion.ts'
const state={season:'spring',hour:8,seasonProgress:.5,inside:false,weather:'clear',wind:.2,x:0,z:1}
test('production selection contains compressed master mixes, no stems/previews; every file exists',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/audio/audio-production-manifest.json',import.meta.url)))
 assert.equal(manifest.assets.filter(a=>a.category==='music').length,26)
 let bytes=0;for(const a of manifest.assets){const file=new URL('../public'+a.url,import.meta.url);bytes+=statSync(file).size;assert.equal(a.bytes,statSync(file).size);const b=readFileSync(file);assert.equal(a.category==='sfx'?b.toString('ascii',0,4):b.toString('ascii',4,8),a.category==='sfx'?'RIFF':'ftyp')}
 assert.equal(bytes,manifest.totalBytes);assert.ok(bytes<45_000_000)
 assert.deepEqual(readdirSync(new URL('../public/audio',import.meta.url)).sort(),['audio-production-manifest.json','v02','v05'])
})
test('all 24 seasonal slots, midnight, home and phrase boundaries use manifest metadata',()=>{
 for(const season of ['spring','summer','autumn','winter'])for(const [hour,time]of [[5,'dawn'],[7,'morning'],[11,'day'],[17,'sunset'],[19,'evening'],[22,'night']])assert.equal(audioPlan({...state,season,hour}).music,`${season}_${time}`)
 assert.equal(timeSlot(0),'night');assert.equal(audioPlan({...state,inside:true,hour:0}).music,'home_night');assert.equal(audioPlan({...state,inside:true}).music,'home_day')
 assert.equal(nextPhrase(10,0,80,8),24);assert.equal(nextPhrase(24,0,80,8),48)
})
test('weather/indoor routing filters only outside; winter never contains summer insects',()=>{
 const day=audioPlan(state),rain=audioPlan({...state,weather:'rain',hour:0}),inside=audioPlan({...state,weather:'rain',inside:true})
 assert.ok(rain.musicGain<day.musicGain);assert.ok(rain.musicCutoff<day.musicCutoff);assert.ok(inside.outsideCutoff<rain.outsideCutoff)
 assert.equal(inside.ambience.amb_indoor_room_tone,1);assert.equal(inside.ambience.amb_indoor_window_rain,.7)
 assert.ok(Object.keys(audioPlan({...state,season:'summer',hour:0}).ambience).includes('amb_summer_night_insects'))
 assert.ok(!Object.keys(audioPlan({...state,season:'winter',hour:0}).ambience).some(id=>id.includes('summer')))
})
test('no-repeat families; water/bridge/house/snow surface priority',()=>{
 for(let i=0;i<4;i++)for(const random of [()=>0,()=>.4,()=>.999])assert.notEqual(chooseVariant(4,i,random),i)
 assert.equal(footSurface(streamCenter(3),3,0),'water');assert.equal(footSurface(streamCenter(BRIDGE.z),BRIDGE.z,1),'wood')
 const p=homeWorldPoint(1,0);assert.equal(footSurface(p.x,p.z,1),'wood');assert.equal(footSurface(-20,0,1),'snow')
})
test('audio observers do not drain Brain events',()=>{const p=createPlayer(),events=[];p.eventListeners.add(e=>events.push(e));p.jumpRequested=true;for(let i=0;i<90;i++)movePlayer(p,1/60);assert.deepEqual(events,['JUMP','LAND']);assert.deepEqual(p.events,events)})
class Param{value=0;setTargetAtTime(v){this.value=v}setValueAtTime(v){this.value=v}setValueCurveAtTime(v,start,duration){this.curve={v,start,duration}}cancelScheduledValues(){}}
class Node{gain=new Param();frequency=new Param();Q=new Param();playbackRate=new Param();threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();connect(){}disconnect(){this.disconnected=true}start(...args){this.startArgs=args}stop(){this.stopped=true;this.onended?.()}getFloatTimeDomainData(array){array.fill(.1)}}
class Context{currentTime=0;state='suspended';destination=new Node();sources=[];createGain(){return new Node()}createBiquadFilter(){return new Node()}createDynamicsCompressor(){return new Node()}createAnalyser(){return new Node()}createBufferSource(){const n=new Node();this.sources.push(n);return n}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}decodeAudioData(bytes){const id=new TextDecoder().decode(bytes),a=catalog.assets[id];return Promise.resolve({length:Math.round(a.duration*32000),sampleRate:32000,numberOfChannels:a.channels,duration:a.duration})}}
const flush=()=>new Promise(resolve=>setImmediate(resolve))
test('lazy unlock, no resume restart, stale destination cancellation, bounded voices/cache and dispose',async()=>{
 const oldContext=globalThis.AudioContext,oldFetch=globalThis.fetch,requests=[]
 globalThis.AudioContext=Context;globalThis.fetch=async url=>{const id=Object.keys(catalog.assets).find(k=>catalog.assets[k].url===url);assert.ok(id);requests.push(id);return{ok:true,arrayBuffer:async()=>new TextEncoder().encode(id).buffer}}
 const audio=new AudioManager(),plan=audioPlan(state)
 try{
  audio.applyPlan(plan);assert.equal(requests.length,0);await Promise.all([audio.unlock(),audio.unlock()]);await flush();const c=audio.context
  for(let i=0;i<6;i++){audio.applyPlan(plan);await flush()}
  assert.equal(audio.diagnostics.music,'spring_morning');assert.ok(requests.length<8);const count=requests.length,sources=c.sources.length
  audio.suspend();await audio.unlock();assert.equal(c.sources.length,sources);assert.equal(requests.length,count)
  c.currentTime=7;audio.applyPlan(plan);await flush()
  const changed=audioPlan({...state,inside:true,hour:0});audio.applyPlan(changed);await flush();assert.equal(audio.diagnostics.music,'home_night');assert.ok(audio.diagnostics.startsIn>0)
  audio.applyPlan(plan);await flush();assert.equal(audio.diagnostics.music,'spring_morning');assert.ok(c.sources.some(s=>s.stopped))
  for(let i=0;i<8;i++){c.currentTime+=.3;await audio.play('step_grass','character','footstep')}
  assert.equal(audio.diagnostics.voices,2)
  for(const season of ['summer','autumn','winter','spring']){c.currentTime+=120;const p=audioPlan({...state,season});audio.applyPlan(p);await flush();c.currentTime+=120;audio.applyPlan(p);await flush()}
  assert.ok(audio.diagnostics.decodedMiB<110);audio.dispose();assert.equal(c.state,'closed');assert.equal(audio.diagnostics.loops,0)
 }finally{audio.dispose();globalThis.AudioContext=oldContext;globalThis.fetch=oldFetch}
})
