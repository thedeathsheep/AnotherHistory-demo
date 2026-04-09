/**
 * AI Engine: narrative + yishi generation.
 * Refactored from aiBridge; aligns with GDD 5.5, AI流水线与存储规范, TODO AI-E*.
 */

import type { Node, Choice, HaiId, Item, Clue, RealmNpc } from '@/game/types'
import { normalizeHais } from '@/game/types'
import { violatesTaboo, statLabel } from '@/game/state'
import { chat, chatStream, AI_DEBUG } from './chat'
import { buildContext, type StateFilter } from './dataAcquisition'
import {
  buildNarrativeUserPrompt,
  NARRATIVE_SYSTEM,
  NARRATIVE_TAIL_RULES,
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
import type { GenerationPlan, ChoiceIntent } from './agents/conductor'

// Re-export for external use
export { chat, chatStream, AI_DEBUG, validateOpenAiCompatibleKey } from './chat'
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
export { runConductor, parseGenerationPlan, type GenerationPlan, type ChoiceIntent } from './agents/conductor'
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
  // NOTE: Do not auto-retry here — retries cause visible “same node rewrites twice”.
  // Keep post-checks as DEV warnings only.
  if (AI_DEBUG && text && plotGuide.length && !narrativeMatchesPlotGuide(text, plotGuide)) {
    console.warn('[AI] generateNodeNarrative: missing plot_guide keyword; no retry')
  }
  const taboos = node.taboo ?? []
  if (AI_DEBUG && text && taboos.length && violatesTaboo(text, taboos)) {
    console.warn('[AI] generateNodeNarrative: taboo violated; no retry')
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
  intent?: ChoiceIntent | string
}

function uniqueStrings(xs: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of xs) {
    const t = x.trim()
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function normalizeIntent(raw: unknown): ChoiceIntent | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  const allowed: ChoiceIntent[] = ['advance', 'inspect', 'seekInfo', 'commitRisk', 'retreat', 'interact', 'wait']
  return (allowed as string[]).includes(t) ? (t as ChoiceIntent) : null
}

function pickChoicesByPlan(params: {
  parsed: AIGeneratedChoice[]
  validNexts: Set<string>
  plan: GenerationPlan | null
  fallbackMax: number
}): AIGeneratedChoice[] {
  const { parsed, validNexts, plan, fallbackMax } = params
  const filtered = parsed
    .filter((x) => x && typeof x.text === 'string' && typeof x.next === 'string')
    .map((x) => ({ text: String(x.text).trim(), next: String(x.next).trim(), intent: x.intent }))
    .filter((x) => x.text.length > 0 && validNexts.has(x.next))

  const target = plan?.target_choice_count ?? fallbackMax
  const required = plan?.intents_required?.length ? plan.intents_required : []
  const requiredSet = new Set(required)

  // Greedy: first cover required intents, then fill by distinct next if prefer_divergent_next.
  const chosen: AIGeneratedChoice[] = []
  const usedIdx = new Set<number>()
  const usedNext = new Set<string>()
  const usedIntent = new Set<string>()

  const norm = filtered.map((c) => ({ ...c, intent: normalizeIntent(c.intent) ?? undefined }))

  for (const intent of required) {
    const j = norm.findIndex((c, idx) => !usedIdx.has(idx) && c.intent === intent)
    if (j >= 0) {
      chosen.push(norm[j]!)
      usedIdx.add(j)
      usedNext.add(norm[j]!.next)
      usedIntent.add(intent)
    }
  }

  const preferDivergent = plan?.prefer_divergent_next !== false
  while (chosen.length < target) {
    let j = -1
    // Prefer new intents first (if provided), else prefer new next.
    j =
      norm.findIndex((c, idx) => {
        if (usedIdx.has(idx)) return false
        if (requiredSet.size && c.intent && !usedIntent.has(c.intent)) return true
        return false
      }) ?? -1
    if (j === -1) {
      j = norm.findIndex((c, idx) => {
        if (usedIdx.has(idx)) return false
        if (preferDivergent && usedNext.has(c.next)) return false
        return true
      })
    }
    if (j === -1) {
      j = norm.findIndex((_, idx) => !usedIdx.has(idx))
    }
    if (j === -1) break
    chosen.push(norm[j]!)
    usedIdx.add(j)
    usedNext.add(norm[j]!.next)
    if (norm[j]!.intent) usedIntent.add(norm[j]!.intent as string)
  }

  return chosen.slice(0, Math.min(5, Math.max(2, target)))
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
  sceneNarrative?: string,
  plan?: GenerationPlan | null
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
    targetChoiceCount: plan?.target_choice_count,
    intentsRequired: plan?.intents_required?.length ? uniqueStrings(plan.intents_required) : undefined,
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
    const fallbackMax = Math.min(5, Math.max(2, node.choices.length))
    const chosen = pickChoicesByPlan({
      parsed: arr as AIGeneratedChoice[],
      validNexts,
      plan: plan ?? null,
      fallbackMax,
    })
    return chosen
  } catch {
    return []
  }
}

export interface GenerateDynamicNarrativeOptions {
  hais?: Record<HaiId, number>
  onStreamChunk?: (fullSoFar: string) => void
  streamSignal?: AbortSignal
  /** Beat summary as 情节点 line (skeleton parity) */
  storyBeat?: string
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

  const dynamicSystem = `${NARRATIVE_SYSTEM}\n\n【叙事行文硬律】\n${NARRATIVE_TAIL_RULES}`

  const messagesFor = (extra: string): { role: string; content: string }[] => {
    let user = buildDynamicNarrativeUserPrompt(
      block,
      statLabels,
      haisFull,
      plotGuide,
      taboo,
      objective,
      options?.storyBeat
    )
    if (extra) user += `\n\n${extra}`
    return [
      { role: 'system', content: dynamicSystem },
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
  // NOTE: Do not auto-retry here — retries cause visible “same node rewrites twice”.
  // Keep post-checks as DEV warnings only.
  if (AI_DEBUG && text && plotGuide.length && !narrativeMatchesPlotGuide(text, plotGuide)) {
    console.warn('[AI] generateDynamicBeatNarrative: missing plot_guide keyword; no retry')
  }
  if (AI_DEBUG && text && taboo.length && violatesTaboo(text, taboo)) {
    console.warn('[AI] generateDynamicBeatNarrative: taboo violated; no retry')
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
