/**
 * Choice generation prompt.
 * AI-E15: 感应念头 AI - 骨架选项 + AI 补充 1–2 条.
 */

import type { Choice, Item, Clue } from '@/game/types'

export interface ChoicesPromptInput {
  plotGuide: string[]
  taboo: string[]
  storyBeat?: string
  skeletonChoices: Choice[]
  items: Item[]
  clues: Clue[]
  realmName: string
  /** 若持有物证，须强制一条与物证相关的念头，文案前缀加 (凭物) */
  requireItemThought?: boolean
}

export function buildChoicesUserPrompt(input: ChoicesPromptInput): string {
  const { plotGuide, taboo, storyBeat, skeletonChoices, items, clues, realmName, requireItemThought } = input
  const nexts = [...new Set(skeletonChoices.map((c) => c.next).filter(Boolean))]
  const itemLine = items.length
    ? `【已有物证】${items.map((i) => `${i.name}(${i.category})`).join('、')}`
    : ''
  const clueLine = clues.length
    ? `【已有线索】${clues.map((c) => `${c.name}(${c.category})`).join('、')}`
    : ''
  const pingwu =
    requireItemThought && items.length
      ? '【凭物】必须输出恰好一条选项，文案以「(凭物)」开头，内容须与【已有物证】中至少一件直接相关（触感、异响、指向路径等），next 仍须合法。另一条（若有）可为普通念头。'
      : ''
  const sections: string[] = [
    `【境遇】${realmName}`,
    storyBeat ? `【情节点】${storyBeat}` : '',
    plotGuide.length ? `【剧情导向】${JSON.stringify(plotGuide)}` : '',
    taboo.length ? `【禁忌】不可触犯：${JSON.stringify(taboo)}` : '',
    itemLine,
    clueLine,
    pingwu,
    `【骨架选项】${skeletonChoices.map((c) => c.text).join(' | ')}`,
    `【可用的 next】${nexts.join(', ')}`,
  ].filter(Boolean)

  return `你扮演《行旅》的选项引擎。根据骨架选项，补充 1–2 条风格一致、可选的念头（选项文案）。

${sections.join('\n')}

要求：
- 输出严格 JSON 数组，每项为 {"text": "选项文案", "next": "节点ID"}，next 必须从【可用的 next】中选一个
- 文案简短（5–18 字），与骨架选项风格一致，不触犯禁忌
- 只输出 JSON，不要其他文字`
}

export const CHOICES_SYSTEM =
  '你只输出 JSON 数组，格式 [{"text":"选项文案","next":"节点ID"}]。文案简短，与给定骨架选项风格一致。用中文。'
