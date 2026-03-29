/**
 * Multi-ending evaluation (GDD §7). Priority: 亡史 > 秽史 > 败史(害) > 逸/化/存 > 鉴照档.
 */

import type { GameState } from './state'
import { statLabel } from './state'
import type { HaiId, YishiEntry } from './types'
import { HAI_IDS } from './types'
import { createYishiEntry } from './aiOutput'

export type EndingSeries =
  | '存史'
  | '化史'
  | '逆史'
  | '废史'
  | '逸史'
  | '败史'
  | '亡史'
  | '秽史'
  | '行旅'

export interface Ending {
  id: string
  series: EndingSeries
  title: string
  description: string
}

export const ENDINGS: Record<string, Ending> = {
  // 亡史
  U: {
    id: 'U',
    series: '亡史',
    title: '陈迹·遗忘',
    description:
      '行旅步数耗尽因果之绳。迷雾合拢，世人再无人识卷上字迹。你与书箱同成荒野陈迹，风过无痕。',
  },
  // 秽史
  V: {
    id: 'V',
    series: '秽史',
    title: '秽史·祸胎',
    description:
      '卷轴秽气过重。墨迹如活物在纸面蠕行，读过之人皆染异征。你非记录者，乃祸胎之母。',
  },
  W: {
    id: 'W',
    series: '秽史',
    title: '秽史·乱纲',
    description:
      '染墨已深，鉴照长浊。笔下伦理倒错，后世读之，礼崩乐坏。你望窗外倒行之人，笑而不自知。',
  },
  // 败史
  Q: {
    id: 'Q',
    series: '败史',
    title: '熄灭·余烬',
    description: '命烛已灭。黑暗吞没归途，未干之墨被雨洗作混沌。异史君倒于荒草，再无人点灯。',
  },
  R: {
    id: 'R',
    series: '败史',
    title: '化土·沉沦',
    description: '根脚断绝，双足化泥，脊生树根。你成大地一部分，行者踏过，不知脚下曾是记录者。',
  },
  S: {
    id: 'S',
    series: '败史',
    title: '瞽者·迷失',
    description: '鉴照归零，万象为乱码。你摸黑步入永恒回旋的逻辑阱，成荒野无名之鬼。',
  },
  T: {
    id: 'T',
    series: '败史',
    title: '同化·异类',
    description: '某一害满盈，你不再抵抗扭曲。羽鳞目生，笔落尘中——你终成所录之物。',
  },
  Y: {
    id: 'Y',
    series: '败史',
    title: '溺墨·窒息',
    description: '灵损与受潮同至极限。墨沿笔管入肺，最后一声求救亦是浓黑。身与字融为一滩污迹。',
  },
  // 存史
  A: {
    id: 'A',
    series: '存史',
    title: '正史·开平',
    description: '真史九成以上，鉴照清彻。卷入石匦，妖异归传说，人间得平庸之安。',
  },
  I: {
    id: 'I',
    series: '存史',
    title: '圣鉴',
    description: '卷中字字成真，后世奉为天理。世界因文字而凝固，再无变数，亦再无惊奇。',
  },
  C: {
    id: 'C',
    series: '存史',
    title: '外史·观礼',
    description:
      '你不再记录具体事件，而记录「观测」本身。世界像一场巨大的感应博弈，你抽身因果之外，成为悬浮其上的永恒观者。',
  },
  // 化史
  B: {
    id: 'B',
    series: '化史',
    title: '野史·异化',
    description: '疑伪过半，灵损深重。谬误在现实中抽枝，你最后一页写下的，是自己畸变的形貌。',
  },
  D: {
    id: 'D',
    series: '化史',
    title: '山川志·归藏',
    description: '根脚将尽而受潮或锈蚀刻骨。血肉化岚泥，异史刻入地脉，后世踏之如闻低语。',
  },
  // 逆史 / 废史 / 逸史（简版）
  E: {
    id: 'E',
    series: '逆史',
    title: '伪典·篡位',
    description: '灵沛之下伪录成真，高位格物证为凭。你弑真相而自立，每翻一页，记忆便薄一分。',
  },
  F: {
    id: 'F',
    series: '逆史',
    title: '因果劫·循环',
    description:
      '你发现自己每一步都在重复前一任异史君的轨迹。卷轴付之一炬，火光里你回到出发那日，因果咬住了自己的尾巴。',
  },
  G: {
    id: 'G',
    series: '废史',
    title: '绝史·无字碑',
    description: '鉴照曾明却择不录。真相吞入腹中，卷轴洁白，历史自此断裂为空白。',
  },
  H: {
    id: 'H',
    series: '废史',
    title: '债偿·虚空',
    description:
      '债偿透支过深，早期条目如被因果抹去。世人不再记得曾有带书箱的行者路过，连荒野之名亦随之稀薄。',
  },
  J: {
    id: 'J',
    series: '逸史',
    title: '小说·谈资',
    description:
      '卷轴流传后世，被视为奇巧小说。茶余饭后有人赞叹想象瑰丽，无人信其曾真实发生——异类反在书页阴影下苟活。',
  },
  K: {
    id: 'K',
    series: '逸史',
    title: '谶纬·预言',
    description:
      '卷中条目似在书写未来。后世术士钻研字里行间，欲窥下一场灾厄的方位；你成了命运的编剧。',
  },
  L: {
    id: 'L',
    series: '逸史',
    title: '经纬·方术',
    description:
      '卷轴不再仅供阅读，诵读片段即可引发小范围逻辑扭曲。历史化为咒文，你的笔墨成了后世方术之器。',
  },
  M: {
    id: 'M',
    series: '逸史',
    title: '童谣·遗忘',
    description:
      '宏大叙事塌缩为巷弄童谣。肝胆俱裂的真相，成了跳皮筋时的顺口溜。你隐入烟火，真理在嬉笑声中被消解。',
  },
  N: {
    id: 'N',
    series: '逸史',
    title: '残卷·拾遗',
    description:
      '你因畏惧或力竭而返，仅留残缺随笔。后世只能在字缝里窥见荒野一角，语焉不详，如拾遗断简。',
  },
  O: {
    id: 'O',
    series: '逸史',
    title: '绝笔·传灯',
    description:
      '宏业未竟，你仍拼死带回关键讯息。历史未因你锚定，却有人因这段文字得赎——传灯一线，未绝。',
  },
  X: {
    id: 'X',
    series: '逸史',
    title: '秽简·秘传',
    description:
      '你知此卷不可见光，深埋残简。秽气沿地脉感应，成局部逻辑黑洞；数百年后此地成禁区，你的名字成了禁中保命咒文。',
  },
  // 鉴照档（保留旧版语义）
  clear: {
    id: 'clear',
    series: '行旅',
    title: '鉴照清彻',
    description: '卷轴已收，异史分明。鉴照清彻，真伪可辨。行旅至此，心有所归。',
  },
  turbid: {
    id: 'turbid',
    series: '行旅',
    title: '鉴照混浊',
    description: '卷轴已收，异史难辨。鉴照混浊，真伪交织。行旅至此，犹在雾中。',
  },
  obscured: {
    id: 'obscured',
    series: '行旅',
    title: '鉴照障目',
    description: '卷轴已收，异史难明。鉴照障目，真伪莫辨。行旅至此，如坠迷障。',
  },
  hai_heavy: {
    id: 'hai_heavy',
    series: '行旅',
    title: '害重难返',
    description: '卷轴已收，异史蒙尘。害重难返，神魂俱损。行旅至此，已非昔我。',
  },
  default: {
    id: 'default',
    series: '行旅',
    title: '行旅终章',
    description: '卷轴已收，异史入册。行旅至此，暂告一段。',
  },
}

