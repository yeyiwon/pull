import type { MoruEvent, Player } from './locomotion.ts'

type ReactionEvent = MoruEvent | 'REPEATED_JUMP' | 'LONG_IDLE' | 'RUN_STOP' | 'ENTRY' | 'LATE_NIGHT' | 'BRAIN'
export type ReactionFX = 'HEARTS' | 'SPARKLES' | 'QUESTION' | 'JOY' | 'SURPRISE'
// Optional channels are requests, not a claim that the current asset supports them.
export type Reaction = { event: ReactionEvent; speech?: string; fx?: ReactionFX; duration: number; expression?: 'SMILE' | 'HAPPY' | 'CURIOUS'; emotion?: 'calm'|'happy'|'curious'|'sleepy'|'warm'|'sad'|'angry'|'annoyed'|null; typing?:boolean; sound?: string }
// Events remain independent of presentation. Future sound assets can be mapped here.
const lines: Partial<Record<ReactionEvent, readonly string[]>> = {
  ENTRY: ['왔네', 'ㅎㅇ'], LATE_NIGHT: ['안 자?', '새벽이네', '...'],
  WAVE: ['안녕', 'ㅎㅇ'], BUBBLE_DANCE: ['♪', '헤헤', 'ㅋㅋ'],
  REPEATED_JUMP: ['또?', '왜...', 'ㅋㅋ'], LONG_IDLE: ['...', '뭐 하지', 'ㅇㅅㅇ'],
  RUN_STOP: ['후...', '음'], CONFUSED: ['저건 뭐야?', '음'],
}
export const MORU_PERSONALITY = {
  traits: ['quiet', 'curious', 'observant', 'independent', 'slightly aloof', 'unexpectedly playful', 'dry humor', 'occasionally weird', 'easily bored', 'affectionate without clinginess'],
  speechCooldown: 38, speechCooldownVariation: 22, reactionFrequency: .45,
} as const
export function createPersonality(random = Math.random, { greet = true } = {}) {
  let time = 0, nextSpeech = 0, nextFX = 0, idle = 0, running = 0, jumps = 0, lastJump = -100
  let nextThought = 40 + random() * 25
  let entered = !greet, nextNight = 100 + random() * 80
  let currentMood: 'calm' | 'curious' | 'playful' | 'sleepy' = 'calm'
  let lastLine = ''
  function react(event: ReactionEvent): Reaction | null {
    const candidates = lines[event]
    let speech: string | undefined
    let fx: ReactionFX | undefined
    const chance = event === 'REPEATED_JUMP' ? 0.8 : event === 'LONG_IDLE' ? 0.6 : MORU_PERSONALITY.reactionFrequency
    if (candidates && time >= nextSpeech && random() < chance) {
      let index = Math.floor(random() * candidates.length)
      if (candidates[index] === lastLine) index = (index + 1) % candidates.length
      lastLine = candidates[index]; speech = lastLine
      nextSpeech = time + MORU_PERSONALITY.speechCooldown + random() * MORU_PERSONALITY.speechCooldownVariation
    }
    if (time >= nextFX && random() < 0.75) {
      if (event === 'WAVE' || event === 'LISTEN') fx = 'SPARKLES'
      if (event === 'BUBBLE_DANCE') fx = random() < 0.5 ? 'HEARTS' : 'JOY'
      if (event === 'CONFUSED') fx = 'QUESTION'
      if (fx) nextFX = time + 8
    }
    return speech || fx ? { event, speech, fx, duration: 2.5 } : null
  }
  return {
    get mood() { return currentMood },
    update(player: Player, delta: number, hour = 12) {
      time += delta
      let reaction: Reaction | null = null
      currentMood = player.state === 'BUBBLE_DANCE' ? 'playful' : hour < 5 || hour >= 23 ? 'sleepy' : player.state === 'CONFUSED' ? 'curious' : 'calm'
      if (!entered && time > 4) { entered = true; if (player.state === 'IDLE' && random() < .25) reaction = react('ENTRY') }
      if (time > nextNight) {
        nextNight = time + 180 + random() * 120
        if (currentMood === 'sleepy' && player.state === 'IDLE') reaction = react('LATE_NIGHT') ?? reaction
      }
      for (const event of player.events) {
        if (event === 'JUMP') {
          jumps = time - lastJump < 5 ? jumps + 1 : 1
          lastJump = time
          if (jumps >= 3) { reaction = react('REPEATED_JUMP') ?? reaction; jumps = 0 }
        } else reaction = react(event) ?? reaction
      }
      player.events.length = 0
      if (player.state === 'RUN') running += delta
      else {
        if (running >= 8 && player.state === 'IDLE') reaction = react('RUN_STOP') ?? reaction
        if (player.state !== 'AIRBORNE') running = 0
      }
      // A quiet look-around still counts as resting; it must not reset long-idle time.
      if (player.state === 'IDLE' || player.state === 'CONFUSED') idle += delta
      else idle = 0
      if (idle >= nextThought) {
        reaction = react('LONG_IDLE') ?? reaction
        idle = 0; nextThought = 40 + random() * 25
      }
      return reaction
    },
  }
}

// Brain owns decisions; this shared policy owns presentation cadence.
export function createBrainPolicy(random = Math.random) {
  let nextSpeech = 0, nextFX = 0, lastSpeech = ''
  return (decision: import('./brain/decision.ts').MoruBrainDecision, time: number) => {
    const result = { ...decision }
    if (time < nextSpeech || result.speech === lastSpeech) result.speech = null
    if (result.speech) {
      lastSpeech = result.speech
      nextSpeech = time + MORU_PERSONALITY.speechCooldown + random() * MORU_PERSONALITY.speechCooldownVariation
    }
    if (time < nextFX) result.reaction = 'none'
    if (result.reaction !== 'none') nextFX = time + 8
    return result
  }
}
