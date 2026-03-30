/**
 * Main narrative prompt builder.
 * Aligns with GDD 5.5 / AI流水线与存储规范 / TODO AI-E12, AI-E13, M1-5/M1-6/M1-13.
 * Supports plot_guide, taboo, objective, 三相档位影响, 害感官滤镜（分档）.
 */

import type { HaiId } from '@/game/types'
import { HAI_IDS, HAI_LABELS } from '@/game/types'
import type { AIContext } from '../dataAcquisition'

function haiTier(v: number): 'none' | 'light' | 'mid' | 'heavy' {
  if (v <= 0) return 'none'
  if (v <= 33) return 'light'
  if (v <= 66) return 'mid'
  return 'heavy'
}

function pushHai(hints: string[], id: HaiId, level: number, light: string, mid: string, heavy: string): void {
  const t = haiTier(level)
  if (t === 'none') return
  const prefix = `【${HAI_LABELS[id]}】`
  if (t === 'light') hints.push(`${prefix}${light}`)
  else if (t === 'mid') hints.push(`${prefix}${mid}`)
  else hints.push(`${prefix}${heavy}`)
}

function buildHaiEffects(hais: Record<HaiId, number>): string[] {
  const hints: string[] = []
  pushHai(
    hints,
    'ling_sun',
    hais.ling_sun ?? 0,
    '偶用「疑似」「隐约」前缀。',
    '多处混入「疑似」「或是幻觉」，语序略跳。',
    '强烈混乱：短句断裂、自我怀疑、虚实难辨。'
  )
  pushHai(
    hints,
    'shou_chao',
    hais.shou_chao ?? 0,
    '略写阴冷、湿意。',
    '粘稠、阴冷、腐朽修辞加重。',
    '阴冷浸透动作与物象，呼吸沉重。'
  )
  pushHai(
    hints,
    'ling_pei',
    hais.ling_pei ?? 0,
    '语气略冷峻。',
    '描述偏准，少修辞堆砌。',
    '极冷峻准确，可点破一处表象矛盾。'
  )
  pushHai(
    hints,
    'ran_mo',
    hais.ran_mo ?? 0,
    '偶现第三人称自称口吻。',
    '叙述者像在旁观自己。',
    '强烈异化：记录者与「他」混称。'
  )
  pushHai(
    hints,
    'zhong_ying',
    hais.zhong_ying ?? 0,
    '一句内可含轻微矛盾印象。',
    '同一场景两种互斥细节并置。',
    '双轨画面：必须二选一的叙事裂隙感（不必明说）。'
  )
  pushHai(
    hints,
    'shi_yu',
    hais.shi_yu ?? 0,
    '个别词可略含糊。',
    '关键词汇故意省略或用代称。',
    '大量语义空缺，靠物象填补。'
  )
  pushHai(
    hints,
    'jing_zhe',
    hais.jing_zhe ?? 0,
    '节奏略急促。',
    '声响刺耳、动作带颤。',
    '神经紧绷：短句、突发响动。'
  )
  pushHai(
    hints,
    'bi_hui',
    hais.bi_hui ?? 0,
    '暗示规则压顶。',
    '禁忌氛围浓重，不可直呼其名之物徘徊。',
    '规则感极强：一步踏错即万劫。'
  )
  pushHai(
    hints,
    'fan_shi',
    hais.fan_shi ?? 0,
    '似有窥视。',
    '背景里重复出现同一窥视意象。',
    '被注视感无处不在。'
  )
  pushHai(
    hints,
    'kong_xiang',
    hais.kong_xiang ?? 0,
    '偶复读上一句碎片。',
    '回声式短语穿插。',
    '大量无意义重复短语污染句读。'
  )
  pushHai(
    hints,
    'du_mo',
    hais.du_mo ?? 0,
    '个别功能词用形状代称。',
    '门、路等多用几何描述。',
    '功能性名词大量替换为形状/触感描述。'
  )
  pushHai(
    hints,
    'yi_xing',
    hais.yi_xing ?? 0,
    '身体感略非人。',
    '视角偶呈器物或兽类。',
    '强烈非人视角描写。'
  )
  pushHai(
    hints,
    'duan_nian',
    hais.duan_nian ?? 0,
    '选项与场景略脱节感（仅氛围，不列选项）。',
    '叙事与处境张力错位。',
    '逻辑断裂：画面与行动难以接续。'
  )
  pushHai(
    hints,
    'xiu_shi',
    hais.xiu_shi ?? 0,
    '铁锈、干涩触感。',
    '关节涩响、铁味。',
    '锈蚀感浸透皮肤与器物。'
  )
  pushHai(
    hints,
    'jie_gu',
    hais.jie_gu ?? 0,
    '骨架异物感。',
    '体内多一副「撑」着的结构。',
    '骨骼错位、穿行死角的身体感。'
  )
  pushHai(
    hints,
    'zhai_chang',
    hais.zhai_chang ?? 0,
    '记忆略薄。',
    '早先细节易被新刺激覆盖（语气）。',
    '强烈失忆感：前文物象随机脱落。'
  )
  pushHai(
    hints,
    'wei_tuo',
    hais.wei_tuo ?? 0,
    '场景略像布景。',
    '人与物偶现「贴上去」的违和。',
    '一切像临时拼贴，随时可撤。'
  )
  pushHai(
    hints,
    'lie_ming',
    hais.lie_ming ?? 0,
    '称呼偶缺字。',
    '名字被拆、谐音替换。',
    '称谓系统持续崩坏。'
  )
  pushHai(
    hints,
    'jiao_ke',
    hais.jiao_ke ?? 0,
    '喉头略干，想找「饮」。',
    '渴求位格之饮，物象边缘发糊。',
    '焦渴入骨：非水可解，唯寻带位格之物。'
  )
  pushHai(
    hints,
    'feng_mo',
    hais.feng_mo ?? 0,
    '光影对比略刺目。',
    '黄昏感加重，诸害氛围一并放大。',
    '逢魔时刻：明暗撕扯，不安加倍。'
  )
  pushHai(
    hints,
    'de_shi',
    hais.de_shi ?? 0,
    '偶有一瞬「对劲」。',
    '气机顺遂，细节更易辨。',
    '得时：鉴照式清明，最优路径若隐若现。'
  )
  pushHai(
    hints,
    'ru_ding',
    hais.ru_ding ?? 0,
    '时间感略迟滞。',
    '动作与回响拉长，尘埃可闻。',
    '入定陷阱：反馈极慢，逻辑黏稠。'
  )
  pushHai(
    hints,
    'bei_yin',
    hais.bei_yin ?? 0,
    '亮处略眩，暗处更深。',
    '光源不可直视，轮廓靠猜。',
    '背阴：视觉剥夺，唯触与声。'
  )
  pushHai(
    hints,
    'lv_ling',
    hais.lv_ling ?? 0,
    '言下有禁，措辞略束。',
    '特定字眼不可出口之感。',
    '律令锁言：犯则惊蛰骤起。'
  )
  pushHai(
    hints,
    'jie_huo',
    hais.jie_huo ?? 0,
    '暗处多一眼「借来的」视线。',
    '死者视野碎片渗入。',
    '借火：见禁忌真相，命烛暗耗。'
  )
  pushHai(
    hints,
    'mi_xiang',
    hais.mi_xiang ?? 0,
    '方位词略含混。',
    '来路与去向互相打架。',
    '迷向：回头路隐伏，逢魔权重升。'
  )
  pushHai(
    hints,
    'zhi_ju',
    hais.zhi_ju ?? 0,
    '纸角微霉，皮发紧。',
    '消耗物易脆、易灰。',
    '纸疽：用物可能失效并落可疑屑。'
  )
  pushHai(
    hints,
    'ying_ji',
    hais.ying_ji ?? 0,
    '影比人先动半步。',
    '镜面式重复动作。',
    '影寄：影语选项诱人，反噬暗涨。'
  )
  pushHai(
    hints,
    'xue_zao',
    hais.xue_zao ?? 0,
    '耳底血流声。',
    '关键词易被噪声盖住。',
    '血噪：音景压过要害字。'
  )
  pushHai(
    hints,
    'duan_xiang',
    hais.duan_xiang ?? 0,
    '人味变薄。',
    '增益易折半，信任线难开。',
    '断香：护佑消散，NPC 信任极难。'
  )
  pushHai(
    hints,
    'chen_sha',
    hais.chen_sha ?? 0,
    '举步略沉。',
    '大动作多耗根脚，反馈变慢。',
    '沉砂：迟滞与额外根脚损耗。'
  )
  pushHai(
    hints,
    'kou_zhai',
    hais.kou_zhai ?? 0,
    '开口有代价之感。',
    '言语类选项隐含命烛/灵损。',
    '口债：字债字还，或可换禁忌。'
  )
  pushHai(
    hints,
    'mu_zhang',
    hais.mu_zhang ?? 0,
    '亮更刺，黑更吞。',
    '关键细节常被省略。',
    '目障：靠触嗅推断环境。'
  )
  pushHai(
    hints,
    'gan_ying',
    hais.gan_ying ?? 0,
    '念头牵引感。',
    '选项似被外力收窄。',
    '感应：直觉强拽，抉择框内博弈感。'
  )
  pushHai(
    hints,
    'tuo_gu',
    hais.tuo_gu ?? 0,
    '骨软一步。',
    '重物难负，根脚似锁。',
    '脱骨：不可负重，根脚低位格，可钻隙。'
  )
  pushHai(
    hints,
    'lin_hua',
    hais.lin_hua ?? 0,
    '皮生冷鳞感。',
    '对湿与痛钝，对暖与人性线索钝。',
    '鳞化：身异化，温暖与人性线索难入。'
  )
  pushHai(
    hints,
    'fen_xin',
    hais.fen_xin ?? 0,
    '心跳赶字。',
    '句短势急。',
    '焚心：极度急促，限时抉择压力（氛围）。'
  )
  pushHai(
    hints,
    'xuan_si',
    hais.xuan_si ?? 0,
    '肩背有线牵制。',
    '行动似被代行（氛围）。',
    '悬丝：因果线操弄，失控感。'
  )
  pushHai(
    hints,
    'gong_sheng',
    hais.gong_sheng ?? 0,
    '他者之痛渗入句中。',
    '异类渴望与己重叠。',
    '共生：异类存亡与己相连。'
  )
  pushHai(
    hints,
    'chang_ming',
    hais.chang_ming ?? 0,
    '真史换寿之感。',
    '每得高价值真史，命烛上限似薄一层。',
    '偿命：记录以寿为墨。'
  )
  pushHai(
    hints,
    'dao_shi',
    hais.dao_shi ?? 0,
    '语序偶逆，果在因先。',
    '须逆向推断起因（氛围）。',
    '倒时：叙事逆流，逻辑倒读。'
  )
  pushHai(
    hints,
    'zhong_ya',
    hais.zhong_ya ?? 0,
    '字少句硬。',
    '描述极短、极涩。',
    '重压：位格压迫，文本压缩。'
  )
  pushHai(
    hints,
    'wu_guang',
    hais.wu_guang ?? 0,
    '无光之黑（概念）。',
    '停一切视觉修辞，余温与颤。',
    '无光：唯内颤与外震。'
  )
  pushHai(
    hints,
    'tan_ta',
    hais.tan_ta ?? 0,
    '纸页焦边之感。',
    '历史自焚，须速决（氛围）。',
    '坍塌：时限压迫，不结案则坠入虚空。'
  )
  const covered = new Set(
    hints
      .map((h) => {
        const m = /^【([^】]+)】/.exec(h)
        return m ? m[1] : ''
      })
      .filter(Boolean)
  )
  for (const id of HAI_IDS) {
    if ((hais[id] ?? 0) > 0 && !covered.has(HAI_LABELS[id])) {
      hints.push(`【${HAI_LABELS[id]}】随强度渗入叙事质感（神秘、不安）。`)
      covered.add(HAI_LABELS[id])
    }
  }
  // R4: make 灵损 readable in play — force one omission when high
  if ((hais.ling_sun ?? 0) > 40) {
    hints.push(
      '【灵损·可读】正文须故意省略一处本该交代的关键细节，或用「……」替代一处要害信息，让读者感到记忆有缺；其余句子仍须具体。'
    )
  }
  return hints
}

