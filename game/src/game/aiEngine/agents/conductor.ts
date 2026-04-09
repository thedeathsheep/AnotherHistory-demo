/**
 * Conductor agent: emits a strict JSON GenerationPlan for a node.
 * Goal: separate control (plan) from prose (writer) and enforce choice distinctness.
 */
import type { Node, Item, Clue } from '@/game/types'
import { chat } from '../chat'

export type ChoiceIntent =
  | 'advance'
  | 'inspect'
  | 'seekInfo'
  | 'commitRisk'
  | 'retreat'
  | 'interact'
  | 'wait'

export interface MicroBranchStep {
  /** Runtime node id (must be unique). */
  node_id: string
  /** Short plot guide for this step (keywords, not prose). */
  plot_guide: string[]
  /** Optional objective for this step. */
  objective?: string
}

export interface MicroBranchPlan {
  enabled: boolean
  /** Back-compat: single runtime node chain, length >= 1 when enabled. */
  steps: MicroBranchStep[]
  /** Preferred: multiple entry roots, each with its own chain. */
  roots?: Array<{
    /** One visible entry choice text (5–18 chars). */
    entry_text: string
    /** Optional small state delta hint (applied on pick). */
    entry_state?: { ming_zhu?: number; gen_jiao?: number; jian_zhao?: number }
    steps: MicroBranchStep[]
  }>
  /** Where the branch must rejoin (skeleton node id). */
  rejoin_node_id: string
  /** Maximum allowed runtime depth (safety rail). */
  max_depth: number
}

export interface GenerationPlan {
  version: 1
  /** Target number of visible choices at this node (3–5 recommended). */
  target_choice_count: number
  /** Required mutually-exclusive intents (subset of ChoiceIntent). */
  intents_required: ChoiceIntent[]
  /** Prefer different next destinations when possible. */
  prefer_divergent_next: boolean
  /** Whether same-next choices are allowed (must be strongly differentiated). */
  allow_same_next: boolean
  /** If true, the engine may create rt: runtime nodes to increase freedom. */
  micro_branch: MicroBranchPlan
  /** Optional director focus to stabilize directions. */
  director_focus?: {
    scene_setting?: string
    mood?: string
    plot_advancement?: string
    /** Concrete action/object directions; must be mutually distinct. */
    directions?: string[]
  }
}

const CONDUCTOR_SYSTEM = `你是《行旅》的叙事管理 Conductor。你只输出严格 JSON（不要 markdown 代码块，不要解释）。\n\n你的任务：为“当前节点”生成一个 GenerationPlan（结构化计划），用于后续 Director/Writer/ChoiceEngine 执行。\n\nSchema (version=1):\n{\n  \"version\": 1,\n  \"target_choice_count\": 3,\n  \"intents_required\": [\"advance\",\"inspect\",\"seekInfo\",\"commitRisk\",\"retreat\",\"interact\",\"wait\"],\n  \"prefer_divergent_next\": true,\n  \"allow_same_next\": true,\n  \"micro_branch\": {\n    \"enabled\": true,\n    \"rejoin_node_id\": \"骨架节点ID\",\n    \"max_depth\": 4,\n    \"roots\": [\n      {\n        \"entry_text\": \"5-18字入口选项\",\n        \"entry_state\": {\"jian_zhao\": -2},\n        \"steps\": [{\"node_id\":\"rt:...\",\"plot_guide\":[\"关键词\"],\"objective\":\"可选\"}]\n      }\n    ],\n    \"steps\": [{\"node_id\":\"rt:...\",\"plot_guide\":[\"关键词\"],\"objective\":\"可选\"}]\n  },\n  \"director_focus\": {\"scene_setting\":\"可选\",\"mood\":\"可选\",\"plot_advancement\":\"可选\",\"directions\":[\"具体动作/物象\"]}\n}\n\n强约束：\n- target_choice_count 取 3–5。\n- intents_required 至少 3 个，且互斥。\n- directions（若给）必须是本拍具体动作或物象，禁止泛化词（前行/探索/观察/继续/查看四周/调查）。\n- micro_branch.enabled 为 true 时：\n  - 优先输出 roots（2–4 个入口），每个 roots[i].steps.length >= 1\n  - 每个 step.node_id 必须以 \"rt:\" 开头\n  - max_depth 在 1–6\n  - rejoin_node_id 必须是骨架可达节点（由输入提供）\n- 只输出 JSON。`

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, Math.round(n)))
}

