// v0 compatibility reference; production uses mind.ts through SpeechBubble.
import { requestBrainAction } from '../locomotion.ts'
import type { Player } from '../locomotion.ts'
import { createBrainPolicy } from '../personality.ts'
import type { Reaction, ReactionFX } from '../personality.ts'
import { createSelf, silentDecision, validateDecision } from './decision.ts'
import type { BrainTrigger, MoruBrainProvider, MoruObservation } from './decision.ts'
import type { createMemoryStore } from './memory.ts'

type WorldSnapshot = { hour: number; phase: string }
export const brainDebug = { mood: 'calm', trigger: 'none', decision: 'none / none', execution: 'none', speech: '', visits: 0, totalSeconds: 0 }
export function createBrainController(memory: ReturnType<typeof createMemoryStore>, provider: MoruBrainProvider, random = Math.random) {
  const self = createSelf(), policy = createBrainPolicy(random)
  let time = 0, idle = 0, jumps = 0, lastJump = -100, recentAction: string | undefined
  let entered = false, phase = '', nextIdle = 45, nextPresence = 180, nextDecision = 0
  let pending = false, requestTime = 0, generation = 0, alive = true
  let reaction: Reaction | null = null
  const lastTrigger = new Map<BrainTrigger, number>()
  function trigger(kind: BrainTrigger, player: Player, world: WorldSnapshot) {
    if (pending || time < nextDecision || time - (lastTrigger.get(kind) ?? -1000) < 45) return
    pending = true; requestTime = time; nextDecision = time + 12; lastTrigger.set(kind, time)
    const token = ++generation
    const o: MoruObservation = { trigger: kind,
      world: { hour: world.hour, dayPhase: world.phase, localTime: `${String(Math.floor(world.hour)).padStart(2, '0')}:${String(Math.floor(world.hour * 60) % 60).padStart(2, '0')}` },
      user: { justEntered: kind === 'ENTRY', idleSeconds: idle, recentAction, repeatedJumpCount: jumps },
      memory: structuredClone(memory.memory), previousVisitAt: memory.previousVisitAt, self: structuredClone(self),
      moru: { state: player.state, grounded: player.isGrounded } }
    brainDebug.trigger = kind
    // Catch synchronous throws as well as rejected transport promises. Late replies cannot act.
    Promise.resolve().then(() => provider.decide(o)).catch(() => silentDecision()).then(value => {
      if (!alive || token !== generation || time - requestTime > 4) return
      pending = false
      const decision = policy(validateDecision(value), time)
      self.mood = decision.mood
      const action = { look: 'LISTEN', confused: 'LISTEN', listen: 'LISTEN', wave: 'WAVE', dance: 'BUBBLE_DANCE' } as const
      brainDebug.execution = decision.action in action ? (requestBrainAction(player, action[decision.action as keyof typeof action]) ? 'accepted' : 'user priority') : 'no body action'
      const fx: Partial<Record<typeof decision.reaction, ReactionFX>> = { hearts: 'HEARTS', sparkles: 'SPARKLES', question: 'QUESTION' }
      if (decision.speech || decision.reaction !== 'none') reaction = { event: 'BRAIN', speech: decision.speech ?? undefined, fx: fx[decision.reaction], duration: 2.5 }
      brainDebug.mood = self.mood; brainDebug.decision = `${decision.intention} / ${decision.action}`; brainDebug.speech = decision.speech ?? ''
    })
  }
  return {
    self,
    update(player: Player, delta: number, world: WorldSnapshot) {
      if (!alive) return
      time += delta; memory.tick(delta)
      if (pending && time - requestTime > 4) { pending = false; generation++ }
      const resting = player.state === 'IDLE' || player.state === 'CONFUSED' || player.state === 'LISTEN'
      idle = resting ? idle + delta : 0
      const targetEnergy = world.hour < 5 || world.hour >= 23 ? .25 : .75
      self.energy += (targetEnergy - self.energy) * Math.min(1, delta / 60)
      for (const event of player.events) {
        memory.event(event); recentAction = event
        if (event === 'JUMP') {
          jumps = time - lastJump < 6 ? jumps + 1 : 1; lastJump = time
          if (jumps >= 3) trigger('REPEATED_JUMP', player, world)
        } else if (event === 'WAVE' || event === 'BUBBLE_DANCE') trigger(event, player, world)
      }
      player.events.length = 0
      if (!entered && time >= 4) { entered = true; trigger('ENTRY', player, world) }
      if (phase && phase !== world.phase) trigger('PHASE_CHANGE', player, world)
      phase = world.phase
      if (!resting) nextIdle = 45
      if (idle >= nextIdle) { nextIdle = idle + 60; trigger('LONG_IDLE', player, world) }
      if (time >= nextPresence) { nextPresence = time + 180; trigger('LONG_PRESENCE', player, world) }
      brainDebug.visits = memory.memory.visitCount; brainDebug.totalSeconds = Math.floor(memory.memory.totalTimeTogetherSeconds)
    },
    takeReaction() { const result = reaction; reaction = null; return result },
    suspend() { generation++; pending = false; reaction = null; memory.save() },
    dispose() { alive = false; generation++; memory.save() },
  }
}
