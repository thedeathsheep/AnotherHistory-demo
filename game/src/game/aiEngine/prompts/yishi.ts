/**
 * Yishi (异史) prompt builder.
 * Aligns with GDD 5.5 / TODO AI-E14, AI-E22.
 * Supports conclusion_label, choice summary, core facts, required tags [真史][疑伪][秽].
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
      ? `【必须包含】异史中应自然融入以下事实：${coreFacts.join('、')}\n\n`
      : ''
  return `将以下行旅撰写为一段异史。体例为明代文言笔记，仿《聊斋志异》《阅微草堂笔记》风格。

【地域】${realmName}
【行旅概要】
${choiceSummary}
${coreLine}【文体要求】
- 纯正文言，不用白话。句式简洁，以四字、六字为主，少用长句。
- 不用「渐渐」「感受到」「内心」等白话词汇；不用「思绪」「心在」等抽象主语。
- 以干支纪年（如「乙巳年」），地点在前，人物次之，事件在后。
- 结尾用「异史氏曰」引出结论，结论为四至六字概括。
- 第三人称，全文不超过八十言。

【示例】
乙巳春，有行者过永宁驿，入而不出。驿人云：是夜闻马蹄声，晨起视之，空无一物。异史氏曰：驿中失迹。

【标签】根据行旅性质，正文前加以下标签之一：
- [真史]：确有其事
- [疑伪]：传闻未证
- [秽]：涉及禁忌灾异

结尾以「异史氏曰：${conclusionLabel}。」收束。只输出正文（含标签），不要解释。`
}

export const YISHI_SYSTEM =
  '你撰写明代文言笔记体异史。纯正文言，句式简洁（四六字为主），不用白话词汇。以干支纪年，地点在前，人物次之，事件在后。结尾用「异史氏曰」引出四至六字结论。全文不超过八十言。正文前必须加 [真史]、[疑伪] 或 [秽] 之一。不要任何解释或标题。'