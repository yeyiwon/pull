import { continuitySummary } from './evolution/offline.ts'
import { feedback, reactionFeedback } from '../characters/feedback.ts'
import { conversationActive } from '../conversation/session.ts'
import { evolve } from './evolution/runtime.ts'
import { ServerResearchProvider } from '../research/provider.ts'
import { researchSessionBudget } from '../research/controller.ts'
import { speechEnvelope, speechDuration, initialSpeech } from '../characters/presentation.ts'
import { conversationSession } from '../conversation/session.ts'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { Player } from './locomotion.ts'
import { createMoruMind, brainCommands } from './brain/mind.ts'
import { worldEvents } from './worldEvents.ts'
import { observeWorld, userControlsMoru } from './brain/observation.ts'
import { getMemorySession } from './brain/memory.ts'
import { audio } from '../audio/AudioManager.ts'
import { worldTime } from './worldTime.ts'
import { moru } from '../characters/expression.ts'
import { homeState } from './homeSpace.ts'
import { livingWorld } from './livingWorld.ts'
import { streamCenter, streamWidth, surfaceHeight } from './terrain.ts'
import type { Reaction } from './personality.ts'
import { createAgentExecutor, agentDiagnostics } from './agentExecutor.ts'
import { perceiveWorld } from './worldPerception.ts'
import { agentControl } from './agentControl.ts'
import { createAutonomy, autonomyDebug } from './autonomy.ts'
import { getBackgroundWorld } from './backgroundWorld.ts'
import { WORLD_V3_LANDMARKS } from './worldV3.ts'
import { attachNotificationListeners } from '../native/notifications.ts'
import { weatherPreview } from './weatherPresentation.ts'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

function clearEvents(player:Player){player.events.length=0}
function markBrainAction(player:Player){player.brainRequested=true}
function present(node: HTMLDivElement, reaction: Reaction, reducedMotion=false) {
  const speech = node.querySelector<HTMLElement>('.moru-speech')
  const fx = node.querySelector<HTMLElement>('.moru-fx')
  node.dataset.tone = reaction.fx?.toLowerCase() ?? 'normal'
  node.dataset.emotion = reaction.emotion ?? 'calm'
  if (speech) { speech.textContent = initialSpeech(reaction.speech??'',!!reaction.typing,reducedMotion); speech.hidden = !reaction.speech }
  if (fx) {
    fx.replaceChildren()
    const symbols = { HEARTS: ['♡','♡'], SPARKLES: ['✧'], QUESTION: ['?'], JOY: ['♪'], SURPRISE: ['!'] }
    const display = reaction.fx ? symbols[reaction.fx] : reaction.emotion === 'sad' ? ['…'] : reaction.emotion === 'angry' || reaction.emotion === 'annoyed' ? ['⌁'] : reaction.emotion === 'warm' ? ['♡'] : reaction.emotion === 'happy' ? ['✿'] : []
    for (const [i, text] of display.entries()) {
      const span = document.createElement('span')
      span.textContent = text; span.className = `reaction-glyph ${reaction.fx?.toLowerCase() ?? reaction.emotion ?? 'normal'}`
      span.style.setProperty('--i', String(i)); fx.append(span)
    }
  }
}
function blurText(node: HTMLDivElement, blur: number) { node.style.filter = `blur(${blur}px)` }
function paint(node: HTMLDivElement, opacity: string, transform?: string) {
  node.style.opacity = opacity
  if (transform) node.style.transform = transform
}

