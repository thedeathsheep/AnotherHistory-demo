// Game types aligned with GDD and skeleton JSON

export type StatKey = 'ming_zhu' | 'gen_jiao' | 'jian_zhao'

export interface StateDelta {
  ming_zhu?: number
  gen_jiao?: number
  jian_zhao?: number
}

export interface Choice {
  text: string
  next: string
  state?: StateDelta
  conclusion_label?: string
}

export interface Node {
  node_id: string
  plot_guide?: string[]
  truth_anchors?: string[]
  taboo?: string[]
  objective?: string
  description: string
  choices: Choice[]
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
