/**
 * Choice generation prompt.
 * AI-E15: 感应念头 AI - 骨架选项 + AI 补充 1–2 条.
 * AI generates 1–2 additional choice texts; next/state inherited from skeleton.
 */

import type { Choice } from '@/game/types'

export interface ChoicesPromptInput {
  plotGuide: string[]
  taboo: string[]
  storyBeat?: string
  skeletonChoices: Choice[]
  items: string[]
  clues: string[]
  realmName: string
}

export function buildChoicesUserPrompt(input: ChoicesPromptInput): string {
  const { plotGuide, taboo, storyBeat, skeletonChoices, items, clues, realmName } = input
  const nexts = [...new Set(skeletonChoices.map((c) => c.next).filter(Boolean))]
  const sections: string[] = [
    `【境遇】${realmName}`,
    storyBeat ? `【情节点】${storyBeat}` : '',
    plotGuide.length ? `【剧情导向】${JSON.stringify(plotGuide)}` : '',
    taboo.length ? `【禁忌】不可触犯：${JSON.stringify(taboo)}` : '',
    items.length ? `【已有物证】${items.join('、')}` : '',
    clues.length ? `【已有线索】${clues.join('、')}` : '',
    `【骨架选项】${skeletonChoices.map((c) => c.text).join(' | ')}`,
    `【可用的 next】${nexts.join(', ')}`,
  ].filter(Boolean)

  return `你扮演《行旅》的选项引擎。根据骨架选项，补充 1–2 条风格一致、可选的念头（选项文案）。

${sections.join('\n')}

要求：
- 输出严格 JSON 数组，每项为 {"text": "选项文案", "next": "节点ID"}，next 必须从【可用的 next】中选一个
- 文案简短（5–15 字），与骨架选项风格一致，不触犯禁忌
- 只输出 JSON，不要其他文字`
}

export const CHOICES_SYSTEM =
  '你只输出 JSON 数组，格式 [{"text":"选项文案","next":"节点ID"}]。文案简短，与给定骨架选项风格一致。用中文。'
