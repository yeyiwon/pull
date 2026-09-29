export type InteractionType='NPC'|'GARDEN'|'COLLECTIBLE'|'DECORATION'|'FISHING_POINT'|'WORLD_OBJECT'
export type InteractionAction='TALK'|'PLANT'|'WATER'|'COLLECT'|'PICK_UP'|'GIVE'|'PLACE'|'INSPECT'|'FISH'
export type InteractionTarget={id:string;type:InteractionType;interactionRange:number;awarenessRange?:number;availableAction:InteractionAction;priority:number;enabled:boolean}

export const INTERACTION_RANGES={NPC:{awareness:10,action:3.4},GARDEN:{action:3.1},COLLECTIBLE:{action:2.25},DECORATION:{action:3.1}} as const
export function inRange(distance:number,range:number,wasInside=false,buffer=.22){return distance<range+(wasInside?buffer:0)}
