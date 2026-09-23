import { worldInterface } from '../ui/interface.ts'
import { conversationActive } from '../conversation/session.ts'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector3, PerspectiveCamera } from 'three'
import { cinematicComposition, idleFramingWeight, skyTargetHeight } from './cinematicFraming.ts'
import { surfaceHeight } from './terrain.ts'
import { homeState } from './homeSpace.ts'
import type { Player } from './locomotion.ts'

// Shared mutable simulation data stays outside React render state.
function frameCamera(camera:PerspectiveCamera,aspect:number){camera.fov=cinematicComposition(aspect).fov;camera.updateProjectionMatrix()}
function updateHeading(player: Player, yaw: number) { player.cameraYaw = yaw }

function CameraRig({ player }: { player: RefObject<Player> }) {
  const { camera, gl, size } = useThree()
  const orbit = useRef({ yaw: -.38, pitch: 0.1, desiredYaw: -.38, desiredPitch: 0.1, pointer: -1, x: 0, y: 0 })
  const focus = useRef(new Vector3(0, 1.3, 1))
  const desiredFocus = useRef(new Vector3())
  const facing = useRef(new Vector3())
  const previewPosition = useRef(new Vector3())
  const previewTarget = useRef(new Vector3())
  const wardrobeBlend = useRef(0)
  const aspect=size.width/size.height
  const distance = MathUtils.clamp(5.2/aspect,8.3,11.5)
  const framing=useRef({distance:10.5,reduced:false,idle:0,time:0})
  useEffect(()=>{if(camera instanceof PerspectiveCamera){frameCamera(camera,aspect)}},[camera,aspect])
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>{framing.current.reduced=media.matches};sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[])
  useEffect(() => {
    const canvas = gl.domElement
    const state = orbit.current
    function down(event: PointerEvent) {
      if(conversationActive())return
      if (event.button !== 0 || state.pointer !== -1) return
      framing.current.idle=0
      state.pointer = event.pointerId; state.x = event.clientX; state.y = event.clientY
      canvas.setPointerCapture(event.pointerId)
    }
    function move(event: PointerEvent) {
      if(conversationActive()){stop();return}
      if (event.pointerId !== state.pointer) return
      state.desiredYaw -= (event.clientX - state.x) * 0.005
      state.desiredPitch = MathUtils.clamp(state.desiredPitch + (event.clientY - state.y) * 0.004, -.55, 1.1)
      state.x = event.clientX; state.y = event.clientY
    }
    function stop() {
      if (state.pointer !== -1 && canvas.hasPointerCapture(state.pointer)) canvas.releasePointerCapture(state.pointer)
      state.pointer = -1
      framing.current.idle=0
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', stop)
    canvas.addEventListener('pointercancel', stop)
    canvas.addEventListener('lostpointercapture', stop)
    window.addEventListener('blur', stop)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', stop)
      canvas.removeEventListener('pointercancel', stop)
      canvas.removeEventListener('lostpointercapture', stop)
      window.removeEventListener('blur', stop)
      stop()
    }
  }, [gl])
  // Run before movement so input uses this frame's visible viewing direction.
  useFrame((_, delta) => {
    const state = orbit.current
    const blend = 1 - Math.exp(-9 * Math.min(delta, 0.05))
    state.yaw = MathUtils.lerp(state.yaw, state.desiredYaw, blend)
    state.pitch = MathUtils.lerp(state.pitch, state.desiredPitch, blend)
    if (Math.abs(state.yaw - state.desiredYaw) < 0.00001) state.yaw = state.desiredYaw
    if (Math.abs(state.pitch - state.desiredPitch) < 0.00001) state.pitch = state.desiredPitch
    updateHeading(player.current, state.yaw)
  }, -2)
  useFrame((_, delta) => {
    const p = player.current
    const f=framing.current,dt=Math.min(delta,.05)
    const interrupted=p.keys.size>0||Math.hypot(p.touchX,p.touchZ)>.01||!p.isGrounded||p.groundState!=='IDLE'||orbit.current.pointer!==-1||conversationActive()||worldInterface.getSnapshot()!==null
    f.time+=dt;f.idle=interrupted?0:f.idle+dt
    const weight=idleFramingWeight(f.idle,interrupted,f.reduced,homeState.cutaway)
    desiredFocus.current.set(p.position.x, p.groundY + (p.position.y - p.groundY) * 0.3 + 1.3, p.position.z)
    focus.current.lerp(desiredFocus.current, 1 - Math.exp(-5 * Math.min(delta, 0.05)))
    const { yaw, pitch } = orbit.current
    const targetDistance=MathUtils.lerp(distance-(conversationActive()?.45:0),7,homeState.cutaway)
    framing.current.distance=MathUtils.damp(framing.current.distance,targetDistance,framing.current.reduced?14:3,Math.min(delta,.05))
    const followDistance=framing.current.distance
    const viewPitch = MathUtils.lerp(pitch, Math.max(.55, pitch), homeState.cutaway)
    camera.position.set(
      focus.current.x + Math.sin(yaw) * Math.cos(Math.max(0,viewPitch)) * followDistance,
      focus.current.y + Math.sin(Math.max(0,viewPitch)) * followDistance,
      focus.current.z + Math.cos(yaw) * Math.cos(Math.max(0,viewPitch)) * followDistance,
    )
    camera.position.setY(Math.max(camera.position.y,surfaceHeight(camera.position.x,camera.position.z)+.45))
    const composition=cinematicComposition(aspect),outside=1-homeState.cutaway
    desiredFocus.current.copy(focus.current).y += (composition.skyLift+Math.sin(Math.max(0,-viewPitch))*followDistance)*outside
    // A fixed off-centre composition; idle movement is bounded and never rotates orbit yaw.
    desiredFocus.current.x+=Math.cos(yaw)*composition.side*outside
    desiredFocus.current.z-=Math.sin(yaw)*composition.side*outside
    facing.current.set(0,0,1).applyQuaternion(p.rotation)
    desiredFocus.current.x+=weight*(Math.sin(f.time*.12)*.035+facing.current.x*.035)
    desiredFocus.current.y+=weight*Math.sin(f.time*.09+1.7)*.025
    desiredFocus.current.z+=weight*facing.current.z*.035
    if(viewPitch<0 && outside>.99 && camera instanceof PerspectiveCamera){
      desiredFocus.current.y=skyTargetHeight(camera.position.y,p.position.y,
        Math.hypot(camera.position.x-p.position.x,camera.position.z-p.position.z),
        desiredFocus.current.y,camera.fov)
    }
    // Preview the existing live body, rather than loading a second GPU model.
    const wardrobe=worldInterface.getSnapshot()==='appearance'
    wardrobeBlend.current=MathUtils.damp(wardrobeBlend.current,wardrobe?1:0,f.reduced?100:7,dt)
    const preview=wardrobeBlend.current
    if(preview>.001 && camera instanceof PerspectiveCamera){
      const portrait=size.width<=600
      const availableHeight=portrait?size.height*.58-100:size.height-100
      const visibleFraction=Math.max(.2,availableHeight/size.height)*.8
      const previewDistance=1.55/(Math.tan(MathUtils.degToRad(camera.fov/2))*visibleFraction)
      previewTarget.current.set(p.position.x,p.position.y+1.45,p.position.z)
      facing.current.set(0,0,1).applyQuaternion(p.rotation);facing.current.y=0;facing.current.normalize()
      previewPosition.current.copy(previewTarget.current).addScaledVector(facing.current,previewDistance)
      previewPosition.current.y+=.12
      camera.position.lerp(previewPosition.current,preview)
      desiredFocus.current.lerp(previewTarget.current,preview)
      const offsetX=portrait?0:204
      const offsetY=portrait?(size.height*.42-100)/2:-25
      camera.setViewOffset(size.width,size.height,offsetX*preview,offsetY*preview,size.width,size.height)
    }else if(camera instanceof PerspectiveCamera && camera.view?.enabled){camera.clearViewOffset()}
    camera.lookAt(desiredFocus.current)
  })
  return null
}
export default CameraRig
