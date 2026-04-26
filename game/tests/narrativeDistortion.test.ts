import { describe, expect, it } from 'vitest'
import { distortNarrativeForHai } from '../src/game/narrativeDistortion'

describe('distortNarrativeForHai', () => {
  it('xue_zao mislabels the first highlighted keyword', () => {
    const out = distortNarrativeForHai('你看见*灰坛*，又闻到[铁腥味]。', {
      xueZao: 60,
      muZhang: 0,
    })

    expect(out).toContain('[灰坛]')
  })

  it('mu_zhang removes one highlighted clue from view', () => {
    const out = distortNarrativeForHai('你看见*灰坛*，又闻到[铁腥味]。', {
      xueZao: 0,
      muZhang: 70,
    })

    expect(out).not.toContain('铁腥味')
  })
})
