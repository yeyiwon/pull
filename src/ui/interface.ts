export type Panel='menu'|'tasks'|'world'|'moru'|'appearance'|'music'|'display'|'controls'|'conversations'|'debug'|null
let panel:Panel=null
const listeners=new Set<()=>void>()
export const worldInterface={
 getSnapshot:()=>panel,
 subscribe(fn:()=>void){listeners.add(fn);return()=>listeners.delete(fn)},
 open(next:Panel){if(next===panel)return;panel=next;listeners.forEach(fn=>fn())},
}
