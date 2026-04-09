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
  /** Conductor: target number of output choices (3–5 recommended). */
  targetChoiceCount?: number
  /** Conductor: required mutually-exclusive intents (labels). */
  intentsRequired?: string[]
}

export function buildChoicesUserPrompt(input: ChoicesPromptInput): string {
  const {
    plotGuide,
    taboo,
    storyBeat,
    sceneNarrative,
    skeletonChoices,
    items,
    clues,
    realmName,
    requireItemThought,
    targetChoiceCount,
    intentsRequired,
  } =
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

  const sameNextHint = nexts.length < skeletonChoices.length
    ? '【注意】骨架里存在多个选项指向同一个 next：这意味着“同走向但不同代价/信息/风险”的选择。你必须为这些同 next 的按钮分别写出**明显不同**的念头（例如：试探/强行/取证/避险/压住冲动等），避免同义换词。'
    : ''

  const countHint =
    typeof targetChoiceCount === 'number' && targetChoiceCount >= 2
      ? `【目标条数】你必须输出恰好 ${targetChoiceCount} 条 JSON 项（除非【可用 next】为空）。`
      : '【目标条数】优先输出 3–5 条。'
  const intentHint =
    intentsRequired?.length
      ? `【意图覆盖】每条必须带 intent 字段，取值从 ${JSON.stringify(intentsRequired)} 中选一个；并且 intentsRequired 中每个 intent 至少出现一次。intent 用于保证选项明显不同（推进/取证/避险/冒险/折返等）。`
      : '【意图覆盖】每条必须带 intent 字段（advance/inspect/seekInfo/commitRisk/retreat/interact/wait），并尽量互斥。'

  return `你扮演《行旅》的选项引擎。根据骨架选项，为每个骨架分支写出更贴当前处境的念头（选项文案）。

${sections.join('\n')}
${sameNextHint ? `\n${sameNextHint}\n` : ''}
${countHint}
${intentHint}

要求：
- 输出严格 JSON 数组，每项为 {"text": "选项文案", "next": "节点ID", "intent": "intent标签"}；next 必须从【可用的 next 及对应骨架】（或【可用的 next】）中选一个，且须与该行文案语义一致（探索物证、前进、撤离等不可错配）
- 输出条数为 2–5 条（或按【目标条数】）：尽量覆盖更多骨架分支；若骨架分支多于 5，则优先覆盖语义差异最大的 5 个
- 各条 text 必须**互不重复**，且分别对应不同骨架分支的意图；若多个条目 next 相同，也必须体现明显不同的代价/风险/信息取向（禁止同义换词）
- 文案简短（5–18 字），与【骨架选项】及【当前境遇正文】（若有）风格一体，不触犯禁忌
- 只输出 JSON，不要其他文字`
}

export const CHOICES_SYSTEM =
  '你只输出 JSON 数组，格式 [{"text":"选项文案","next":"节点ID"}]。每条选项须是**角色当下的念头或身体动作**，第一人称、口语化、简短；与骨架选项气质一致。用中文。'
