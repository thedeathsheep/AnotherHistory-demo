/**
 * Main narrative prompt builder.
 * Aligns with GDD 5.5 / AI流水线与存储规范 / TODO AI-E12, AI-E13, M1-5/M1-6/M1-13.
 * Supports plot_guide, taboo, objective, 三相档位影响（命烛摇曳→疑似/幻觉，鉴照混浊→噪音）, 害感官滤镜.
 */

import type { HaiId } from '@/game/types'
import type { AIContext } from '../dataAcquisition'

function buildHaiEffects(hais: Record<HaiId, number>): string[] {
  const hints: string[] = []
  if ((hais.ling_sun ?? 0) > 0) {
    hints.push('【灵损】描述中混入「疑似」「隐约」「或是幻觉」等前缀，体现神魂磨损、认知崩塌。')
  }
  if ((hais.shou_chao ?? 0) > 0) {
    hints.push('【受潮】强制加入粘稠、阴冷、腐朽类修辞，体现肉身退化。')
  }
  if ((hais.ling_pei ?? 0) > 0) {
    hints.push('【灵沛】拮抗灵损，描述更冷峻、准确，可识破幻觉。')
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
    hints.push('【鉴照混浊】扩充描述、混入干扰性细节或语义噪音；可加入无意义的远方怪响、错误视觉线索，掩盖关键信息。')
  } else if (statLabels.jian_zhao === '障目') {
    hints.push('【鉴照障目】描述可更混乱、难以辨明。')
  }
  return hints
}

export function buildNarrativeUserPrompt(ctx: AIContext): string {
  const sections: string[] = [
    `【境遇】${ctx.realmName}`,
    ctx.storyBeat ? `【情节点】将以下情节点改写为 1–2 句具体叙事（只写动作/物象/身体反应）：${ctx.storyBeat}` : '',
    ctx.plotGuide.length
      ? `【核心剧情导向】策划给定的关键词/剧情要求，若有则自然融入描述：${JSON.stringify(ctx.plotGuide)}`
      : '',
    ctx.taboo.length ? `【禁忌】描述中不可让角色触犯：${JSON.stringify(ctx.taboo)}` : '',
    ctx.objective ? `【目标】${ctx.objective}` : '',
    `【三相档位】命烛:${ctx.statLabels.ming_zhu} / 根脚:${ctx.statLabels.gen_jiao} / 鉴照:${ctx.statLabels.jian_zhao}`,
    ...buildStateEffects(ctx.statLabels),
    ...buildHaiEffects(ctx.hais),
  ].filter(Boolean)

  return `你扮演《行旅》的叙事引擎。根据以下骨架写 1–2 句叙事，点明当前处境即可，然后交给选项。

${sections.join('\n')}

核心：叙事为游戏服务，极简点明处境。**所有描述必须具体**：只写具体动作、物象、身体反应；每个节点要有具体情节点或与前后衔接，有叙事趣味与逻辑。

禁止抽象（一律不用）：
- 「思绪在……中游走」「思绪游走」「心在……中」——禁止抽象主语（思绪、心、意识）与抽象环境（清晰的蓝天、宁静的环境）；必须具体到谁在做什么、什么物。例：❌「思绪在清晰的蓝天与宁静的环境中游走。」→ ✅「你抬头。天蓝，没云。」
禁止浅白：渐渐/逐渐、感受到、内心觉察、熟悉又陌生、心跳回荡等；例 ❌「渐渐清醒的你，感受到……内心觉察这片熟悉又陌生的土地。」→ ✅「你醒了。风擦过。野地在脚边。」

禁止：罗列场景元素、比喻句、固定套词（古道/书箱）；不列举选项、不解释玩法。只输出这段描述，不要选项或标题。

【鉴照高亮】在 1–2 个关键信息（物象、动作、线索）处用 \`*关键词*\` 包裹，供鉴照高亮。鉴照清彻/混浊时显示，障目时不显示。例：\`草还挂着*露*。脚边是一条*土路*。\``
}

export const NARRATIVE_SYSTEM =
  '你只输出游戏内的叙事文本。叙事为游戏服务：1–2 句点明处境，只写具体动作与物象；有具体情节点或与前后衔接。可用 *关键词* 标记关键信息供鉴照高亮。禁止抽象句：思绪/心/意识作主语、在……中游走、清晰的蓝天、宁静的环境等；禁止浅白句（渐渐、感受到、内心觉察、熟悉又陌生）。例：不写「思绪在清晰的蓝天与宁静的环境中游走」，写「你抬头。天蓝，没云。」用中文，不要解释或加标题。'
