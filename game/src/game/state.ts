import type { Skeleton, Node, Choice, StatKey, HaiId, Item, Clue, YishiEntry } from './types'
import { DEFAULT_STATS, MING_ZHU, GEN_JIAO, JIAN_ZHAO, HAI_IDS, normalizeHais } from './types'
import { itemFromId, clueFromId } from './catalog'
import { createYishiEntry } from './aiOutput'

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
  return normalizeHais()
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

/** 触犯禁忌：叠灵损、略抬避讳害、扣命烛（由 GameState 统一执行） */
export function applyTabooViolationToState(stats: Record<StatKey, number>, hais: Record<HaiId, number>): void {
  hais.ling_sun = Math.min(100, (hais.ling_sun ?? 0) + 50)
  hais.bi_hui = Math.min(100, (hais.bi_hui ?? 0) + 15)
  stats.ming_zhu = Math.max(0, stats.ming_zhu - 10)
}

/** 线索越多，点破消耗鉴照比例越低 */
export function dianPoConsumePercent(clueCount: number): number {
  if (clueCount >= 6) return 5
  if (clueCount >= 3) return 7
  if (clueCount >= 1) return 8
  return 10
}

export function filterChoicesByClue(choices: Choice[], clueIds: string[]): Choice[] {
  const set = new Set(clueIds)
  return choices.filter((c) => !c.required_clue || set.has(c.required_clue))
}

/** 玩家主动「中途定稿」时写入异史结论标签（与 AI 凝练 prompt 一致） */
export const MID_CONCLUDE_LABEL = '中途定稿'

export class GameState {
  skeleton: Skeleton
  stats: Record<StatKey, number>
  hais: Record<HaiId, number>
  items: Item[]
  clues: Clue[]
  currentNodeId: string | null
  realmId: string | null
  choiceHistory: Choice[]
  yishiEntries: YishiEntry[]
  /** 累计抉择步数（亡史系等） */
  stepsTaken: number

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
    this.stepsTaken = 0
  }

  get realmName(): string {
    if (!this.realmId) return ''
    const r = this.skeleton.realms.find((x) => x.id === this.realmId!)
    return r?.name ?? this.realmId
  }

  itemIds(): string[] {
    return this.items.map((i) => i.id)
  }

  clueIds(): string[] {
    return this.clues.map((c) => c.id)
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
    this.stepsTaken = 0
    return true
  }

  /** Switch realm mid-run: keep stats, hais, items, clues, scroll, history; spawn at entry node. */
  enterRealm(realmId: string): boolean {
    const realm = this.skeleton.realms.find((r) => r.id === realmId)
    if (!realm?.entry_node) return false
    this.realmId = realm.id
    this.currentNodeId = realm.entry_node
    return true
  }

  /** 中途定稿：离开当前节点，不改动三相/害/物证/线索；记入抉择史并增加步数，供异史凝练摘要使用 */
  beginMidConclude(): void {
    this.currentNodeId = null
    this.choiceHistory.push({
      text: '就此定稿，先行封笔。',
      next: '__结案__',
      state: {},
    })
    this.stepsTaken += 1
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
    const ids = this.itemIds()
    const cids = this.clueIds()
    if (gate?.item != null && !ids.includes(gate.item)) return false
    if (gate?.clue != null && !cids.includes(gate.clue)) return false
    if (node.required_item != null && !ids.includes(node.required_item)) return false
    if (node.unlock_clue != null && !cids.includes(node.unlock_clue)) return false
    const sm = gate?.stat_min
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
      if (id && !this.itemIds().includes(id)) this.items.push(itemFromId(id))
    }
    for (const id of choice.gain_clue ?? []) {
      if (id && !this.clueIds().includes(id)) this.clues.push(clueFromId(id))
    }
    for (const id of choice.drop_item ?? []) {
      if (id) this.items = this.items.filter((i) => i.id !== id)
    }
    clampStats(this.stats)
    clampHais(this.hais)
    this.choiceHistory.push(choice)
    this.stepsTaken += 1

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

  addYishiEntry(raw: string | YishiEntry): void {
    const entry = typeof raw === 'string' ? createYishiEntry(raw) : raw
    this.yishiEntries.push(entry)
  }

  /** Plain lines for AI summaries */
  getYishiTexts(): string[] {
    return this.yishiEntries.map((e) => e.text)
  }

  getChoiceSummaryForYishi(): string {
    return this.choiceHistory.map((c) => c.text).join('\n') || '（无）'
  }

  isGameOver(): boolean {
    return this.stats[MING_ZHU] <= 0 || this.stats[GEN_JIAO] <= 0 || this.stats[JIAN_ZHAO] <= 0
  }
}
