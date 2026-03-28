/**
 * World state graph: episodic events + light entity registry for AI prompts (Engine v2).
 */

export type GraphEntityType = 'character' | 'location' | 'object' | 'concept'

export interface GraphEntity {
  id: string
  type: GraphEntityType
  name: string
  properties?: Record<string, string>
}

export interface GraphEvent {
  id: string
  beat_id?: string
  summary: string
  entity_ids?: string[]
  choice_text?: string
  step: number
}

export interface ForeshadowingEntry {
  id: string
  text: string
  beatIndex: number
  resolved: boolean
}

export interface WorldStateGraph {
  entities: GraphEntity[]
  events: GraphEvent[]
  /** Unresolved / resolved foreshadowing lines from Director (草蛇灰线). */
  foreshadowingPool?: ForeshadowingEntry[]
}

const MAX_EVENTS = 24
const MAX_ENTITIES = 32
const MAX_FORESHADOWING = 16

let eventCounter = 0

function newEventId(): string {
  eventCounter += 1
  return `ev_${eventCounter}`
}

function newForeshadowId(): string {
  return `fs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeForeshadowingPool(raw: unknown): ForeshadowingEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ForeshadowingEntry[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : newForeshadowId()
    const text = typeof o.text === 'string' ? o.text.trim() : ''
    const beatIndex = typeof o.beatIndex === 'number' && Number.isFinite(o.beatIndex) ? Math.max(0, Math.floor(o.beatIndex)) : 0
    const resolved = o.resolved === true
    if (!text) continue
    out.push({ id, text, beatIndex, resolved })
  }
  return out.slice(-MAX_FORESHADOWING)
}

export function createEmptyWorldGraph(): WorldStateGraph {
  return { entities: [], events: [], foreshadowingPool: [] }
}

export function graphFromJSON(raw: unknown): WorldStateGraph {
  if (!raw || typeof raw !== 'object') return createEmptyWorldGraph()
  const o = raw as Record<string, unknown>
  const entities = Array.isArray(o.entities) ? (o.entities as GraphEntity[]) : []
  const events = Array.isArray(o.events) ? (o.events as GraphEvent[]) : []
  const foreshadowingPool = normalizeForeshadowingPool(o.foreshadowingPool)
  return {
    entities: entities.slice(0, MAX_ENTITIES),
    events: events.slice(-MAX_EVENTS),
    foreshadowingPool,
  }
}

export function graphToJSON(g: WorldStateGraph): WorldStateGraph {
  return {
    entities: [...g.entities].slice(-MAX_ENTITIES),
    events: [...g.events].slice(-MAX_EVENTS),
    foreshadowingPool: [...(g.foreshadowingPool ?? [])].slice(-MAX_FORESHADOWING),
  }
}

export class WorldStateGraphManager {
  private graph: WorldStateGraph
  private step = 0

  constructor(initial?: WorldStateGraph | null) {
    this.graph = initial ? graphFromJSON(initial) : createEmptyWorldGraph()
    if (!this.graph.foreshadowingPool) this.graph.foreshadowingPool = []
    const last = this.graph.events[this.graph.events.length - 1]
    if (last) this.step = last.step
  }

  getSnapshot(): WorldStateGraph {
    return graphToJSON(this.graph)
  }

  upsertEntity(e: GraphEntity): void {
    const i = this.graph.entities.findIndex((x) => x.id === e.id)
    if (i >= 0) this.graph.entities[i] = e
    else {
      this.graph.entities.push(e)
      if (this.graph.entities.length > MAX_ENTITIES) {
        this.graph.entities = this.graph.entities.slice(-MAX_ENTITIES)
      }
    }
  }

  appendEvent(partial: Omit<GraphEvent, 'id' | 'step'> & { id?: string }): void {
    this.step += 1
    const id = partial.id ?? newEventId()
    const ev: GraphEvent = {
      id,
      beat_id: partial.beat_id,
      summary: partial.summary,
      entity_ids: partial.entity_ids,
      choice_text: partial.choice_text,
      step: this.step,
    }
    this.graph.events.push(ev)
    if (this.graph.events.length > MAX_EVENTS) {
      this.graph.events = this.graph.events.slice(-MAX_EVENTS)
    }
  }

  /** Register a new foreshadowing line from Director (current beat). */
  addForeshadowing(text: string, beatIndex: number): void {
    const t = text?.trim()
    if (!t) return
    if (!this.graph.foreshadowingPool) this.graph.foreshadowingPool = []
    this.graph.foreshadowingPool.push({
      id: newForeshadowId(),
      text: t,
      beatIndex,
      resolved: false,
    })
    if (this.graph.foreshadowingPool.length > MAX_FORESHADOWING) {
      this.graph.foreshadowingPool = this.graph.foreshadowingPool.slice(-MAX_FORESHADOWING)
    }
  }

  /**
   * Unresolved foreshadowings from earlier beats, for Director prompt (待回收).
   */
  pendingForeshadowingsForPrompt(currentBeat: number, maxLines = 5, maxCharsPerLine = 120): string {
    const pool = this.graph.foreshadowingPool ?? []
    const pending = pool.filter((e) => !e.resolved && e.beatIndex < currentBeat)
    if (!pending.length) return '（无）'
    const lines = pending.slice(-maxLines).map((e) => {
      let s = `[#${e.beatIndex}] ${e.text}`
      if (s.length > maxCharsPerLine) s = s.slice(0, maxCharsPerLine) + '…'
      return s
    })
    return lines.join('\n')
  }

  /**
   * Mark a foreshadowing as resolved when Director outputs callback (best-effort text match).
   */
  markResolvedByCallback(callbackText: string): void {
    const t = callbackText?.trim()
    if (!t || !this.graph.foreshadowingPool?.length) return
    const pool = this.graph.foreshadowingPool
    const norm = (s: string) => s.replace(/\s/g, '')
    const tn = norm(t)
    for (let i = pool.length - 1; i >= 0; i--) {
      const e = pool[i]!
      if (e.resolved) continue
      const en = norm(e.text)
      const frag = en.slice(0, Math.min(10, en.length))
      if (frag.length >= 4 && (tn.includes(frag) || en.includes(tn.slice(0, Math.min(10, tn.length))))) {
        e.resolved = true
        return
      }
    }
    const first = pool.find((x) => !x.resolved)
    if (first) first.resolved = true
  }

  /** Recent events as prompt line; lingSun high drops older fraction (mirror narrativeContext). */
  summaryForPrompt(lingSunLevel = 0, maxChars = 420): string {
    let evs = [...this.graph.events]
    if (lingSunLevel > 66) {
      evs = evs.slice(Math.floor(evs.length * 0.4))
    } else if (lingSunLevel > 33) {
      evs = evs.slice(Math.floor(evs.length * 0.65))
    }
    if (!evs.length) return '（无）'
    const lines = evs.map((e) => e.summary).filter(Boolean)
    let s = lines.join('；')
    if (s.length > maxChars) s = `…${s.slice(-maxChars)}`
    return s
  }

  entitySummary(maxChars = 280): string {
    if (!this.graph.entities.length) return '（无）'
    const parts = this.graph.entities.map((e) => `${e.name}(${e.type})`)
    let s = parts.join('、')
    if (s.length > maxChars) s = s.slice(0, maxChars) + '…'
    return s
  }

  reset(): void {
    this.graph = createEmptyWorldGraph()
    this.step = 0
  }
}
