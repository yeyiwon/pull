import { catalog } from './catalog.ts'
import { nextPhrase } from './AudioDirector.ts'
import type { AudioPlan } from './AudioDirector.ts'
export const BUSES = ['music','ambience','character','world','ui'] as const
export type AudioBus = typeof BUSES[number]
type Asset = typeof catalog.assets[keyof typeof catalog.assets]
const assets:Record<string,Asset>=catalog.assets
const families:Record<string,typeof catalog.families[keyof typeof catalog.families]>=catalog.families
const tracks:Record<string,typeof catalog.tracks[keyof typeof catalog.tracks]>=catalog.tracks
const aliases:Record<string,string>={soft_touch:'ui_tap',moru_land_soft:'moru_land'}
export const WORLD_AUDIO_CUES={SHOOTING_STAR:'event_shooting_star',DOOR_OPEN:'house_door_open',DOOR_CLOSE:'house_door_close',WATER_ENTER:'water_enter_water',WATER_EXIT:'water_exit_water',WATER_STEP:'step_water'} as const
type Loop={id:string;source:AudioBufferSourceNode;gain:GainNode;start:number;end:number;level:number}
export function chooseVariant(count: number, previous: number, random = Math.random) {
  if (count <= 1) return 0
  const pick = Math.floor(random() * (previous < 0 ? count : count - 1))
  return previous >= 0 && pick >= previous ? pick + 1 : pick
}


