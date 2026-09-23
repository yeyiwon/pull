import type { MoruActionId } from './actions.ts'
export type AmbientContext = {hour:number;season:string;weather:string;inside:boolean;nearWater:boolean;idle:boolean}
export const AMBIENT_LINES = {
  greeting:['왔네.','같이 있을래?','다시 보네.'],
  home:['여기 따뜻하다.','잠깐 쉬자.','집이 조용하네.','창가가 좋다.','조금 더 있고 싶어.'],
  wind:['바람 분다.','잎이 흔들려.','살랑살랑.','머리카락 날린다.','바람이 간질간질해.'],
  curious:['저쪽 뭐지?','뭔가 지나갔어.','한번 볼까?','방금 반짝였어.','저기까지 가보고 싶다.'],
  sleepy:['조금 졸려.','눈이 감긴다.','잠깐 쉴래.'],
  happy:['헤헤.','기분 좋다.','좋네.','둠칫둠칫.','오늘 좀 신나.'],
  affectionate:['옆에 있네.','같이 걷자.','여기 있어.'],
  morning:['좋은 아침.','오늘 하늘 봤어?','어디 가볼까?','잘 잤어?','햇빛이 말랑해.'],
  day:['저쪽 가볼래?','뭔가 발견할 것 같아.','오늘 바람 좋다.','한 바퀴 더 돌까?','꽃 세어볼래?'],
  sunset:['하늘 색 봐.','조금만 더 있다 가자.','물이 분홍색이 됐어.','오늘 빛 예쁘다.'],
  night:['별 많다.','달 예쁘다.','집에 들어갈까?','별 하나 움직였어.','밤공기 좋다.'],
  rain:['비 온다.','물소리 들어봐.','비 냄새 날 것 같아.'],
  snow:['눈이다.','하늘 봐!','발자국 남겨볼까?'],
  water:['물소리 들어봐.','물 보러 갈까?','빛이 물 위에서 흔들려.','저기 반짝인다.'],
  indoor:['여기 따뜻하다.','잠깐 쉬자.'],
  spring:['꽃 피었네.','봄 냄새.','꽃잎 잡아볼까?','분홍색이 많아.'],summer:['그늘에서 쉴까?','잎이 무성하다.','초록색이 가득해.','물가가 시원해 보여.'],autumn:['낙엽 봐.','바스락.','주황색 예쁘다.','잎 하나 주울까?'],winter:['조금 춥다.','같이 걷자.','눈 밟고 싶어.','입김 나올 것 같아.'],
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
