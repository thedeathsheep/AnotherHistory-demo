/**
 * Merge AI-generated choice lines onto skeleton branches (one row per next).
 * Avoids duplicating the same path and reduces 凭物+折返误配。
 */

import type { Choice, Node } from '@/game/types'
import type { AIGeneratedChoice } from '@/game/aiEngine'

const RETREAT_HINT = /回|退|绕开|离去|离开|折返|返回|往回|不去|别去|回头/

/** Skeleton options that read like turning back / leaving (locale heuristic). */
function skeletonLooksRetreat(c: Choice): boolean {
  return RETREAT_HINT.test(c.text)
}

/** 凭物叙述若未明示折返，不把 next 绑到「撤离类」骨架上，改绑第一条非撤离（若存在）。 */
export function alignPingwuNextIfNeeded(ac: AIGeneratedChoice, node: Node): AIGeneratedChoice {
  const t = ac.text.trim()
  if (!t.includes('凭物') && !t.startsWith('(凭物)')) return ac
  const sk = node.choices.find((c) => c.next === ac.next)
  if (!sk) return ac
  const pingwuBody = t.replace(/^\(?凭物\)?\s*[：:］\]]?\s*/, '')
  const wantsRetreat = RETREAT_HINT.test(pingwuBody)
  if (!wantsRetreat && skeletonLooksRetreat(sk)) {
    const alt = node.choices.find((c) => !skeletonLooksRetreat(c))
    if (alt) {
      return { ...ac, next: alt.next }
    }
  }
  return ac
}

/**
 * One display row per skeleton branch; AI rewrites text when it targets the same `next`.
 */
export function mergeSkeletonChoicesWithAi(node: Node, aiChoices: AIGeneratedChoice[]): Choice[] {
  if (!node.choices?.length) return []
  const byNext = new Map<string, string>()
  for (const raw of aiChoices) {
    const ac = alignPingwuNextIfNeeded(raw, node)
    if (!node.choices.some((c) => c.next === ac.next)) continue
    if (ac.text.trim()) {
      byNext.set(ac.next, ac.text.trim())
    }
  }
  const rows = node.choices.map((c) => {
    const text = byNext.get(c.next)
    return text ? { ...c, text } : c
  })
  return dedupeDuplicateDisplayTexts(node, rows)
}

/** Same visible text on two buttons is confusing; later rows fall back to skeleton copy. */
function dedupeDuplicateDisplayTexts(node: Node, merged: Choice[]): Choice[] {
  if (!node.choices?.length || merged.length !== node.choices.length) return merged
  const seen = new Set<string>()
  return merged.map((c, i) => {
    const key = c.text.trim().replace(/\s+/g, ' ')
    if (seen.has(key)) {
      const sk = node.choices[i]
      return sk ? { ...c, text: sk.text } : c
    }
    seen.add(key)
    return c
  })
}

/**
 * Dynamic beats store runtime choices on the node; `cachedAiChoices[dynId]` is `[]` as a fetch marker only.
 * Skeleton nodes store the merged full list in cache once AI returns.
 */
export function getDisplayChoicesForNode(
  node: Node,
  cachedByNode: Record<string, Choice[]>,
  isDynamicBeat: boolean
): Choice[] {
  if (isDynamicBeat) return node.choices ?? []
  const merged = cachedByNode[node.node_id]
  return merged !== undefined ? merged : (node.choices ?? [])
}

/** True while the choices effect will run and has not yet written `cachedAiChoices[node_id]`. */
export function isAwaitingChoiceHydration(params: {
  apiKey: string | null
  node: Node
  canEnterNode: boolean
  cachedAiChoices: Record<string, Choice[]>
  cachedNarrative: Record<string, string>
  isDynamicBeat: boolean
}): boolean {
  const { apiKey, node, canEnterNode, cachedAiChoices, cachedNarrative, isDynamicBeat } = params
  if (!apiKey || !canEnterNode) return false
  const nid = node.node_id
  if (cachedAiChoices[nid] !== undefined) return false
  if (!isDynamicBeat && !node.choices?.length) return false
  const nodeUseAi = Boolean(
    apiKey && (isDynamicBeat || (node.plot_guide ?? node.truth_anchors)?.length)
  )
  if (nodeUseAi && cachedNarrative[nid] === undefined) return false
  return true
}
