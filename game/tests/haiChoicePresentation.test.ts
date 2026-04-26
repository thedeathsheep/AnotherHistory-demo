import { describe, expect, it } from 'vitest'
import { filterChoicesByHaiVisibility, getHaiActionFeedback } from '../src/game/haiChoicePresentation'
import type { Choice } from '../src/game/types'

const choices: Choice[] = [
  { text: '把木牌托付给他', next: 'a', state: {} },
  { text: '求他带路', next: 'b', state: {} },
  { text: '自己继续往前', next: 'c', state: {} },
]

describe('filterChoicesByHaiVisibility', () => {
  it('hides trust-like choices under high duan_xiang when alternatives exist', () => {
    const out = filterChoicesByHaiVisibility(choices, { duan_xiang: 75 } as never)
    expect(out.map((c) => c.text)).toEqual(['自己继续往前'])
  })

  it('keeps trust-like choices if there are no alternatives', () => {
    const out = filterChoicesByHaiVisibility(choices.slice(0, 2), { duan_xiang: 75 } as never)
    expect(out).toHaveLength(2)
  })
})

describe('getHaiActionFeedback', () => {
  it('returns slowdown feedback for chen_sha forceful action', () => {
    const out = getHaiActionFeedback('冲过去撞开门', { chen_sha: 70 } as never)
    expect(out.preDelayMs).toBeGreaterThan(0)
    expect(out.preMessage).toContain('脚下一沉')
  })

  it('returns speech warning for kou_zhai', () => {
    const out = getHaiActionFeedback('开口问他真名', { kou_zhai: 70 } as never)
    expect(out.postMessage).toContain('开口')
  })
})
