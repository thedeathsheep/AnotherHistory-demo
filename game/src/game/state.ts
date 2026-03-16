import type { Skeleton, Node, Choice, StatKey, HaiId } from './types'
import { DEFAULT_STATS, MING_ZHU, GEN_JIAO, JIAN_ZHAO, HAI_IDS } from './types'

function clampStats(stats: Record<StatKey, number>): void {
  ;([MING_ZHU, GEN_JIAO, JIAN_ZHAO] as const).forEach((k) => {
    stats[k] = Math.max(0, Math.min(100, stats[k]))
  })
}

function clampHais(hais: Record<HaiId, number>): void {
  HAI_IDS.forEach((k) => {
    hais[k] = Math.max(0, Math.min(100, hais[k]))
  })
}

function emptyHais(): Record<HaiId, number> {
  return Object.fromEntries(HAI_IDS.map((k) => [k, 0])) as Record<HaiId, number>
}

/** 选项是否触犯禁忌（简单关键词匹配） */
export function violatesTaboo(choiceText: string, taboo: string[]): boolean {
  if (!taboo?.length) return false
  for (const t of taboo) {
    const word = t.startsWith('不可') ? t.slice(2).trim() : t.trim()
    if (word && choiceText.includes(word)) return true
  }
  return false
}

export function statLabel(key: StatKey, value: number): string {
  if (key === MING_ZHU) return value > 80 ? '旺盛' : value > 30 ? '摇曳' : '熄灭'
  if (key === GEN_JIAO) return value > 60 ? '扎实' : value > 40 ? '虚浮' : '化外'
  if (key === JIAN_ZHAO) return value > 80 ? '清彻' : value > 40 ? '混浊' : '障目'
  return String(value)
}

export class GameState {
  skeleton: Skeleton
  stats: Record<StatKey, number>
  hais: Record<HaiId, number>
  items: string[]
  clues: string[]
  currentNodeId: string | null
  realmId: string | null
  choiceHistory: Choice[]
  yishiEntries: string[]

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton
    this.stats = { ...DEFAULT_STATS }
    this.hais = emptyHais()
    this.items = []
    this.clues = []
    this.currentNodeId = null
    this.realmId = null
    this.choiceHistory = []
    this.yishiEntries = []
  }

  get realmName(): string {
    if (!this.realmId) return ''
    const r = this.skeleton.realms.find((x) => x.id === this.realmId!)
    return r?.name ?? this.realmId
  }

  startRealm(realmId?: string): boolean {
    const realm = realmId
      ? this.skeleton.realms.find((r) => r.id === realmId)
      : this.skeleton.realms[0]
    if (!realm?.entry_node) return false
    this.realmId = realm.id
    this.currentNodeId = realm.entry_node
    this.stats = { ...DEFAULT_STATS }
    this.hais = emptyHais()
    this.items = []
    this.clues = []
    this.choiceHistory = []
    this.yishiEntries = []
    return true
  }

  getCurrentNode(): Node | null {
    if (!this.currentNodeId) return null
    for (const realm of this.skeleton.realms) {
      const node = realm.nodes.find((n) => n.node_id === this.currentNodeId!)
      if (node) return node
    }
    return null
  }

  /** 是否满足节点门禁条件 */
  canEnterNode(node: Node): boolean {
    const gate = node.gate
    if (!gate) return true
    if (gate.item != null && !this.items.includes(gate.item)) return false
    if (gate.clue != null && !this.clues.includes(gate.clue)) return false
    const sm = gate.stat_min
    if (sm) {
      for (const k of [MING_ZHU, GEN_JIAO, JIAN_ZHAO] as const) {
        const min = sm[k]
        if (min != null && this.stats[k] < min) return false
      }
    }
    return true
  }

  applyChoice(choice: Choice): { nextNodeId: string | null; conclusionLabel: string | null } {
    const delta = choice.state ?? {}
    ;(Object.keys(delta) as StatKey[]).forEach((k) => {
      if (k in this.stats) this.stats[k] += (delta as Record<StatKey, number>)[k] ?? 0
    })
    const haiDelta = choice.hai_delta ?? delta.hai_delta ?? {}
    HAI_IDS.forEach((k) => {
      this.hais[k] += haiDelta[k] ?? 0
    })
    for (const id of choice.gain_item ?? []) {
      if (id && !this.items.includes(id)) this.items.push(id)
    }
    for (const id of choice.gain_clue ?? []) {
      if (id && !this.clues.includes(id)) this.clues.push(id)
    }
    clampStats(this.stats)
    clampHais(this.hais)
    this.choiceHistory.push(choice)

    const nextId = choice.next
    const conclusion = choice.conclusion_label ?? null
    if (nextId === '__结案__' && conclusion) {
      const penalty = choice.jian_zhao_penalty ?? 0
      if (penalty > 0) this.stats.jian_zhao = Math.max(0, this.stats.jian_zhao - penalty)
      this.currentNodeId = null
      return { nextNodeId: null, conclusionLabel: conclusion }
    }
    if (nextId && nextId !== '__结案__') this.currentNodeId = nextId
    return { nextNodeId: this.currentNodeId, conclusionLabel: null }
  }

  consumeJianZhao(percent: number): boolean {
    const amount = Math.round((this.stats.jian_zhao * percent) / 100)
    if (amount <= 0 || this.stats.jian_zhao <= 0) return false
    this.stats.jian_zhao = Math.max(0, this.stats.jian_zhao - amount)
    return true
  }

  addYishiEntry(text: string): void {
    this.yishiEntries.push(text)
  }

  getChoiceSummaryForYishi(): string {
    return this.choiceHistory.map((c) => c.text).join('\n') || '（无）'
  }

  isGameOver(): boolean {
    return this.stats[MING_ZHU] <= 0 || this.stats[GEN_JIAO] <= 0 || this.stats[JIAN_ZHAO] <= 0
  }
}
