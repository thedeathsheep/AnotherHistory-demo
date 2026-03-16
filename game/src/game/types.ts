// Game types aligned with GDD and skeleton JSON

export type StatKey = 'ming_zhu' | 'gen_jiao' | 'jian_zhao'

/** 害 ID：首批 5 种 */
export type HaiId = 'ling_sun' | 'shou_chao' | 'bi_hui' | 'jing_zhe' | 'ling_pei'

export const HAI_IDS: HaiId[] = ['ling_sun', 'shou_chao', 'bi_hui', 'jing_zhe', 'ling_pei']

export const HAI_LABELS: Record<HaiId, string> = {
  ling_sun: '灵损',
  shou_chao: '受潮',
  bi_hui: '避讳',
  jing_zhe: '惊蛰',
  ling_pei: '灵沛',
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
}

export interface NodeGate {
  item?: string
  clue?: string
  stat_min?: Partial<Record<StatKey, number>>
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
}

export interface Realm {
  id: string
  name: string
  entry_node: string
  nodes: Node[]
}

export interface Skeleton {
  realms: Realm[]
}

export const MING_ZHU: StatKey = 'ming_zhu'
export const GEN_JIAO: StatKey = 'gen_jiao'
export const JIAN_ZHAO: StatKey = 'jian_zhao'

export const DEFAULT_STATS: Record<StatKey, number> = {
  ming_zhu: 100,
  gen_jiao: 100,
  jian_zhao: 100,
}