function buildStateEffects(statLabels: AIContext['statLabels']): string[] {
  const hints: string[] = []
  if (statLabels.ming_zhu === '摇曳') {
    hints.push('【命烛摇曳】描述中适当混入「疑似」「隐约」「或是幻觉」等前缀，体现认知不稳。')
  } else if (statLabels.ming_zhu === '熄灭') {
    hints.push('【命烛熄灭】描述可更破碎、模糊，体现存在濒危。')
  }
  if (statLabels.gen_jiao === '虚浮') {
    hints.push('【根脚虚浮】可略暗示重心不稳、环境异化感。')
  }
  if (statLabels.jian_zhao === '混浊') {
    hints.push(
      '【鉴照混浊】扩充描述、混入干扰性细节或语义噪音；可加入无意义的远方怪响、错误视觉线索，掩盖关键信息。'
    )
  } else if (statLabels.jian_zhao === '障目') {
    hints.push('【鉴照障目】描述可更混乱、难以辨明。')
  }
  return hints
}

/** Dynamic + skeleton tail rules; also prepended in dynamic user prompt so long context does not bury them. */
export const NARRATIVE_TAIL_RULES = `核心：叙事为游戏服务，**极简但要有画面**：**写满 3–5 句**（可短句），点明处境与氛围；**所有描述必须具体**——只写具体动作、物象、身体反应；每段须有可感知的情节点或与前后衔接。

**禁止清单（只守三条原则）**：
1. 不用抽象主语：禁止以思绪、心、意识、灵魂等作主语空转；须落到人或身体在做什么、眼前何物。
2. 不用浅白副词与空泛感受词堆砌（如渐渐、仿佛、某种、一股说不清）；用可观察的细节代替。
3. 不用比喻排比堆砌与场景清单式罗列；不列举选项、不解释玩法。

另禁：固定套词硬凑（如无故重复「古道/书箱」）。只输出这段叙事正文，不要标题或选项。

【鉴照高亮】**每一段正文必须恰好包含 1–2 处** \`*关键词*\`（多不得、少不得），裹在**最关键**的物象、动作或线索上，供鉴照高亮；鉴照清彻/混浊时 UI 会显示，障目时不显示。
**格式示例（须仿此结构，可换词）**：\`你停步。墙皮翘起，露出*灰坯*。风里有一股*铁锈味*，不像驿站该有的。\``

