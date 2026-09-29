export type ResidentId='mallow'|'pebble'|'lumi'
export type ResidentActivity='GARDEN'|'RIVER'|'MAKE'|'REST'|'SHELTER'|'FIREWORKS'
export type ResidentAction='IDLE'|'WALK'|'RUN'|'LOOK'|'SIT'|'WAVE'|'INSPECT'|'PICK_UP'|'CARRY'|'PLACE'|'REACT'|'WATER'
export type ResidentSpec={id:ResidentId;name:string;role:string;temperament:string;favoritePlace:string;favoriteActivities:string[];palette:{body:string;accent:string;detail:string};scale:number;movement:number;route:number[]}

export const RESIDENTS:readonly ResidentSpec[]=[
 {id:'mallow',name:'Mallow',role:'Garden keeper',temperament:'다정하지만 조금 덤벙거림',favoritePlace:'Home Garden',favoriteActivities:['watering','flowers','butterflies','porch rest'],palette:{body:'#dfc99f',accent:'#79956f',detail:'#87664e'},scale:.82,movement:.96,route:[0,1,2,3]},
 {id:'pebble',name:'Pebble',role:'River wanderer',temperament:'호기심이 많고 잠깐씩 빠르게 움직임',favoritePlace:'Old Bridge',favoriteActivities:['water watching','collecting stones','wandering','quick discoveries'],palette:{body:'#aebfc4',accent:'#7093a0',detail:'#d7b47d'},scale:.78,movement:1.12,route:[4,5,6,2]},
 {id:'lumi',name:'Lumi',role:'Little maker',temperament:'차분하고 꼼꼼하지만 가끔 물건을 떨어뜨림',favoritePlace:'Home Porch',favoriteActivities:['carrying','arranging','lanterns','quiet sitting'],palette:{body:'#d8c9df',accent:'#9986aa',detail:'#e8c987'},scale:.8,movement:.88,route:[7,8,9,0]},
] as const

export type RoutineContext={hour:number;rain:boolean;snow:boolean;wind:boolean;fireworks:boolean;step:number}
export type RoutineChoice={activity:ResidentActivity;action:ResidentAction;routeIndex:number;duration:number;situation:'NONE'|'RIVER_WATCH'|'DROP_AND_RECOVER'|'LOST_SEEDS'}

const hash=(id:ResidentId,step:number)=>{let value=step*1103515245+id.charCodeAt(0)*97+id.charCodeAt(id.length-1)*193;value^=value>>>16;return Math.abs(value)%997}
export function chooseResidentRoutine(spec:ResidentSpec,context:RoutineContext,previous:ResidentActivity|null):RoutineChoice{
 if(context.fireworks)return {activity:'FIREWORKS',action:'WALK',routeIndex:10+RESIDENTS.findIndex(item=>item.id===spec.id),duration:8,situation:'NONE'}
 if(context.rain)return {activity:'SHELTER',action:context.step%3===0?'RUN':'WALK',routeIndex:spec.id==='pebble'?8:7,duration:4.5,situation:'NONE'}
 if(context.snow&&context.step%3===1)return {activity:'REST',action:'INSPECT',routeIndex:spec.route.at(-1)!,duration:4.2,situation:'NONE'}
 const night=context.hour>=20||context.hour<5,roll=hash(spec.id,context.step)%spec.route.length
 let activity:ResidentActivity=spec.id==='mallow'?'GARDEN':spec.id==='pebble'?'RIVER':'MAKE'
 if(night&&context.step%3===0)activity='REST'
 if(activity===previous&&context.step%2===0)activity='REST'
 const action:ResidentAction=activity==='REST'?(spec.id==='lumi'?'SIT':'LOOK'):spec.id==='mallow'?(context.step%3===0?'WATER':'INSPECT'):spec.id==='pebble'?(context.step%6===1?'RUN':context.step%6===3?'INSPECT':'LOOK'):(context.step%4===2?'CARRY':'PLACE')
 const situation=spec.id==='pebble'&&context.step%5===2?'RIVER_WATCH':spec.id==='lumi'&&context.step%7===3?'DROP_AND_RECOVER':spec.id==='mallow'?'LOST_SEEDS':'NONE'
 return {activity,action,routeIndex:spec.route[roll],duration:3.2+(hash(spec.id,context.step+1)%22)/10,situation}
}

export function residentDialogue(id:ResidentId,context:{hour:number;rain:boolean;snow:boolean;favorite:boolean;repeated:boolean}){
 const base={
  mallow:context.favorite?'정원 가장자리의 작은 꽃이 오늘 먼저 고개를 들었어.':'흙 냄새가 포근해서 조금 더 여기 있으려고.',
  pebble:context.favorite?'물결 사이에 반짝이는 게 있어. 잠깐 같이 볼래?':'강이 굽어지는 곳마다 소리가 조금씩 달라.',
  lumi:context.favorite?'등불을 여기 두면 집으로 돌아오는 길이 더 따뜻해 보여.':'작은 물건도 자리를 찾으면 방 안이 편안해져.',
 }[id]
 if(context.repeated)return {mallow:'아까 본 꽃, 조금 더 폈어.',pebble:'그 반짝임이 아직 있어. 아주 천천히 움직여.',lumi:'이번에는 떨어뜨리지 않고 잘 놓았어.'}[id]
 if(context.rain)return {mallow:'비가 잎 끝까지 닿는지 보고 있었어.',pebble:'비 오는 강은 작은 원을 계속 만들고 있어.',lumi:'젖기 전에 등불을 처마 밑으로 옮겼어.'}[id]
 if(context.snow)return {mallow:'눈 아래에서도 새싹은 조용히 기다리고 있대.',pebble:'강가 돌 위에 눈 모자가 하나씩 생겼어.',lumi:'눈빛을 닮은 작은 등불을 만들어보고 있어.'}[id]
 if(context.hour<8)return {mallow:'아침 햇빛이 정원부터 깨우고 있어.',pebble:'이른 강물은 유리처럼 조용해.',lumi:'아직 모두 조용해서 작은 소리도 잘 들려.'}[id]
 if(context.hour>=20)return {mallow:'밤꽃은 달빛을 조금 오래 바라봐.',pebble:'다리 불빛이 물속에서 길게 흔들려.',lumi:'마지막 등불 하나만 켜고 쉬려고.'}[id]
 return base
}
