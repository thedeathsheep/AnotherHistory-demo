/**
 * AI Engine: narrative + yishi generation.
 * Refactored from aiBridge; aligns with GDD 5.5, AI流水线与存储规范, TODO AI-E*.
 */

import type { Node, Choice, HaiId, Item, Clue, RealmNpc } from '@/game/types'
import { normalizeHais } from '@/game/types'
import { violatesTaboo, statLabel } from '@/game/state'
import { chat, chatStream } from './chat'
import { buildContext, type StateFilter } from './dataAcquisition'
import {
  buildNarrativeUserPrompt,
  NARRATIVE_SYSTEM,
  narrativeMatchesPlotGuide,
  buildDynamicNarrativeUserPrompt,
} from './prompts/narrative'
import { buildYishiUserPrompt, YISHI_SYSTEM } from './prompts/yishi'
import { buildChoicesUserPrompt, CHOICES_SYSTEM } from './prompts/choices'
import { buildDynamicChoicesUserPrompt, DYNAMIC_CHOICES_SYSTEM } from './prompts/dynamicChoices'
import { ITEM_NARRATIVE_SYSTEM, buildItemNarrativeUserPrompt } from './prompts/item'
import { NPC_DIALOGUE_SYSTEM, buildNpcDialogueUserPrompt } from './prompts/npc'
import { buildLayeredContext, layeredContextBlock, type LayeredContextInput } from './contextAssembly'
import { beatNextToken } from '@/game/storyRuntime'

// Re-export for external use
export { chat, chatStream, AI_DEBUG } from './chat'
export { getModelForRole, type AIAgentRole } from './aiModels'
export {
  buildContext,
  getYishiSummary,
  getChoiceHistorySummary,
  type AIContext,
  type StateFilter,
  type StatLabels,
} from './dataAcquisition'
export { narrativeMatchesPlotGuide } from './prompts/narrative'
export { runPlanner } from './agents/planner'
export { runDirector } from './agents/director'
export { verifyNarrative, type VerifyNarrativeResult } from './agents/verifier'
export { buildLayeredContext, layeredContextBlock, type LayeredContext, type LayeredContextInput } from './contextAssembly'

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
  /** When set, first generation uses SSE; retries use non-streaming chat. */
  onStreamChunk?: (fullSoFar: string) => void
  streamSignal?: AbortSignal
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
  const messagesFor = (extra: string): { role: string; content: string }[] => {
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
    return [
      { role: 'system', content: NARRATIVE_SYSTEM },
      { role: 'user', content: user },
    ]
  }

  const run = async (extra: string, allowStream: boolean): Promise<string | null> => {
    const msgs = messagesFor(extra)
    if (allowStream && options?.onStreamChunk) {
      return chatStream(apiKey, msgs, {
        maxTokens: 400,
        label: 'generateNodeNarrative',
        agentRole: 'writer',
        onChunk: options.onStreamChunk,
        signal: options.streamSignal,
      })
    }
    return chat(apiKey, msgs, {
      maxTokens: 400,
      label: 'generateNodeNarrative',
      agentRole: 'writer',
    })
  }

  let result = await run('', true)
  let text = result?.trim() ?? ''
  if (text && plotGuide.length && !narrativeMatchesPlotGuide(text, plotGuide)) {
    const retry = await run(
      '【重试】上一稿未体现核心剧情导向中的关键词。请改写，并至少自然融入其中一个导向词或禁忌相关物象（仍保持 1–2 句具体叙事）。',
      false
    )
    if (retry?.trim()) text = retry.trim()
  }
  const taboos = node.taboo ?? []
  if (text && taboos.length && violatesTaboo(text, taboos)) {
    const list = taboos.map((t) => t.trim()).filter(Boolean).join('、')
    const retryTaboo = await run(
      list
        ? `【重试】上一稿正文中出现了禁忌相关用语。请改写为 1–2 句具体叙事，禁止直接写出或明显指涉以下禁忌词：${list}。若本节点有核心剧情导向，仍须至少融入其中一个导向词。`
        : '【重试】上一稿正文中出现了禁忌相关用语。请改写为 1–2 句具体叙事，避开节点禁忌。',
      false
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
    agentRole: 'yishi',
  })
}

/** AI-E16: sensory / inspection narrative for a single item. */
export async function generateItemNarrative(
  apiKey: string,
  item: Item,
  clues: Clue[],
  hais?: Partial<Record<HaiId, number>>
): Promise<string | null> {
  const user = buildItemNarrativeUserPrompt(item, hais, clues)
  const raw = await chat(
    apiKey,
    [{ role: 'system', content: ITEM_NARRATIVE_SYSTEM }, { role: 'user', content: user }],
    { maxTokens: 320, label: 'generateItemNarrative', agentRole: 'writer' }
  )
  return raw?.trim() || null
}

