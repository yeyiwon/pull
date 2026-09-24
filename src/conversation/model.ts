import type { Continuity } from '../world/evolution/offline.ts'
import { parseContinuity, continuityQuestion } from '../world/evolution/offline.ts'
import { parseResearchSummary } from '../research/model.ts'
import type { ResearchSummary } from '../research/model.ts'
import { MORU_ACTIONS } from '../characters/actions.ts'
import type { MoruActionId } from '../characters/actions.ts'
import type { AttentionTarget, BrainEmote, InternalState, MeaningfulMemory, Observation } from '../world/brain/types.ts'
import { directCommandPlan, parseActionPlan } from '../world/agentSkills.ts'
import type { SkillStep, WorldPerception } from '../world/agentSkills.ts'
import { conversationIntelligence } from '../world/intelligence.ts'
import type { ConversationIntelligence,IntelligenceState } from '../world/intelligence.ts'
import { getAccountIdentityContext,type AccountIdentityContext } from '../cloud/profileContext.ts'
export type Turn={user:string;moru:string}
export type Context={user?:AccountIdentityContext;continuity?:Continuity;research?:ResearchSummary;intelligence?:ConversationIntelligence;userMessage:string;world:Pick<Observation,'season'|'timeOfDay'|'weather'|'location'|'indoor'|'nearWater'|'skyEvent'|'activeEvents'|'eventLocation'|'currentAutonomousGoal'|'currentAgentSkill'|'autonomyState'>;moru:InternalState&{target:AttentionTarget};perception:WorldPerception;recentConversation:Turn[];recentEvents:MeaningfulMemory[]}
export interface MoruConversationProvider{respond(context:Context,signal:AbortSignal):Promise<unknown>}
export type Response={speech:string;emotion:'calm'|'happy'|'curious'|'sleepy'|'warm'|'sad'|'angry'|'annoyed'|null;attention:AttentionTarget;action:MoruActionId|null;emote:BrainEmote|null;plan:SkillStep[]}
const emptyPerception=():WorldPerception=>({candidates:[],deicticTarget:null})
export function buildContext(userMessage:string,o:Observation,state:InternalState,target:AttentionTarget,turns:Turn[],events:MeaningfulMemory[],research?:ResearchSummary,continuity?:Continuity,perception:WorldPerception=emptyPerception(),intelligence?:IntelligenceState):Context{
 const {season,timeOfDay,weather,location,indoor,nearWater,skyEvent,activeEvents=[],eventLocation=null,currentAutonomousGoal=null,currentAgentSkill=null,autonomyState='QUIET'}=o
 const adaptive=intelligence?conversationIntelligence(intelligence,userMessage,o):undefined
 const user=getAccountIdentityContext()
 return structuredClone({...(user?{user}:{}),...(continuity&&continuityQuestion(userMessage)?{continuity:parseContinuity(continuity)}:{}),...(research&&/궁금|관심|연구|탐구|발견|뭐.*생각|뭐.*하|뭐해|없을 때|없는 동안|뭐했|뭐 했/.test(userMessage)?{research:parseResearchSummary(research)}:{}),...(adaptive?{intelligence:adaptive}:{}),userMessage,world:{season,timeOfDay,weather,location,indoor,nearWater,skyEvent,activeEvents,eventLocation,currentAutonomousGoal,currentAgentSkill,autonomyState},moru:{...state,target},perception,recentConversation:turns.slice(-8),recentEvents:events.slice(-8)})
}
export function parseResponse(raw:unknown,context:Context){
 const rejected:string[]=[]
 const v=raw&&typeof raw==='object'?raw as Record<string,unknown>:{}
 const speech=typeof v.speech==='string'&&v.speech.trim().length<=120&&!/[<>\r\n]/.test(v.speech)?v.speech.trim():''
 if(!speech)rejected.push('speech')
 const optional=(key:string,valid:boolean)=>{if(v[key]!=null&&!valid)rejected.push(key);return valid}
 const action=optional('action',MORU_ACTIONS.some(a=>a.id===v.action&&a.category==='gesture'))?v.action as MoruActionId:null
 const emotion=optional('emotion',['calm','happy','curious','sleepy','warm','sad','angry','annoyed'].includes(String(v.emotion)))?v.emotion as Response['emotion']:null
 const emote=optional('emote',['heart','sparkle','question','surprise','music'].includes(String(v.emote)))?v.emote as BrainEmote:null
 const t=typeof v.attention==='string'?v.attention.toUpperCase():''
 const validTarget=['USER','WORLD','NONE'].includes(t)||t==='SKY'&&!context.world.indoor||t==='WATER'&&context.world.nearWater||t==='HOME'&&context.world.indoor
 const attention=optional('attention',validTarget)?t as AttentionTarget:'USER'
 const parsedPlan=parseActionPlan(v.plan,context.perception?.candidates.map(c=>c.id)??[])
 if(v.plan!=null&&(!Array.isArray(v.plan)||parsedPlan.length!==v.plan.length))rejected.push('plan')
 const plan=parsedPlan.length?parsedPlan:directCommandPlan(context.userMessage,context.perception?.candidates??[])
 return {response:{speech,action,emotion,emote,attention,plan} satisfies Response,rejected}
}
export class MockConversationAdapter implements MoruConversationProvider{
 async respond(c:Context,_signal:AbortSignal):Promise<unknown>{
  const text=c.userMessage.toLowerCase(),sleepy=c.moru.sleepiness>.6,w=c.world
  let speech:string,action:MoruActionId|null=null,attention:AttentionTarget='USER',emotion:Response['emotion']='calm',emote:BrainEmote|null=null
  const plan=directCommandPlan(text,c.perception?.candidates??[])
  if(plan.length){speech=/앉/.test(text)?'응. 가까운 자리로 가볼게.':/춤/.test(text)?'좋아.':'응, 해볼게.';attention='WORLD'}
  else if(continuityQuestion(text)){const event=c.continuity?.meaningfulOfflineEvents[0],h=c.continuity?.worldHistory.at(-1);speech=h?.status==='APPLIED'?'작은 장식을 놓았어. 기록이 남아 있어.':h?.status==='WAITING_FOR_ASSET'?'작게 꾸밀 생각은 있어. 아직 놓은 건 없어.':event?'전에 궁금했던 걸 다시 생각해봤어. 새로 알아낸 건 없어.':'특별히 남아 있는 기록은 없어.'}
  else if(c.research?.currentFascination&&/궁금|관심|연구|탐구/.test(text)){const labels:Record<string,string>={snow:'눈의 모양',reflection:'밤의 물',leaves:'가을의 잎'};speech=`요즘 ${labels[c.research.currentFascination]??'그 주제'}이 궁금해. 아직 모르는 게 있어.`;attention='WORLD';emotion='curious'}
  else if(/안녕|반가|hello|\bhi\b/.test(text)){speech=sleepy?'왔네. 조금 졸고 있었어.':'왔네.';action='wave';emotion='warm'}
  else if(/피곤|지쳤|tired/.test(text)){speech=c.moru.comfort>.7?'잠깐 같이 쉬자. 여긴 조용해.':'오늘은 천천히 가도 돼.';emotion='warm';action='listen'}
  else if(/날씨|비|눈|weather/.test(text)){speech=w.weather==='snow'?'눈이 오네. 조금 보고 싶어.':w.weather==='rain'||w.weather==='storm'?'비 온다. 잠깐 보고 있어.':w.timeOfDay==='NIGHT'?'밤이네.':'지금은 비가 안 와.';attention=w.indoor?'HOME':'SKY'}
  else if(/뭐.*하|뭐해|what.*doing/.test(text)){speech=w.nearWater?(w.timeOfDay==='NIGHT'?'물 보고 있었어. 밤에는 색이 좀 달라 보여.':'물이 지나가는 걸 보고 있었어.'):w.indoor?'집에서 잠깐 쉬고 있었어.':sleepy?'조금 졸고 있었어.':'주변 보고 있었어. 그냥 조금 더 보고 싶어서.';attention=w.indoor?'HOME':w.nearWater?'WATER':'WORLD';action='listen'}
  else if(/심심/.test(text)){speech=sleepy?'나는 좀 졸려. 잠깐 이러고 있을래.':'음. 나는 조금 더 여기 보고 싶어.';attention='WORLD'}
  else if(/예쁘|예뻐|아름다/.test(text)){speech='응. 조금 더 보고 싶네.';attention=w.indoor?'HOME':w.nearWater?'WATER':'WORLD';emotion='warm'}
  else if(/내.*(생각|마음|기분)|왜.*(했|하는)|알아[?？]?/.test(text)){speech='아직 모르겠어. 짐작만으로 말하긴 좀 그래.'}
  else if(/어디|어디로|where/.test(text)){speech=sleepy?'집 쪽으로 천천히 가자.':w.nearWater?'다리 건너편은 어때?':c.moru.energy>.65?'물가까지 걸어볼래? 뭐가 보일지 궁금해.':'가까운 곳부터 천천히 둘러보자.';emotion='curious';emote='question'}
  else {speech=sleepy?'응, 듣고 있어. 조금 느긋해졌네.':c.moru.curiosity>.7?'음. 조금 더 생각해볼래.':'응. 듣고 있어.';action='listen'}
  if(c.recentConversation.at(-1)?.moru===speech)speech='음. 잠깐 생각 중이야.'
  return {speech,emotion,attention,action,emote,plan}
 }
}
