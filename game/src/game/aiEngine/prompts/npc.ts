/**
 * AI-E16: NPC dialogue / attitude (GDD 剧情人物).
 */

import type { Clue, HaiId, RealmNpc } from '@/game/types'
import { HAI_LABELS } from '@/game/types'
import { normalizeHais } from '@/game/types'

export const NPC_DIALOGUE_SYSTEM =
  '你是《行旅》剧情人物台词生成器。只输出该 NPC 的一段对话或态度描写（2–4 句中文），须符合乡野风评与真名禁忌约束。具体物象与动作；禁止抽象比喻、禁止浅白套话。不要输出选项或旁白解释玩法。'

export function buildNpcDialogueUserPrompt(
  npc: RealmNpc,
  sceneHint: string,
  hais: Partial<Record<HaiId, number>> | undefined,
  clues: Clue[]
): string {
  const h = normalizeHais(hais)
  const active = (Object.entries(h) as [HaiId, number][])
    .filter(([, v]) => v > 20)
    .map(([id]) => HAI_LABELS[id])
    .slice(0, 8)
  const fengping = clues.filter((c) => c.category === '风评').map((c) => `${c.name}:${c.description ?? ''}`)
  const zhenming = clues.filter((c) => c.category === '真名').map((c) => c.name)
  return [
    `【人物】${npc.name}（id=${npc.id}）`,
    npc.personality ? `【人设】${npc.personality}` : '',
    npc.related_clue_ids?.length ? `【关联线索 id】${npc.related_clue_ids.join('、')}` : '',
    `【场景提示】${sceneHint || '（当前节点）'}`,
    `【风评线索】${fengping.length ? fengping.join('；') : '无'}`,
    `【真名线索（勿直呼触犯）】${zhenming.length ? zhenming.join('、') : '无'}`,
    `【当前害】${active.length ? active.join('、') : '无'}`,
    '请生成该 NPC 对此处境的对话或态度表述。',
  ]
    .filter(Boolean)
    .join('\n')
}
