import { WARDROBE } from './wardrobe.ts'
export const BODY_CHOICES = WARDROBE
export type MoruAppearance = typeof BODY_CHOICES[number]['id']
export type MoruBodyId = MoruAppearance
const key='moruAppearance'
let selected:MoruAppearance='base'
try {
 const stored=typeof localStorage!=='undefined'?localStorage.getItem(key):null
 const choice=BODY_CHOICES.find(body=>body.id===stored&&body.status==='COMPATIBLE')
 if(choice)selected=choice.id
} catch { /* Appearance selection works without storage. */ }
let ready=false
const listeners=new Set<()=>void>()
export const bodySelection={
 getSnapshot:()=>selected,
 getReadySnapshot:()=>ready,
 loaded(id:MoruAppearance){if(id!==selected||ready)return;ready=true;try{localStorage.setItem(key,selected)}catch{/* Visual preference only. */}listeners.forEach(fn=>fn())},
 subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn)}},
 select(id:MoruAppearance){if(!BODY_CHOICES.some(body=>body.id===id&&body.status==='COMPATIBLE')||id===selected)return;selected=id;ready=false;try{localStorage.setItem(key,id)}catch{/* Optional preference only. */}listeners.forEach(fn=>fn())},
}
