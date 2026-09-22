import type { Reaction } from '../world/personality.ts'
import { MORU_ACTIONS, REACTION_ACTIONS } from './actions.ts'
import type { MoruActionId, MoruReaction } from './actions.ts'
import { AMBIENT_LINES, contextCategory, LINE_GESTURES } from './ambientLines.ts'
import type { AmbientContext, LineCategory } from './ambientLines.ts'

type Origin = 'user' | 'ambient' | 'brain' | 'conversation'
type Performer = (id:MoruActionId)=>boolean
const FX = {heart:'HEARTS',sparkle:'SPARKLES',curiosity:'QUESTION',music:'JOY',surprise:'SURPRISE'} as const
export type Emote = keyof typeof FX
export function createMoruExpression(random:()=>number=Math.random) {
  let performer:Performer|null=null,time=0,busyUntil=0,nextSpeech=0,nextUserSpeech=0,nextEmote=0,nextAmbient=35+random()*35,idle=0
  let returning=false,autonomy=true,userVersion=0
  let pending:Reaction|null=null,lastAction:MoruActionId|null=null,lastActionAt=-1000
  let context:AmbientContext={hour:12,season:'spring',weather:'clear',inside:false,nearWater:false,idle:false}
  const recent=new Map<string,number>()
  function offer(reaction:Reaction,origin:Origin='ambient') {
    if(origin!=='conversation'&&(time<busyUntil||pending))return false
    const text=reaction.speech?.trim().slice(0,origin==='conversation'?120:48)
    if(origin!=='conversation' && text && (recent.has(text)||time<(origin==='user'?nextUserSpeech:nextSpeech)))return false
    if(!text && (!reaction.fx||time<nextEmote))return false
    if(origin==='user')userVersion++
    pending={...reaction,speech:text,duration:Math.max(1.5,Math.min(origin==='conversation'?8:3,reaction.duration))}
    busyUntil=time+pending.duration;nextEmote=time+6
    if(text){recent.set(text,time);nextSpeech=time+20+random()*16;nextUserSpeech=time+4}
    return true
  }
  function perform(id:MoruActionId,origin:Origin='user',decorate=true) {
    const definition=MORU_ACTIONS.find(a=>a.id===id)
    if(!definition||!performer || (origin!=='user'&&definition.category==='dance') || (lastAction===id&&time-lastActionAt<12))return false
    if(!performer(id))return false
    lastAction=id;lastActionAt=time
    if(origin==='user')userVersion++
    if(decorate){
      if(id==='wave')offer({event:'BRAIN',speech:'안녕.',duration:2.4},origin)
      else if(id==='listen')offer({event:'BRAIN',speech:'...',duration:2},origin)
      else if(id==='loveDance'||id==='superloveDance')offer({event:'BRAIN',fx:'HEARTS',duration:2.5},origin)
      else if(definition.category==='dance'&&random()<.45)offer({event:'BRAIN',fx:'JOY',duration:2.4},origin)
      else if(id==='hop')offer({event:'BRAIN',fx:'SPARKLES',duration:2.2},origin)
    }
    return true
  }
  function contextReaction(mode:'context'|'time'|'weather'='context',origin:Origin='user',category?:LineCategory) {
    const key=category??contextCategory(context,mode),lines=AMBIENT_LINES[key].filter(line=>!recent.has(line))
    if(!lines.length)return false
    const speech=lines[Math.floor(random()*lines.length)]
    const accepted=offer({event:'BRAIN',speech,fx:key==='snow'?'SPARKLES':undefined,duration:2.8},origin)
    if(accepted&&context.idle){const action=LINE_GESTURES[key];if(action)perform(action,origin,false)}
    return accepted
  }
  return {
    bind(fn:Performer){performer=fn;return()=>{if(performer===fn){performer=null;pending=null;busyUntil=0}}},
    perform,offer,contextReaction,
    setAutonomy(enabled:boolean){autonomy=enabled},
    cancelSpeech(){pending=null;busyUntil=0},
    get userVersion(){return userVersion},
    get recentSpeech(){return [...recent.keys()]},
    get recentActions(){return lastAction&&time-lastActionAt<90?[lastAction]:[]},
    say(text:string,options:{emote?:Emote;origin?:Origin}={}){return offer({event:'BRAIN',speech:text,fx:options.emote?FX[options.emote]:undefined,duration:2.8},options.origin??'user')},
    emote(kind:Emote){return offer({event:'BRAIN',fx:FX[kind],duration:2.5},'user')},
    react(kind:MoruReaction){return perform(REACTION_ACTIONS[kind],'user',false)&&offer({event:'BRAIN',fx:kind==='love'?'HEARTS':kind==='curious'?'QUESTION':kind==='surprise'?'SURPRISE':'SPARKLES',duration:2.5},'user')},
    // A semantic gesture, not a claim of exact eye/head tracking on this asset.
    lookAt(target:'user'|'sky'|'water'){return perform(target==='user'?'wave':'listen','user',false)},
    returned(){returning=true;nextAmbient=Math.min(nextAmbient,time+8+random()*12)},
    update(delta:number,next:AmbientContext){
      time+=delta;context=next;idle=next.idle?idle+delta:0
      for(const [line,at]of recent)if(time-at>90)recent.delete(line)
      if(autonomy&&time>=nextAmbient){
        if(idle>=12){
          const seasonal=random()<.2 && context.season in AMBIENT_LINES ? context.season as LineCategory:undefined
          contextReaction('context','ambient',returning?'returned':seasonal)
          returning=false
          nextAmbient=time+45+random()*65
        }else nextAmbient=time+8+random()*12
      }
    },
    take(){const result=pending;pending=null;return result},
    get busy(){return time<busyUntil},
  }
}
export const moru=createMoruExpression()
