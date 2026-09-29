export type GameUiMode='EXPLORE'|'CONVERSATION'|'ITEM_PICKER'|'PLACEMENT'|'MENU'
const priority:Record<GameUiMode,number>={EXPLORE:0,PLACEMENT:1,ITEM_PICKER:2,CONVERSATION:3,MENU:4}
const sources=new Map<string,GameUiMode>();let mode:GameUiMode='EXPLORE';const listeners=new Set<()=>void>()
document.documentElement.dataset.gameUiMode='explore'
function refresh(){const next=[...sources.values()].sort((a,b)=>priority[b]-priority[a])[0]??'EXPLORE';if(next===mode)return;mode=next;document.documentElement.dataset.gameUiMode=next.toLowerCase();listeners.forEach(listener=>listener())}
export const gameUiMode={getSnapshot:()=>mode,subscribe(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener)},set(source:string,next:GameUiMode|null){if(next)sources.set(source,next);else sources.delete(source);refresh()}}
