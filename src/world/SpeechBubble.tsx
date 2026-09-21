import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import type { Player } from './locomotion.ts'
import { createPersonality } from './personality.ts'
import { worldTime } from './worldTime.ts'
import type { Reaction } from './personality.ts'

function present(node: HTMLDivElement, reaction: Reaction) {
  const speech = node.querySelector<HTMLElement>('.moru-speech')
  const fx = node.querySelector<HTMLElement>('.moru-fx')
  node.dataset.tone = reaction.fx?.toLowerCase() ?? 'normal'
  if (speech) { speech.textContent = reaction.speech ?? ''; speech.hidden = !reaction.speech }
  if (fx) {
    fx.replaceChildren()
    const symbols = { HEARTS: ['♡', '♥', '♡'], SPARKLES: ['✧', '✦', '✧'], QUESTION: ['?'], JOY: ['♪', '✧', '♫'] }
    if (reaction.fx) for (const [i, text] of symbols[reaction.fx].entries()) {
      const span = document.createElement('span')
      span.textContent = reaction.fx === 'QUESTION' ? text : '';  span.className = `reaction-glyph ${reaction.fx === "JOY" ? (i === 1 ? "hearts" : "sparkles") : reaction.fx.toLowerCase()}`
      span.style.setProperty('--i', String(i)); fx.append(span)
    }
  }
}
function setBlur(node: HTMLDivElement, age: number) {
  node.style.filter = `blur(${Math.max(0, 1 - age / .3) * 3}px)`
}
function paint(node: HTMLDivElement, opacity: string, transform?: string) {
  node.style.opacity = opacity
  if (transform) node.style.transform = transform
}

function SpeechBubble({ player, element }: { player: RefObject<Player>; element: RefObject<HTMLDivElement | null> }) {
  const personality = useRef(createPersonality())
  const projected = useRef(new Vector3())
  const headTop = useRef(new Vector3())
  const active = useRef({ age: 0, duration: 0 })
  useEffect(() => {
    const node = element.current
    return () => { if (node) paint(node, '0') }
  }, [element])
  useFrame(({ camera, size }, delta) => {
    const reaction = personality.current.update(player.current, Math.min(delta, 0.05), worldTime.current.hour)
    const node = element.current
    if (!node) return
    // No stacking: the short FX cooldown and longer speech cooldown keep channels sparse.
    if (reaction && active.current.age >= active.current.duration) {
      present(node, reaction)
      active.current = { age: 0, duration: reaction.duration }
    }
    active.current.age += delta
    const { age, duration } = active.current
    if (age >= duration) { paint(node, '0'); return }
    projected.current.copy(player.current.headPosition).project(camera)
    const p = projected.current
    // Project an upper envelope above the ears, plus a fixed pixel gap at every zoom.
    headTop.current.copy(player.current.headPosition).addScaledVector(player.current.up, .3).project(camera)
    const visible = p.z >= -1 && p.z <= 1 && Math.abs(p.x) < .92 && Math.abs(p.y) < .88
    const opacity = Math.min(1, age / .3, (duration - age) / .75)
    const rise = 4 * Math.min(1, age / .45) + 5 * Math.max(0, age - 1.5)
    const y = Math.min((-p.y * .5 + .5) * size.height, (-headTop.current.y * .5 + .5) * size.height) - 20 - rise
    setBlur(node, age)
    const scale = .92 + .08 * Math.min(1, age / .35)
    paint(node, visible ? String(Math.max(0, opacity)) : '0',
      `translate(${(p.x * .5 + .5) * size.width}px, ${Math.max(70, y)}px) translate(-50%, -100%) scale(${scale})`)
  })
  return null
}
export default SpeechBubble
