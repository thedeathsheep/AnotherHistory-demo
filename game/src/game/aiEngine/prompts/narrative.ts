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

const NARRATIVE_TAIL_RULES = `核心：叙事为游戏服务，极简点明处境。**所有描述必须具体**：只写具体动作、物象、身体反应；每个节点要有具体情节点或与前后衔接，有叙事趣味与逻辑。

禁止抽象（一律不用）：
- 「思绪在……中游走」「思绪游走」「心在……中」——禁止抽象主语（思绪、心、意识）与抽象环境（清晰的蓝天、宁静的环境）；必须具体到谁在做什么、什么物。例：❌「思绪在清晰的蓝天与宁静的环境中游走。」→ ✅「你抬头。天蓝，没云。」
禁止浅白：渐渐/逐渐、感受到、内心觉察、熟悉又陌生、心跳回荡等；例 ❌「渐渐清醒的你，感受到……内心觉察这片熟悉又陌生的土地。」→ ✅「你醒了。风擦过。野地在脚边。」

禁止：罗列场景元素、比喻句、固定套词（古道/书箱）；不列举选项、不解释玩法。只输出这段描述，不要选项或标题。

【鉴照高亮】在 1–2 个关键信息（物象、动作、线索）处用 \`*关键词*\` 包裹，供鉴照高亮。鉴照清彻/混浊时显示，障目时不显示。例：\`草还挂着*露*。脚边是一条*土路*。\``

export function buildNarrativeUserPrompt(ctx: AIContext): string {
  const sections: string[] = [
    `【境遇】${ctx.realmName}`,
    ctx.storyBeat ? `【情节点】将以下情节点改写为 1–2 句具体叙事（只写动作/物象/身体反应）：${ctx.storyBeat}` : '',
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

  return `你扮演《行旅》的叙事引擎。根据以下骨架写 1–2 句叙事，点明当前处境即可，然后交给选项。

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
  objective?: string
): string {
  const sections: string[] = [
    layeredBlock,
    plotGuide.length ? `【核心剧情导向】${JSON.stringify(plotGuide)}` : '',
    taboo.length ? `【禁忌】描述中不可让角色触犯：${JSON.stringify(taboo)}` : '',
    objective ? `【目标】${objective}` : '',
    `【三相档位】命烛:${statLabels.ming_zhu} / 根脚:${statLabels.gen_jiao} / 鉴照:${statLabels.jian_zhao}`,
    ...buildStateEffects(statLabels),
    ...buildHaiEffects(hais),
  ].filter(Boolean)

  return `你扮演《行旅》的叙事引擎。根据以下分层语境写 1–2 句叙事，点明当前处境即可，然后交给选项。

${sections.join('\n')}

${NARRATIVE_TAIL_RULES}`
}

export const NARRATIVE_SYSTEM =
  '你只输出游戏内的叙事文本。叙事为游戏服务：1–2 句点明处境，只写具体动作与物象；有具体情节点或与前后衔接。可用 *关键词* 标记关键信息供鉴照高亮。禁止抽象句：思绪/心/意识作主语、在……中游走、清晰的蓝天、宁静的环境等；禁止浅白句（渐渐、感受到、内心觉察、熟悉又陌生）。例：不写「思绪在清晰的蓝天与宁静的环境中游走」，写「你抬头。天蓝，没云。」用中文，不要解释或加标题。'

/** AI-E18: rough check that output mentions at least one plot keyword (2+ chars). */
export function narrativeMatchesPlotGuide(text: string, plotGuide: string[]): boolean {
  if (!plotGuide.length) return true
  const t = text.replace(/\s/g, '')
  return plotGuide.some((kw) => {
    const k = kw.replace(/^禁忌[：:]\s*/, '').replace(/^破解[：:]\s*/, '').trim()
    return k.length >= 2 && t.includes(k)
  })
}
