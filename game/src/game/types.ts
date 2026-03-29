// Game types aligned with GDD and skeleton JSON

import type { HaiDimension, HaiId } from './haiCatalog'
import { HAI_DIMENSIONS, HAI_IDS, HAI_LABELS } from './haiCatalog'

export type { HaiDimension, HaiId }
export { HAI_DIMENSIONS, HAI_IDS, HAI_LABELS }

export type StatKey = 'ming_zhu' | 'gen_jiao' | 'jian_zhao'

export type ItemCategory = '厌胜' | '仪轨' | '随身器'

export interface Item {
  id: string
  name: string
  description?: string
  category: ItemCategory
  passiveEffect?: string
}

export type ClueCategory = '真名' | '因果残片' | '风评'

export interface Clue {
  id: string
  name: string
  description?: string
  category: ClueCategory
}

export type YishiTag = 'zhenshi' | 'yiwei' | 'hui' | 'none'

export interface YishiEntry {
  text: string
  tags: YishiTag[]
}

export interface StateDelta {
  ming_zhu?: number
  gen_jiao?: number
  jian_zhao?: number
  /** 害强度增减，0–100 */
  hai_delta?: Partial<Record<HaiId, number>>
}

export interface Choice {
  text: string
  next: string
  state?: StateDelta
  /** 害增减（可单独或与 state 共存） */
  hai_delta?: Partial<Record<HaiId, number>>
  conclusion_label?: string
  /** 结案时若高位格，扣鉴照（反噬） */
  jian_zhao_penalty?: number
  /** 获得物证 ID 列表 */
  gain_item?: string[]
  /** 获得线索 ID 列表 */
  gain_clue?: string[]
  /** 撰写异史时的场景提示语 */
  yishi_hint?: string
  /** 仅当持有该线索 ID 时显示此选项 */
  required_clue?: string
  /** 失去物证 ID */
  drop_item?: string[]
}

export interface NodeGate {
  item?: string
  clue?: string
  stat_min?: Partial<Record<StatKey, number>>
}

/** 可选：剧情人物（AI-E16） */
export interface RealmNpc {
  id: string
  name: string
  /** 一句话人设，供 prompt */
  personality?: string
  /** 关联线索 id（如风评） */
  related_clue_ids?: string[]
}

export interface Node {
  node_id: string
  plot_guide?: string[]
  truth_anchors?: string[]
  taboo?: string[]
  objective?: string
  /** One-sentence story beat for this node (from AI-2); used by AI-3 to generate description. */
  story_beat?: string
  description: string
  choices: Choice[]
  /** 进入节点所需条件，不满足则显示「无法进入」 */
  gate?: NodeGate
  /** 额外门禁：须持某物证（与 gate.item 二选一或叠加，二者都需满足） */
  required_item?: string
  /** 额外门禁：须掌握某线索 */
  unlock_clue?: string
  /** 本节点出现的 NPC（可选） */
  npcs?: RealmNpc[]
}

/** Optional Engine v2 Planner fields merged from skeleton into design-seed at runtime. */
export type PlannerAnchorPosition = 'early' | 'mid' | 'late' | 'climax'

export interface RealmPlannerSeed {
  theme?: string
  tension_curve?: string
  estimated_beats?: number
  forbidden?: string[]
  anchors?: Array<{
    id: string
    description: string
    position: PlannerAnchorPosition
    must_include: string[]
    unlocks?: string[]
  }>
}

/** D-1: 剧情点（多节点），可嵌在事件下 */
export interface PlotPoint {
  id: string
  name?: string
  nodes: Node[]
}

/** D-1: 事件（多剧情点）；与扁平 `nodes` 二选一或由加载器归一 */
export interface RealmEvent {
  id: string
  name?: string
  plot_points: PlotPoint[]
}

export interface Realm {
  id: string
  name: string
  entry_node: string
  /** 扁平节点列表（legacy 或 normalizeLoadedRealm 后必有） */
  nodes: Node[]
  /** D-1 层级：有则可在无 nodes 时由加载器展开 */
  events?: RealmEvent[]
  /** When present, merged into DesignSeed.realms for this id (single source with narrative nodes). */
  planner_seed?: RealmPlannerSeed
}

export interface Skeleton {
  realms: Realm[]
}

/** 若已有非空 nodes 则沿用；否则从 events 展开（深度优先：事件 → 剧情点 → 节点） */
export function flattenRealmNodes(realm: Realm): Node[] {
  if (realm.nodes?.length) return realm.nodes
  const out: Node[] = []
  for (const ev of realm.events ?? []) {
    for (const pp of ev.plot_points ?? []) {
      for (const n of pp.nodes ?? []) out.push(n)
    }
  }
  return out
}

export function normalizeLoadedRealm(realm: Realm): Realm {
  const nodes = flattenRealmNodes(realm)
  return { ...realm, nodes }
}

export const MING_ZHU: StatKey = 'ming_zhu'
export const GEN_JIAO: StatKey = 'gen_jiao'
export const JIAN_ZHAO: StatKey = 'jian_zhao'

export const DEFAULT_STATS: Record<StatKey, number> = {
  ming_zhu: 100,
  gen_jiao: 100,
  jian_zhao: 100,
}

/** Merge partial hais from save/API into full Record with zeros. */
export function normalizeHais(partial?: Partial<Record<HaiId, number>>): Record<HaiId, number> {
  const base = Object.fromEntries(HAI_IDS.map((k) => [k, 0])) as Record<HaiId, number>
  if (!partial) return base
  for (const k of HAI_IDS) {
    const v = partial[k]
    if (typeof v === 'number' && !Number.isNaN(v)) base[k] = v
  }
  return base
}
