import type { Node, Skeleton } from './types'

let cachedSkeleton: Skeleton | null = null

export async function loadSkeleton(): Promise<Skeleton> {
  if (cachedSkeleton) return cachedSkeleton
  const res = await fetch('/data/skeleton.json')
  if (!res.ok) throw new Error('Failed to load skeleton')
  const data = (await res.json()) as Skeleton
  cachedSkeleton = data
  return data
}

export function findNode(skeleton: Skeleton, nodeId: string): Node | null {
  for (const realm of skeleton.realms) {
    const node = realm.nodes.find((n) => n.node_id === nodeId)
    if (node) return node
  }
  return null
}
