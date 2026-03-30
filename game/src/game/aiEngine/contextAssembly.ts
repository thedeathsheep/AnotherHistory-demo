/**
 * Layered context assembly (L0–L5) for AI Engine v2 prompts.
 */

import type { DesignSeed, RealmSeed } from '@/game/designSeed'
import type { NodeDirective, StoryOutline } from '@/game/storyRuntime'
/** Minimal surface for prompt summaries (WorldStateGraphManager or test double). */
export interface WorldGraphPromptSource {
  summaryForPrompt(lingSunLevel?: number, maxChars?: number): string
  entitySummary(maxChars?: number): string
}

export interface LayeredContextInput {
  designSeed: DesignSeed | null
  outline: StoryOutline | null
  /** Current beat index for L1 focus */
  beatIndex: number | null
  worldGraph: WorldGraphPromptSource | null
  lingSunLevel?: number
  /** L4: compact player line (stats, items — caller builds) */
  playerStateLine?: string
  directive: NodeDirective | null
  /** Current realm seed: resolve beat anchor_ref → must_include for L1 focus */
  realmSeed?: RealmSeed | null
}

export interface LayeredContext {
  l0_world: string
  l1_outline: string
  l2_events: string
  l3_entities: string
  l4_player: string
  l5_directive: string
}

function seedWorldLine(seed: DesignSeed | null): string {
  if (!seed?.world) return '（无种子）'
  const w = seed.world
  const tones = (w.tone ?? []).join('、')
  const rulesArr = seed.narrative_rules ?? []
  const rulesBlock =
    rulesArr.length > 0 ? `\n【行文铁律】（须与叙事引擎尾规则一致；禁止空转与堆砌）${rulesArr.join(' ')}` : ''
  return `【世界】${w.name}；${w.era}；基调：${tones}；主题：${w.core_theme}。${rulesBlock}`.trim()
}

function outlineLine(outline: StoryOutline | null, beatIndex: number | null, realmSeed: RealmSeed | null | undefined): string {
  if (!outline?.beats?.length) return '（无大纲）'
  const parts = outline.beats.map((b, i) => `${i}:${b.type} ${b.summary}`)
  let focus = ''
  if (beatIndex != null && outline.beats[beatIndex]) {
    const b = outline.beats[beatIndex]
    const anchor = b.anchor_ref ? realmSeed?.anchors?.find((a) => a.id === b.anchor_ref) : undefined
    const must =
      anchor?.must_include?.length ? `；锚点须含：${anchor.must_include.join('、')}` : ''
    focus = `【当前拍】#${beatIndex} ${b.beat_id}：${b.summary}（张力≈${b.tension}）${must}`
  }
  return `【故事大纲】${parts.join(' | ')}\n${focus}`.trim()
}

function directiveLine(d: NodeDirective | null): string {
  if (!d) return '（无导演指令）'
  const dirs = d.choices_hint?.directions?.length ? d.choices_hint.directions.join('、') : ''
  return [
    `【场景】${d.scene_setting}`,
    `【氛围】${d.mood}`,
    `【推进】${d.plot_advancement}`,
    dirs ? `【念头方向】${dirs}` : '',
    d.foreshadowing ? `【伏笔】${d.foreshadowing}` : '',
    d.callback ? `【回收】${d.callback}` : '',
    d.hai_effects_note ? `【害/质感提示】${d.hai_effects_note}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildLayeredContext(input: LayeredContextInput): LayeredContext {
  const ling = input.lingSunLevel ?? 0
  const l2 = input.worldGraph?.summaryForPrompt(ling) ?? '（无）'
  const l3 = input.worldGraph?.entitySummary() ?? '（无）'
  return {
    l0_world: seedWorldLine(input.designSeed),
    l1_outline: outlineLine(input.outline, input.beatIndex, input.realmSeed ?? null),
    l2_events: `【已发生】${l2}`,
    l3_entities: `【实体】${l3}`,
    l4_player: input.playerStateLine?.trim() || '（无）',
    l5_directive: directiveLine(input.directive),
  }
}

export function layeredContextBlock(ctx: LayeredContext): string {
  return [ctx.l0_world, ctx.l1_outline, ctx.l2_events, ctx.l3_entities, ctx.l4_player, ctx.l5_directive].join('\n\n')
}