/** AI-E16: NPC line or attitude block for current scene. */
export async function generateNpcDialogue(
  apiKey: string,
  npc: RealmNpc,
  sceneHint: string,
  clues: Clue[],
  hais?: Partial<Record<HaiId, number>>
): Promise<string | null> {
  const user = buildNpcDialogueUserPrompt(npc, sceneHint, hais, clues)
  const raw = await chat(
    apiKey,
    [{ role: 'system', content: NPC_DIALOGUE_SYSTEM }, { role: 'user', content: user }],
    { maxTokens: 320, label: 'generateNpcDialogue', agentRole: 'writer' }
  )
  return raw?.trim() || null
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
    agentRole: 'choice',
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

export interface GenerateDynamicNarrativeOptions {
  hais?: Record<HaiId, number>
  onStreamChunk?: (fullSoFar: string) => void
  streamSignal?: AbortSignal
}

/**
 * Engine v2: narrative for current beat using layered context + Director directive.
 */
export async function generateDynamicBeatNarrative(
  apiKey: string,
  layeredInput: LayeredContextInput,
  stateFilter: StateFilter,
  plotGuide: string[],
  taboo: string[],
  objective: string | undefined,
  options?: GenerateDynamicNarrativeOptions
): Promise<string | null> {
  const layered = buildLayeredContext(layeredInput)
  const block = layeredContextBlock(layered)
  const statLabels = {
    ming_zhu: statLabel('ming_zhu', stateFilter.ming_zhu),
    gen_jiao: statLabel('gen_jiao', stateFilter.gen_jiao),
    jian_zhao: statLabel('jian_zhao', stateFilter.jian_zhao),
  }
  const haisFull = normalizeHais(options?.hais)

  const messagesFor = (extra: string): { role: string; content: string }[] => {
    let user = buildDynamicNarrativeUserPrompt(block, statLabels, haisFull, plotGuide, taboo, objective)
    if (extra) user += `\n\n${extra}`
    return [
      { role: 'system', content: NARRATIVE_SYSTEM },
      { role: 'user', content: user },
    ]
  }

  const run = async (extra: string, allowStream: boolean): Promise<string | null> => {
    const msgs = messagesFor(extra)
    if (allowStream && options?.onStreamChunk) {
      return chatStream(apiKey, msgs, {
        maxTokens: 400,
        label: 'generateDynamicBeatNarrative',
        agentRole: 'writer',
        onChunk: options.onStreamChunk,
        signal: options.streamSignal,
      })
    }
    return chat(apiKey, msgs, {
      maxTokens: 400,
      label: 'generateDynamicBeatNarrative',
      agentRole: 'writer',
    })
  }

  let result = await run('', true)
  let text = result?.trim() ?? ''
  if (text && plotGuide.length && !narrativeMatchesPlotGuide(text, plotGuide)) {
    const retry = await run(
      '【重试】上一稿未体现核心剧情导向中的关键词。请改写，并至少自然融入其中一个导向词（仍保持 1–2 句具体叙事）。',
      false
    )
    if (retry?.trim()) text = retry.trim()
  }
  if (text && taboo.length && violatesTaboo(text, taboo)) {
    const list = taboo.map((t) => t.trim()).filter(Boolean).join('、')
    const retryTaboo = await run(
      list
        ? `【重试】正文中出现了禁忌相关用语。请改写，禁止直接写出或明显指涉：${list}。`
        : '【重试】正文中出现了禁忌相关用语。请改写。',
      false
    )
    if (retryTaboo?.trim()) text = retryTaboo.trim()
  }
  return text || null
}

/** Engine v2: choices for dynamic beat; all branches share same next token unless last beat (__结案__). */
export async function generateDynamicBeatChoices(
  apiKey: string,
  realmName: string,
  sceneNarrative: string,
  taboo: string[],
  directions: string[],
  beatIndex: number,
  totalBeats: number
): Promise<Choice[]> {
  const isLastBeat = beatIndex >= Math.max(0, totalBeats - 1)
  const validNextTokens = isLastBeat ? ['__结案__'] : [beatNextToken(beatIndex + 1)]
  const user = buildDynamicChoicesUserPrompt({
    realmName,
    sceneNarrative: sceneNarrative.trim() || '（无）',
    taboo,
    directions: directions.length ? directions : ['前行', '停步', '辨位'],
    validNextTokens,
    isLastBeat,
  })
  const raw = await chat(apiKey, [{ role: 'system', content: DYNAMIC_CHOICES_SYSTEM }, { role: 'user', content: user }], {
    maxTokens: 512,
    label: 'generateDynamicBeatChoices',
    agentRole: 'choice',
  })
  if (!raw?.trim()) return []
  let text = raw.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(text)
  if (fence) text = fence[1].trim()
  try {
    const parsed = JSON.parse(text) as unknown
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    const valid = new Set(validNextTokens)
    const out: Choice[] = []
    for (const x of arr) {
      if (!x || typeof x !== 'object') continue
      const o = x as Record<string, unknown>
      const t = typeof o.text === 'string' ? o.text.trim() : ''
      const n = typeof o.next === 'string' ? o.next.trim() : ''
      if (!t || !valid.has(n)) continue
      const c: Choice = { text: t, next: n }
      if (isLastBeat && typeof o.conclusion_label === 'string' && o.conclusion_label.trim()) {
        c.conclusion_label = o.conclusion_label.trim()
      }
      if (violatesTaboo(t, taboo)) continue
      out.push(c)
    }
    return out.filter((c) => (isLastBeat ? Boolean(c.conclusion_label) : true)).slice(0, 5)
  } catch {
    return []
  }
}
