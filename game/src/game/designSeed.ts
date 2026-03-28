/**
 * Design seed: minimal author input for AI Engine v2 (Planner / Director).
 * Loaded from public/data/design-seed.json (optional).
 * Realm rows may be augmented from skeleton.json `planner_seed` per realm.
 */

import type { Skeleton } from './types'

export type AnchorPosition = 'early' | 'mid' | 'late' | 'climax'

export interface AnchorPoint {
  id: string
  description: string
  position: AnchorPosition
  must_include: string[]
  unlocks?: string[]
}

export interface RealmSeed {
  id: string
  name: string
  theme: string
  anchors: AnchorPoint[]
  tension_curve?: string
  estimated_beats?: number
  forbidden?: string[]
}

export interface DesignSeed {
  world: {
    name: string
    era: string
    tone: string[]
    core_theme: string
  }
  protagonist: {
    identity: string
    goal: string
    arc_hint?: string
  }
  realms: RealmSeed[]
  /** Short rules injected as L0 context */
  narrative_rules?: string[]
}

let cachedRaw: DesignSeed | null | undefined

function dataUrl(p: string): string {
  if (typeof window === 'undefined') return p
  const base = window.location.origin
  return base.endsWith('/') ? base + p.slice(1) : base + p
}

function cloneAnchor(a: AnchorPoint): AnchorPoint {
  return {
    ...a,
    must_include: [...a.must_include],
    unlocks: a.unlocks ? [...a.unlocks] : undefined,
  }
}

/** Merge skeleton `planner_seed` into raw design-seed realms by id (insert or overwrite). */
export function mergeDesignSeedWithSkeleton(raw: DesignSeed, skeleton: Skeleton): DesignSeed {
  const order = raw.realms.map((r) => r.id)
  const map = new Map<string, RealmSeed>()
  for (const r of raw.realms) {
    map.set(r.id, {
      ...r,
      anchors: (r.anchors ?? []).map(cloneAnchor),
      forbidden: r.forbidden ? [...r.forbidden] : undefined,
    })
  }

  for (const sr of skeleton.realms) {
    const ps = sr.planner_seed
    if (!ps) continue
    const existing = map.get(sr.id)
    const fromPlanner = (ps.anchors ?? []).map((a) =>
      cloneAnchor({
        id: a.id,
        description: a.description,
        position: a.position,
        must_include: [...a.must_include],
        unlocks: a.unlocks ? [...a.unlocks] : undefined,
      })
    )
    const anchors = fromPlanner.length ? fromPlanner : (existing?.anchors ?? []).map(cloneAnchor)
    const merged: RealmSeed = {
      id: sr.id,
      name: sr.name,
      theme: ps.theme ?? existing?.theme ?? '',
      tension_curve: ps.tension_curve ?? existing?.tension_curve,
      estimated_beats: ps.estimated_beats ?? existing?.estimated_beats,
      forbidden: ps.forbidden?.length ? [...ps.forbidden] : existing?.forbidden ? [...existing.forbidden] : undefined,
      anchors,
    }
    if (!merged.theme) merged.theme = existing?.theme ?? sr.name
    map.set(sr.id, merged)
    if (!order.includes(sr.id)) order.push(sr.id)
  }

  const realms = order.filter((id) => map.has(id)).map((id) => map.get(id)!)
  return { ...raw, realms }
}

async function fetchRawDesignSeed(): Promise<DesignSeed | null> {
  if (cachedRaw !== undefined) return cachedRaw
  try {
    const res = await fetch(dataUrl('/data/design-seed.json'))
    if (!res.ok) {
      cachedRaw = null
      return null
    }
    const data = (await res.json()) as DesignSeed
    if (!data?.world?.name || !Array.isArray(data.realms)) {
      cachedRaw = null
      return null
    }
    cachedRaw = data
    return data
  } catch {
    cachedRaw = null
    return null
  }
}

/**
 * Fetch design-seed.json; when `skeleton` is passed and any realm has `planner_seed`, merge those rows.
 */
export async function loadDesignSeed(skeleton?: Skeleton | null): Promise<DesignSeed | null> {
  const raw = await fetchRawDesignSeed()
  if (!raw) return null
  if (skeleton?.realms?.some((r) => r.planner_seed)) return mergeDesignSeedWithSkeleton(raw, skeleton)
  return raw
}

export function getCachedDesignSeed(): DesignSeed | null {
  return cachedRaw ?? null
}

/** For tests: reset module cache */
export function resetDesignSeedCache(): void {
  cachedRaw = undefined
}

export function realmSeedById(seed: DesignSeed | null, realmId: string): RealmSeed | null {
  if (!seed?.realms?.length) return null
  return seed.realms.find((r) => r.id === realmId) ?? null
}
