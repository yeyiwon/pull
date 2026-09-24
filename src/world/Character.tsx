import { BENCH_CLIP, BENCH_CROSS, BENCH_REST, BENCH_STAND, isSeated, updateBench, clearBench } from './bench.ts'
import { MORU_RENDERING_PROFILE as profile, prepareMoruRendering, createMoruEnvironment } from '../characters/renderingProfile.ts'
import { environmentState } from './environmentState.ts'
import { bodySelection } from '../characters/bodySelection.ts'
import { appearanceAssets } from '../characters/appearanceAssets.ts'
import { appearanceGroundOffsets } from '../characters/appearanceGroundOffsets.ts'
import { retargetAnimation } from '../characters/retargetAnimation.ts'
import { prepareBodyAnimation } from '../characters/bodyAnimation.ts'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { AnimationClip, AnimationUtils, Box3, Group, Mesh, PointLight, Quaternion, SkinnedMesh, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { createLocomotion, movePlayer } from './locomotion.ts'
import type { AnimationState, Player } from './locomotion.ts'
import { moru } from '../characters/expression.ts'
import { MORU_ACTIONS, UNAVAILABLE_MORU_ACTIONS } from '../characters/actions.ts'
import { moruAnimations } from '../characters/assets.ts'
import { characters } from '../characters/registry.ts'
import { worldInterface } from '../ui/interface.ts'
import { conversationActive } from '../conversation/session.ts'

function Character({ player, onReady }: { player: RefObject<Player>; onReady: () => void }) {
  const {gl}=useThree()
  const body=useSyncExternalStore(bodySelection.subscribe,bodySelection.getSnapshot)
  const manifest=moruAnimations
  const walkingAsset = useLoader(GLTFLoader, appearanceAssets[body])
  const animationAssets = useLoader(GLTFLoader, manifest.map(a => a.url))
  const root = useRef<Group>(null)
  const faceFill = useRef<PointLight>(null)
  const fillDirection = useRef(new Vector3())
  const lookRotation = useRef(new Quaternion())
  const model = useMemo(() => {
    const scene = clone(walkingAsset.scene)
    const materials=prepareMoruRendering(scene)
    // Normalize the inspected new body's rest bounds without changing its mesh or rig.
    scene.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(scene)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
    const sources = Object.fromEntries(animationAssets.flatMap(asset => asset.animations.map(clip => [clip.name, body==='base'?clip:retargetAnimation(clip,asset.scene,scene)])))
    const offsets=body==='base'?undefined:appearanceGroundOffsets[body]
    const semanticClip=(id:string)=>MORU_ACTIONS.find(action=>action.id===id)!.clip
    const names = { IDLE: semanticClip('idle'), WALK: semanticClip('walk'), RUN: semanticClip('run'),
      CONFUSED: semanticClip('idle'), LISTEN: semanticClip('listen'), JUMP: semanticClip('jump'),
      WAVE: semanticClip('wave'), BUBBLE_DANCE: semanticClip('bubbleDance') }
    const clips = {} as Record<AnimationState, import('three').AnimationClip>
    for (const state of Object.keys(names) as AnimationState[]) {
      const name = names[state]
      const clip = sources[name]
      if (!clip) throw new Error(`Missing Moru animation: ${name}`)
      clips[state] = prepareBodyAnimation(clip,state==='JUMP',offsets)
    }
    const extras: Record<string, { clip: AnimationClip; loop: boolean; hold?: boolean }> = {}
    for (const [name, source] of Object.entries(sources)) {
      // Reference-pose .001 clips are retained in the inventory, not treated as emotes.
      if (!moruAnimations.some(entry=>entry.name===name)) continue
      const clip = prepareBodyAnimation(source,false,offsets)
      if(name===BENCH_CROSS){const hips=clip.tracks.find(t=>t.name==='mixamorigHips.position');if(hips)for(let i=1;i<hips.values.length;i+=3)hips.values[i]+=.066}
      extras[name] = { clip, loop: name===BENCH_CROSS||name==='Idle', hold: name===BENCH_CLIP||name===BENCH_STAND }
    }
    // No standalone sit-down export is present. Reverse the supplied stand-up
    // transition instead of importing an incompatible old-body animation.
    const stand=extras[BENCH_STAND].clip
    const sit=stand.clone();sit.name=BENCH_CLIP
    for(const track of sit.tracks){
      const times=Array.from(track.times),values=Array.from(track.values),stride=track.getValueSize()
      for(let i=0;i<times.length;i++){
        track.times[i]=stand.duration-times[times.length-1-i]
        for(let k=0;k<stride;k++)track.values[i*stride+k]=values[(times.length-1-i)*stride+k]
      }
    }
    extras[BENCH_CLIP]={clip:sit,loop:false,hold:true}
    extras[BENCH_REST]={clip:AnimationUtils.subclip(sit,BENCH_REST,Math.floor(sit.duration*24)-2,Math.ceil(sit.duration*24),24),loop:false,hold:true}
    const head = scene.getObjectByName('mixamorigHead')
    if (!head) throw new Error('Inspected Moru head bone is missing')
    return { scene, head, materials, scale: 2.8 / size.y, offset: new Vector3(-center.x, -bounds.min.y, -center.z), clips, extras }
  }, [walkingAsset, animationAssets, body])
  const materialRefs = useRef(model.materials)
  // GPU resources belong to the committed effect, not render: StrictMode can
  // replay setup/cleanup and Suspense can discard an uncommitted render.
  useEffect(() => {
    materialRefs.current = model.materials
    const studio = createMoruEnvironment(gl)
    for (const material of materialRefs.current) { material.envMap = studio.texture; material.needsUpdate = true }
    return () => {
      for (const material of materialRefs.current) material.envMap = null
      studio.dispose()
    }
  }, [gl, model])
  const animation = useRef<ReturnType<typeof createLocomotion> | null>(null)
  const wardrobeWasOpen = useRef(false)
  useEffect(() => {
    const controller = createLocomotion(model.scene, model.clips, { extras: model.extras, automaticObservation: false })
    // Keep the rest/bind pose offscreen until the first mixer evaluation.
    if(root.current)root.current.visible=false
    const currentPlayer=player.current
    animation.current = controller
    characters.MORU = {
      play: (name) => { const state = (Object.keys(model.clips) as AnimationState[]).find(key => model.clips[key].name === name)
        if (isSeated(player.current)||[BENCH_CLIP,BENCH_CROSS,BENCH_REST,BENCH_STAND,'Sit_Cross_Legged_on_Floor'].includes(name)) return false
        if (!player.current.isGrounded || player.current.groundState !== 'IDLE' || player.current.jumpRequested) return false
        if (!state || state==='JUMP') return controller.playExtra(name)
        if (state === 'WAVE' || state === 'BUBBLE_DANCE' || state === 'LISTEN' || state === 'CONFUSED') { player.current.actionRequested = state; return true }
        return false
      }, greet: () => { player.current.actionRequested = 'WAVE' },
      clip: 'IDLE', position: player.current.position, head: player.current.headPosition,
      anchors: ['mixamorigHead','mixamorigNeck','mixamorigSpine2','mixamorigLeftHand','mixamorigRightHand'], status: `Moru ${body} · ${manifest.length} animations`,
    }
    const unbind=moru.bind(id=>{
      const action=MORU_ACTIONS.find(a=>a.id===id)
      return action&&!UNAVAILABLE_MORU_ACTIONS.has(id)?characters.MORU?.play(action.clip)??false:false
    })
    return () => { clearBench(currentPlayer); unbind(); controller.dispose(); animation.current = null; delete characters.MORU; model.scene.traverse(node=>{if(node instanceof Mesh){if(node instanceof SkinnedMesh)node.skeleton.dispose();node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material]){for(const value of Object.values(material))if(value&&typeof value==='object'&&'isTexture' in value&&value.isTexture&&'dispose' in value)(value as import('three').Texture).dispose();material.dispose()}}}) }
  }, [model, player, onReady, body, manifest.length])

  useFrame(({camera}, delta) => {
    const dt = Math.min(delta, 0.05)
    const p=player.current
    const night=environmentState.night
    // Three.js materials are mutable render resources, not React state.
    // oxlint-disable-next-line react/immutability
    for(const material of materialRefs.current)material.envMapIntensity=profile.environmentDay+(profile.environmentNight-profile.environmentDay)*night
    if(faceFill.current)faceFill.current.intensity=profile.fillDay+(profile.fillNight-profile.fillDay)*night
    const controller=animation.current
    const wardrobePreview=worldInterface.getSnapshot()==='appearance'
    if(wardrobePreview&&!wardrobeWasOpen.current){controller?.stopExtra();controller?.playExtra('Idle')}
    else if(wardrobePreview&&controller&&(Object.keys(model.clips) as string[]).includes(controller.activeClip))controller.playExtra('Idle')
    else if(!wardrobePreview&&wardrobeWasOpen.current)controller?.stopExtra()
    wardrobeWasOpen.current=wardrobePreview
    if([BENCH_CLIP,BENCH_CROSS,BENCH_REST,BENCH_STAND].includes(controller?.activeClip??'')&&!isSeated(player.current))controller?.stopExtra()
    updateBench(player.current,dt,clip=>controller?.playExtra(clip)??false,()=>controller?.stopExtra())
    movePlayer(player.current, dt)
    const firstPose=!!controller&&root.current?.visible===false
    controller?.update(player.current, firstPose?Math.max(dt,.001):dt)
    if (characters.MORU && animation.current) characters.MORU.clip = animation.current.activeClip
    if (root.current) {
      if(conversationActive()&&p.groundState==='IDLE'){
        fillDirection.current.copy(camera.position).sub(p.position)
        lookRotation.current.setFromAxisAngle(p.up,Math.atan2(fillDirection.current.x,fillDirection.current.z))
        p.rotation.slerp(lookRotation.current,1-Math.exp(-5*dt))
      }
      root.current.position.copy(player.current.position)
      root.current.quaternion.copy(player.current.rotation)
      root.current.updateMatrixWorld(true)
      model.head.getWorldPosition(player.current.headPosition)
      player.current.headPosition.addScaledVector(player.current.up, 0.85)
      if(faceFill.current){model.head.getWorldPosition(faceFill.current.position);fillDirection.current.copy(camera.position).sub(faceFill.current.position).normalize();faceFill.current.position.addScaledVector(fillDirection.current,profile.fillDistance);faceFill.current.position.y+=.15}
      if(firstPose){
        root.current.visible=true
        bodySelection.loaded(body)
        onReady()
      }
    }
  }, -1)

  return (
    <>
    <pointLight ref={faceFill} color="#fff1e2" intensity={profile.fillDay} distance={7} decay={2}/>
    <group ref={root} visible={false} position={[0, 0, 1]} rotation={[0, Math.PI, 0]}>
      <group scale={model.scale}>
        <primitive object={model.scene} position={model.offset} dispose={null} />
      </group>
    </group>
    </>
  )
}
export default Character
