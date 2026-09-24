import type { MoruActionId } from '../../characters/actions.ts'
export const ATTENTION_TARGETS = ['USER','SKY','WATER','HOME','WORLD','OBJECT','NONE'] as const
export type AttentionTarget = typeof ATTENTION_TARGETS[number]
export type InternalState = {energy:number;curiosity:number;comfort:number;attention:number;affection:number;sleepiness:number}
export type Observation = {
 date:string;hour:number;timeOfDay:string;season:string;weather:string;wind:number
 location:'home'|'water'|'field';indoor:boolean;nearWater:boolean;skyEvent:string|null;activeEvents?:string[];eventLocation?:string|null
 userMoving:boolean;userIdleDuration:number;userInteracted:boolean;userReturned:boolean
 actionBusy:boolean;grounded:boolean;recentMoruActions:string[];recentSpeech:string[]
}
export type BrainEmote = 'heart'|'sparkle'|'question'|'surprise'|'music'
export type Intent = {kind:'WAIT'|'REACT';attention:AttentionTarget;action:MoruActionId|null;speech:string|null;emote:BrainEmote|null;reason:string}
export type Execution = {action:MoruActionId|null;speech:string|null;emote:boolean}
export type MeaningfulMemory = {key:string;at:number;event:string}
// Optional durable storage port; no autobiographical database or API is installed.
export interface LongMemoryPort {recall():readonly MeaningfulMemory[];remember(event:MeaningfulMemory):void}
export interface ConversationAdapter {respond(text:string,context:{observation:Observation;state:InternalState;recentSpeech:readonly string[]},signal:AbortSignal):Promise<unknown>}
export const waitIntent=(reason:string):Intent=>({kind:'WAIT',attention:'NONE',action:null,speech:null,emote:null,reason})
