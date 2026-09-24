import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { audio, BUSES } from './AudioManager.ts'

function AudioDebug() {
  const [status, setStatus] = useState(() => audio.diagnostics)
  useEffect(() => { const id = window.setInterval(() => setStatus(audio.diagnostics), 500); return () => clearInterval(id) }, [])
  return <details className="audio-debug"><summary>Audio preview</summary>
    <output aria-label="Audio diagnostics">{status.platform} · {status.visibility} · {status.state} · gesture {status.unlocked?'unlocked':'locked'} · {status.muted?'muted':'audible'} {Math.round(status.volume*100)}%<br />{status.load} · {status.source}<br />{status.loops} loops · {status.voices} voices<br />{status.music} → {status.target} · starts in {status.startsIn.toFixed(1)}s<br />{status.seconds.toFixed(1)}s · {status.cached} buffers · {status.decodedMiB.toFixed(1)} MiB PCM · {status.downloadedMiB.toFixed(2)} MiB downloaded<br />LP {Math.round(status.cutoff)}Hz · {status.cue} · {status.played} cues · sampled peak {status.peak.toFixed(3)}<br />{status.ambience}{status.error && <strong>{status.error}</strong>}</output>
    {BUSES.map(bus => <label key={bus}>{bus}<input type="range" aria-label={`${bus} volume`} min="0" max="1" step=".05" value={audio.volumes[bus]} onChange={e => audio.setVolume(bus, Number(e.target.value))} /></label>)}
    <button onClick={() => { for (const bus of ['character','world','ui'] as const) audio.setVolume(bus, 0) }}>Mute SFX</button>
    <button onClick={() => { audio.setVolume('character',.8); audio.setVolume('world',.65); audio.setVolume('ui',.4) }}>Restore SFX</button>

    <small>Rain / snow / wind / visits: World preview</small>
  </details>
}
export default function AudioControls({mode='panel',slot=null,muted,onMute}:{mode?:'hidden'|'panel';slot?:HTMLElement|null;muted:boolean;onMute:(muted:boolean)=>void}) {
  const [volume,setVolume]=useState(.8),[status,setStatus]=useState(()=>audio.diagnostics)
  useEffect(()=>{if(mode!=='panel')return;const update=()=>setStatus(audio.diagnostics);update();const id=setInterval(update,300);return()=>clearInterval(id)},[mode])
  useEffect(()=>{audio.setMaster(muted?0:volume)},[muted,volume])
  useEffect(() => {
    const unlock = () => { if (!document.hidden) void audio.unlock() }
    const visibility = () => { if (document.hidden) audio.suspend(); else if (audio.context) unlock() }
    const native=Capacitor.isNativePlatform()
    if(!native){window.addEventListener('pointerdown', unlock, { passive: true });window.addEventListener('touchend', unlock, { passive: true });window.addEventListener('keydown', unlock);window.addEventListener('click', unlock)}
    window.addEventListener('pageshow', visibility)
    window.addEventListener('focus', visibility)
    document.addEventListener('visibilitychange', visibility)
    return () => { if(!native){window.removeEventListener('pointerdown', unlock);window.removeEventListener('touchend', unlock);window.removeEventListener('keydown', unlock);window.removeEventListener('click', unlock)}window.removeEventListener('pageshow', visibility); window.removeEventListener('focus', visibility); document.removeEventListener('visibilitychange', visibility); audio.dispose() }
  }, [])
  return slot?createPortal(<section className="music-panel">
    <p className="section-label">지금 흐르는 곡</p><p className="track-title">{status.music&&status.music!=='none'&&status.music!=='—'?status.music.replaceAll('_',' ').replaceAll('-',' '):status.state==='running'?'잠시 고요한 시간':'Tap to enable sound'}</p>
    <button className="text-link" aria-pressed={muted} onClick={()=>{if(!status.unlocked){onMute(false);audio.setMaster(volume);void audio.unlock()}else onMute(!muted)}}>{!status.unlocked?'Tap to enable sound':muted?'소리 켜기':'소리 끄기'} </button>
    <label className="volume-label">음량 <span>{Math.round(volume*100)}%</span><input aria-label="Master volume" type="range" min="0" max="1" step=".01" value={volume} onChange={e=>{const v=Number(e.target.value);setVolume(v);if(!muted)audio.setMaster(v)}}/></label>
    {import.meta.env.DEV&&<AudioDebug/>}
  </section>,slot):null
}
