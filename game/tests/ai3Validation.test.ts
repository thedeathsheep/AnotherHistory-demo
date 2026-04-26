import { describe, expect, it, vi } from 'vitest'
import { resolveAi3Part } from '../scripts/ai3-validation.mjs'

describe('resolveAi3Part', () => {
  it('retries when the first draft hits banned wording', async () => {
    const generatePart = vi
      .fn()
      .mockResolvedValueOnce({
        descriptions: { scene_4: '你停下脚，心中一紧。' },
        choice_texts: { scene_4_0: '往前走。' },
      })
      .mockResolvedValueOnce({
        descriptions: { scene_4: '你停下脚，喉头发紧。' },
        choice_texts: { scene_4_0: '往前走。' },
      })

    const part = await resolveAi3Part({
      nodeId: 'scene_4',
      node: { choices: [{}] },
      generatePart,
    })

    expect(generatePart).toHaveBeenCalledTimes(2)
    expect(part.descriptions.scene_4).toBe('你停下脚，喉头发紧。')
  })

  it('throws after exhausting retries', async () => {
    const generatePart = vi.fn().mockResolvedValue({
      descriptions: { scene_4: '你停下脚，心中一紧。' },
      choice_texts: { scene_4_0: '往前走。' },
    })

    await expect(
      resolveAi3Part({
        nodeId: 'scene_4',
        node: { choices: [{}] },
        generatePart,
        maxAttempts: 2,
      }),
    ).rejects.toThrow('scene_4')

    expect(generatePart).toHaveBeenCalledTimes(2)
  })
})
