import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Color, DoubleSide, InstancedMesh, MeshBasicMaterial, Object3D, PointLight, Sprite, Vector3, Shape, ShapeGeometry } from 'three'
import type { Player } from './locomotion.ts'
import { feedback, FEEDBACK_SOUNDS, feedbackVisual } from '../characters/feedback.ts'
import { MORU_ACTIONS } from '../characters/actions.ts'
import { characters } from '../characters/registry.ts'
import { audio } from '../audio/AudioManager.ts'

// One bounded pool shared by every appearance, never a per-outfit emitter.
export default function MoruFeedback({player}:{player:RefObject<Player>}){
 const petals=useRef<InstancedMesh>(null),light=useRef<PointLight>(null),left=useRef<Sprite>(null),right=useRef<Sprite>(null)
 const state=useRef({dummy:new Object3D(),origin:new Vector3(),forward:new Vector3(),toCamera:new Vector3(),color:new Color(),white:new Color('#fff7e6'),age:Infinity})
 const shapes=useMemo(()=>{
  const petal=new Shape();petal.moveTo(0,-1);petal.bezierCurveTo(-1.1,-.3,-.8,1.1,0,.8);petal.bezierCurveTo(.8,1.1,1.1,-.3,0,-1)
  const heart=new Shape();heart.moveTo(0,-.85);heart.bezierCurveTo(-1.7,.2,-.7,1.5,0,.55);heart.bezierCurveTo(.7,1.5,1.7,.2,0,-.85)
  const star=new Shape();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?.24:1,x=Math.sin(a)*r,y=Math.cos(a)*r;if(i===0)star.moveTo(x,y);else star.lineTo(x,y)}star.closePath()
  return {petal:new ShapeGeometry(petal,6),heart:new ShapeGeometry(heart,8),star:new ShapeGeometry(star)}
 },[])
 const blush=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32
  const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(16,16,0,16,16,16)
  gradient.addColorStop(0,'rgba(220,133,158,.8)');gradient.addColorStop(1,'rgba(220,133,158,0)')
  ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);return new CanvasTexture(canvas)
 },[])
 useEffect(()=>()=>{feedback.stop();blush.dispose();Object.values(shapes).forEach(geometry=>geometry.dispose())},[blush,shapes])
 useFrame(({camera},dt)=>{
  const frame=feedback.update(dt),p=player.current,s=state.current
  if(frame.active?.action&&frame.age>.4){
   const expected=MORU_ACTIONS.find(a=>a.id===frame.active?.action)?.clip
   const actual=characters.MORU?.clip
   const aliases:Record<string,string>={BUBBLE_DANCE:'bubbleDance',WAVE:'wave',LISTEN:'listen'}
   if(actual!==expected&&aliases[actual??'']!==frame.active.action)feedback.stop()
  }
  for(const hook of frame.cues){const entry=FEEDBACK_SOUNDS[hook];if(entry.cue&&frame.active?.action)void audio.play(entry.cue,'character','moru-feedback')}
  if(frame.age<s.age)s.origin.copy(p.position)
  s.age=frame.age
  const mesh=petals.current
  if(mesh){
   const visual=feedbackVisual(frame.active??{state:'NEUTRAL',intensity:'SUBTLE',duration:0})
   mesh.geometry=shapes[visual.shape]
   mesh.count=frame.count;mesh.visible=frame.count>0
   const material=mesh.material as MeshBasicMaterial;material.opacity=frame.opacity*.7
   for(let i=0;i<frame.count;i++){
    const phase=(frame.age*(.16+(i%3)*.025)+i*.137)%1,angle=i*2.399+frame.age*(i%2?-.16:.13)
    const burst=Math.min(1,frame.age/(frame.active?.state==='DANCING'?1.8:1.1))
    const radius=visual.motion==='burst'?.35+burst*(.5+i%3*.18):.55+phase*.9+frame.pulse*.18
    s.dummy.position.copy(s.origin).lerp(p.position,.35)
    s.dummy.position.x+=Math.cos(angle)*radius;s.dummy.position.y+=visual.motion==='rise'?.4+phase*1.6:visual.motion==='burst'?.8+Math.sin(burst*Math.PI)*.7:.25+Math.sin(phase*Math.PI)*1.5;s.dummy.position.z+=Math.sin(angle)*radius
    if(visual.shape==='petal')s.dummy.rotation.set(frame.age*.6+i,angle,Math.sin(frame.age+i))
    else{s.dummy.quaternion.copy(camera.quaternion);s.dummy.rotateZ(Math.sin(frame.age+i)*.18)}
    s.dummy.scale.setScalar((visual.motion==='burst'?1:Math.sin(phase*Math.PI))*(.08+(i%3)*.02))
    s.dummy.updateMatrix();mesh.setMatrixAt(i,s.dummy.matrix)
    s.color.set(visual.color);s.color.lerp(s.white,(i%3)*.12);mesh.setColorAt(i,s.color)
   }
   mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true
  }
  if(light.current){light.current.position.copy(p.position).addScaledVector(p.up,.65);light.current.intensity=frame.pulse*.65}
  s.forward.set(0,0,1).applyQuaternion(p.rotation);s.toCamera.copy(camera.position).sub(p.headPosition).normalize()
  for(const [index,sprite] of [left.current,right.current].entries())if(sprite){
   sprite.position.set(index===0?-.17:.17,-.78,.21).applyQuaternion(p.rotation).add(p.headPosition)
   sprite.material.opacity=s.forward.dot(s.toCamera)>.3?frame.blush:0
   sprite.visible=!!characters.MORU&&frame.blush>0
  }
 })
 return <group>
  <instancedMesh ref={petals} args={[shapes.petal,undefined,24]} frustumCulled={false}>
   <meshBasicMaterial transparent depthWrite={false} side={DoubleSide} />
  </instancedMesh>
  <pointLight ref={light} color="#ead6f2" intensity={0} distance={3.5} decay={2} />
  <sprite ref={left} scale={[.22,.12,1]}><spriteMaterial map={blush} transparent depthWrite={false} opacity={0} /></sprite>
  <sprite ref={right} scale={[.22,.12,1]}><spriteMaterial map={blush} transparent depthWrite={false} opacity={0} /></sprite>
 </group>
}
