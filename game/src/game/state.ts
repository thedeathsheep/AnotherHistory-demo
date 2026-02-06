import type { Skeleton, Node, Choice, StatKey } from './types'
import { DEFAULT_STATS, MING_ZHU, GEN_JIAO, JIAN_ZHAO } from './types'

function clampStats(stats: Record<StatKey, number>): void {
  ;([MING_ZHU, GEN_JIAO, JIAN_ZHAO] as const).forEach((k) => {
    stats[k] = Math.max(0, Math.min(100, stats[k]))
  })
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
  currentNodeId: string | null
  realmId: string | null
  choiceHistory: Choice[]
  yishiEntries: string[]

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton
    this.stats = { ...DEFAULT_STATS }
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

  applyChoice(choice: Choice): { nextNodeId: string | null; conclusionLabel: string | null } {
    const delta = choice.state ?? {}
    ;(Object.keys(delta) as StatKey[]).forEach((k) => {
      if (k in this.stats) this.stats[k] += (delta as Record<StatKey, number>)[k] ?? 0
    })
    clampStats(this.stats)
    this.choiceHistory.push(choice)

    const nextId = choice.next
    const conclusion = choice.conclusion_label ?? null
    if (nextId === '__结案__' && conclusion) {
      this.currentNodeId = null
      return { nextNodeId: null, conclusionLabel: conclusion }
    }
    if (nextId && nextId !== '__结案__') this.currentNodeId = nextId
    return { nextNodeId: this.currentNodeId, conclusionLabel: null }
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
