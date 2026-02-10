/**
 * Yishi (异史)凝练 prompt builder.
 * Aligns with GDD 5.5 / TODO AI-E14, AI-E22.
 * Supports conclusion_label, choice summary, core facts, optional tags [真史][疑伪][秽].
 */

export interface YishiPromptInput {
  realmName: string
  choiceSummary: string
  conclusionLabel: string
  coreFacts?: string[]
}

export function buildYishiUserPrompt(input: YishiPromptInput): string {
  const { realmName, choiceSummary, conclusionLabel, coreFacts } = input
  const coreLine =
    coreFacts?.length
      ? `【必须包含】异史中应自然融入以下 2–3 个事实：${coreFacts.join('、')}\n\n`
      : ''
  return `将以下行旅记录凝练为一段「异史」。极简白描，不铺陈不比喻；禁止浅白句与抽象句（渐渐、感受到、内心觉察、思绪游走、宁静的环境等），只写具体人事。奇诡与烟火气并置，内敛含蓄。质朴半文言纪传体，时间地点人物事件；以「记之曰」收束；第三人称，不超过100字。

【地域】${realmName}
【行旅概要】
${choiceSummary}
${coreLine}结尾以「记之曰：${conclusionLabel}。」收束。
可选：若判定为疑伪或秽史，可在正文前加 [疑伪] 或 [秽]；确认为真史可加 [真史]。默认不标。
只输出异史正文（可含标签），不要解释。`
}

export const YISHI_SYSTEM =
  '你只输出异史正文。极简白描；禁止浅白句与抽象句（渐渐、感受到、内心觉察、思绪游走、宁静的环境）、比喻句；只写具体人事。质朴半文言纪传体，以记之曰收束。不要任何解释或标题。用中文。'
