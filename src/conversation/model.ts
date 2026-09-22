import { MORU_ACTIONS } from '../characters/actions.ts'
import type { MoruActionId } from '../characters/actions.ts'
import type { AttentionTarget, BrainEmote, InternalState, MeaningfulMemory, Observation } from '../world/brain/types.ts'
export type Turn={user:string;moru:string}
export type Context={userMessage:string;world:Pick<Observation,'season'|'timeOfDay'|'weather'|'location'|'indoor'|'nearWater'|'skyEvent'>;moru:InternalState&{target:AttentionTarget};recentConversation:Turn[];recentEvents:MeaningfulMemory[]}
export interface MoruConversationProvider{respond(context:Context,signal:AbortSignal):Promise<unknown>}
export type Response={speech:string;emotion:'calm'|'happy'|'curious'|'sleepy'|'warm'|null;attention:AttentionTarget;action:MoruActionId|null;emote:BrainEmote|null}
export function buildContext(userMessage:string,o:Observation,state:InternalState,target:AttentionTarget,turns:Turn[],events:MeaningfulMemory[]):Context{
 const {season,timeOfDay,weather,location,indoor,nearWater,skyEvent}=o
 return structuredClone({userMessage,world:{season,timeOfDay,weather,location,indoor,nearWater,skyEvent},moru:{...state,target},recentConversation:turns.slice(-8),recentEvents:events.slice(-8)})
}
export function parseResponse(raw:unknown,context:Context){
 const rejected:string[]=[]
 const v=raw&&typeof raw==='object'?raw as Record<string,unknown>:{}
 const speech=typeof v.speech==='string'&&v.speech.trim().length<=120&&!/[<>\r\n]/.test(v.speech)?v.speech.trim():''
 if(!speech)rejected.push('speech')
 const optional=(key:string,valid:boolean)=>{if(v[key]!=null&&!valid)rejected.push(key);return valid}
 const action=optional('action',MORU_ACTIONS.some(a=>a.id===v.action&&a.category==='gesture'))?v.action as MoruActionId:null
 const emotion=optional('emotion',['calm','happy','curious','sleepy','warm'].includes(String(v.emotion)))?v.emotion as Response['emotion']:null
 const emote=optional('emote',['heart','sparkle','question','surprise','music'].includes(String(v.emote)))?v.emote as BrainEmote:null
 const t=typeof v.attention==='string'?v.attention.toUpperCase():''
 const validTarget=['USER','WORLD','NONE'].includes(t)||t==='SKY'&&!context.world.indoor||t==='WATER'&&context.world.nearWater||t==='HOME'&&context.world.indoor
 const attention=optional('attention',validTarget)?t as AttentionTarget:'USER'
 return {response:{speech,action,emotion,emote,attention} satisfies Response,rejected}
}
export class MockConversationAdapter implements MoruConversationProvider{
 async respond(c:Context,_signal:AbortSignal):Promise<unknown>{
  const text=c.userMessage.toLowerCase(),sleepy=c.moru.sleepiness>.6,w=c.world
  let speech:string,action:MoruActionId|null=null,attention:AttentionTarget='USER',emotion:Response['emotion']='calm',emote:BrainEmote|null=null
  if(/안녕|반가|hello|\bhi\b/.test(text)){speech=sleepy?'왔네. 조금 졸고 있었어.':'안녕. 옆에 있어도 좋아.';action='wave';emotion='warm'}
  else if(/피곤|지쳤|tired/.test(text)){speech=c.moru.comfort>.7?'잠깐 같이 쉬자. 여긴 조용해.':'오늘은 천천히 가도 돼.';emotion='warm';action='listen'}
  else if(/날씨|비|눈|weather/.test(text)){speech=w.weather==='snow'?'눈이 내려. 발자국이 금방 옅어지겠네.':w.weather==='rain'||w.weather==='storm'?'비 온다. 잠깐 처마 밑에 있을까?':w.timeOfDay==='NIGHT'?'밤이 조용해. 하늘 보고 있었어.':'지금은 비가 안 와. 조금 걸을까?';attention=w.indoor?'HOME':'SKY'}
  else if(/뭐.*하|what.*doing/.test(text)){speech=w.nearWater?(w.timeOfDay==='NIGHT'?'물 보고 있었어. 밤에는 색이 좀 달라 보여.':'물이 지나가는 걸 보고 있었어.'):w.indoor?'집에서 잠깐 쉬고 있었어.':sleepy?'조금 졸고 있었어. 바람 소리 들으면서.':'주변을 보고 있었어. 오늘은 어디가 눈에 들어와?';attention=w.indoor?'HOME':w.nearWater?'WATER':'WORLD';action='listen'}
  else if(/어디|어디로|where/.test(text)){speech=sleepy?'집 쪽으로 천천히 가자.':w.nearWater?'다리 건너편은 어때?':c.moru.energy>.65?'물가까지 걸어볼래? 뭐가 보일지 궁금해.':'가까운 곳부터 천천히 둘러보자.';emotion='curious';emote='question'}
  else {speech=sleepy?'응, 듣고 있어. 조금 느긋해졌네.':c.moru.curiosity>.7?'그건 어떤 느낌이야?':c.recentConversation.length%3===1?'조금 더 듣고 싶어.':'응. 여기서 같이 듣고 있어.';action='listen'}
  if(c.recentConversation.at(-1)?.moru===speech)speech='응, 기억하고 있어. 조금 쉬었다 갈까?'
  return {speech,emotion,attention,action,emote}
 }
}
