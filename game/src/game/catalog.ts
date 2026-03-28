/**
 * Default display metadata for item/clue IDs from skeleton (策划可扩展).
 * Keys must match `public/data/prologue.json` 中 gain_item / gain_clue 的 ID 字符串。
 */
import type { Clue, ClueCategory, Item, ItemCategory } from './types'

export const ITEM_REGISTRY: Record<string, { name: string; category: ItemCategory; description?: string }> = {
  旧书箱: {
    name: '旧书箱',
    category: '随身器',
    description: '边角磨白，铜扣发暗。装笔墨与空白纸页。',
  },
  残破信札: {
    name: '残破信札',
    category: '仪轨',
    description: '纸边焦黄，字迹断续，似自急递途中散落。',
  },
  铜印: {
    name: '铜印',
    category: '厌胜',
    description: '官驿铜印，压纸留痕，可证文书来历。',
  },
  未送文书: {
    name: '未送文书',
    category: '仪轨',
    description: '火漆未干，角上批注已被人读过。',
  },
  信使档案: {
    name: '信使档案',
    category: '仪轨',
    description: '驿站册页，记人名、脚程与交接时辰。',
  },
  老人布袋: {
    name: '老人布袋',
    category: '随身器',
    description: '粗布束口，内物轻响，不知装的是粮还是符。',
  },
}

export const CLUE_REGISTRY: Record<string, { name: string; category: ClueCategory; description?: string }> = {
  信使身份: {
    name: '信使身份',
    category: '真名',
    description: '你与此身所任之职有关，却一时对不上名号。',
  },
  急递铺信使: {
    name: '急递铺信使',
    category: '风评',
    description: '沿途铺丁口风：有人见信使夜行，未至下一铺。',
  },
  失踪真相: {
    name: '失踪真相',
    category: '因果残片',
    description: '档案与批注拼出一条线：人不是走失，是被拦下。',
  },
  自我觉醒: {
    name: '自我觉醒',
    category: '因果残片',
    description: '你意识到自己并非偶然路过此地。',
  },
  谋害嫌疑: {
    name: '谋害嫌疑',
    category: '因果残片',
    description: '文书与证词指向同一批人，动机未明。',
  },
}

export function itemFromId(id: string): Item {
  const r = ITEM_REGISTRY[id]
  return {
    id,
    name: r?.name ?? id,
    category: r?.category ?? '随身器',
    description: r?.description,
  }
}

export function clueFromId(id: string): Clue {
  const r = CLUE_REGISTRY[id]
  return {
    id,
    name: r?.name ?? id,
    category: r?.category ?? '风评',
    description: r?.description,
  }
}
