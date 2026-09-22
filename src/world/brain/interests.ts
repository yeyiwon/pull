import { readProgress } from '../../research/model.ts'
import type { ResearchProgress } from '../../research/model.ts'
import type { Observation } from './types.ts'

export const INTEREST_SOURCES = ['WORLD_OBSERVATION', 'SELF_ASSOCIATION', 'USER_CONVERSATION', 'PAST_MEMORY'] as const
export type InterestSource = typeof INTEREST_SOURCES[number]
export const TOPICS = ['snow', 'reflection', 'leaves'] as const
export type Topic = typeof TOPICS[number]
export type EpistemicKind = 'FACT' | 'INFERENCE' | 'UNKNOWN' | 'IDEA'
export type Note<K extends EpistemicKind> = { kind: K; text: string; source: InterestSource }
export type Journal = {
 research?: ResearchProgress
 topic: Topic; question: string; observations: string[]
 facts: Note<'FACT'>[]; inferences: Note<'INFERENCE'>[]; unknowns: Note<'UNKNOWN'>[]; ideas: Note<'IDEA'>[]
 status: 'OPEN' | 'PAUSED' | 'RESOLVED'
}
export type Curiosity = { topic: Topic; question: string; score: number; sources: InterestSource[]; lastObservedDay: string }
export type Interests = {
 queue: Curiosity[]
 fascination: { topic: Topic; since: number; until: number } | null
 journal: Journal[]
}
export type Candidate = { topic: Topic; question: string; source: InterestSource; score: number; observation?: string; fact?: string }
export const FASCINATION_MS = 24 * 60 * 60 * 1000
export const emptyInterests = (): Interests => ({ queue: [], fascination: null, journal: [] })
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const text = (v: unknown) => typeof v === 'string' ? v.trim().slice(0, 180) : ''
const array = (v: unknown): unknown[] => Array.isArray(v) ? v.slice(-12) : []
const topic = (v: unknown): v is Topic => TOPICS.includes(v as Topic)
const source = (v: unknown): v is InterestSource => INTEREST_SOURCES.includes(v as InterestSource)
const day = (v: unknown) => {
 if (typeof v !== 'string' || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(v)) return ''
 const [year, month, date] = v.split('-').map(Number)
 const d = new Date(Date.UTC(year, month - 1, date))
 return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === date ? d.toISOString().slice(0, 10) : ''
}
function notes<K extends EpistemicKind>(raw: unknown, kind: K): Note<K>[] {
 return array(raw).flatMap(v => { const n = record(v); return n.kind === kind && source(n.source) && text(n.text) ? [{ kind, text: text(n.text), source: n.source }] : [] })
}
// Storage is untrusted. Never promote inference/idea text into facts on reload.
export function readInterests(raw: unknown): Interests {
 const v = record(raw), result = emptyInterests()
 for (const item of array(v.queue)) {
  const c = record(item)
  if (!topic(c.topic) || !text(c.question) || !day(c.lastObservedDay) || result.queue.some(x => x.topic === c.topic)) continue
  const sources = [...new Set(array(c.sources).filter(source))]
  if (!sources.length) continue
  result.queue.push({ topic: c.topic, question: text(c.question), sources, score: typeof c.score === 'number' && Number.isFinite(c.score) ? Math.min(1, Math.max(0, c.score)) : 0, lastObservedDay: day(c.lastObservedDay) })
  if (result.queue.length === 3) break
 }
 for (const item of array(v.journal)) {
  const j = record(item)
  if (!topic(j.topic) || !text(j.question) || result.journal.some(x => x.topic === j.topic)) continue
  result.journal.push({ ...(j.research?{research:readProgress(j.research,j.topic)}:{}), topic: j.topic, question: text(j.question), observations: [...new Set(array(j.observations).map(text).filter(Boolean))], facts: notes(j.facts, 'FACT'), inferences: notes(j.inferences, 'INFERENCE'), unknowns: notes(j.unknowns, 'UNKNOWN'), ideas: notes(j.ideas, 'IDEA'), status: j.status === 'RESOLVED' || j.status === 'PAUSED' ? j.status : 'OPEN' })
 }
 const f = record(v.fascination)
 if (topic(f.topic) && result.queue.some(c => c.topic === f.topic) && typeof f.since === 'number' && Number.isFinite(f.since) && f.since >= 0 && typeof f.until === 'number' && f.until === f.since + FASCINATION_MS) result.fascination = { topic: f.topic, since: f.since, until: f.until }
 return result
}
export function localCandidates(o: Observation): Candidate[] {
 const result: Candidate[] = []
 if (o.indoor) return result
 if (o.weather === 'snow') result.push({ topic: 'snow', question: '눈은 왜 이런 모양으로 내릴까?', source: 'WORLD_OBSERVATION', score: .9, observation: `${o.date}: weather=snow, outdoors`, fact: '관찰한 World weather 상태는 snow다.' })
 if (o.nearWater && o.timeOfDay === 'NIGHT') result.push({ topic: 'reflection', question: '밤의 물에는 무엇이 비칠까?', source: 'WORLD_OBSERVATION', score: .8, observation: `${o.date}: nearWater=true, timeOfDay=NIGHT`, fact: '밤에 물 근처에 있었다. 달이나 반사의 실제 관측 여부는 모른다.' })
 if (o.season === 'autumn') result.push({ topic: 'leaves', question: '가을이면 이곳의 잎도 달라질까?', source: 'WORLD_OBSERVATION', score: .55, observation: `${o.date}: season=autumn, outdoors`, fact: 'World season 상태는 autumn이다. 잎의 실제 모습은 관측하지 않았다.' })
 return result
}
export function createInterestModel(data: Interests, changed: () => void = () => {}, now = () => Date.now()) {
 function offer(c: Candidate, date: string) {
  if (!topic(c.topic) || !source(c.source) || !day(date) || !text(c.question) || !Number.isFinite(c.score)) return
  date = day(date)
  let item = data.queue.find(x => x.topic === c.topic)
  let dirty = false
  if (!item) {
   if (data.queue.length >= 3) return
   item = { topic: c.topic, question: text(c.question), sources: [], score: Math.max(0, Math.min(1, c.score)), lastObservedDay: date }
   data.queue.push(item); dirty = true
  }
  if (!item.sources.includes(c.source)) { item.sources.push(c.source); dirty = true }
  if (item.lastObservedDay !== date) { item.lastObservedDay = date; dirty = true }
  let journal = data.journal.find(j => j.topic === c.topic)
  if (!journal) {
   journal = { topic: c.topic, question: item.question, observations: [], facts: [], inferences: [], unknowns: [{ kind: 'UNKNOWN', text: item.question, source: c.source }], ideas: [], status: 'OPEN' }
   data.journal.push(journal); dirty = true
  }
  if (c.observation && !journal.observations.includes(text(c.observation))) { journal.observations.push(text(c.observation)); journal.observations = journal.observations.slice(-12); dirty = true }
  // Only direct world observations may supply facts. Other sources remain unverified.
  if (c.fact && c.source === 'WORLD_OBSERVATION' && c.observation && !journal.facts.some(n => n.text === text(c.fact))) {
   journal.facts.push({ kind: 'FACT', text: text(c.fact), source: c.source }); journal.facts = journal.facts.slice(-12); dirty = true
  }
  if (dirty) changed()
 }
 function observe(o: Observation) {
  for (const c of localCandidates(o)) offer(c, o.date)
  const time = now(), current = data.fascination
  if (current && time < current.until) return
  const eligible = data.queue.filter(c => c.lastObservedDay === day(o.date) && data.journal.find(j => j.topic === c.topic)?.status === 'OPEN')
  const alternatives = eligible.filter(c => c.topic !== current?.topic)
  const chosen = (alternatives.length ? alternatives : eligible).sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic))[0]
  if (!chosen) return // Absence is not a reason to fabricate a new interest or simulate offline research.
  data.fascination = { topic: chosen.topic, since: time, until: time + FASCINATION_MS }; changed()
 }
 return { data, offer, observe }
}
