export const MORU_SKILLS = ['WALK_TO','RUN_TO','LOOK_AT','TURN_TO','SIT','STAND','DANCE','WAIT','INSPECT','MOVE_NEAR','SPEAK'] as const
export type MoruSkill = typeof MORU_SKILLS[number]
export type SkillStep = { skill:MoruSkill; target:string|null; duration:number|null; text:string|null }
export type ActionPlan = readonly SkillStep[]
export type WorldCandidate = {id:string;type:'tree'|'bench'|'flower'|'water'|'house'|'ground'|'landmark'|'bridge';position:{x:number;z:number};tags:string[];affordances:string[];distance:number;visible:boolean}
export type WorldPerception = {candidates:WorldCandidate[];deicticTarget:string|null}

export function parseActionPlan(raw:unknown,allowed:readonly string[]):SkillStep[]{
 if(!Array.isArray(raw))return []
 const ids=new Set([...allowed,'ORIGIN','AHEAD_POINT','DEICTIC_POINT'])
 const result:SkillStep[]=[]
 for(const value of raw.slice(0,8)){
  if(!value||typeof value!=='object')continue
  const v=value as Record<string,unknown>,skill=String(v.skill) as MoruSkill
  if(!MORU_SKILLS.includes(skill))continue
  const target=v.target==null?null:String(v.target)
  if(target&&!ids.has(target))continue
  const duration=v.duration==null?null:Math.max(.2,Math.min(8,Number(v.duration)))
  const text=v.text==null?null:String(v.text).trim().slice(0,120)||null
  if(duration!==null&&!Number.isFinite(duration))continue
  if(['WALK_TO','RUN_TO','LOOK_AT','TURN_TO','SIT','INSPECT','MOVE_NEAR'].includes(skill)&&!target)continue
  if(skill==='SPEAK'&&!text)continue
  result.push({skill,target,duration,text})
 }
 return result
}

export function directCommandPlan(text:string,candidates:readonly WorldCandidate[]):SkillStep[]{
 const command=text.toLowerCase(),find=(type:WorldCandidate['type'])=>candidates.find(c=>c.type===type)?.id??null
 const tree=find('tree'),bench=find('bench'),flower=find('flower'),landmark=find('landmark'),bridge=find('bridge')
 const step=(skill:MoruSkill,target:string|null=null,duration:number|null=null,text:string|null=null):SkillStep=>({skill,target,duration,text})
 if(/(고대 나무|달 전망대|숨은 정원|랜드마크).*(가|봐|보고|관찰)/.test(command)&&landmark)return [step(/(뛰|달)/.test(command)?'RUN_TO':'MOVE_NEAR',landmark),step('INSPECT',landmark,2)]
 if(/다리.*(가|봐|보고|관찰)/.test(command)&&bridge)return [step('MOVE_NEAR',bridge),step('LOOK_AT',bridge)]
 if(/벤치.*앉|의자.*앉|앉아/.test(command)&&bench)return [step('SIT',bench)]
 if(/춤/.test(command))return [step('DANCE',null,3)]
 if(/나무.*(뛰|달).*(보고|봐).*(와|돌아)/.test(command)&&tree)return [step('RUN_TO',tree),step('LOOK_AT',tree),step('WAIT',null,1.5),step('RUN_TO','ORIGIN')]
 if(/꽃.*(보고|봐|관찰)/.test(command)&&flower)return [step('MOVE_NEAR',flower),step('INSPECT',flower,2)]
 if(/나무.*(보고|봐)/.test(command)&&tree)return [step('LOOK_AT',tree)]
 if(/저기.*(뛰|달)|저기로.*(뛰|달)/.test(command))return [step('RUN_TO','DEICTIC_POINT')]
 if(/저기.*(가|걸)|저기로.*(가|걸)/.test(command))return [step('WALK_TO','DEICTIC_POINT')]
 if(/(조금|잠깐).*(걸어|걸어봐)|걸어봐/.test(command))return [step('WALK_TO','AHEAD_POINT')]
 return []
}
