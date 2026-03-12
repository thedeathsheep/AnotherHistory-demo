/**
 * AI Context assembly: node, gameState, summaries.
 * Aligns with GDD 5.5 / TODO AI-E1, AI-E2, AI-E3, AI-E4.
 */

import type { Node, Choice, StatKey } from '@/game/types'
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
  /** One-sentence story beat from skeleton (AI-2); rewrite as 1–2 sentence narrative when present. */
  storyBeat?: string
  stateFilter: StateFilter
  statLabels: StatLabels
  realmName: string
  yishiSummary: string
  choiceHistorySummary: string
  /** Placeholder for future: hais, items, clues */
}

const CHARS_PER_TOKEN = 2
const MAX_YISHI_ENTRIES = 5

/**
 * Rough token estimate; used to cap yishi summary size.
 */
function charsToTokens(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN)
}

/**
 * Compress recent yishi entries into a prompt-injectable summary.
 * AI-E3
 */
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

/**
 * Summarize choice history for yishi凝练 /念头编排.
 * AI-E4
 */
export function getChoiceHistorySummary(choices: Choice[]): string {
  return choices.map((c) => c.text).join('\n') || '（无）'
}

export interface BuildContextInput {
  node: Node
  realmName: string
  stats: Record<StatKey, number>
  yishiEntries: string[]
  choiceHistory: Choice[]
}

/**
 * Assemble full AIContext from GameState + Skeleton node.
 * AI-E1, AI-E2
 */
export function buildContext(input: BuildContextInput): AIContext {
  const { node, realmName, stats, yishiEntries, choiceHistory } = input
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
    yishiSummary: getYishiSummary(yishiEntries, 200),
    choiceHistorySummary: getChoiceHistorySummary(choiceHistory),
  }
}
