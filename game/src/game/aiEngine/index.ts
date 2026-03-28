/**
 * AI Engine: narrative + yishi generation.
 * Refactored from aiBridge; aligns with GDD 5.5, AI流水线与存储规范, TODO AI-E*.
 */

import type { Node, Choice, HaiId, Item, Clue } from '@/game/types'
import { violatesTaboo } from '@/game/state'
import { chat } from './chat'
import { buildContext, type StateFilter } from './dataAcquisition'
import { buildNarrativeUserPrompt, NARRATIVE_SYSTEM, narrativeMatchesPlotGuide } from './prompts/narrative'
import { buildYishiUserPrompt, YISHI_SYSTEM } from './prompts/yishi'
import { buildChoicesUserPrompt, CHOICES_SYSTEM } from './prompts/choices'

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
export { narrativeMatchesPlotGuide } from './prompts/narrative'

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

export interface GenerateNarrativeOptions {
  yishiEntryTexts?: string[]
  choiceHistory?: Choice[]
  hais?: Record<HaiId, number>
  narrativeFactSummary?: string
}

/**
 * Generate narrative for a node. Returns null on API failure (caller should fallback to node.description).
 * AI-E18: one retry if plot_guide keywords missing from output.
 * AI-E19: one retry if narrative text includes taboo keywords (same rules as choice taboo).
 */
export async function generateNodeNarrative(
  apiKey: string,
  node: Node,
  realmName: string,
  stateFilter: StateFilter,
  options?: GenerateNarrativeOptions
): Promise<string | null> {
  const plotGuide = node.plot_guide ?? node.truth_anchors ?? []
  const run = async (extra: string): Promise<string | null> => {
    const ctx = buildContext({
      node,
      realmName,
      stats: stateFilter,
      hais: options?.hais,
      yishiEntryTexts: options?.yishiEntryTexts ?? [],
      choiceHistory: options?.choiceHistory ?? [],
      narrativeFactSummary: options?.narrativeFactSummary,
    })
    let user = buildNarrativeUserPrompt(ctx)
    if (extra) user += `\n\n${extra}`
    return chat(apiKey, [{ role: 'system', content: NARRATIVE_SYSTEM }, { role: 'user', content: user }], {
      maxTokens: 400,
      label: 'generateNodeNarrative',
    })
  }
  let result = await run('')
  let text = result?.trim() ?? ''
  if (text && plotGuide.length && !narrativeMatchesPlotGuide(text, plotGuide)) {
    const retry = await run(
      '【重试】上一稿未体现核心剧情导向中的关键词。请改写，并至少自然融入其中一个导向词或禁忌相关物象（仍保持 1–2 句具体叙事）。'
    )
    if (retry?.trim()) text = retry.trim()
  }
  const taboos = node.taboo ?? []
  if (text && taboos.length && violatesTaboo(text, taboos)) {
    const list = taboos.map((t) => t.trim()).filter(Boolean).join('、')
    const retryTaboo = await run(
      list
        ? `【重试】上一稿正文中出现了禁忌相关用语。请改写为 1–2 句具体叙事，禁止直接写出或明显指涉以下禁忌词：${list}。若本节点有核心剧情导向，仍须至少融入其中一个导向词。`
        : '【重试】上一稿正文中出现了禁忌相关用语。请改写为 1–2 句具体叙事，避开节点禁忌。'
    )
    if (retryTaboo?.trim()) text = retryTaboo.trim()
  }
  return text || null
}

export async function generateYishi(
  apiKey: string,
  realmName: string,
  choiceSummary: string,
  conclusionLabel: string,
  coreFacts?: string[]
): Promise<string | null> {
  const user = buildYishiUserPrompt({ realmName, choiceSummary, conclusionLabel, coreFacts })
  return chat(apiKey, [{ role: 'system', content: YISHI_SYSTEM }, { role: 'user', content: user }], {
    maxTokens: 256,
    label: 'generateYishi',
  })
}

/** Parsed AI choice: text + next only; state/hai_delta inherited from skeleton. */
export interface AIGeneratedChoice {
  text: string
  next: string
}

/**
 * Generate 1–2 additional choices for a node (AI-E15).
 * Returns empty array on failure; caller merges with skeleton choices.
 */
export async function generateChoices(
  apiKey: string,
  node: Node,
  realmName: string,
  items: Item[],
  clues: Clue[],
  requireItemThought?: boolean,
  /** 与叙事一体：有 AI 叙事时应为成稿；无则为骨架 description */
  sceneNarrative?: string
): Promise<AIGeneratedChoice[]> {
  if (!node.choices?.length) return []
  const user = buildChoicesUserPrompt({
    plotGuide: node.plot_guide ?? node.truth_anchors ?? [],
    taboo: node.taboo ?? [],
    storyBeat: node.story_beat,
    sceneNarrative: sceneNarrative?.trim() || undefined,
    skeletonChoices: node.choices,
    items,
    clues,
    realmName,
    requireItemThought,
  })
  const result = await chat(apiKey, [{ role: 'system', content: CHOICES_SYSTEM }, { role: 'user', content: user }], {
    maxTokens: 256,
    label: 'generateChoices',
  })
  if (!result?.trim()) return []
  try {
    const parsed = JSON.parse(result) as unknown
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    const validNexts = new Set(node.choices.map((c) => c.next).filter(Boolean))
    return arr
      .filter((x): x is AIGeneratedChoice => x && typeof x.text === 'string' && typeof x.next === 'string')
      .filter((x) => validNexts.has(x.next))
      .slice(0, 2)
      .map((x) => ({ text: String(x.text).trim(), next: x.next }))
      .filter((x) => x.text.length > 0)
  } catch {
    return []
  }
}
