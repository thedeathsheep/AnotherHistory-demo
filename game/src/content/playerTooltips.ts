/**
 * Player-facing hover copy only (no design/dev meta).
 */

import type { HaiId } from '@/game/types'
import { HAI_LABELS } from '@/game/types'
import { HAI_PLAYER_HINTS } from '@/game/haiCatalog'

export const TT_STAT_MING_ZHU =
  '命烛如身存之焰。愈明愈能久行于途；黯弱则所见皆疑，末路或在不觉之间。'

export const TT_STAT_GEN_JIAO =
  '根脚是足下所立的实感。稳固则步履有据；涣散则像踏空一步，易被境遇挤出。'

export const TT_STAT_JIAN_ZHAO =
  '鉴照是辨真审伪的眼力。清澈则感应可分；昏浊则花影乱目；障目则光昏难凭。'

export function ttDianPo(pct: number): string {
  return `以鉴照挑落一重感应，余路稍清。此番大约耗去眼前鉴照的 ${pct}%；线头积得愈厚，略省眼力。`
}

export const TT_DING_GAO =
  '不候感应齐至，便从此刻封笔。行旅收作卷中一段异史，前路或因之改易；已得之物与所知之迹仍随身。'

export const TT_ITEMS = '随身器物；或可作凭，或与某些感应相涉。'

export const TT_CLUES = '道听途记、残缺名号与风评；有时能别开一路。'

export function ttHaiChip(id: HaiId): string {
  const name = HAI_LABELS[id]
  const hint = HAI_PLAYER_HINTS[id]
  return `「${name}」缠身：${hint}。行旅既久，体感或更深。`
}

export const TT_HAI_SEVERE_ROW =
  '邪气交错叠压，见闻或断续、或自相抵牾，所记所感须慎辨。'

export const TT_SCROLL_INCOME =
  '将眼前凝就的一段异史，捺入《异史》卷轴，以备后翻。'

export function ttNextRealm(name: string): string {
  return `此处事已毕，可举步前往「${name}」。身中所携仍旧，只在另一段路途上续行。`
}

export const TT_CHANGE_API = '自择向外通问笔墨的门路与笔名；熟手方开此项。'

export const TT_SAVE_MANUAL = '把此刻行旅深痕写入当前档格，以备歇后续接。'

export const TT_ENTER_REALM = '从该界入口节点接续行旅；身中三相、害与卷轴不丢。'

export const TT_SELECT_SLOT = '把读写对准这一格；新痕将覆写其上。'

export const TT_LOAD_SLOT = '唤回此一档里封存的行旅断面。'

export const TT_CLEAR_SLOT = '抹除这一格上的旧痕，令其空空如也。'

export const TT_NEW_GAME_ALL = '尽数抹去各档旧痕，自开一局新行旅；此手不可逆。'