export function buildNarrativeUserPrompt(ctx: AIContext): string {
  const sections: string[] = [
    `【境遇】${ctx.realmName}`,
    ctx.storyBeat
      ? `【情节点】将以下情节点展开为 3–5 句具体叙事（只写动作/物象/身体反应）：${ctx.storyBeat}`
      : '',
    ctx.plotGuide.length
      ? `【核心剧情导向】策划给定的关键词/剧情要求，若有则自然融入描述：${JSON.stringify(ctx.plotGuide)}`
      : '',
    ctx.taboo.length ? `【禁忌】描述中不可让角色触犯：${JSON.stringify(ctx.taboo)}` : '',
    ctx.objective ? `【目标】${ctx.objective}` : '',
    ctx.narrativeFactSummary && ctx.narrativeFactSummary !== '（无）'
      ? `【本界已发生】${ctx.narrativeFactSummary}`
      : '',
    `【三相档位】命烛:${ctx.statLabels.ming_zhu} / 根脚:${ctx.statLabels.gen_jiao} / 鉴照:${ctx.statLabels.jian_zhao}`,
    ...buildStateEffects(ctx.statLabels),
    ...buildHaiEffects(ctx.hais),
  ].filter(Boolean)

  return `你扮演《行旅》的叙事引擎。根据以下语境写 **3–5 句**叙事（可短句），点明当前处境与氛围，然后交给选项。

${sections.join('\n')}

${NARRATIVE_TAIL_RULES}`
}

