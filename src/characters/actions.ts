export const MORU_ACTIONS = [
  {id:'idle',clip:'Short_Breathe_and_Look_Around',label:'대기',category:'movement'},
  {id:'walk',clip:'Walking',label:'걷기',category:'movement'},
  {id:'run',clip:'Running',label:'달리기',category:'movement'},
  {id:'jump',clip:'Hop_with_Arms_Raised',label:'점프',category:'movement'},
  {id:'wave',clip:'Wave_One_Hand',label:'손 흔들기',category:'gesture'},
  {id:'listen',clip:'Long_Breathe_and_Look_Around',label:'귀 기울이기',category:'gesture'},
  {id:'hop',clip:'Happy_jump_f',label:'작은 점프',category:'gesture'},
  {id:'skip',clip:'Skip_Forward',label:'깡충걸음',category:'gesture'},
  {id:'penguin',clip:'penguin_walk',label:'펭귄걸음',category:'gesture'},
  {id:'bubbleDance',clip:'Bubble_Dance',label:'버블 댄스',category:'dance'},
  {id:'funnyDance',clip:'Pop_Dance_LSA2',label:'장난스러운 춤',category:'dance'},
  {id:'loveDance',clip:'Love_You_Pop_Dance',label:'러브 유',category:'dance'},
  {id:'superloveDance',clip:'Love_You_Pop_Dance',label:'슈퍼러브',category:'dance'},
  {id:'podGroove',clip:'You_Groove',label:'작은 그루브',category:'dance'},
  {id:'youGroove',clip:'You_Groove',label:'함께 그루브',category:'dance'},
  {id:'bow',clip:'Gentlemans_Bow',label:'꾸벅 인사',category:'gesture'},
  {id:'hipPose',clip:'Hand_on_Hip_Gesture',label:'허리에 손',category:'gesture'},
  {id:'playful',clip:'Not_Your_Mom',label:'장난스러운 몸짓',category:'gesture'},
  {id:'sitBack',clip:'Bench_Sit_From_Stand',label:'돌아보고 앉기',category:'gesture'},
  {id:'sitFloor',clip:'Sit_Cross_Legged_on_Floor',label:'바닥에 앉기',category:'gesture'},
  {id:'sitCross',clip:'Sit_Cross_Legged',label:'다리 모아 앉기',category:'gesture'},
  {id:'squat',clip:'air_squat',label:'쪼그려 앉기',category:'gesture'},
  {id:'walkRelaxed',clip:'walking_2_inplace',label:'느긋한 걸음',category:'gesture'},
] as const
// Intent IDs remain stable for saved Brain state. Missing capabilities are declined,
// never redirected to an unrelated gesture or loaded from an obsolete body.
export const UNAVAILABLE_MORU_ACTIONS = new Set<string>(['funnyDance','hipPose','sitFloor','walkRelaxed'])
export type MoruActionId = typeof MORU_ACTIONS[number]['id']
export type MoruReaction = 'happy' | 'curious' | 'love' | 'listen' | 'surprise'
export const REACTION_ACTIONS: Record<MoruReaction,MoruActionId> = {happy:'hop',curious:'listen',love:'wave',listen:'listen',surprise:'listen'}

export type ActionClass = 'AMBIENT'|'REACTION'|'SOCIAL'|'DANCE'
export function actionClass(id:MoruActionId):ActionClass{
 const action=MORU_ACTIONS.find(a=>a.id===id)
 return action?.category==='dance'?'DANCE':id==='wave'?'SOCIAL':id==='listen'||id==='idle'?'AMBIENT':'REACTION'
}
