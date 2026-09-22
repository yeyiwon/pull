import { continuitySummary } from './evolution/offline.ts'
import { conversationActive } from '../conversation/session.ts'
import { evolve } from './evolution/runtime.ts'
import { ServerResearchProvider } from '../research/provider.ts'
import { researchSessionBudget } from '../research/controller.ts'
import { speechEnvelope } from '../characters/presentation.ts'
import { conversationSession } from '../conversation/session.ts'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { Player } from './locomotion.ts'
import { createMoruMind, brainCommands } from './brain/mind.ts'
import { observeWorld, userControlsMoru } from './brain/observation.ts'
import { getMemorySession } from './brain/memory.ts'
import { audio } from '../audio/AudioManager.ts'
import { worldTime } from './worldTime.ts'
import { moru } from '../characters/expression.ts'
import { homeState } from './homeSpace.ts'
import { livingWorld } from './livingWorld.ts'
import { streamCenter, streamWidth } from './terrain.ts'
import type { Reaction } from './personality.ts'

function clearEvents(player:Player){player.events.length=0}
function markBrainAction(player:Player){player.brainRequested=true}
function present(node: HTMLDivElement, reaction: Reaction) {
  const speech = node.querySelector<HTMLElement>('.moru-speech')
  const fx = node.querySelector<HTMLElement>('.moru-fx')
  node.dataset.tone = reaction.fx?.toLowerCase() ?? 'normal'
  node.dataset.emotion = reaction.emotion ?? 'calm'
  if (speech) { speech.textContent = reaction.typing ? '' : reaction.speech ?? ''; speech.hidden = !reaction.speech }
  if (fx) {
    fx.replaceChildren()
    const symbols = { HEARTS: ['♡', '✿', '✿'], SPARKLES: ['✧', '✧'], QUESTION: ['?'], JOY: ['♪'], SURPRISE: ['!'] }
    const display = reaction.fx ? symbols[reaction.fx] : reaction.emotion === 'sad' ? ['·', '·'] : reaction.emotion === 'angry' || reaction.emotion === 'annoyed' ? ['⌁'] : reaction.emotion === 'happy' || reaction.emotion === 'warm' ? ['✿', '✿'] : []
    for (const [i, text] of display.entries()) {
      const span = document.createElement('span')
      span.textContent = text; span.className = `reaction-glyph ${reaction.fx?.toLowerCase() ?? reaction.emotion ?? 'normal'}`
      span.style.setProperty('--i', String(i)); fx.append(span)
    }
    if(reaction.emotion==='warm'||reaction.emotion==='happy')for(let i=0;i<2;i++){
      const blush=document.createElement('span')
      blush.className='reaction-blush';blush.style.setProperty('--side',String(i));fx.append(blush)
    }
  }
}
function blurText(node: HTMLDivElement, blur: number) { node.style.filter = `blur(${blur}px)` }
function paint(node: HTMLDivElement, opacity: string, transform?: string) {
  node.style.opacity = opacity
  if (transform) node.style.transform = transform
}