function SpeechBubble({ player, element }: { player: RefObject<Player>; element: RefObject<HTMLDivElement | null> }) {
  const {camera}=useThree()
  const brain = useRef<ReturnType<typeof createMoruMind> | null>(null)
  const agent=useRef<ReturnType<typeof createAgentExecutor>|null>(null)
  const autonomy=useRef<ReturnType<typeof createAutonomy>|null>(null)
  const active = useRef({ age: 0, duration: 0, letters: [] as string[], shown: 0 })
 const semantic = useRef({elapsed:0,idle:0,returned:false,userVersion:0,eventRevision:-1,noticedEvent:''})
  useEffect(() => {
    const memory=getMemorySession()
    const background=getBackgroundWorld()
    const controlledPlayer=player.current
    const restoreBackground=()=>{
      const result=background.reconcile()
      if(worldEvents.getSnapshot().mode==='AUTO')worldEvents.restoreSemantic(result.state.activeEvents.map(event=>event.id))
      const landmark=WORLD_V3_LANDMARKS.find(item=>item.id===result.state.moruLocation)
      // The imperative Player is the existing R3F simulation boundary, not React state.
      // oxlint-disable-next-line react/immutability
      if(landmark){const y=surfaceHeight(landmark.approach[0],landmark.approach[1]);controlledPlayer.groundY=y;controlledPlayer.position.set(landmark.approach[0],y,landmark.approach[1])}
      for(const item of result.memories){
       memory.event(`BACKGROUND_${item.kind}_${item.id}`)
       if(item.kind==='DISCOVERY'&&!memory.memory.autonomy.discoveries[item.id])memory.memory.autonomy.discoveries[item.id]={status:'discovered',firstSeenAt:new Date(item.at).toISOString(),lastSeenAt:new Date(item.at).toISOString(),observations:1}
      }
      if(result.memories.length)memory.autonomyChanged()
    }
    const captureBackground=()=>{const eventState=worldEvents.getSnapshot();background.capture({season:worldTime.realWorld.season,worldTime:worldTime.current.hour,weather:livingWorld.weather?.type??'clear',activeEvents:eventState.active.map(event=>({id:event.id,startedAt:Date.now()-eventState.elapsed*1000,endsAt:Date.now()+Math.max(0,event.duration-eventState.elapsed)*1000,significance:event.significance,location:event.location})),moruLocation:WORLD_V3_LANDMARKS.map(item=>({id:item.id,distance:Math.hypot(item.approach[0]-controlledPlayer.position.x,item.approach[1]-controlledPlayer.position.z)})).sort((a,b)=>a.distance-b.distance)[0]?.id??'home',moruState:'QUIET',moruGoal:autonomy.current?.goal?.id??null,discoveries:Object.fromEntries(Object.entries(memory.memory.autonomy.discoveries).map(([id,value])=>[id,value.status])),manual:{season:worldTime.seasonOverride!==null,time:worldTime.override!==null,weather:weatherPreview.type!==null,events:eventState.mode==='MANUAL'}})}
    restoreBackground();void attachNotificationListeners()
    let disposed=false,appStateHandle:{remove:()=>Promise<void>}|null=null
    if(Capacitor.isNativePlatform())void App.addListener('appStateChange',({isActive})=>{if(isActive)restoreBackground();else captureBackground()}).then(handle=>{if(disposed)void handle.remove();else appStateHandle=handle})
    const executor=createAgentExecutor((result,command)=>{if(result==='completed'&&!command.startsWith('AUTONOMY:'))memory.event('AGENT_COMMAND_COMPLETED');autonomy.current?.result(result,command)})
    const director=createAutonomy({start:executor.start,memory:memory.memory.autonomy,changed:memory.autonomyChanged})
    const detachAgentControl=agentControl.bind(executor.start)
    agent.current=executor
    autonomy.current=director
    if(import.meta.env.DEV){const debugWindow=window as Window&{__moruAgentDiagnostics?:typeof agentDiagnostics;__moruAutonomyDiagnostics?:typeof autonomyDebug};debugWindow.__moruAgentDiagnostics=agentDiagnostics;debugWindow.__moruAutonomyDiagnostics=autonomyDebug}
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
    const detach=conversationSession.attach({snapshot:()=>{const snapshot=controller.snapshot();return snapshot?{...snapshot,perception:perceiveWorld(player.current,camera),continuity:continuitySummary(memory.memory.offline,memory.memory.evolution)}:null},hold:controller.holdConversation,
      listen(){moru.cancelSpeech();active.current.duration=0;moru.perform('listen','user',false)},
      speak(response,command){
        const p=player.current
        const fx={heart:'HEARTS',sparkle:'SPARKLES',question:'QUESTION',surprise:'SURPRISE',music:'JOY'} as const
        active.current.duration=0
        const offered=moru.offer({event:'BRAIN',speech:response.speech,fx:response.emote?fx[response.emote]:undefined,emotion:response.emotion,typing:true,duration:speechDuration(response.speech)},'conversation')
        if(response.action&&!response.plan.length&&!userControlsMoru(p))moru.perform(response.action,'conversation',false)
        if(response.plan.length)executor.start(response.plan,p,command)
        return offered
      },cancel(){moru.cancelSpeech();active.current.duration=0},
    })
    brainCommands.trigger=controller.trigger;brainCommands.converse=async text=>{await conversationSession.send(text);return controller.intent}
    brain.current = controller
    const suspend = () => { if (document.hidden){captureBackground();controller.suspend();conversationSession.cancel()} memory.save() }
    const leave = () => {captureBackground();controller.suspend();memory.save()}
    const returned = () => { if (!document.hidden){restoreBackground();semantic.current.returned=true} }
    document.addEventListener('visibilitychange', returned)
    document.addEventListener('visibilitychange', suspend)
    window.addEventListener('pagehide', leave)
    return () => { disposed=true;void appStateHandle?.remove();detachAgentControl();executor.interrupt(controlledPlayer,'disposed');agent.current=null;autonomy.current=null;document.removeEventListener('visibilitychange', returned); detach();controller.dispose(); memory.save(); brainCommands.trigger=null;brainCommands.converse=null;moru.setAutonomy(true);brain.current = null; document.removeEventListener('visibilitychange', suspend); window.removeEventListener('pagehide', leave) }
  }, [player,camera])
  const projected = useRef(new Vector3())
  const headTop = useRef(new Vector3())
  const emotePoint = useRef(new Vector3())
  const cameraRight = useRef(new Vector3())
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
    agent.current?.update(pState,Math.min(delta,.05))
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
      const eventState=worldEvents.getSnapshot()
      if(eventState.revision!==clock.eventRevision){
       clock.eventRevision=eventState.revision
       const important=eventState.active.find(event=>event.moruAwareness&&(event.significance==='HIGH'||event.significance==='VERY_HIGH'))
       if(important&&important.id!==clock.noticedEvent&&available&&!userControlsMoru(pState)){
        clock.noticedEvent=important.id
        void conversationSession.reactToEvent(important.id)
       }
       if(!important)clock.noticedEvent=''
      }
      let interacted=moru.userVersion!==clock.userVersion
      for(const event of pState.events){memory.event(event);interacted=true}
      clearEvents(pState);clock.userVersion=moru.userVersion
      // Preserve completed ideas on return before research can start its next cycle.
      if(brain.current)evolve(brain.current.interests.data,worldTime.realWorld.season,available&&!conversationActive())
      const observation=observeWorld(pState,{idle:clock.idle,interacted,returned:clock.returned,actions:moru.recentActions,speech:moru.recentSpeech,autonomousGoal:autonomy.current?.goal?.id??null,agentSkill:agentDiagnostics.skill,autonomyState:autonomy.current?.state??'QUIET'})
      brain.current?.tick(observation,elapsed)
      autonomy.current?.update({observation,perception:perceiveWorld(pState,camera),player:pState,agentState:agentDiagnostics.state,currentSkill:agentDiagnostics.skill},elapsed)
      clock.returned=false
    }
    const node = element.current
    if (!node) return
    const reaction=moru.take(active.current.age>=active.current.duration)
    // No stacking: the short FX cooldown and longer speech cooldown keep channels sparse.
    if (reaction && (reaction.typing || active.current.age >= active.current.duration)) {
      present(node, reaction,reducedMotion.current)
      const effect=reactionFeedback(reaction)
      feedback.start(effect)
      if(reaction.typing&&available&&!userControlsMoru(pState)){
        const gesture=effect.state==='AFFECTIONATE'||effect.state==='HAPPY'?'wave':effect.state==='PLAYFUL'?'playful':effect.state==='CURIOUS'||effect.state==='SURPRISED'?'listen':null
        if(gesture)moru.perform(gesture,'conversation',false)
      }
      const cue = reaction.fx === 'HEARTS' || reaction.emotion === 'warm' ? 'moru_affection' : reaction.fx === 'JOY' || reaction.emotion === 'happy' ? 'moru_happy' : reaction.fx === 'QUESTION' || reaction.emotion === 'curious' ? 'moru_curious' : reaction.fx === 'SURPRISE' || reaction.emotion === 'angry' || reaction.emotion === 'annoyed' ? 'moru_surprise' : reaction.emotion === 'sleepy' || reaction.emotion === 'sad' ? 'moru_sleepy' : 'moru_greeting'
      if (reaction.speech || reaction.fx) void audio.play(cue, 'character', 'moru-expression')
      active.current = { age: 0, duration: reaction.duration, letters: reaction.typing && !reducedMotion.current ? Array.from(reaction.speech ?? '') : [], shown: 0 }
    }
    active.current.age += Math.min(delta,.1)
    const { age, duration } = active.current
    if (age >= duration) { paint(node, '0'); return }
    if(active.current.letters.length){
      const count=Math.min(active.current.letters.length,Math.floor(Math.max(0,age-.2)/.055))
      if(count!==active.current.shown){active.current.shown=count;const speech=node.querySelector<HTMLElement>('.moru-speech');if(speech)speech.textContent=active.current.letters.slice(0,count).join('')}
    }
    // Character.headPosition includes an interaction clearance above the skull;
    // pull the typography anchor back toward the visible head.
    projected.current.copy(player.current.headPosition).addScaledVector(player.current.up,-.27).project(camera)
    const p = projected.current
    // Keep speech close enough to read as Moru's voice without covering the face.
    headTop.current.copy(projected.current)
    const visible = p.z >= -1 && p.z <= 1 && Math.abs(p.x) < 1.15 && Math.abs(p.y) < 1.6
    const { opacity, rise, blur } = speechEnvelope(age, duration, reducedMotion.current)
    const y = Math.min((-p.y * .5 + .5) * size.height, (-headTop.current.y * .5 + .5) * size.height) - 24 - rise
    blurText(node, blur)
    const anchorX = Math.max(Math.min(150,size.width*.42),Math.min(size.width-Math.min(150,size.width*.42),(p.x*.5+.5)*size.width))
    const anchorY = Math.min(size.height-130,Math.max(node.offsetHeight+68,y))
    paint(node, visible ? String(Math.max(0, opacity)) : '0',
      `translate(${anchorX}px, ${anchorY}px) translate(-50%, -100%)`)
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
  })
  return null
}
export default SpeechBubble
