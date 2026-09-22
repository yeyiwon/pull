import type { MoruActionId } from './actions.ts'
export type AmbientContext = {hour:number;season:string;weather:string;inside:boolean;nearWater:boolean;idle:boolean}
export const AMBIENT_LINES = {
  greeting:['왔네.','같이 있을래?','다시 보네.'],
  home:['여기 따뜻하다.','잠깐 쉬자.','집이 조용하네.'],
  wind:['바람 분다.','잎이 흔들려.','살랑살랑.'],
  curious:['저쪽 뭐지?','뭔가 지나갔어.','한번 볼까?'],
  sleepy:['조금 졸려.','눈이 감긴다.','잠깐 쉴래.'],
  happy:['헤헤.','기분 좋다.','좋네.'],
  affectionate:['옆에 있네.','같이 걷자.','여기 있어.'],
  morning:['좋은 아침.','오늘 하늘 봤어?','어디 가볼까?','잘 잤어?'],
  day:['저쪽 가볼래?','뭔가 발견할 것 같아.','오늘 바람 좋다.'],
  sunset:['하늘 색 봐.','조금만 더 있다 가자.'],
  night:['별 많다.','달 예쁘다.','집에 들어갈까?'],
  rain:['비 온다.','물소리 들어봐.','비 냄새 날 것 같아.'],
  snow:['눈이다.','하늘 봐!','발자국 남겨볼까?'],
  water:['물소리 들어봐.','물 보러 갈까?'],
  indoor:['여기 따뜻하다.','잠깐 쉬자.'],
  spring:['꽃 피었네.','봄 냄새.'],summer:['그늘에서 쉴까?','잎이 무성하다.'],autumn:['낙엽 봐.','바스락.'],winter:['조금 춥다.','같이 걷자.'],
  returned:['오늘도 왔네.','왔구나.'],
} as const
export type LineCategory = keyof typeof AMBIENT_LINES
export function contextCategory(c:AmbientContext, mode:'context'|'time'|'weather'='context'):LineCategory {
  if(c.inside && mode==='context')return 'indoor'
  if(mode!=='time'){
    if(c.weather==='snow')return 'snow'
    if(c.weather==='rain'||c.weather==='storm')return 'rain'
    if(c.nearWater && mode==='context')return 'water'
  }
  return c.hour<5||c.hour>=20?'night':c.hour<11?'morning':c.hour>=17?'sunset':'day'
}
export const LINE_GESTURES: Partial<Record<LineCategory,MoruActionId>> = {morning:'wave',day:'listen',sunset:'listen',night:'listen',rain:'listen',snow:'listen',water:'listen',indoor:'listen',returned:'wave'}
