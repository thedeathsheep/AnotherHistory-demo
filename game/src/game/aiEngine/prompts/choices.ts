/**
 * Choice generation prompt.
 * AI-E15: 感应念头 AI - 骨架选项 + AI 补充 1–2 条.
 */

import type { Choice, Item, Clue } from '@/game/types'

export interface ChoicesPromptInput {
  plotGuide: string[]
  taboo: string[]
  storyBeat?: string
  /** 玩家当前读到的境遇正文（AI 叙事成稿或骨架描述）；补充念头须与此一体 */
  sceneNarrative?: string
  skeletonChoices: Choice[]
  items: Item[]
  clues: Clue[]
  realmName: string
  /** 若持有物证，须强制一条与物证相关的念头，文案前缀加 (凭物) */
  requireItemThought?: boolean
}

export function buildChoicesUserPrompt(input: ChoicesPromptInput): string {
  const { plotGuide, taboo, storyBeat, sceneNarrative, skeletonChoices, items, clues, realmName, requireItemThought } =
    input
  const nexts = [...new Set(skeletonChoices.map((c) => c.next).filter(Boolean))]
  const nextWithSkeletonLine = skeletonChoices.length
    ? `【可用的 next 及对应骨架】${skeletonChoices.map((c) => `${c.next}: "${c.text}"`).join(' | ')}`
    : ''
  const itemLine = items.length
    ? `【已有物证】${items.map((i) => `${i.name}(${i.category})`).join('、')}`
    : ''
  const clueLine = clues.length
    ? `【已有线索】${clues.map((c) => `${c.name}(${c.category})`).join('、')}`
    : ''
  const pingwu =
    requireItemThought && items.length
      ? '【凭物】必须输出恰好一条选项，文案以「(凭物)」开头，内容须与【已有物证】中至少一件直接相关（触感、异响、指向路径等）。该条的 next 须与凭物探索方向一致：优先选择深入/检视/跟进类骨架分支；不得选择折返、离开、绕开、回头类 next，除非凭物文案明确写出撤离、放弃或返回。另一条（若有）可为普通念头，其 next 亦须与文案语义一致。'
      : ''
  const sections: string[] = [
    `【境遇】${realmName}`,
    sceneNarrative
      ? `【当前境遇正文】（玩家此刻读到的文字；补充念头须与语气、物象、处境一致，不可另起无关场景）\n${sceneNarrative}`
      : '',
    storyBeat ? `【情节点】${storyBeat}` : '',
    plotGuide.length ? `【剧情导向】${JSON.stringify(plotGuide)}` : '',
    taboo.length ? `【禁忌】不可触犯：${JSON.stringify(taboo)}` : '',
    itemLine,
    clueLine,
    pingwu,
    `【骨架选项】${skeletonChoices.map((c) => c.text).join(' | ')}`,
    nextWithSkeletonLine || `【可用的 next】${nexts.join(', ')}`,
  ].filter(Boolean)

  return `你扮演《行旅》的选项引擎。根据骨架选项，补充 1–2 条风格一致、可选的念头（选项文案）。

${sections.join('\n')}

要求：
- 输出严格 JSON 数组，每项为 {"text": "选项文案", "next": "节点ID"}；next 必须从【可用的 next 及对应骨架】（或【可用的 next】）中选一个，且须与该行文案语义一致（探索物证、前进、撤离等不可错配）
- 若输出多条，各条 text 必须**互不重复**，且分别对应不同骨架分支的意图，禁止两条用同一句话套在不同 next 上
- 文案简短（5–18 字），与【骨架选项】及【当前境遇正文】（若有）风格一体，不触犯禁忌
- 只输出 JSON，不要其他文字`
}

export const CHOICES_SYSTEM =
  '你只输出 JSON 数组，格式 [{"text":"选项文案","next":"节点ID"}]。每条选项须是**角色当下的念头或身体动作**，第一人称、口语化、简短；与骨架选项气质一致。用中文。'