function SpeechBubble({ player, element }: { player: RefObject<Player>; element: RefObject<HTMLDivElement | null> }) {
  const brain = useRef<ReturnType<typeof createMoruMind> | null>(null)
  const active = useRef({ age: 0, duration: 0, letters: [] as string[], shown: 0 })
  const semantic = useRef({elapsed:0,idle:0,returned:false,userVersion:0})
  useEffect(() => {
    const memory=getMemorySession()
    moru.setAutonomy(false)
    const controller = createMoruMind({research:{provider:new ServerResearchProvider(),budget:memory.memory.researchBudget,session:researchSessionBudget},interests:memory.memory.interests,interestsChanged:memory.interestsChanged,visits:memory.memory.visitCount,debug:import.meta.env.DEV,execute:intent=>{
      const p=player.current
      if(userControlsMoru(p)||p.state!=='IDLE'||p.actionRequested||p.listenRequested)return {action:null,speech:null,emote:false}
      const fx={heart:'HEARTS',sparkle:'SPARKLES',question:'QUESTION',surprise:'SURPRISE',music:'JOY'} as const
      const offered=(intent.speech||intent.emote)?moru.offer({event:'BRAIN',speech:intent.speech??undefined,fx:intent.emote?fx[intent.emote]:undefined,duration:2.8},'brain'):false
      const acted=intent.action?moru.perform(intent.action,'brain',false):false
      if(acted&&p.actionRequested)markBrainAction(p)
      return {action:acted?intent.action:null,speech:offered?intent.speech:null,emote:offered&&!!intent.emote}
    }})
    const detach=conversationSession.attach({snapshot:()=>{const snapshot=controller.snapshot();return snapshot?{...snapshot,continuity:continuitySummary(memory.memory.offline,memory.memory.evolution)}:null},hold:controller.holdConversation,
      listen(){moru.cancelSpeech();active.current.duration=0;moru.perform('listen','user',false)},
      speak(response){
        const p=player.current;if(userControlsMoru(p))return false
        const fx={heart:'HEARTS',sparkle:'SPARKLES',question:'QUESTION',surprise:'SURPRISE',music:'JOY'} as const
        active.current.duration=0
        const offered=moru.offer({event:'BRAIN',speech:response.speech,fx:response.emote?fx[response.emote]:undefined,emotion:response.emotion,typing:true,duration:Math.min(8,2.8+response.speech.length*.07)},'conversation')
        if(response.action)moru.perform(response.action,'user',false)
        return offered
      },cancel(){moru.cancelSpeech();active.current.duration=0},
    })
    brainCommands.trigger=controller.trigger;brainCommands.converse=async text=>{await conversationSession.send(text);return controller.intent}
    brain.current = controller
    const suspend = () => { if (document.hidden){controller.suspend();conversationSession.cancel()} memory.save() }
    const leave = () => {controller.suspend();memory.save()}
    const returned = () => { if (!document.hidden) semantic.current.returned=true }
    document.addEventListener('visibilitychange', returned)
    document.addEventListener('visibilitychange', suspend)
    window.addEventListener('pagehide', leave)
    return () => { document.removeEventListener('visibilitychange', returned); detach();controller.dispose(); memory.save(); brainCommands.trigger=null;brainCommands.converse=null;moru.setAutonomy(true);brain.current = null; document.removeEventListener('visibilitychange', suspend); window.removeEventListener('pagehide', leave) }
  }, [player])
  const projected = useRef(new Vector3())
  const headTop = useRef(new Vector3())
  const emotePoint = useRef(new Vector3())
  const cameraRight = useRef(new Vector3())
  const facePoint = useRef(new Vector3())
  const faceDirection = useRef(new Vector3())
  const toCamera = useRef(new Vector3())
  const reducedMotion = useRef(false)
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => { reducedMotion.current = preference.matches }
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    const node = element.current
    return () => { if (node) paint(node, '0') }
  }, [element])
  useFrame(({ camera, size }, delta) => {
    if (document.hidden) return
    const pState=player.current
    const available=pState.state==='IDLE'&&!pState.actionRequested&&!pState.jumpRequested&&pState.isGrounded
    moru.update(Math.min(delta,.05),{hour:worldTime.canonical.hour+worldTime.canonical.minute/60,season:worldTime.canonical.season,weather:livingWorld.weather?.type??'clear',inside:homeState.inside,
      nearWater:Math.abs(pState.position.x-streamCenter(pState.position.z))<streamWidth(pState.position.z)+2,idle:available})
    const clock=semantic.current
    const dt=Math.min(delta,.1)
    clock.elapsed+=dt;clock.idle=available&&!userControlsMoru(pState)?clock.idle+dt:0
    // Rendering tracks the head every frame; decisions and semantic reads run at 1 Hz.
    if(clock.elapsed>=1){
      const elapsed=clock.elapsed;clock.elapsed=0
      const memory=getMemorySession();memory.tick(elapsed)
      let interacted=moru.userVersion!==clock.userVersion
      for(const event of pState.events){memory.event(event);interacted=true}
      clearEvents(pState);clock.userVersion=moru.userVersion
      // Preserve completed ideas on return before research can start its next cycle.
      if(brain.current)evolve(brain.current.interests.data,worldTime.realWorld.season,available&&!conversationActive())
      brain.current?.tick(observeWorld(pState,{idle:clock.idle,interacted,returned:clock.returned,actions:moru.recentActions,speech:moru.recentSpeech}),elapsed)
      clock.returned=false
    }
    const reaction=moru.take()
    const node = element.current
    if (!node) return
    // No stacking: the short FX cooldown and longer speech cooldown keep channels sparse.
    if (reaction && (reaction.typing || active.current.age >= active.current.duration)) {
      present(node, reaction)
      const cue = reaction.fx === 'HEARTS' || reaction.emotion === 'warm' ? 'moru_affection' : reaction.fx === 'JOY' || reaction.emotion === 'happy' ? 'moru_happy' : reaction.fx === 'QUESTION' || reaction.emotion === 'curious' ? 'moru_curious' : reaction.fx === 'SURPRISE' || reaction.emotion === 'angry' || reaction.emotion === 'annoyed' ? 'moru_surprise' : reaction.emotion === 'sleepy' || reaction.emotion === 'sad' ? 'moru_sleepy' : 'moru_greeting'
      if (reaction.speech || reaction.fx) void audio.play(cue, 'character', 'moru-expression')
      active.current = { age: 0, duration: reaction.duration, letters: reaction.typing && !reducedMotion.current ? Array.from(reaction.speech ?? '') : [], shown: 0 }
    }
    active.current.age += delta
    const { age, duration } = active.current
    if (age >= duration) { paint(node, '0'); return }
    if(active.current.letters.length){
      const count=Math.min(active.current.letters.length,Math.floor(Math.max(0,age-.2)/.055))
      if(count!==active.current.shown){active.current.shown=count;const speech=node.querySelector<HTMLElement>('.moru-speech');if(speech)speech.textContent=active.current.letters.slice(0,count).join('')}
    }
    projected.current.copy(player.current.headPosition).project(camera)
    const p = projected.current
    // Project an upper envelope above the ears, plus a fixed pixel gap at every zoom.
    headTop.current.copy(player.current.headPosition).addScaledVector(player.current.up, .3).project(camera)
    const visible = p.z >= -1 && p.z <= 1 && Math.abs(p.x) < .92 && Math.abs(p.y) < .88
    const { opacity, rise, blur } = speechEnvelope(age, duration, reducedMotion.current)
    const y = Math.min((-p.y * .5 + .5) * size.height, (-headTop.current.y * .5 + .5) * size.height) - 20 - rise
    blurText(node, blur)
    const anchorX = Math.max(Math.min(150,size.width*.42),Math.min(size.width-Math.min(150,size.width*.42),(p.x*.5+.5)*size.width))
    const anchorY = Math.max(node.offsetHeight+24,y)
    paint(node, visible ? String(Math.max(0, opacity)) : '0',
      `translate(${Math.max(Math.min(150,size.width*.42),Math.min(size.width-Math.min(150,size.width*.42),(p.x * .5 + .5) * size.width))}px, ${Math.max(node.offsetHeight+24, y)}px) translate(-50%, -100%)`)
    // Lightweight DOM glyphs anchored at projected world positions, not screen-fixed confetti.
    cameraRight.current.setFromMatrixColumn(camera.matrixWorld, 0)
    const glyphs = node.querySelectorAll<HTMLElement>('.reaction-glyph')
    glyphs.forEach((glyph, index) => {
      const t = Math.max(0, Math.min(1, (age - .3 - index * .12) / Math.max(.1, duration - .6)))
      const side = index % 2 === 0 ? 1 : -1
      emotePoint.current.copy(player.current.headPosition)
        .addScaledVector(cameraRight.current, side * (.6 + index * .1))
        .addScaledVector(player.current.up, reducedMotion.current ? .05 : .05 + t * .22)
        .project(camera)
      const point = emotePoint.current
      glyph.style.left = `${(point.x * .5 + .5) * size.width - anchorX}px`
      glyph.style.top = `${(-point.y * .5 + .5) * size.height - anchorY}px`
      glyph.style.opacity = String(Math.sin(Math.PI * t) * .78)
      glyph.style.fontSize = `${Math.max(12, Math.min(23, 160 / camera.position.distanceTo(player.current.headPosition)))}px`
    })
    faceDirection.current.set(0,0,1).applyQuaternion(player.current.rotation)
    toCamera.current.copy(camera.position).sub(player.current.headPosition).normalize()
    const faceVisible=faceDirection.current.dot(toCamera.current)>.25
    node.querySelectorAll<HTMLElement>('.reaction-blush').forEach((blush,index)=>{
      facePoint.current.copy(player.current.headPosition).addScaledVector(player.current.up,-.78)
        .addScaledVector(cameraRight.current,index===0?-.19:.19).project(camera)
      blush.style.left=`${(facePoint.current.x*.5+.5)*size.width-anchorX}px`
      blush.style.top=`${(-facePoint.current.y*.5+.5)*size.height-anchorY}px`
      blush.style.opacity=faceVisible?String(Math.sin(Math.PI*Math.min(1,age/duration))*.46):'0'
    })
  })
  return null
}
export default SpeechBubble
