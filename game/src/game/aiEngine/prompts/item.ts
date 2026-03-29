/**
 * AI-E16: item-focused narrative (厌胜 / 仪轨 / 随身器).
 */

import type { Clue, HaiId, Item } from '@/game/types'
import { HAI_LABELS } from '@/game/types'
import { normalizeHais } from '@/game/types'

export const ITEM_NARRATIVE_SYSTEM =
  '你是《行旅》物证叙事助手。只输出一段简短中文（2–4 句），写玩家注视或感应该物证时的具体物象与身体反应。叙事为游戏服务：具体动作与物象；禁止抽象比喻、禁止浅白套话、禁止罗列场景。'

export function buildItemNarrativeUserPrompt(item: Item, hais: Partial<Record<HaiId, number>> | undefined, clues: Clue[]): string {
  const h = normalizeHais(hais)
  const active = (Object.entries(h) as [HaiId, number][])
    .filter(([, v]) => v > 33)
    .map(([id]) => HAI_LABELS[id])
    .slice(0, 8)
  const clueNames = clues.map((c) => c.name).slice(0, 10)
  return [
    `【物证】${item.name}（类别：${item.category}）`,
    item.description ? `【档案】${item.description}` : '',
    item.passiveEffect ? `【被动】${item.passiveEffect}` : '',
    `【当前显著害】${active.length ? active.join('、') : '无'}`,
    `【已掌握线索】${clueNames.length ? clueNames.join('、') : '无'}`,
    '请写玩家注视或感应此物时的具体叙事。',
  ]
    .filter(Boolean)
    .join('\n')
}
