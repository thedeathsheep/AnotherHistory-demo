import type { Node, Realm, Skeleton } from './types'
import { normalizeLoadedRealm } from './types'

let cachedSkeleton: Skeleton | null = null

interface Manifest {
  chapters?: string[]
  default_chapter?: string
}

/** Load single realm from chapter file (e.g. prologue.json) */
async function loadRealm(path: string): Promise<Realm | null> {
  const res = await fetch(path)
  if (!res.ok) return null
  const data = (await res.json()) as Realm
  return normalizeLoadedRealm(data)
}

/** Load skeleton (multi-realm) from file (e.g. skeleton.json) */
async function loadSkeletonFile(path: string): Promise<Skeleton | null> {
  const res = await fetch(path)
  if (!res.ok) return null
  return (await res.json()) as Skeleton
}

function dataUrl(p: string): string {
  if (typeof window === 'undefined') return p
  const base = window.location.origin
  return base.endsWith('/') ? base + p.slice(1) : base + p
}

export async function loadSkeleton(): Promise<Skeleton> {
  if (cachedSkeleton) return cachedSkeleton

  const manifestRes = await fetch(dataUrl('/data/manifest.json'))
  const manifest: Manifest = manifestRes.ok ? await manifestRes.json() : {}

  const chapters = manifest.chapters ?? ['skeleton']
  const realms: Realm[] = []

  for (const name of chapters) {
    const path = dataUrl(`/data/${name}.json`)
    const realm = await loadRealm(path)
    if (realm?.id && realm?.nodes?.length) {
      realms.push(realm)
      continue
    }
    const sk = await loadSkeletonFile(path)
    if (sk?.realms?.length) {
      realms.push(...sk.realms.map((r) => normalizeLoadedRealm(r)))
    }
  }

  if (realms.length === 0) {
    const fallback = await loadSkeletonFile(dataUrl('/data/skeleton.json'))
    if (fallback?.realms?.length) {
      cachedSkeleton = { realms: fallback.realms.map((r) => normalizeLoadedRealm(r)) }
      return cachedSkeleton
    }
    throw new Error('Failed to load skeleton: no realms found')
  }

  cachedSkeleton = { realms }
  return cachedSkeleton
}

export function findNode(skeleton: Skeleton, nodeId: string): Node | null {
  for (const realm of skeleton.realms) {
    const node = realm.nodes.find((n) => n.node_id === nodeId)
    if (node) return node
  }
  return null
}
