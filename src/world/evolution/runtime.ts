import type { EnvironmentEntry, Season } from '../../environment/registry.ts'
import { getMemorySession } from '../brain/memory.ts'
import { consider, rendered, failAsset, removeChange, expireChanges } from './history.ts'
import { ideaFrom, propose } from './director.ts'
import type { Interests } from '../brain/interests.ts'
const listeners=new Set<()=>void>()
let entries:EnvironmentEntry[]=[],revision=0
function publish(){revision++;listeners.forEach(f=>f())}
export const evolutionView={subscribe(fn:()=>void){listeners.add(fn);return()=>listeners.delete(fn)},snapshot:()=>revision,entries:()=>entries}
export function setEvolutionRegistry(value:EnvironmentEntry[]){entries=value;publish()}
export function evolve(interests:Interests,season:Season,allowApply:boolean){
 const store=getMemorySession(),data=store.memory.evolution,now=Date.now()
 const before=JSON.stringify(data)
 expireChanges(data,season,now)
 const journal=interests.journal.find(j=>j.topic===interests.fascination?.topic),idea=journal?ideaFrom(journal):null
 if(idea)consider(data,propose(idea,season),entries,season,now,allowApply)
 if(before!==JSON.stringify(data)){store.interestsChanged();publish()}
}
export function changeRendered(id:string){const store=getMemorySession();if(rendered(store.memory.evolution,id,Date.now())){store.interestsChanged();publish()}}
export function changeFailed(id:string){const store=getMemorySession();if(failAsset(store.memory.evolution,id)){store.interestsChanged();publish()}}
export function removeMoruChange(id:string){const store=getMemorySession();if(removeChange(store.memory.evolution,id)){store.interestsChanged();publish()}}
