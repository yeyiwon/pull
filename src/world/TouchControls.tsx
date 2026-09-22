import { useEffect, useRef } from 'react'
import type { RefObject, PointerEvent } from 'react'
import { setTouchIntent } from './locomotion.ts'
import type { Player } from './locomotion.ts'
export default function TouchControls({ player, disabled }: { player: RefObject<Player>; disabled: boolean }) {
  const surface = useRef<HTMLDivElement>(null)
  const active = useRef(-1)
  const knob = useRef<HTMLSpanElement>(null)
  function reset() {
    active.current = -1
    if(surface.current) surface.current.dataset.active = "false"
    setTouchIntent(player.current, 0, 0)
    if (knob.current) knob.current.style.transform = 'translate(0, 0)'
  }
  useEffect(() => {
    window.addEventListener('blur', reset)
    const hide = () => { if (document.hidden) reset() }
    document.addEventListener('visibilitychange', hide)
    return () => { reset(); window.removeEventListener('blur', reset); document.removeEventListener('visibilitychange', hide) }
  })
  useEffect(()=>{if(disabled)reset()})
  function move(e: PointerEvent<HTMLDivElement>) {
    if (active.current !== e.pointerId) return
    const r = e.currentTarget.getBoundingClientRect()
    let x = (e.clientX - r.left - r.width / 2) / 34, z = (e.clientY - r.top - r.height / 2) / 34
    const length = Math.hypot(x, z)
    if (length > 1) { x /= length; z /= length }
    if (length < .15) { x = 0; z = 0 }
    setTouchIntent(player.current, x, z)
    if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${z * 34}px)`
  }
  if(disabled)return null
  return <div ref={surface} className="touch-stick" aria-label="Move joystick" role="group" onPointerDown={e => {
    if (disabled || active.current !== -1) return
    e.currentTarget.dataset.active="true"; active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e)
  }} onPointerMove={move} onPointerUp={reset} onPointerCancel={reset} onLostPointerCapture={reset}>
    <span className="stick-orbit" aria-hidden="true"/><span className="stick-knob" ref={knob}><i/></span>
  </div>
}
