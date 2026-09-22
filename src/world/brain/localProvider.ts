// v0 compatibility reference; production uses mind.ts through SpeechBubble.
import { silentDecision } from './decision.ts'
import type { MoruBrainDecision, MoruBrainProvider, MoruObservation } from './decision.ts'
export class LocalMoruBrainProvider implements MoruBrainProvider {
  private random: () => number
  constructor(random = Math.random) { this.random = random }
  async decide(o: MoruObservation): Promise<MoruBrainDecision> {
    const { traits, energy } = o.self
    const late = o.world.hour < 5 || o.world.hour >= 23
    const sleepy = late && this.random() < .45 + (1 - energy) * .5
    const d = silentDecision(sleepy ? 'sleepy' : o.self.mood)
    const recentRepeats = o.memory.recentEvents.filter(e => e.type === o.user.recentAction).length
    const novelty = 1 / (1 + recentRepeats * .18)
    const speak = (text: string) => { if (this.random() < traits.verbosity * novelty) d.speech = text }
    if (o.trigger === 'ENTRY') {
      // Familiarity changes recognition, without making every return a greeting.
      const familiarity = Math.min(.18, o.memory.visitCount * .025)
      if (this.random() < traits.affection * .35 + familiarity) {
        d.intention = 'notice_user'; d.action = 'wave'; d.reaction = 'sparkles'; speak(o.previousVisitAt ? '왔네' : 'ㅎㅇ')
      }
    } else if (o.trigger === 'REPEATED_JUMP') {
      const boredom = Math.min(.2, o.memory.interactions.jumps / 100)
      if (this.random() < Math.min(.75, o.user.repeatedJumpCount * .1 + boredom)) {
        d.intention = 'observe'; d.action = 'confused'; d.reaction = 'question'; d.mood = 'curious'; speak('또?')
      }
    } else if (o.trigger === 'BUBBLE_DANCE') {
      if (this.random() < traits.playfulness * novelty + .2) {
        d.intention = 'play'; d.mood = 'playful'; d.reaction = this.random() < .5 ? 'hearts' : 'sparkles'; speak('헤헤')
      }
    } else if (o.trigger === 'WAVE') {
      if (this.random() < traits.affection * novelty) { d.intention = 'notice_user'; d.reaction = 'sparkles'; speak('ㅎㅇ') }
    } else if (sleepy) {
      if (this.random() < .3) { d.intention = 'rest'; d.action = 'idle'; speak(o.world.hour < 5 ? '안 자?' : '...') }
    } else if (this.random() < traits.curiosity * traits.noveltySeeking) {
      d.intention = 'express_curiosity'; d.action = this.random() < .5 ? 'look' : 'listen'; d.mood = 'curious'; speak('뭐 하지')
    }
    d.reason = `${o.trigger.toLowerCase()} / ${d.mood}`
    return d
  }
}
