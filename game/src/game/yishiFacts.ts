import type { Clue, Item } from './types'

interface BuildYishiCoreFactsInput {
  nodeId: string
  conclusionLabel: string
  isMidConclude?: boolean
  plotGuide?: string[]
  truthAnchors?: string[]
  objective?: string
  items?: Item[]
  clues?: Clue[]
  maxFacts?: number
}

export function buildYishiCoreFacts(input: BuildYishiCoreFactsInput): string[] {
  const {
    nodeId,
    conclusionLabel,
    isMidConclude = false,
    plotGuide = [],
    truthAnchors = [],
    objective,
    items = [],
    clues = [],
    maxFacts = 6,
  } = input

  const facts: string[] = []
  if (isMidConclude) facts.push(`定稿于节点 ${nodeId}`)
  if (conclusionLabel) facts.push(`结案：${conclusionLabel}`)

  const guides = (plotGuide.length ? plotGuide : truthAnchors).slice(0, 2)
  facts.push(...guides)

  if (objective) facts.push(objective)

  const lastItem = items[items.length - 1]
  if (lastItem?.name) facts.push(`物证：${lastItem.name}`)

  const lastClue = clues[clues.length - 1]
  if (lastClue?.name) facts.push(`线索：${lastClue.name}`)

  return facts.filter(Boolean).slice(0, maxFacts)
}
