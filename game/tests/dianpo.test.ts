import { describe, expect, it } from 'vitest'
import { chooseDianPoTarget } from '../src/game/dianpo'
import type { Choice } from '../src/game/types'

const choices: Choice[] = [
  { text: '回头', next: 'a', state: {} },
  { text: '向前', next: 'b', state: {} },
  { text: '停步', next: 'c', state: {} },
]

describe('chooseDianPoTarget', () => {
  it('prefers taboo choices in normal state', () => {
    const result = chooseDianPoTarget({
      indexed: choices.map((choice, origIndex) => ({ choice, origIndex })),
      tabooTexts: ['回头'],
      xueZaoLevel: 0,
      muZhangLevel: 0,
      randomValue: 0,
    })

    expect(result.removedIndex).toBe(0)
    expect(result.message).toBeNull()
  })

  it('xue_zao may remove a wrong choice', () => {
    const result = chooseDianPoTarget({
      indexed: choices.map((choice, origIndex) => ({ choice, origIndex })),
      tabooTexts: ['回头'],
      xueZaoLevel: 70,
      muZhangLevel: 0,
      randomValue: 0,
    })

    expect(result.removedIndex).toBe(1)
    expect(result.message).toContain('点偏')
  })

  it('mu_zhang can consume dianpo without removing anything', () => {
    const result = chooseDianPoTarget({
      indexed: choices.map((choice, origIndex) => ({ choice, origIndex })),
      tabooTexts: ['回头'],
      xueZaoLevel: 0,
      muZhangLevel: 80,
      randomValue: 0,
    })

    expect(result.removedIndex).toBeNull()
    expect(result.message).toContain('没点穿')
  })
})
