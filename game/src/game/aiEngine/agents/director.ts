/**
 * Director agent: current beat + graph → NodeDirective (JSON).
 */

import type { DirectorGateHint, NodeDirective, StoryOutline } from '@/game/storyRuntime'
import { chat } from '../chat'

const DIRECTOR_SYSTEM = `你是《行旅》的导演 AI。只输出一个 JSON 对象，不要 markdown，不要解释。
Schema:
{"scene_setting":"string","mood":"string","plot_advancement":"string","choices_hint":{"count":3,"directions":["string"]},"foreshadowing":"string可选","callback":"string可选","hai_effects_note":"string可选","gate_hint":{"item":"string可选","clue":"string可选","ming_zhu_min":0可选,"gen_jiao_min":0可选,"jian_zhao_min":0可选}}
choices_hint.count 在 2–4；directions 与 count 一致；中文短词组。
gate_hint：仅当本拍需要门禁时填写；item/clue 须为游戏目录中已有物证/线索 ID（字符串），否则留空；stat 阈值为 0–100 整数。`

function buildDirectorUser(
  realmName: string,
  outline: StoryOutline,
  beatIndex: number,
  eventSummary: string,
  entitySummary: string,
  playerLine: string,
  pendingForeshadowBlock: string
): string {
  const b = outline.beats[beatIndex]
  const nextBeat = outline.beats[beatIndex + 1]
  return `【境遇】${realmName}
【大纲摘要】${outline.beats.map((x, i) => `${i}:${x.summary}`).join(' | ')}
【当前拍】#${beatIndex} ${b?.beat_id ?? ''}：${b?.summary ?? ''}
【下一拍】${nextBeat ? `${beatIndex + 1}:${nextBeat.summary}` : '（无，可导向收束）'}
【待回收伏笔】
${pendingForeshadowBlock}
【已发生】${eventSummary}
【实体】${entitySummary}
【玩家状态】${playerLine}
请生成导演指令 JSON。`
}

function parseGateHint(raw: unknown): DirectorGateHint | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const item = typeof o.item === 'string' ? o.item.trim() : undefined
  const clue = typeof o.clue === 'string' ? o.clue.trim() : undefined
  const ming = typeof o.ming_zhu_min === 'number' ? o.ming_zhu_min : undefined
  const gen = typeof o.gen_jiao_min === 'number' ? o.gen_jiao_min : undefined
  const jz = typeof o.jian_zhao_min === 'number' ? o.jian_zhao_min : undefined
  if (!item && !clue && ming == null && gen == null && jz == null) return undefined
  return {
    item: item || undefined,
    clue: clue || undefined,
    ming_zhu_min: ming,
    gen_jiao_min: gen,
    jian_zhao_min: jz,
  }
}

function parseDirective(json: string): NodeDirective | null {
  try {
    const o = JSON.parse(json) as NodeDirective
    if (!o || typeof o.scene_setting !== 'string' || typeof o.mood !== 'string' || typeof o.plot_advancement !== 'string')
      return null
    const ch = o.choices_hint
    if (!ch || typeof ch.count !== 'number' || !Array.isArray(ch.directions)) return null
    const count = Math.max(2, Math.min(4, Math.round(ch.count)))
    const directions = ch.directions.filter((x) => typeof x === 'string').map((x) => x.trim()).slice(0, count)
    while (directions.length < count) directions.push('前行')
    const gate_hint = parseGateHint((o as { gate_hint?: unknown }).gate_hint)
    return {
      scene_setting: o.scene_setting,
      mood: o.mood,
      plot_advancement: o.plot_advancement,
      choices_hint: { count, directions },
      foreshadowing: typeof o.foreshadowing === 'string' ? o.foreshadowing : undefined,
      callback: typeof o.callback === 'string' ? o.callback : undefined,
      hai_effects_note: typeof o.hai_effects_note === 'string' ? o.hai_effects_note : undefined,
      gate_hint,
    }
  } catch {
    return null
  }
}

export async function runDirector(
  apiKey: string,
  realmName: string,
  outline: StoryOutline,
  beatIndex: number,
  eventSummary: string,
  entitySummary: string,
  playerLine: string,
  pendingForeshadowBlock: string
): Promise<NodeDirective | null> {
  if (beatIndex < 0 || beatIndex >= outline.beats.length) return null
  const user = buildDirectorUser(realmName, outline, beatIndex, eventSummary, entitySummary, playerLine, pendingForeshadowBlock)
  const raw = await chat(apiKey, [
    { role: 'system', content: DIRECTOR_SYSTEM },
    { role: 'user', content: user },
  ], {
    maxTokens: 700,
    label: 'runDirector',
    agentRole: 'director',
  })
  if (!raw?.trim()) return null
  let text = raw.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(text)
  if (fence) text = fence[1].trim()
  return parseDirective(text)
}
