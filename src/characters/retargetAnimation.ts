import { AnimationClip, Object3D, Quaternion, Vector3 } from 'three'

/** Rest-space basis conversion. One shared source vocabulary, no per-outfit GLB copies. */
export function retargetAnimation(clip: AnimationClip, source: Object3D, target: Object3D): AnimationClip {
 source.updateMatrixWorld(true); target.updateMatrixWorld(true)
 const result=clip.clone()
 for(const track of result.tracks){
  const dot=track.name.lastIndexOf('.'),name=track.name.slice(0,dot),property=track.name.slice(dot+1)
  const from=source.getObjectByName(name),to=target.getObjectByName(name)
  if(!from||!to)throw new Error(`Retarget bone missing: ${name}`)
  if(property==='quaternion'){
   const sourceParent=from.parent?.getWorldQuaternion(new Quaternion())??new Quaternion()
   const targetParent=to.parent?.getWorldQuaternion(new Quaternion())??new Quaternion()
   const pre=targetParent.invert().multiply(sourceParent)
   const post=from.getWorldQuaternion(new Quaternion()).invert().multiply(to.getWorldQuaternion(new Quaternion()))
   const q=new Quaternion(),previous=new Quaternion();let first=true
   for(let i=0;i<track.values.length;i+=4){
    q.fromArray(track.values,i).premultiply(pre).multiply(post).normalize()
    if(!first&&q.dot(previous)<0)q.set(-q.x,-q.y,-q.z,-q.w)
    q.toArray(track.values,i);previous.copy(q);first=false
   }
  }else if(property==='position'){
   const ratio=name==='mixamorigHips'?to.position.y/from.position.y:(from.position.length()>1e-5?to.position.length()/from.position.length():1)
   const p=new Vector3()
   for(let i=0;i<track.values.length;i+=3)p.fromArray(track.values,i).sub(from.position).multiplyScalar(ratio).add(to.position).toArray(track.values,i)
  }else if(property==='scale'){
   for(let i=0;i<track.values.length;i+=3){track.values[i]*=to.scale.x/from.scale.x;track.values[i+1]*=to.scale.y/from.scale.y;track.values[i+2]*=to.scale.z/from.scale.z}
  }else throw new Error(`Unsupported retarget property: ${property}`)
 }
 return result
}
