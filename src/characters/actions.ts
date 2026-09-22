export const MORU_ACTIONS = [
  {id:'idle',clip:'Short_Breathe_and_Look_Around',label:'대기',category:'movement'},
  {id:'walk',clip:'Walking',label:'걷기',category:'movement'},
  {id:'run',clip:'Running',label:'달리기',category:'movement'},
  {id:'jump',clip:'Hop_with_Arms_Raised',label:'점프',category:'movement'},
  {id:'wave',clip:'Wave_One_Hand',label:'손 흔들기',category:'gesture'},
  {id:'listen',clip:'Listening_Gesture',label:'귀 기울이기',category:'gesture'},
  {id:'hop',clip:'Regular_Jump',label:'작은 점프',category:'gesture'},
  {id:'skip',clip:'Skip_Forward_inplace',label:'깡충걸음',category:'gesture'},
  {id:'penguin',clip:'penguin_walk',label:'펭귄걸음',category:'gesture'},
  {id:'bubbleDance',clip:'Bubble_Dance',label:'버블 댄스',category:'dance'},
  {id:'funnyDance',clip:'FunnyDancing_03',label:'장난스러운 춤',category:'dance'},
  {id:'loveDance',clip:'Love_You_Pop_Dance',label:'러브 유',category:'dance'},
  {id:'superloveDance',clip:'Superlove_Pop_Dance',label:'슈퍼러브',category:'dance'},
  {id:'podGroove',clip:'Pod_Baby_Groove',label:'작은 그루브',category:'dance'},
  {id:'youGroove',clip:'You_Groove',label:'함께 그루브',category:'dance'},
] as const
export type MoruActionId = typeof MORU_ACTIONS[number]['id']
export type MoruReaction = 'happy' | 'curious' | 'love' | 'listen' | 'surprise'
export const REACTION_ACTIONS: Record<MoruReaction,MoruActionId> = {happy:'hop',curious:'listen',love:'wave',listen:'listen',surprise:'listen'}

export type ActionClass = 'AMBIENT'|'REACTION'|'SOCIAL'|'DANCE'
export function actionClass(id:MoruActionId):ActionClass{
 const action=MORU_ACTIONS.find(a=>a.id===id)
 return action?.category==='dance'?'DANCE':id==='wave'?'SOCIAL':id==='listen'||id==='idle'?'AMBIENT':'REACTION'
}
