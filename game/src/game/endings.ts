/**
 * Multi-ending evaluation engine.
 * 根据卷轴真史比例、害、三相档位等输出结局 ID.
 */

import type { GameState } from './state'
import { statLabel } from './state'
import type { HaiId } from './types'
import { HAI_IDS } from './types'

export interface Ending {
  id: string
  title: string
  description: string
}

export const ENDINGS: Record<string, Ending> = {
  clear: {
    id: 'clear',
    title: '鉴照清彻',
    description: '卷轴已收，异史分明。鉴照清彻，真伪可辨。行旅至此，心有所归。',
  },
  turbid: {
    id: 'turbid',
    title: '鉴照混浊',
    description: '卷轴已收，异史难辨。鉴照混浊，真伪交织。行旅至此，犹在雾中。',
  },
  obscured: {
    id: 'obscured',
    title: '鉴照障目',
    description: '卷轴已收，异史难明。鉴照障目，真伪莫辨。行旅至此，如坠迷障。',
  },
  hai_heavy: {
    id: 'hai_heavy',
    title: '害重难返',
    description: '卷轴已收，异史蒙尘。害重难返，神魂俱损。行旅至此，已非昔我。',
  },
  default: {
    id: 'default',
    title: '行旅终章',
    description: '卷轴已收，异史入册。行旅至此，暂告一段。',
  },
}

/** Sum of active hai levels (for "害重" detection). */
function totalHaiLevel(hais: Record<HaiId, number>): number {
  return HAI_IDS.reduce((acc, k) => acc + (hais[k] ?? 0), 0)
}

/** Parse yishi entries for [真史] [疑伪] [秽] tags; return counts. */
export function parseYishiTags(
  entries: string[]
): { zhenshi: number; yiwei: number; hui: number; total: number } {
  let zhenshi = 0
  let yiwei = 0
  let hui = 0
  for (const e of entries) {
    if (e.includes('[真史]')) zhenshi++
    if (e.includes('[疑伪]')) yiwei++
    if (e.includes('[秽]')) hui++
  }
  return { zhenshi, yiwei, hui, total: entries.length }
}

/**
 * Evaluate ending ID from game state.
 * Called when 结案 (no node, yishi written, no pending).
 * Uses 卷轴真史比例 as modifier when tags present.
 */
export function evaluateEnding(game: GameState): string {
  const { stats, hais, yishiEntries } = game
  const jianZhaoLabel = statLabel('jian_zhao', stats.jian_zhao)
  const haiTotal = totalHaiLevel(hais)
  const { hui, total } = parseYishiTags(yishiEntries)

  // 害重：任一害 > 60 或总害 > 100
  const haiHeavy = HAI_IDS.some((k) => (hais[k] ?? 0) > 60) || haiTotal > 100
  if (haiHeavy) return 'hai_heavy'

  // 秽史比例高 → 倾向 obscured
  const huiRatio = total > 0 ? hui / total : 0
  if (huiRatio >= 0.3) return 'obscured'

  // 鉴照档位主导
  if (jianZhaoLabel === '障目') return 'obscured'
  if (jianZhaoLabel === '混浊') return 'turbid'
  if (jianZhaoLabel === '清彻') return 'clear'

  return 'default'
}

export function getEnding(id: string): Ending {
  return ENDINGS[id] ?? ENDINGS.default
}