function totalHaiLevel(hais: Record<HaiId, number>): number {
  return HAI_IDS.reduce((acc, k) => acc + (hais[k] ?? 0), 0)
}

export function parseYishiTagStats(entries: YishiEntry[]): {
  zhenshi: number
  yiwei: number
  hui: number
  total: number
} {
  let zhenshi = 0
  let yiwei = 0
  let hui = 0
  for (const e of entries) {
    const t = e.text
    if (t.includes('[真史]')) zhenshi++
    if (t.includes('[疑伪]')) yiwei++
    if (t.includes('[秽]')) hui++
  }
  return { zhenshi, yiwei, hui, total: entries.length }
}

/** Legacy: plain strings without structured tags */
export function parseYishiTags(entries: string[]): {
  zhenshi: number
  yiwei: number
  hui: number
  total: number
} {
  return parseYishiTagStats(entries.map((text) => createYishiEntry(text)))
}

export function evaluateEnding(game: GameState): string {
  const { stats, hais, yishiEntries, stepsTaken, choiceHistory, clues, items } = game
  const jianZhaoLabel = statLabel('jian_zhao', stats.jian_zhao)
  const { zhenshi, yiwei, hui, total } = parseYishiTagStats(yishiEntries)
  const haiTotal = totalHaiLevel(hais)

  const anyHaiMax = HAI_IDS.some((k) => (hais[k] ?? 0) >= 100)
  if (anyHaiMax) return 'T'

  if ((hais.ling_sun ?? 0) >= 80 && (hais.shou_chao ?? 0) >= 80) return 'Y'

  const huiRatio = total > 0 ? hui / total : 0
  // GDD V: 秽标高 + 邪异物证（以「曾持物证」代理）
  if (huiRatio >= 0.4 && items.length > 0) return 'V'

  if ((hais.ran_mo ?? 0) > 60 && jianZhaoLabel === '混浊') return 'W'

  if (stats.ming_zhu <= 0) return 'Q'
  // GDD D: 根脚尽 + 高受潮或鳞化（先于普通根脚败）
  if (
    stats.gen_jiao <= 0 &&
    ((hais.shou_chao ?? 0) > 65 || (hais.lin_hua ?? 0) > 65)
  ) {
    return 'D'
  }
  if (stats.gen_jiao <= 0) return 'R'
  if (stats.jian_zhao <= 0) return 'S'

  const zhenRatio = total > 0 ? zhenshi / total : 0
  const yiweiRatio = total > 0 ? yiwei / total : 0

  if (zhenRatio >= 0.9 && jianZhaoLabel === '清彻' && total >= 1) return 'A'
  if (zhenRatio >= 1 && total >= 3 && (hais.wei_tuo ?? 0) < 30) return 'I'
  // GDD C: 逻辑孤岛 + 惊蛰长（代理：步数、惊蛰强度）
  if (zhenRatio >= 0.82 && stepsTaken > 180 && (hais.jing_zhe ?? 0) > 48) return 'C'

  if (yiweiRatio >= 0.5 && (hais.ling_sun ?? 0) > 55) return 'B'

  const turnedBack = choiceHistory.some((c) => /回头|回望来路|向后/.test(c.text))
  const fateClue = clues.some((c) => /宿|因|命/.test(`${c.name}${c.description ?? ''}`))
  if (turnedBack && fateClue) return 'F'

  if ((hais.ling_pei ?? 0) > 70 && total >= 2 && items.some((i) => i.category === '仪轨')) return 'E'

  if ((hais.zhai_chang ?? 0) > 75 && total < 4 && total >= 1) return 'H'

  if (stats.jian_zhao > 85 && yishiEntries.length > 0 && zhenRatio < 0.2) return 'G'

  if ((hais.ling_sun ?? 0) > 74 && total >= 2) return 'J'

  if ((hais.dao_shi ?? 0) > 44 && total >= 2) return 'K'

  const ritualN = items.filter((i) => i.category === '仪轨').length
  if (ritualN >= 2 && (jianZhaoLabel === '清彻' || jianZhaoLabel === '障目')) return 'L'

  const hasZhenming = clues.some((c) => c.category === '真名')
  if (!hasZhenming && total >= 1 && total <= 4 && yiweiRatio < 0.4) return 'M'

  const midConclude = yishiEntries.some((e) => e.text.includes('中途定稿'))
  if (midConclude && total <= 3 && total >= 1) {
    const trustItem = items.some((i) => /托付|所托|遗/.test(`${i.name}${i.description ?? ''}`))
    if (trustItem) return 'O'
    if (hui >= 1) return 'X'
    return 'N'
  }

  const haiHeavy = HAI_IDS.some((k) => (hais[k] ?? 0) > 60) || haiTotal > 100
  if (haiHeavy) return 'hai_heavy'

  if (huiRatio >= 0.3) return 'obscured'

  if (jianZhaoLabel === '障目') return 'obscured'
  if (jianZhaoLabel === '混浊') return 'turbid'
  if (jianZhaoLabel === '清彻') return 'clear'

  // 亡史 U：步数过高且未落入上列收束（阈值自 250 降至 80，便于可触发）
  if (stepsTaken > 80) return 'U'

  return 'default'
}

export function getEnding(id: string): Ending {
  return ENDINGS[id] ?? ENDINGS.default
}
