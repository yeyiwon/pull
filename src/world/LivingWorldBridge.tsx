import { useEffect } from 'react'
import { brainDebug } from './brain/controller.ts'
import { interpretMoruExperience } from './livingWorld.ts'
import { MOODS } from './brain/decision.ts'
// The environment reads semantic snapshots; it never drives the Brain or its animations.
export default function LivingWorldBridge() {
  useEffect(() => {
    const update = () => {
      const mood = MOODS.find(m => m === brainDebug.mood) ?? 'calm'
      interpretMoruExperience(mood, brainDebug.totalSeconds, brainDebug.visits)
    }
    update(); const id = window.setInterval(update, 5000)
    return () => clearInterval(id)
  }, [])
  return null
}
