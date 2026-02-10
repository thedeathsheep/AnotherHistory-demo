/**
 * AI Engine: narrative + yishi generation.
 * Refactored from aiBridge; aligns with GDD 5.5, AI流水线与存储规范, TODO AI-E*.
 */

import type { Node, Choice } from '@/game/types'
import { chat } from './chat'
import { buildContext, type StateFilter } from './dataAcquisition'
import { buildNarrativeUserPrompt, NARRATIVE_SYSTEM } from './prompts/narrative'
import { buildYishiUserPrompt, YISHI_SYSTEM } from './prompts/yishi'

// Re-export for external use
export { chat, AI_DEBUG } from './chat'
export {
  buildContext,
  getYishiSummary,
  getChoiceHistorySummary,
  type AIContext,
  type StateFilter,
  type StatLabels,
} from './dataAcquisition'

export interface NodeContext {
  node_id: string
  plot_guide?: string[]
  truth_anchors?: string[]
  taboo?: string[]
  objective?: string
  description: string
}

export interface NarrativeInput {
  node: Node
  realmName: string
  stats: { ming_zhu: number; gen_jiao: number; jian_zhao: number }
  yishiEntries: string[]
  choiceHistory: Choice[]
}

/**
 * Generate narrative for a node. Returns null on API failure (caller should fallback to node.description).
 * AI-E24: fallback handled by App when desc is null.
 */
export async function generateNodeNarrative(
  apiKey: string,
  node: Node,
  realmName: string,
  stateFilter: StateFilter,
  options?: { yishiEntries?: string[]; choiceHistory?: Choice[] }
): Promise<string | null> {
  const ctx = buildContext({
    node,
    realmName,
    stats: stateFilter,
    yishiEntries: options?.yishiEntries ?? [],
    choiceHistory: options?.choiceHistory ?? [],
  })
  const user = buildNarrativeUserPrompt(ctx)
  const result = await chat(apiKey, [{ role: 'system', content: NARRATIVE_SYSTEM }, { role: 'user', content: user }], {
    maxTokens: 400,
    label: 'generateNodeNarrative',
  })
  return result ?? null
}

export async function generateYishi(
  apiKey: string,
  realmName: string,
  choiceSummary: string,
  conclusionLabel: string
): Promise<string | null> {
  const user = buildYishiUserPrompt({ realmName, choiceSummary, conclusionLabel })
  return chat(apiKey, [{ role: 'system', content: YISHI_SYSTEM }, { role: 'user', content: user }], {
    maxTokens: 256,
    label: 'generateYishi',
  })
}
