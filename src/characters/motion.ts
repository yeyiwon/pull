import { AnimationMixer, AnimationUtils, LoopOnce, LoopRepeat, AdditiveAnimationBlendMode } from 'three'
import type { AnimationClip, Object3D, AnimationAction } from 'three'
export type ClipInfo = { layer: string; loop: boolean; next?: string }
/** One mixer owns all tracks. Additive attention never competes with body weights. */
export function createMotion(root:Object3D, clips:Record<string,AnimationClip>, info:Record<string,ClipInfo>, neutral?:AnimationClip){
 const mixer=new AnimationMixer(root),actions=new Map<string,AnimationAction>(),targets=new Map<string,string>(),from=new Map<string,number>(),ages=new Map<string,number>(),durations=new Map<string,number>()
 for(const [name,source] of Object.entries(clips)){
  const clip=source.clone();clip.name=name
  if(info[name].layer!=='BODY'&&neutral){AnimationUtils.makeClipAdditive(clip,0,neutral);clip.blendMode=AdditiveAnimationBlendMode}
  const a=mixer.clipAction(clip);a.setLoop(info[name].loop?LoopRepeat:LoopOnce,info[name].loop?Infinity:1);a.clampWhenFinished=!info[name].loop;actions.set(name,a)
 }
 function play(name:string,fade=.3){
  const action=actions.get(name);if(!action)return false
  const layer=info[name].layer
  if(targets.get(layer)===name&&action.isScheduled())return true
  for(const [key,a]of actions)if(info[key].layer===layer)from.set(key,a.isScheduled()?a.getEffectiveWeight():0)
  action.reset().setEffectiveWeight(from.get(name)??0).play();targets.set(layer,name);ages.set(layer,0);durations.set(layer,fade)
  return true
 }
 function clear(layer:string,fade=.3){
  for(const [name,a]of actions)if(info[name].layer===layer)from.set(name,a.isScheduled()?a.getEffectiveWeight():0)
  targets.delete(layer);ages.set(layer,0);durations.set(layer,fade)
 }
 return {mixer,play,clear,get active(){return targets.get('BODY')??''},
  update(delta:number){
   for(const [layer,age]of ages)ages.set(layer,age+delta)
   for(const [name,a]of actions){if(!a.isScheduled())continue;const layer=info[name].layer,t=Math.min(1,(ages.get(layer)??1)/Math.max(.001,durations.get(layer)??.3)),target=targets.get(layer)===name?1:0;a.setEffectiveWeight((from.get(name)??0)*(1-t)+target*t);if(t===1&&!target)a.stop()}
   mixer.update(delta)
   for(const [layer,name]of targets){const a=actions.get(name)!;if(!info[name].loop&&a.time>=a.getClip().duration){if(info[name].next)play(info[name].next!);else if(layer!=='BODY')clear(layer)}}
  },
  finished(name:string){const a=actions.get(name);return !!a&&!info[name].loop&&a.time>=a.getClip().duration},
  dispose(){mixer.stopAllAction();mixer.uncacheRoot(root)},
 }
}
