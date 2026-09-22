import type { MoruMemory } from './memory.ts'
import type { MovementState } from '../locomotion.ts'
export const INTENTIONS = ['observe', 'notice_user', 'explore', 'play', 'rest', 'seek_attention', 'stay_nearby', 'express_curiosity', 'none'] as const
export const ACTIONS = ['idle', 'look', 'wave', 'dance', 'listen', 'confused', 'none'] as const
export const MOODS = ['calm', 'curious', 'playful', 'sleepy'] as const
export const REACTIONS = ['hearts', 'sparkles', 'question', 'none'] as const
export type MoruBrainDecision = { intention: typeof INTENTIONS[number]; action: typeof ACTIONS[number]; speech: string | null; reaction: typeof REACTIONS[number]; mood: typeof MOODS[number]; reason?: string }
export type MoruSelfState = { mood: MoruBrainDecision['mood']; traits: { curiosity: number; independence: number; playfulness: number; affection: number; noveltySeeking: number; verbosity: number }; energy: number }
export type BrainTrigger = 'ENTRY' | 'LONG_IDLE' | 'REPEATED_JUMP' | 'WAVE' | 'BUBBLE_DANCE' | 'PHASE_CHANGE' | 'LONG_PRESENCE'
export type MoruObservation = {
  trigger: BrainTrigger
  world: { localTime: string; hour: number; dayPhase: string }
  user: { justEntered: boolean; idleSeconds: number; recentAction?: string; repeatedJumpCount: number }
  memory: MoruMemory; previousVisitAt: string | null; self: MoruSelfState
  moru: { state: MovementState; grounded: boolean }
}
export function createSelf(): MoruSelfState { return { mood: 'calm', traits: { curiosity: .75, independence: .85, playfulness: .5, affection: .45, noveltySeeking: .7, verbosity: .18 }, energy: .7 } }
export function silentDecision(mood: MoruBrainDecision['mood'] = 'calm'): MoruBrainDecision { return { intention: 'none', action: 'none', speech: null, reaction: 'none', mood } }
export function validateDecision(value: unknown): MoruBrainDecision {
  if (!value || typeof value !== 'object') return silentDecision()
  const v = value as Record<string, unknown>
  if (!(INTENTIONS as readonly unknown[]).includes(v.intention) || !(ACTIONS as readonly unknown[]).includes(v.action) || !(MOODS as readonly unknown[]).includes(v.mood) || !(REACTIONS as readonly unknown[]).includes(v.reaction)
    || !(v.speech === null || typeof v.speech === 'string' && v.speech.length <= 24 && !/[\r\n<>]/.test(v.speech))
    || !(v.reason === undefined || typeof v.reason === 'string' && v.reason.length <= 200)) return silentDecision()
  return { intention: v.intention as MoruBrainDecision['intention'], action: v.action as MoruBrainDecision['action'], mood: v.mood as MoruBrainDecision['mood'], reaction: v.reaction as MoruBrainDecision['reaction'], speech: typeof v.speech === 'string' ? v.speech.trim() || null : null, ...(v.reason ? { reason: v.reason as string } : {}) }
}
export interface MoruBrainProvider { decide(observation: MoruObservation): Promise<unknown> }
// Future server transport is injected. There is no endpoint, credential, or network request here.
export class RemoteMoruBrainProvider implements MoruBrainProvider {
  private transport: (observation: MoruObservation) => Promise<unknown>
  constructor(transport: (observation: MoruObservation) => Promise<unknown>) { this.transport = transport }
  decide(observation: MoruObservation) { return this.transport(observation) }
}
