import { Vector3 } from 'three'
import type { CharacterId } from './assets.ts'
export type CharacterHandle={play:(name:string)=>boolean;greet:()=>void;clip:string;position:Vector3;head:Vector3;anchors:readonly string[];status:string}
export const characters:Partial<Record<CharacterId,CharacterHandle>>={}
export const attentionPoints={SKY:new Vector3(0,35,-65),WATER:new Vector3(6,0,-9),HOME:new Vector3(10,2,-24),WORLD_OBJECT:new Vector3(12,8.8,-57),EVENT:new Vector3(0,35,-65)}
