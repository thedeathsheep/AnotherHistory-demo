// Game types aligned with GDD and skeleton JSON

export type StatKey = 'ming_zhu' | 'gen_jiao' | 'jian_zhao'

/** 害：首批 5 种 + GDD 四维度扩展（神/身/业/数） */
export type HaiId =
  | 'ling_sun'
  | 'shou_chao'
  | 'bi_hui'
  | 'jing_zhe'
  | 'ling_pei'
  | 'ran_mo'
  | 'zhong_ying'
  | 'shi_yu'
  | 'zhai_chang'
  | 'wei_tuo'
  | 'kong_xiang'
  | 'lie_ming'
  | 'du_mo'
  | 'yi_xing'
  | 'duan_nian'
  | 'xiu_shi'
  | 'jie_gu'
  | 'fan_shi'

export type HaiDimension = '神' | '身' | '业' | '数'

export const HAI_IDS: HaiId[] = [
  'ling_sun',
  'shou_chao',
  'bi_hui',
  'jing_zhe',
  'ling_pei',
  'ran_mo',
  'zhong_ying',
  'shi_yu',
  'zhai_chang',
  'wei_tuo',
  'kong_xiang',
  'lie_ming',
  'du_mo',
  'yi_xing',
  'duan_nian',
  'xiu_shi',
  'jie_gu',
  'fan_shi',
]

export const HAI_LABELS: Record<HaiId, string> = {
  ling_sun: '灵损',
  shou_chao: '受潮',
  bi_hui: '避讳',
  jing_zhe: '惊蛰',
  ling_pei: '灵沛',
  ran_mo: '染墨',
  zhong_ying: '重影',
  shi_yu: '失语',
  zhai_chang: '债偿',
  wei_tuo: '伪托',
  kong_xiang: '空响',
  lie_ming: '裂名',
  du_mo: '蠹墨',
  yi_xing: '易形',
  duan_nian: '断念',
  xiu_shi: '锈蚀',
  jie_gu: '借骨',
  fan_shi: '反噬',
}

export const HAI_DIMENSIONS: Record<HaiId, HaiDimension> = {
  ling_sun: '神',
  ran_mo: '神',
  zhong_ying: '神',
  shi_yu: '神',
  ling_pei: '神',
  zhai_chang: '神',
  wei_tuo: '神',
  kong_xiang: '神',
  lie_ming: '神',
  du_mo: '神',
  yi_xing: '神',
  duan_nian: '神',
  shou_chao: '身',
  xiu_shi: '身',
  jie_gu: '身',
  bi_hui: '业',
  fan_shi: '业',
  jing_zhe: '数',
}

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