function uniqueStrings(xs: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of xs) {
    const t = x.trim()
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export function parseGenerationPlan(raw: string): GenerationPlan | null {
  const t = raw.trim()
  if (!t) return null
  let text = t
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(text)
  if (fence) text = fence[1].trim()
  try {
    const o = JSON.parse(text) as Partial<GenerationPlan>
    if (!o || o.version !== 1) return null
    const target_choice_count = clampInt(o.target_choice_count ?? 3, 2, 6)
    const intents_required = Array.isArray(o.intents_required)
      ? (o.intents_required.filter((x) => typeof x === 'string') as string[])
          .map((x) => x.trim())
          .filter(Boolean)
      : []
    const intents = uniqueStrings(intents_required).filter((x) =>
      ['advance', 'inspect', 'seekInfo', 'commitRisk', 'retreat', 'interact', 'wait'].includes(x)
    ) as ChoiceIntent[]
    const prefer_divergent_next = o.prefer_divergent_next !== false
    const allow_same_next = o.allow_same_next !== false
    const mb = (o.micro_branch ?? {}) as Partial<MicroBranchPlan>
    const enabled = Boolean(mb.enabled)
    const stepsIn = Array.isArray(mb.steps) ? (mb.steps as unknown[]) : []
    const steps: MicroBranchStep[] = []
    for (const x of stepsIn) {
      if (!x || typeof x !== 'object') continue
      const r = x as Record<string, unknown>
      const node_id = typeof r.node_id === 'string' ? r.node_id.trim() : ''
      if (!node_id.startsWith('rt:')) continue
      const pg = Array.isArray(r.plot_guide)
        ? (r.plot_guide.filter((k) => typeof k === 'string') as string[]).map((k) => k.trim()).filter(Boolean)
        : []
      if (!pg.length) continue
      const objective = typeof r.objective === 'string' ? r.objective.trim() : undefined
      steps.push({ node_id, plot_guide: uniqueStrings(pg).slice(0, 10), objective: objective || undefined })
    }
    const max_depth = clampInt(mb.max_depth ?? (steps.length || 1), 1, 6)
    const rejoin_node_id = typeof mb.rejoin_node_id === 'string' ? mb.rejoin_node_id.trim() : ''

    const rootsIn = Array.isArray(mb.roots) ? (mb.roots as unknown[]) : []
    const roots: NonNullable<MicroBranchPlan['roots']> = []
    for (const x of rootsIn) {
      if (!x || typeof x !== 'object') continue
      const r = x as Record<string, unknown>
      const entry_text = typeof r.entry_text === 'string' ? r.entry_text.trim() : ''
      if (!entry_text) continue
      const entry_state_raw =
        r.entry_state && typeof r.entry_state === 'object' ? (r.entry_state as Record<string, unknown>) : null
      const entry_state = entry_state_raw
        ? {
            ming_zhu: typeof entry_state_raw.ming_zhu === 'number' ? Math.round(entry_state_raw.ming_zhu) : undefined,
            gen_jiao: typeof entry_state_raw.gen_jiao === 'number' ? Math.round(entry_state_raw.gen_jiao) : undefined,
            jian_zhao: typeof entry_state_raw.jian_zhao === 'number' ? Math.round(entry_state_raw.jian_zhao) : undefined,
          }
        : undefined
      const rs = Array.isArray(r.steps) ? (r.steps as unknown[]) : []
      const rsteps: MicroBranchStep[] = []
      for (const y of rs) {
        if (!y || typeof y !== 'object') continue
        const rr = y as Record<string, unknown>
        const node_id = typeof rr.node_id === 'string' ? rr.node_id.trim() : ''
        if (!node_id.startsWith('rt:')) continue
        const pg = Array.isArray(rr.plot_guide)
          ? (rr.plot_guide.filter((k) => typeof k === 'string') as string[]).map((k) => k.trim()).filter(Boolean)
          : []
        if (!pg.length) continue
        const objective = typeof rr.objective === 'string' ? rr.objective.trim() : undefined
        rsteps.push({ node_id, plot_guide: uniqueStrings(pg).slice(0, 10), objective: objective || undefined })
      }
      if (!rsteps.length) continue
      roots.push({ entry_text, entry_state, steps: rsteps.slice(0, max_depth) })
    }

    const df = (o.director_focus ?? {}) as Record<string, unknown>
    const director_focus =
      df && typeof df === 'object'
        ? {
            scene_setting: typeof df.scene_setting === 'string' ? df.scene_setting.trim() : undefined,
            mood: typeof df.mood === 'string' ? df.mood.trim() : undefined,
            plot_advancement: typeof df.plot_advancement === 'string' ? df.plot_advancement.trim() : undefined,
            directions: Array.isArray(df.directions)
              ? uniqueStrings((df.directions.filter((d) => typeof d === 'string') as string[]).slice(0, 6))
              : undefined,
          }
        : undefined

    const micro_branch: MicroBranchPlan = {
      enabled: enabled && (roots.length > 0 || steps.length > 0) && Boolean(rejoin_node_id),
      steps: enabled ? steps.slice(0, max_depth) : [],
      roots: roots.length ? roots : undefined,
      rejoin_node_id,
      max_depth,
    }
    return {
      version: 1,
      target_choice_count: clampInt(target_choice_count, 3, 5),
      intents_required: intents.length >= 3 ? intents : (['advance', 'inspect', 'commitRisk'] as ChoiceIntent[]),
      prefer_divergent_next,
      allow_same_next,
      micro_branch,
      director_focus,
    }
  } catch {
    return null
  }
}

export async function runConductor(params: {
  apiKey: string
  node: Node
  realmName: string
  /** Skeleton allowed next ids for this node (deduped). */
  allowedNexts: string[]
  items: Item[]
  clues: Clue[]
  /** Current narrative text (if already generated) */
  sceneNarrative?: string
}): Promise<GenerationPlan | null> {
  const { apiKey, node, realmName, allowedNexts, items, clues, sceneNarrative } = params
  const plotGuide = node.plot_guide ?? node.truth_anchors ?? []
  const taboo = node.taboo ?? []
  const objective = node.objective ?? ''
  const allowed = allowedNexts.filter(Boolean)
  const user = [
    `【境遇】${realmName}`,
    plotGuide.length ? `【核心剧情导向】${JSON.stringify(plotGuide)}` : '',
    taboo.length ? `【禁忌】${JSON.stringify(taboo)}` : '',
    objective ? `【目标】${objective}` : '',
    sceneNarrative?.trim() ? `【当前境遇正文】\n${sceneNarrative.trim()}` : '',
    `【骨架节点ID】${node.node_id}`,
    `【可用 next】${allowed.join(', ') || '（无）'}`,
    `【骨架选项】${node.choices?.map((c) => `${c.next}: ${c.text}`).join(' | ') || '（无）'}`,
    items.length ? `【物证】${items.map((i) => `${i.name}(${i.category})`).join('、')}` : '',
    clues.length ? `【线索】${clues.map((c) => `${c.name}(${c.category})`).join('、')}` : '',
    `请输出 GenerationPlan JSON。若可用 next 去重后少于 3，请倾向启用 micro_branch 并给出 rt: steps 与回流节点（通常回到可用 next 中最“推进主线”的那个）。`,
  ]
    .filter(Boolean)
    .join('\n')

  const raw = await chat(
    apiKey,
    [
      { role: 'system', content: CONDUCTOR_SYSTEM },
      { role: 'user', content: user },
    ],
    { maxTokens: 700, label: 'runConductor', agentRole: 'director' }
  )
  if (!raw?.trim()) return null
  return parseGenerationPlan(raw)
}

