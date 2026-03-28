/**
 * AI Context assembly: node, gameState, summaries.
 * Aligns with GDD 5.5 / TODO AI-E1, AI-E2, AI-E3, AI-E4.
 */

import type { Node, Choice, StatKey, HaiId } from '@/game/types'
import { normalizeHais } from '@/game/types'
import { statLabel } from '@/game/state'

export interface StateFilter {
  ming_zhu: number
  gen_jiao: number
  jian_zhao: number
}

export interface StatLabels {
  ming_zhu: string
  gen_jiao: string
  jian_zhao: string
}

export interface AIContext {
  nodeId: string
  plotGuide: string[]
  taboo: string[]
  objective: string
  description: string
  storyBeat?: string
  stateFilter: StateFilter
  statLabels: StatLabels
  realmName: string
  yishiSummary: string
  choiceHistorySummary: string
  narrativeFactSummary?: string
  hais: Record<HaiId, number>
}

const CHARS_PER_TOKEN = 2
const MAX_YISHI_ENTRIES = 5

function charsToTokens(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN)
}

export function getYishiSummary(entries: string[], maxTokens = 300): string {
  if (!entries.length) return '（无）'
  const recent = entries.slice(-MAX_YISHI_ENTRIES)
  let acc = ''
  for (let i = recent.length - 1; i >= 0; i--) {
    const line = recent[i] + '\n'
    if (charsToTokens(acc.length + line.length) > maxTokens) break
    acc = line + acc
  }
  return acc.trim() || '（无）'
}

export function getChoiceHistorySummary(choices: Choice[]): string {
  return choices.map((c) => c.text).join('\n') || '（无）'
}

export interface BuildContextInput {
  node: Node
  realmName: string
  stats: Record<StatKey, number>
  hais?: Partial<Record<HaiId, number>>
  yishiEntryTexts: string[]
  choiceHistory: Choice[]
  narrativeFactSummary?: string
}

export function buildContext(input: BuildContextInput): AIContext {
  const { node, realmName, stats, hais = {}, yishiEntryTexts, choiceHistory, narrativeFactSummary } = input
  const plotGuide = node.plot_guide ?? node.truth_anchors ?? []
  const taboo = node.taboo ?? []
  const objective = node.objective ?? ''
  const stateFilter: StateFilter = {
    ming_zhu: stats.ming_zhu,
    gen_jiao: stats.gen_jiao,
    jian_zhao: stats.jian_zhao,
  }
  const statLabels: StatLabels = {
    ming_zhu: statLabel('ming_zhu', stats.ming_zhu),
    gen_jiao: statLabel('gen_jiao', stats.gen_jiao),
    jian_zhao: statLabel('jian_zhao', stats.jian_zhao),
  }
  const haisRecord = normalizeHais(hais)
  return {
    nodeId: node.node_id,
    plotGuide,
    taboo,
    objective,
    description: node.description,
    storyBeat: node.story_beat,
    stateFilter,
    statLabels,
    realmName,
    yishiSummary: getYishiSummary(yishiEntryTexts, 200),
    choiceHistorySummary: getChoiceHistorySummary(choiceHistory),
    narrativeFactSummary,
    hais: haisRecord,
  }
}
