import { emptyOffline, readOffline, simulateOffline } from '../evolution/offline.ts'
import type { OfflineLife } from '../evolution/offline.ts'
import { emptyEvolution, readEvolution } from '../evolution/history.ts'
import type { Evolution } from '../evolution/history.ts'
import { emptyResearchBudget } from '../../research/controller.ts'
import type { ResearchBudget } from '../../research/controller.ts'
import { emptyInterests, readInterests } from './interests.ts'
import type { Interests } from './interests.ts'
export type MoruMemory = {
  version: 5; offline: OfflineLife; evolution: Evolution; researchBudget: ResearchBudget; interests: Interests; firstMetAt: string; lastVisitAt: string; visitCount: number; totalTimeTogetherSeconds: number
  interactions: { jumps: number; waves: number; dances: number }
  recentEvents: { type: string; timestamp: string }[]
}
// Keep the existing key so v1 visits migrate in place; payload version is authoritative.
export const MEMORY_KEY = 'pull.moru.memory.v1'
export type MemoryStorage = Pick<Storage, 'getItem' | 'setItem'>
const count = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(v, Number.MAX_SAFE_INTEGER) : 0
const date = (v: unknown, fallback: string) => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : fallback
export function readMemory(raw: string | null, now: string): MoruMemory {
  const fresh: MoruMemory = { version: 5, offline: emptyOffline(), evolution: emptyEvolution(), researchBudget: emptyResearchBudget(), interests: emptyInterests(), firstMetAt: now, lastVisitAt: now, visitCount: 0, totalTimeTogetherSeconds: 0, interactions: { jumps: 0, waves: 0, dances: 0 }, recentEvents: [] }
  try {
    const v = JSON.parse(raw ?? 'null')
    if (!v || ![1,2,3,4,5].includes(v.version)) return fresh
    return { ...fresh, offline: v.version >= 5 ? readOffline(v.offline) : emptyOffline(), evolution: readEvolution(v.evolution), researchBudget: {day: typeof v.researchBudget?.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.researchBudget.day) ? v.researchBudget.day : '', attempts: Math.floor(count(v.researchBudget?.attempts)), nextAllowedAt: count(v.researchBudget?.nextAllowedAt)}, interests: v.version >= 2 ? readInterests(v.interests) : emptyInterests(), firstMetAt: date(v.firstMetAt, now), lastVisitAt: date(v.lastVisitAt, now), visitCount: Math.floor(count(v.visitCount)),
      totalTimeTogetherSeconds: count(v.totalTimeTogetherSeconds),
      interactions: { jumps: Math.floor(count(v.interactions?.jumps)), waves: Math.floor(count(v.interactions?.waves)), dances: Math.floor(count(v.interactions?.dances)) },
      recentEvents: Array.isArray(v.recentEvents) ? v.recentEvents.filter((e: unknown) => !!e && typeof e === 'object' && 'type' in e && typeof e.type === 'string' && e.type.length <= 40 && 'timestamp' in e && typeof e.timestamp === 'string' && Number.isFinite(Date.parse(e.timestamp))).slice(-24).map((e: { type: string; timestamp: string }) => ({ type: e.type, timestamp: e.timestamp })) : [] }
  } catch { return fresh }
}
export function createMemoryStore(storage: MemoryStorage | null, now = () => new Date().toISOString()) {
  let raw: string | null = null
  try { raw = storage?.getItem(MEMORY_KEY) ?? null } catch { /* Private browsing may deny storage. */ }
  let futureVersion = false
  try { const version = JSON.parse(raw ?? 'null')?.version; futureVersion = typeof version === 'number' && version > 5 } catch { /* Corrupt data uses fresh defaults. */ }
  const memory = readMemory(raw, now())
  const previousVisitAt = memory.visitCount > 0 ? memory.lastVisitAt : null
  simulateOffline(memory.offline, memory.interests, Date.parse(now()))
  memory.visitCount++; memory.lastVisitAt = now()
  let dirty = true, sinceSave = 0
  function save() {
    if (!dirty || futureVersion) return
    try { storage?.setItem(MEMORY_KEY, JSON.stringify(memory)); dirty = false } catch { /* Keep the session functional in memory. */ }
  }
  save()
  return {
    memory, previousVisitAt,
    interestsChanged() { dirty = true; save() },
    event(type: string) {
      if (type === 'JUMP') memory.interactions.jumps++
      if (type === 'WAVE') memory.interactions.waves++
      if (type === 'BUBBLE_DANCE') memory.interactions.dances++
      memory.recentEvents.push({ type, timestamp: now() }); memory.recentEvents = memory.recentEvents.slice(-24); dirty = true
    },
    tick(delta: number) {
      memory.offline.lastSeenAt = Date.parse(now())
      memory.totalTimeTogetherSeconds += delta; sinceSave += delta; dirty = true
      if (sinceSave >= 15) { sinceSave = 0; save() }
    },
    save,
  }
}
// One visit per page lifetime, including React StrictMode's setup/cleanup replay.
let session: ReturnType<typeof createMemoryStore> | undefined
export function getMemorySession() {
  if (!session) {
    let storage: MemoryStorage | null = null
    try { storage = window.localStorage } catch { /* Storage is optional. */ }
    session = createMemoryStore(storage)
  }
  return session
}
