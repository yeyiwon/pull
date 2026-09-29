export type ContextActionKind='TALK'|'PICK_UP'|'PLANT'|'WATER'|'COLLECT'|'GIVE'|'PLACE'|'INSPECT'
export type ContextActionTarget={id:string;kind:ContextActionKind;label:string;priority:number;perform:()=>void}
const candidates=new Map<string,ContextActionTarget>();let active:ContextActionTarget|null=null;const listeners=new Set<()=>void>()
function select(){const next=[...candidates.values()].sort((a,b)=>b.priority-a.priority)[0]??null;if(next?.id===active?.id&&next?.kind===active?.kind)return;active=next;listeners.forEach(listener=>listener())}
export const contextAction={getSnapshot:()=>active,subscribe(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener)},set(owner:string,target:ContextActionTarget|null){if(target)candidates.set(owner,target);else candidates.delete(owner);select()},clear(owner:string){candidates.delete(owner);select()},perform(){active?.perform()}}
