import { describe, expect, it } from 'vitest'
import { GameState } from '@/game/state'
import type { Skeleton } from '@/game/types'

function miniSk(): Skeleton {
  return {
    realms: [
      {
        id: 't',
        name: 't',
        entry_node: 'n1',
        nodes: [{ node_id: 'n1', description: '', choices: [{ text: 'x', next: 'n1' }] }],
      },
    ],
  }
}

describe('hai choice consequences', () => {
  it('kou_zhai makes speech choices cost ming_zhu and ling_sun', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.hais.kou_zhai = 60

    g.applyChoice({ text: '开口问他真名', next: 'n1', state: {} })

    expect(g.stats.ming_zhu).toBeLessThan(100)
    expect(g.hais.ling_sun).toBeGreaterThan(0)
  })

  it('chen_sha makes forceful movement cost extra gen_jiao', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.hais.chen_sha = 70

    g.applyChoice({ text: '冲过去撞开门', next: 'n1', state: {} })

    expect(g.stats.gen_jiao).toBeLessThan(100)
  })

  it('duan_xiang halves positive stat recovery from a choice', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.stats.ming_zhu = 50
    g.stats.gen_jiao = 50
    g.hais.duan_xiang = 70

    g.applyChoice({
      text: '缓一口气',
      next: 'n1',
      state: { ming_zhu: 10, gen_jiao: 8 },
    })

    expect(g.stats.ming_zhu).toBe(55)
    expect(g.stats.gen_jiao).toBe(54)
  })
})
