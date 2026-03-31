/**
 * Runtime story structures for AI Engine v2 (outline, beats, director directive).
 */

import type { RealmSeed } from './designSeed'
import type { Node, NodeGate, StatKey } from './types'
import { MING_ZHU, GEN_JIAO, JIAN_ZHAO } from './types'

export type StoryBeatType = 'setup' | 'rising' | 'twist' | 'climax' | 'resolution'

export interface StoryBeat {
  beat_id: string
  type: StoryBeatType
  summary: string
  anchor_ref?: string
  /** 0–1 */
  tension: number
}

export interface StoryOutline {
  realm_id: string
  beats: StoryBeat[]
  divergence_note?: string
}

/** Director-suggested entry conditions for the current dynamic beat (maps to Node.gate). */
export interface DirectorGateHint {
  item?: string
  clue?: string
  ming_zhu_min?: number
  gen_jiao_min?: number
  jian_zhao_min?: number
}

export interface NodeDirective {
  scene_setting: string
  mood: string
  plot_advancement: string
  choices_hint: {
    count: number
    directions: string[]
  }
  foreshadowing?: string
  callback?: string
  /** Free-text hint for hai / atmosphere (fed to narrative prompt) */
  hai_effects_note?: string
  /** Optional gate for this beat (catalog item/clue IDs, stat floors). */
  gate_hint?: DirectorGateHint
}

/** Merge Director gate_hint into runtime Node.gate for canEnterNode. */
export function directorGateHintToNodeGatePatch(h?: DirectorGateHint | null): Pick<Node, 'gate'> {
  if (!h || typeof h !== 'object') return {}
  const gate: NodeGate = {}
  if (typeof h.item === 'string' && h.item.trim()) gate.item = h.item.trim()
  if (typeof h.clue === 'string' && h.clue.trim()) gate.clue = h.clue.trim()
  const stat_min: Partial<Record<StatKey, number>> = {}
  if (typeof h.ming_zhu_min === 'number' && Number.isFinite(h.ming_zhu_min)) {
    stat_min[MING_ZHU] = Math.max(0, Math.min(100, Math.round(h.ming_zhu_min)))
  }
  if (typeof h.gen_jiao_min === 'number' && Number.isFinite(h.gen_jiao_min)) {
    stat_min[GEN_JIAO] = Math.max(0, Math.min(100, Math.round(h.gen_jiao_min)))
  }
  if (typeof h.jian_zhao_min === 'number' && Number.isFinite(h.jian_zhao_min)) {
    stat_min[JIAN_ZHAO] = Math.max(0, Math.min(100, Math.round(h.jian_zhao_min)))
  }
  if (Object.keys(stat_min).length) gate.stat_min = stat_min
  if (gate.item == null && gate.clue == null && !gate.stat_min) return {}
  return { gate }
}

export interface BuildDynamicBeatRuntimeNodeParams {
  realmId: string
  beatIndex: number
  outline: StoryOutline | null | undefined
  previousNode?: Node | null
  realmSeed?: RealmSeed | null
  gateHint?: DirectorGateHint | null
}

export function buildDynamicBeatRuntimeNode(params: BuildDynamicBeatRuntimeNodeParams): Node | null {
  const { realmId, beatIndex, outline, previousNode, realmSeed, gateHint } = params
  const beat = outline?.beats[beatIndex]
  if (!realmId || !beat) return null

  const plotGuide: string[] = [beat.summary?.trim() || 'Opening beat']
  const anchor = realmSeed?.anchors?.find((a) => a.id === beat.anchor_ref)
  if (anchor?.must_include?.length) plotGuide.push(...anchor.must_include)

  const taboo = previousNode?.taboo?.length
    ? [...previousNode.taboo]
    : beatIndex === 0 && realmSeed?.forbidden?.length
      ? [...realmSeed.forbidden]
      : []

  return {
    node_id: dynamicNodeId(realmId, beatIndex),
    description: '',
    plot_guide: plotGuide,
    story_beat: beat.summary?.trim() || undefined,
    taboo,
    choices: [],
    ...directorGateHintToNodeGatePatch(gateHint),
  }
}

/** Prefix for dynamic beat navigation in Choice.next */
export const BEAT_NEXT_PREFIX = '__beat__'

export function beatNextToken(index: number): string {
  return `${BEAT_NEXT_PREFIX}${index}`
}

export function parseBeatNext(next: string): number | null {
  if (!next.startsWith(BEAT_NEXT_PREFIX)) return null
  const n = parseInt(next.slice(BEAT_NEXT_PREFIX.length), 10)
  return Number.isFinite(n) ? n : null
}

export function dynamicNodeId(realmId: string, beatIndex: number): string {
  return `dyn:${realmId}:${beatIndex}`
}

export function parseDynamicNodeId(nodeId: string): { realmId: string; beatIndex: number } | null {
  const m = /^dyn:([^:]+):(\d+)$/.exec(nodeId)
  if (!m) return null
  return { realmId: m[1], beatIndex: parseInt(m[2], 10) }
}