export class AudioManager {
 context:AudioContext|null=null
 private master:GainNode|null=null
 private filter:BiquadFilterNode|null=null
 private musicFilter:BiquadFilterNode|null=null
 private buses=new Map<AudioBus,GainNode>()
 private cache=new Map<string,{promise:Promise<AudioBuffer>;bytes:number}>()
 private voices=new Map<AudioBufferSourceNode,string>()
 private pending=new Map<string,number>()
 private cooldowns=new Map<string,number>()
 private failures=new Map<string,number>()
 private previous=new Map<string,number>()
 private loops:Loop[]=[]
 private plan:AudioPlan|null=null
 private loading=false
 private generation=0
 private abort=new AbortController()
 private current:Loop|null=null
 private transition:{incoming:Loop;outgoing:Loop|null;end:number}|null=null
 private ambienceLoading=new Set<string>()
 volumes:Record<AudioBus,number>={music:1,ambience:1,character:1,world:.65,ui:.7}
 muted=false;masterVolume=.8;error='';lastCue='—';played=0;downloaded=0
 private decoded=0
 private encoded=new Map<string,ArrayBuffer>()
 private prefetching=false
 private hot=false
 private peak=0
 private analyser:AnalyserNode|null=null
 private samples=new Float32Array(256)
 setMaster(v:number){this.masterVolume=Math.max(0,Math.min(1,v));this.muted=v===0;if(this.master)this.fade(this.master.gain,this.masterVolume,.15)}
 setVolume(bus:AudioBus,v:number){this.volumes[bus]=Math.max(0,Math.min(1,v));const node=this.buses.get(bus);if(node)this.fade(node.gain,this.volumes[bus],.15)}
 private fade(param:AudioParam,value:number,seconds=1.5){if(this.context)param.setTargetAtTime(value,this.context.currentTime,seconds)}
 private async buffer(id:string,ctx:AudioContext){
  const hit=this.cache.get(id);if(hit){this.cache.delete(id);this.cache.set(id,hit);return hit.promise}
  const asset=assets[id];if(!asset)throw new Error(`Unknown audio asset: ${id}`)
  const entry={bytes:0,promise:Promise.resolve(null as unknown as AudioBuffer)},generation=this.generation
  entry.promise=(this.encoded.has(id)?Promise.resolve(this.encoded.get(id)!.slice(0)):fetch(asset.url,{signal:this.abort.signal}).then(r=>{if(!r.ok)throw new Error(`${id}: HTTP ${r.status}`);return r.arrayBuffer()}).then(b=>{this.downloaded+=b.byteLength;return b})).then(b=>ctx.decodeAudioData(b)).then(b=>{if(generation!==this.generation)throw new Error('Audio session ended');entry.bytes=b.length*b.numberOfChannels*4;this.decoded+=entry.bytes;this.trim(id);return b})
  this.cache.set(id,entry);entry.promise.catch(()=>{if(this.cache.get(id)===entry)this.cache.delete(id);if(this.context===ctx)this.failures.set(id,ctx.currentTime+10)});return entry.promise
 }
 private trim(keep=''){
  // 80 MiB decoded cache budget; active source buffers are released when their nodes end.
  for(const [id,e]of this.cache){if(this.decoded<=80*1024*1024)break;if(id===keep||!e.bytes||this.loops.some(l=>l.id===id))continue;this.decoded-=e.bytes;this.cache.delete(id)}
 }
 async unlock(){
  try{
   if(!this.context){const c=new AudioContext({latencyHint:'interactive',sampleRate:32000});this.context=c;this.master=c.createGain();this.master.gain.value=this.masterVolume;const limiter=c.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=3;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.18;this.analyser=c.createAnalyser();this.analyser.fftSize=256;this.master.connect(limiter);limiter.connect(this.analyser);this.analyser.connect(c.destination)
    for(const bus of BUSES){const g=c.createGain();g.gain.value=this.volumes[bus];g.connect(this.master);this.buses.set(bus,g)}
    this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=18000;this.filter.connect(this.buses.get('ambience')!)
    this.musicFilter=c.createBiquadFilter();this.musicFilter.type='lowpass';this.musicFilter.frequency.value=18000;this.musicFilter.connect(this.buses.get('music')!)
   }
   await this.context.resume();this.tick()
  }catch(e){this.error=String(e)}
 }
 applyPlan(plan:AudioPlan){this.plan=plan;this.tick()}
 private stop(loop:Loop){try{loop.source.stop()}catch{/* Already stopped by its scheduled end. */}loop.source.disconnect();loop.gain.disconnect();this.loops=this.loops.filter(l=>l!==loop)}
 private async start(id:string,bus:AudioBus,level:number,at:number):Promise<Loop|null>{
  const c=this.context;if(!c)return null;const b=await this.buffer(id,c);if(this.context!==c)return null
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=b;source.loop=true;source.loopEnd=Math.min(b.duration,assets[id].frames/assets[id].sampleRate);gain.gain.value=0;source.connect(gain)
  const indoor=id.startsWith('amb_indoor');gain.connect(bus==='music'?this.musicFilter!:indoor?this.buses.get('ambience')!:this.filter!)
  const start=Math.max(c.currentTime+.05,at),loop={id,source,gain,start,end:Infinity,level};source.start(start,0);this.loops.push(loop);return loop
 }
 private tick(){
  const c=this.context,p=this.plan;if(!c||c.state!=='running'||!p)return
  const transition=this.transition
  if(transition&&transition.incoming.id!==p.music&&c.currentTime<transition.incoming.start){
   this.stop(transition.incoming);this.current=transition.outgoing
   if(transition.outgoing){transition.outgoing.gain.gain.cancelScheduledValues(c.currentTime);transition.outgoing.gain.gain.setValueAtTime(1,c.currentTime);transition.outgoing.end=Infinity}
   this.transition=null
  }else if(transition&&c.currentTime>=transition.end)this.transition=null
  for(const l of [...this.loops])if(l.end<=c.currentTime)this.stop(l)
  this.fade(this.musicFilter!.frequency,p.musicCutoff,2);this.fade(this.filter!.frequency,p.outsideCutoff,1.6)
  this.fade(this.buses.get('music')!.gain,p.musicGain*this.volumes.music,2)
  if(c.currentTime>=(this.failures.get(p.music)??0)&&!this.loading&&this.current?.id!==p.music&&(!this.current||c.currentTime>this.current.start+tracks[this.current.id].crossfadeSeconds)){
   this.loading=true;const id=p.music,old=this.current,generation=this.generation
   // Do not decode any other season/stems. Destination loads once; stale requests never start.
   void this.buffer(id,c).then(async()=>{
    if(this.context!==c||this.plan?.music!==id)return
    const at=old?nextPhrase(c.currentTime,old.start,tracks[old.id].bpm,tracks[old.id].phraseBars):c.currentTime+.05
    const fresh=await this.start(id,'music',1,at);if(!fresh)return
    if(this.plan?.music!==id){this.stop(fresh);return}
    const duration=old?tracks[old.id].crossfadeSeconds:1
    const incoming=new Float32Array(33),outgoing=new Float32Array(33)
    for(let i=0;i<33;i++){incoming[i]=Math.sin(i/32*Math.PI/2);outgoing[i]=Math.cos(i/32*Math.PI/2)}
    fresh.gain.gain.setValueCurveAtTime(incoming,fresh.start,duration)
    if(old){old.gain.gain.cancelScheduledValues(fresh.start);old.gain.gain.setValueCurveAtTime(outgoing,fresh.start,duration);old.end=fresh.start+duration+.05}
    this.current=fresh;this.transition={incoming:fresh,outgoing:old,end:fresh.start+duration};this.error=''
   }).catch(e=>{if(this.context===c)this.error=String(e)}).finally(()=>{if(generation===this.generation)this.loading=false})
  }
  for(const l of this.loops.filter(l=>l.id.startsWith('amb_'))){const target=(p.ambience[l.id]??0)*assets[l.id].gain;this.fade(l.gain.gain,target,1.6);if(!target&&l.end===Infinity)l.end=c.currentTime+8;else if(target)l.end=Infinity}
  // Sequential ambience loading limits transient decode pressure on mobile.
  if(!this.ambienceLoading.size&&this.loops.filter(l=>l.id.startsWith('amb_')).length<8){
   const id=Object.keys(p.ambience).find(id=>!this.loops.some(l=>l.id===id)&&p.ambience[id]>.001&&c.currentTime>=(this.failures.get(id)??0))
   if(id){this.ambienceLoading.add(id);const generation=this.generation;void this.start(id,'ambience',p.ambience[id],c.currentTime+.05).then(l=>{if(l&&!this.plan?.ambience[id])this.stop(l)}).catch(e=>{if(this.context===c)this.error=String(e)}).finally(()=>{if(generation===this.generation)this.ambienceLoading.delete(id)})}
  }
  this.trim()
  if(this.analyser){this.analyser.getFloatTimeDomainData(this.samples);for(const value of this.samples)this.peak=Math.max(this.peak,Math.abs(value))}
  if(this.current&&c.currentTime>this.current.start+2&&!this.hot){this.hot=true;const generation=this.generation;void(async()=>{for(const family of ['moru_jump','moru_land','step_grass','ui_tap']){if(generation!==this.generation)return;for(const id of families[family].assets)await this.buffer(id,c)}})().catch(e=>{if(this.context===c)this.error=String(e)})}
  // Near-future is compressed only, one track; it does not occupy decoded PCM memory.
  if(this.current?.id===p.music&&c.currentTime>this.current.start+10&&!this.prefetching&&!this.encoded.has(p.next)&&!this.cache.has(p.next)){
   this.prefetching=true;const id=p.next,generation=this.generation
   void fetch(assets[id].url,{signal:this.abort.signal}).then(r=>{if(!r.ok)throw new Error(`Prefetch HTTP ${r.status}`);return r.arrayBuffer()}).then(bytes=>{if(generation===this.generation){this.downloaded+=bytes.byteLength;this.encoded.clear();this.encoded.set(id,bytes)}}).catch(()=>{/* Optional prefetch never interrupts the current music. */}).finally(()=>{if(generation===this.generation)this.prefetching=false})
  }
 }
 worldEvent(event:keyof typeof WORLD_AUDIO_CUES){void this.play(WORLD_AUDIO_CUES[event],'world',event)}
 async play(request:string,bus:AudioBus,group:string=bus,_pitch=0,_variation=false){
  const c=this.context;if(!c||c.state!=='running'||this.muted||this.volumes[bus]===0)return
  const familyId=aliases[request]??request,f= families[familyId];let id=familyId
  if(f){const i=chooseVariant(f.assets.length,this.previous.get(familyId)??-1);id=f.assets[i]}
  if(!assets[id])return
  const event=id.startsWith('event_'),now=c.currentTime,key=event?'event':group
  if(now<(this.failures.get(id)??-1))return
  const cooldown=group==='moru-expression'?0:Math.max((f?.cooldownMs??(event?30000:100))/1000,group.includes('emotion')?8:0)
  if(now<(this.cooldowns.get(key)??-1))return
  const active=[...this.voices.values()].filter(g=>g===key).length+(this.pending.get(key)??0)
  if(active>=Math.min(f?.maxConcurrent??1,key==='footstep'?2:3)||this.voices.size+[...this.pending.values()].reduce((a,b)=>a+b,0)>=8)return
  this.cooldowns.set(key,now+cooldown);this.pending.set(key,(this.pending.get(key)??0)+1)
  try{const b=await this.buffer(id,c);if(this.context!==c||c.state!=='running'||c.currentTime-now>(event?3:.5)||this.muted)return
   const s=c.createBufferSource(),g=c.createGain();s.buffer=b;s.playbackRate.value=1+(Math.random()*2-1)*(f?.pitchRandom??0);g.gain.value=assets[id].gain*(1+(Math.random()*2-1)*(f?.volumeRandom??0));s.connect(g);g.connect(this.buses.get(bus)!);this.voices.set(s,key);s.onended=()=>{s.disconnect();g.disconnect();this.voices.delete(s)};s.start();if(f)this.previous.set(familyId,f.assets.indexOf(id));this.lastCue=id;this.played++
  }catch(e){if(this.context===c)this.error=String(e)}finally{if(this.context===c)this.pending.set(key,Math.max(0,(this.pending.get(key)??1)-1))}
 }
 variant(prefix:string,_count:number,group:string,_pitch:number){void this.play(aliases[prefix]??prefix.replace('footstep_','step_'),'character',group)}
 suspend(){if(this.context?.state==='running')void this.context.suspend().catch(e=>{this.error=String(e)})}
 get diagnostics(){const now=this.context?.currentTime??0;return{state:this.context?.state??'locked',peak:this.peak,loops:this.loops.length,voices:this.voices.size,cached:this.cache.size,decodedMiB:this.decoded/1048576,downloadedMiB:this.downloaded/1048576,music:this.current?.id??'—',target:this.plan?.music??'—',startsIn:Math.max(0,(this.current?.start??now)-now),seconds:Math.max(0,now-(this.current?.start??now)),cutoff:this.filter?.frequency.value??18000,cue:this.lastCue,played:this.played,error:this.error,ambience:this.loops.filter(l=>l.id.startsWith('amb_')).map(l=>l.id).join(', ')}}
 dispose(){this.generation++;this.abort.abort();this.abort=new AbortController();for(const l of [...this.loops])this.stop(l);for(const s of this.voices.keys())s.stop();const c=this.context;this.context=null;if(c)void c.close().catch(()=>{});this.cache.clear();this.voices.clear();this.buses.clear();this.pending.clear();this.cooldowns.clear();this.failures.clear();this.ambienceLoading.clear();this.loading=false;this.current=null;this.transition=null;this.decoded=0;this.downloaded=0;this.encoded.clear();this.prefetching=false;this.hot=false;this.peak=0;this.analyser=null;this.master=null;this.filter=null;this.musicFilter=null}
}
export const audio=new AudioManager()

if(import.meta.hot)import.meta.hot.dispose(()=>audio.dispose())
