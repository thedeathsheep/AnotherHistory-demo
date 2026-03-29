/**
 * GDD §4.1 — 44 害：编号与维度与代码 id 对齐。
 */

export type HaiDimension = '神' | '身' | '业' | '数'

export type HaiId =
  | 'ling_sun'
  | 'ran_mo'
  | 'zhong_ying'
  | 'shi_yu'
  | 'ling_pei'
  | 'shou_chao'
  | 'xiu_shi'
  | 'jie_gu'
  | 'jiao_ke'
  | 'feng_mo'
  | 'bi_hui'
  | 'de_shi'
  | 'ru_ding'
  | 'bei_yin'
  | 'lv_ling'
  | 'zhai_chang'
  | 'jie_huo'
  | 'fan_shi'
  | 'wei_tuo'
  | 'jing_zhe'
  | 'mi_xiang'
  | 'kong_xiang'
  | 'zhi_ju'
  | 'ying_ji'
  | 'xue_zao'
  | 'duan_xiang'
  | 'lie_ming'
  | 'chen_sha'
  | 'kou_zhai'
  | 'mu_zhang'
  | 'gan_ying'
  | 'du_mo'
  | 'yi_xing'
  | 'duan_nian'
  | 'tuo_gu'
  | 'lin_hua'
  | 'fen_xin'
  | 'xuan_si'
  | 'gong_sheng'
  | 'chang_ming'
  | 'dao_shi'
  | 'zhong_ya'
  | 'wu_guang'
  | 'tan_ta'

export const HAI_IDS: HaiId[] = [
  'ling_sun',
  'ran_mo',
  'zhong_ying',
  'shi_yu',
  'ling_pei',
  'shou_chao',
  'xiu_shi',
  'jie_gu',
  'jiao_ke',
  'feng_mo',
  'bi_hui',
  'de_shi',
  'ru_ding',
  'bei_yin',
  'lv_ling',
  'zhai_chang',
  'jie_huo',
  'fan_shi',
  'wei_tuo',
  'jing_zhe',
  'mi_xiang',
  'kong_xiang',
  'zhi_ju',
  'ying_ji',
  'xue_zao',
  'duan_xiang',
  'lie_ming',
  'chen_sha',
  'kou_zhai',
  'mu_zhang',
  'gan_ying',
  'du_mo',
  'yi_xing',
  'duan_nian',
  'tuo_gu',
  'lin_hua',
  'fen_xin',
  'xuan_si',
  'gong_sheng',
  'chang_ming',
  'dao_shi',
  'zhong_ya',
  'wu_guang',
  'tan_ta',
]

export const HAI_LABELS: Record<HaiId, string> = {
  ling_sun: '灵损',
  ran_mo: '染墨',
  zhong_ying: '重影',
  shi_yu: '失语',
  ling_pei: '灵沛',
  shou_chao: '受潮',
  xiu_shi: '锈蚀',
  jie_gu: '借骨',
  jiao_ke: '焦渴',
  feng_mo: '逢魔',
  bi_hui: '避讳',
  de_shi: '得时',
  ru_ding: '入定',
  bei_yin: '背阴',
  lv_ling: '律令',
  zhai_chang: '债偿',
  jie_huo: '借火',
  fan_shi: '反噬',
  wei_tuo: '伪托',
  jing_zhe: '惊蛰',
  mi_xiang: '迷向',
  kong_xiang: '空响',
  zhi_ju: '纸疽',
  ying_ji: '影寄',
  xue_zao: '血噪',
  duan_xiang: '断香',
  lie_ming: '裂名',
  chen_sha: '沉砂',
  kou_zhai: '口债',
  mu_zhang: '目障',
  gan_ying: '感应',
  du_mo: '蠹墨',
  yi_xing: '易形',
  duan_nian: '断念',
  tuo_gu: '脱骨',
  lin_hua: '鳞化',
  fen_xin: '焚心',
  xuan_si: '悬丝',
  gong_sheng: '共生',
  chang_ming: '偿命',
  dao_shi: '倒时',
  zhong_ya: '重压',
  wu_guang: '无光',
  tan_ta: '坍塌',
}

/** UI: when hai > 50, show label + short player-facing blurb (MVP visibility). */
export const HAI_PLAYER_HINTS: Record<HaiId, string> = {
  ling_sun: '记忆有缺',
  ran_mo: '自我疏离',
  zhong_ying: '所见互斥',
  shi_yu: '语意含糊',
  ling_pei: '冷硬难入',
  shou_chao: '阴湿缠身',
  xiu_shi: '锈涩碍体',
  jie_gu: '骨节异物',
  jiao_ke: '喉干难润',
  feng_mo: '明暗刺目',
  bi_hui: '讳名压顶',
  de_shi: '气机偏顺',
  ru_ding: '迟滞黏稠',
  bei_yin: '明暗失衡',
  lv_ling: '措辞受束',
  zhai_chang: '旧事易忘',
  jie_huo: '借视窥禁',
  fan_shi: '因果回咬',
  wei_tuo: '布景违和',
  jing_zhe: '神经紧绷',
  mi_xiang: '方位含混',
  kong_xiang: '回声扰神',
  zhi_ju: '纸物易碎',
  ying_ji: '影先于人',
  xue_zao: '耳鸣盖字',
  duan_xiang: '护佑稀薄',
  lie_ming: '称谓崩缺',
  chen_sha: '举步沉重',
  kou_zhai: '开口有债',
  mu_zhang: '细节常缺',
  gan_ying: '念头被牵',
  du_mo: '名物变形',
  yi_xing: '身感非人',
  duan_nian: '行止脱节',
  tuo_gu: '难负重物',
  lin_hua: '皮生冷鳞',
  fen_xin: '心跳赶字',
  xuan_si: '似被代行',
  gong_sheng: '他痛渗入',
  chang_ming: '真史换寿',
  dao_shi: '语序逆流',
  zhong_ya: '字句压缩',
  wu_guang: '目不能视',
  tan_ta: '时限压顶',
}

export const HAI_DIMENSIONS: Record<HaiId, HaiDimension> = {
  ling_sun: '神',
  ran_mo: '神',
  zhong_ying: '神',
  shi_yu: '神',
  ling_pei: '神',
  zhai_chang: '神',
  wei_tuo: '神',
  kong_xiang: '神',
  lie_ming: '神',
  du_mo: '神',
  yi_xing: '神',
  duan_nian: '神',
  shou_chao: '身',
  xiu_shi: '身',
  jie_gu: '身',
  jiao_ke: '身',
  zhi_ju: '身',
  xue_zao: '身',
  mu_zhang: '身',
  tuo_gu: '身',
  lin_hua: '身',
  fen_xin: '身',
  bi_hui: '业',
  lv_ling: '业',
  jie_huo: '业',
  fan_shi: '业',
  ying_ji: '业',
  duan_xiang: '业',
  kou_zhai: '业',
  gan_ying: '业',
  xuan_si: '业',
  gong_sheng: '业',
  chang_ming: '业',
  feng_mo: '数',
  de_shi: '数',
  ru_ding: '数',
  bei_yin: '数',
  jing_zhe: '数',
  mi_xiang: '数',
  chen_sha: '数',
  dao_shi: '数',
  zhong_ya: '数',
  wu_guang: '数',
  tan_ta: '数',
}
