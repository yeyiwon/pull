import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Player, MoruEvent } from '../world/locomotion.ts'
import { environmentState as env } from '../world/environmentState.ts'
import { homeState } from '../world/homeSpace.ts'
import { worldTime } from '../world/worldTime.ts'
import { audio } from './AudioManager.ts'
import { audioPlan } from './AudioDirector.ts'
import { characters } from '../characters/registry.ts'
import { livingWorld } from '../world/livingWorld.ts'
import { footSurface } from './worldAudio.ts'

export default function WorldAudio({ player }: { player: RefObject<Player> }) {
  const travel = useRef({ x: player.current.position.x, z: player.current.position.z, distance: 0, elapsed: 0, meteor: false, events:new Set<string>(), expressions:{MORU:'NEUTRAL'}, clips:{MORU:''}, door: false, wet: false, inside:false })
  useEffect(() => {
    const p = player.current
    const event = (event: MoruEvent) => {
      if (event === 'JUMP') audio.variant('moru_jump', 3, 'jump', .03)
      if (event === 'LAND') {
        travel.current.distance = 0
        if (p.waterDepth < .08) audio.variant('moru_land', 5, 'land', .04)
        else void audio.play('water_tiny_splash','world','splash')
      }
    }
    p.eventListeners ??= new Set()
    p.eventListeners.add(event)
    return () => { p.eventListeners.delete(event) }
  }, [player])
  useFrame((_, delta) => {
    const p = player.current, t = travel.current
    // Fast Refresh can preserve refs created before these observer fields existed.
    t.expressions ??= {MORU:'NEUTRAL'}
    t.clips ??= {MORU:''}
    t.events ??= new Set<string>()
    const distance = Math.hypot(p.position.x - t.x, p.position.z - t.z)
    t.x = p.position.x; t.z = p.position.z
    if (p.isGrounded && (p.state === 'WALK' || p.state === 'RUN') && distance < 1 && !document.hidden) {
      t.distance += distance
      if (t.distance > (p.state === 'RUN' ? 1.25 : .85)) {
        t.distance = 0
        const surface = footSurface(p.position.x, p.position.z, env.snow)
        if (surface) audio.variant(`footstep_${surface}`, 4, 'footstep', .04)
      }
    } else t.distance = 0
    t.elapsed += delta
    if (t.elapsed < .1) return
    t.elapsed = 0
    audio.applyPlan(audioPlan({season:worldTime.realWorld.season,hour:worldTime.current.hour,seasonProgress:worldTime.realWorld.seasonProgress,weather:livingWorld.weather?.type==='rain'?'rain':livingWorld.weather?.type==='storm'?'storm':livingWorld.weather?.type==='snow'?'snow':livingWorld.weather?.type==='fog'?'fog':env.wind>.55?'wind':'clear',inside:homeState.inside,wind:env.wind,x:p.position.x,z:p.position.z}))
    const clip=characters.MORU?.clip??''
    if(clip!==t.clips.MORU){if(clip==='stretch')void audio.play('moru_stretch','character','emotion');else if(clip==='WAVE')void audio.play('moru_greeting','character','emotion');t.clips.MORU=clip}
    const meteor = env.meteor > .4 || env.meteorShower > .4
    const events:Record<string,boolean>={shooting_star:meteor&&env.meteorShower<.4,meteor_shower:env.meteorShower>.4,aurora:env.aurora>.4,rainbow:env.rainbow>.4,firefly_night:env.fireflies>.4,cherry_blossom_shower:livingWorld.eventOverride==='petalShower',golden_wind:livingWorld.eventOverride==='goldenWind',first_snow:livingWorld.weather?.type==='snow'}
    for(const [id,active]of Object.entries(events)){if(active&&!t.events.has(id))void audio.play(`event_${id}`,'world','event');if(active)t.events.add(id);else t.events.delete(id)}
    t.meteor = meteor
    const door = homeState.doorOpen > .5, wet = p.waterDepth > .08
    if (door !== t.door) audio.worldEvent(door ? 'DOOR_OPEN' : 'DOOR_CLOSE')
    if (wet !== t.wet) audio.worldEvent(wet?'WATER_ENTER':'WATER_EXIT')
    if(homeState.inside&&!t.inside)void audio.play('house_enter_home','world','home-entry')
    t.inside=homeState.inside
    t.door = door; t.wet = wet
  }, -.5)
  return null
}
