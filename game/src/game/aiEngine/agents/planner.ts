/**
 * Planner agent: DesignSeed + realm → StoryOutline (JSON).
 */

import type { DesignSeed, RealmSeed } from '@/game/designSeed'
import { realmSeedById } from '@/game/designSeed'
import type { StoryBeat, StoryOutline } from '@/game/storyRuntime'
import { chat } from '../chat'

const PLANNER_SYSTEM = `你是《行旅》的故事结构策划。只输出一个 JSON 对象，不要 markdown 代码块，不要解释。
Schema:
{"realm_id":"string","beats":[{"beat_id":"string","type":"setup|rising|twist|climax|resolution","summary":"string","anchor_ref":"string可选","tension":0.0}],"divergence_note":"string可选"}
要求：beats 至少 6 条、至多 18 条；summary 用中文短句；tension 在 0–1；覆盖种子中的 anchors（anchor_ref 填锚点 id）。`

function buildPlannerUserPrompt(realm: RealmSeed, seed: DesignSeed, playthroughHint?: string): string {
  const anchors = JSON.stringify(realm.anchors ?? [])
  const world = JSON.stringify(seed.world)
  const hint = playthroughHint?.trim() ? `【上周目摘要】${playthroughHint}\n请与上周目在情节走向上有所区分（divergence_note 简短说明）。\n` : ''
  return `${hint}【世界】${world}
【界】id=${realm.id} name=${realm.name}
【主题】${realm.theme}
【张力曲线】${realm.tension_curve ?? '（自定）'}
【建议拍数】${realm.estimated_beats ?? 10}
【禁忌】${JSON.stringify(realm.forbidden ?? [])}
【锚点】${anchors}
请生成完整 JSON。`
}

/** Exported for unit tests / fixtures. */
export function parseOutline(json: string, realmId: string): StoryOutline | null {
  try {
    const o = JSON.parse(json) as StoryOutline
    if (!o || o.realm_id !== realmId || !Array.isArray(o.beats) || o.beats.length < 3) return null
    const beats: StoryBeat[] = []
    for (const b of o.beats) {
      if (!b || typeof b.beat_id !== 'string' || typeof b.summary !== 'string') continue
      const type = (['setup', 'rising', 'twist', 'climax', 'resolution'] as const).includes(b.type as StoryBeat['type'])
        ? (b.type as StoryBeat['type'])
        : 'rising'
      const tension = typeof b.tension === 'number' && !Number.isNaN(b.tension) ? Math.max(0, Math.min(1, b.tension)) : 0.5
      beats.push({
        beat_id: b.beat_id,
        type,
        summary: b.summary,
        anchor_ref: typeof b.anchor_ref === 'string' ? b.anchor_ref : undefined,
        tension,
      })
    }
    if (beats.length < 3) return null
    return {
      realm_id: realmId,
      beats,
      divergence_note: typeof o.divergence_note === 'string' ? o.divergence_note : undefined,
    }
  } catch {
    return null
  }
}

export async function runPlanner(
  apiKey: string,
  seed: DesignSeed | null,
  realmId: string,
  playthroughHint?: string
): Promise<StoryOutline | null> {
  if (!seed) return null
  const realm = realmSeedById(seed, realmId)
  if (!realm) return null
  const user = buildPlannerUserPrompt(realm, seed, playthroughHint)
  const raw = await chat(apiKey, [
    { role: 'system', content: PLANNER_SYSTEM },
    { role: 'user', content: user },
  ], {
    maxTokens: 1800,
    label: 'runPlanner',
    agentRole: 'planner',
    throwOnFailure: true,
  })
  if (!raw?.trim()) return null
  let text = raw.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(text)
  if (fence) text = fence[1].trim()
  return parseOutline(text, realmId)
}
