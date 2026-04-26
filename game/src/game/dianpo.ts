import type { Choice } from './types'

export interface IndexedChoice {
  choice: Choice
  origIndex: number
}

export interface DianPoResult {
  removedIndex: number | null
  message: string | null
}

function pickFrom(list: IndexedChoice[], randomValue: number): IndexedChoice | null {
  if (!list.length) return null
  const idx = Math.min(list.length - 1, Math.floor(randomValue * list.length))
  return list[idx] ?? null
}

export function chooseDianPoTarget(params: {
  indexed: IndexedChoice[]
  tabooTexts: string[]
  xueZaoLevel: number
  muZhangLevel: number
  randomValue?: number
}): DianPoResult {
  const { indexed, tabooTexts, xueZaoLevel, muZhangLevel } = params
  const randomValue = params.randomValue ?? Math.random()
  if (indexed.length <= 1) {
    return { removedIndex: null, message: null }
  }

  if (muZhangLevel >= 70) {
    return { removedIndex: null, message: '目障压住了眼前这一层，点破落下去，却没点穿。' }
  }

  const tabooSet = new Set(tabooTexts)
  const tabooPool = indexed.filter(({ choice }) => tabooSet.has(choice.text))
  const normalPool = tabooPool.length > 0 ? tabooPool : indexed

  if (xueZaoLevel >= 55 && indexed.length > 1) {
    const wrongPool = indexed.filter(({ choice }) => !tabooSet.has(choice.text))
    const wrongPick = pickFrom(wrongPool.length ? wrongPool : indexed, randomValue)
    return {
      removedIndex: wrongPick?.origIndex ?? null,
      message: '血噪盖住了要字，这一下点偏了。'
    }
  }

  const pick = pickFrom(normalPool, randomValue)
  return { removedIndex: pick?.origIndex ?? null, message: null }
}
