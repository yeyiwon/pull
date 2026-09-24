import { Quaternion, Vector3 } from 'three'
import { moru } from '../characters/expression.ts'
import type { ActionPlan, MoruSkill, SkillStep } from './agentSkills.ts'
import { isSeated, requestBench, WORLD_SEATS } from './bench.ts'
import type { Player } from './locomotion.ts'
import { getDeicticPoint, worldTarget } from './worldPerception.ts'
import { canOccupy } from './collision.ts'

export type AgentState='IDLE'|'MOVING'|'RUNNING'|'INTERACTING'|'SITTING'|'DANCING'|'THINKING'
export const agentDiagnostics={command:'',resolvedTarget:null as string|null,plan:[] as ActionPlan,skill:null as MoruSkill|null,state:'IDLE' as AgentState,step:0,completedSteps:[] as MoruSkill[],result:'idle',startPosition:{x:0,z:0},position:{x:0,z:0},distanceFromStart:0,maxDistanceFromStart:0}
const direction=new Vector3(),desired=new Quaternion(),up=new Vector3(0,1,0)
const steering=new Vector3()
function navigateDirection(player:Player,point:Vector3){
 direction.copy(point).sub(player.position).setY(0).normalize()
 let best=direction.clone(),bestScore=Infinity
 for(const angle of [0,.35,-.35,.7,-.7,1.05,-1.05,1.4,-1.4]){
  steering.copy(direction).applyAxisAngle(up,angle)
  const x=player.position.x+steering.x*.9,z=player.position.z+steering.z*.9
  if(!canOccupy(x,z,player.position.y))continue
  const score=Math.hypot(point.x-x,point.z-z)+Math.abs(angle)*.2
  if(score<bestScore){bestScore=score;best.copy(steering)}
 }
 return best
}
export function createAgentExecutor(onResult?:(event:string)=>void){
 let plan:SkillStep[]=[],index=0,elapsed=0,origin=new Vector3(),lastDistance=Infinity,stuck=0
 const resolved=new Map<string,Vector3>()
 const state=()=>agentDiagnostics.state
 function finish(result:string){agentDiagnostics.result=result;agentDiagnostics.state='IDLE';plan=[];index=0;elapsed=0;onResult?.(result)}
 function advance(){agentDiagnostics.completedSteps.push(plan[index].skill);index++;elapsed=0;lastDistance=Infinity;stuck=0;agentDiagnostics.step=index;if(index>=plan.length)finish('completed')}
 function start(next:ActionPlan,player:Player,command:string){
  if(!next.length)return false
  player.agentMovement=null;player.agentInterrupted=false;origin.copy(player.position);resolved.clear();resolved.set('ORIGIN',origin.clone())
  for(const id of ['AHEAD_POINT','DEICTIC_POINT']){const point=worldTarget(id,player);if(point)resolved.set(id,point)}
  plan=[...next];index=0;elapsed=0;agentDiagnostics.command=command;agentDiagnostics.plan=plan;agentDiagnostics.skill=plan[0].skill;agentDiagnostics.step=0;agentDiagnostics.completedSteps=[];agentDiagnostics.result='running';agentDiagnostics.startPosition={x:player.position.x,z:player.position.z};agentDiagnostics.position={...agentDiagnostics.startPosition};agentDiagnostics.distanceFromStart=0;agentDiagnostics.maxDistanceFromStart=0;return true
 }
 function interrupt(player:Player,reason='interrupted'){player.agentMovement=null;finish(reason)}
 function target(step:SkillStep,player:Player){const id=step.target??'';return resolved.get(id)?.clone()??worldTarget(id,player)}
 function face(player:Player,point:Vector3,dt:number){direction.copy(point).sub(player.position).setY(0);if(direction.lengthSq()<.0001)return true;desired.setFromAxisAngle(up,Math.atan2(direction.x,direction.z));player.rotation.slerp(desired,1-Math.exp(-7*dt));return player.rotation.angleTo(desired)<.04}
 function update(player:Player,dt:number){
  if(!plan.length)return
  agentDiagnostics.position={x:+player.position.x.toFixed(3),z:+player.position.z.toFixed(3)}
  agentDiagnostics.distanceFromStart=+Math.hypot(player.position.x-agentDiagnostics.startPosition.x,player.position.z-agentDiagnostics.startPosition.z).toFixed(3)
  agentDiagnostics.maxDistanceFromStart=Math.max(agentDiagnostics.maxDistanceFromStart,agentDiagnostics.distanceFromStart)
  if(player.agentInterrupted||player.keys.size||Math.hypot(player.touchX,player.touchZ)>.05||player.jumpRequested){player.agentInterrupted=false;interrupt(player);return}
  const step=plan[index];elapsed+=dt;agentDiagnostics.skill=step.skill;agentDiagnostics.resolvedTarget=step.target
  if(['WALK_TO','RUN_TO','MOVE_NEAR'].includes(step.skill)||step.skill==='SIT'){
   let point=target(step,player)
   if(step.skill==='SIT'&&step.target?.startsWith('bench-')){const seat=WORLD_SEATS.find(s=>`bench-${s.id}`===step.target);if(seat)point=worldTarget(step.target,player)}
   if(!point){finish(step.target==='DEICTIC_POINT'&&!getDeicticPoint()?'missing_deictic_target':'missing_target');return}
   const distance=Math.hypot(point.x-player.position.x,point.z-player.position.z),arrival=step.skill==='SIT'?.9:step.target?.startsWith('tree-')?2.2:step.target?.startsWith('flower-')?1.7:.45
   if(distance<=arrival){player.agentMovement=null;if(step.skill==='SIT'){if(requestBench(player)){agentDiagnostics.state='SITTING';advance()}else if(elapsed>2)finish('sit_failed')}else{face(player,point,dt);advance()}return}
   player.agentMovement={direction:navigateDirection(player,point).clone(),run:step.skill==='RUN_TO'};agentDiagnostics.state=step.skill==='RUN_TO'?'RUNNING':'MOVING'
   if(distance>=lastDistance-.01)stuck+=dt;else stuck=0;lastDistance=distance
   if(stuck>2.5||elapsed>25){player.agentMovement=null;finish('navigation_blocked')}return
  }
  player.agentMovement=null
  if(step.skill==='LOOK_AT'||step.skill==='TURN_TO'||step.skill==='INSPECT'){
   const point=target(step,player);if(!point){finish('missing_target');return}agentDiagnostics.state='INTERACTING'
   if(face(player,point,dt)){if(step.skill==='INSPECT'&&elapsed<(step.duration??2)){if(elapsed<.1)moru.perform('listen','user',false);return}advance()}return
  }
  if(step.skill==='WAIT'){agentDiagnostics.state='THINKING';if(elapsed>=Math.min(8,step.duration??1))advance();return}
  if(step.skill==='DANCE'){agentDiagnostics.state='DANCING';if(elapsed<dt*1.5)moru.perform('bubbleDance','user',false);if(elapsed>=Math.min(8,step.duration??3))advance();return}
  if(step.skill==='STAND'){agentDiagnostics.state='INTERACTING';if(!isSeated(player)||requestBench(player))advance();return}
  if(step.skill==='SPEAK'){if(elapsed<dt*1.5&&step.text)moru.say(step.text,{origin:'user'});advance();return}
  advance()
 }
 return {start,update,interrupt,get state(){return state()}}
}
