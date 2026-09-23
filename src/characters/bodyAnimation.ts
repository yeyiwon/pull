import { AnimationClip, AnimationUtils } from 'three'
import { groundOffsets } from './bodyProfile.ts'
/** Adapt source-space translations only. All rotations/skin weights remain original. */
export function prepareBodyAnimation(source:AnimationClip, physicsJump=false, offsets:Readonly<Record<string,number>>=groundOffsets){
 const clip=physicsJump?AnimationUtils.subclip(source,source.name,source.name==='Hop_with_Arms_Raised'?22:110,source.name==='Hop_with_Arms_Raised'?41:128,24):source.clone()
 const hips=clip.tracks.find(track=>track.name==='mixamorigHips.position')
 if(!hips)throw Error(`Missing hips translation: ${source.name}`)
 const ground=offsets[source.name]??0
 for(let i=0;i<hips.values.length;i+=3){
  hips.values[i]=hips.values[0];hips.values[i+2]=hips.values[2]
  hips.values[i+1]=(physicsJump?source.tracks.find(t=>t.name==='mixamorigHips.position')!.values[1]:hips.values[i+1])+ground
 }
 return clip
}