/** Engine v2: layered context (L0–L5) + state/hai + plot/taboo. */
export function buildDynamicNarrativeUserPrompt(
  layeredBlock: string,
  statLabels: AIContext['statLabels'],
  hais: Record<HaiId, number>,
  plotGuide: string[],
  taboo: string[],
  objective?: string,
  storyBeat?: string
): string {
  const sections: string[] = [
    layeredBlock,
    storyBeat?.trim()
      ? `【情节点】将以下情节点展开为 3–5 句具体叙事（只写动作/物象/身体反应）：${storyBeat.trim()}`
      : '',
    plotGuide.length ? `【核心剧情导向】${JSON.stringify(plotGuide)}` : '',
    taboo.length ? `【禁忌】描述中不可让角色触犯：${JSON.stringify(taboo)}` : '',
    objective ? `【目标】${objective}` : '',
    `【三相档位】命烛:${statLabels.ming_zhu} / 根脚:${statLabels.gen_jiao} / 鉴照:${statLabels.jian_zhao}`,
    ...buildStateEffects(statLabels),
    ...buildHaiEffects(hais),
  ].filter(Boolean)

  return `你扮演《行旅》的叙事引擎。须**严格**遵守 system 消息中的【叙事行文硬律】；根据以下分层语境与状态写 **3–5 句**叙事（可短句），点明当前处境与氛围，然后交给选项。

${sections.join('\n')}`
}

export const NARRATIVE_SYSTEM =
  '你只输出游戏内的叙事文本。叙事为游戏服务：用 **3–5 句**（可短句）点明处境与画面，只写具体动作、物象与身体反应；须有可感知的情节点或与前后衔接。**每一段必须恰好含 1–2 处 *关键词*（半角星号包裹）** 供鉴照高亮。遵守三条禁令：不用抽象主语（思绪、心、意识作主语空转）；不用浅白副词与空泛感受词堆砌；不用比喻排比与场景清单式罗列。用中文，不要解释或加标题。'

/** AI-E18: rough check that output mentions at least one plot keyword (2+ chars). */
export function narrativeMatchesPlotGuide(text: string, plotGuide: string[]): boolean {
  if (!plotGuide.length) return true
  const t = text.replace(/\s/g, '')
  return plotGuide.some((kw) => {
    const k = kw.replace(/^禁忌[：:]\s*/, '').replace(/^破解[：:]\s*/, '').trim()
    return k.length >= 2 && t.includes(k)
  })
}
