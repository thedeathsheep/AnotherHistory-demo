import { describe, it, expect } from 'vitest'
import { evaluateEnding } from '@/game/endings'
import { GameState } from '@/game/state'
import type { Skeleton } from '@/game/types'
import { createYishiEntry } from '@/game/aiOutput'

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

describe('evaluateEnding', () => {
  it('returns Q when ming_zhu depleted', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.stats.ming_zhu = 0
    expect(evaluateEnding(g)).toBe('Q')
  })

  it('returns D when gen_jiao 0 with high shou_chao (before plain R)', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.stats.gen_jiao = 0
    g.hais.shou_chao = 70
    expect(evaluateEnding(g)).toBe('D')
  })

  it('returns V when high hui ratio and has items', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.items = [{ id: 'i1', name: '邪铃', category: '厌胜' }]
    g.yishiEntries = [
      createYishiEntry('[秽] one'),
      createYishiEntry('[秽] two'),
      createYishiEntry('plain'),
      createYishiEntry('plain'),
    ]
    expect(evaluateEnding(g)).toBe('V')
  })

  it('returns C under proxy conditions', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.stepsTaken = 200
    g.hais.jing_zhe = 55
    g.yishiEntries = [
      createYishiEntry('[真史] a'),
      createYishiEntry('[真史] b'),
      createYishiEntry('[真史] c'),
      createYishiEntry('[真史] d'),
      createYishiEntry('[真史] e'),
      createYishiEntry('[疑伪] f'),
    ]
    g.stats.jian_zhao = 90
    expect(evaluateEnding(g)).toBe('C')
  })

  it('returns O for mid-conclude with trust item', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.items = [{ id: 'i1', name: '托付木牌', category: '随身器' }]
    g.yishiEntries = [createYishiEntry('[疑伪] 中途定稿')]
    g.beginMidConclude()

    expect(evaluateEnding(g)).toBe('O')
  })

  it('returns X for mid-conclude with hui-tag entry when no trust item', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.yishiEntries = [createYishiEntry('[秽] 中途定稿')]
    g.beginMidConclude()

    expect(evaluateEnding(g)).toBe('X')
  })

  it('returns N for plain mid-conclude', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.yishiEntries = [createYishiEntry('[疑伪] 中途定稿')]
    g.beginMidConclude()

    expect(evaluateEnding(g)).toBe('N')
  })

  it('returns G only when player explicitly chose not to record', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.stats.jian_zhao = 95
    g.yishiEntries = [createYishiEntry('[疑伪] 一条记录')]
    g.choiceHistory.push({ text: '不予记录，收笔离开', next: '__结案__', state: {} })

    expect(evaluateEnding(g)).toBe('G')
  })

  it('does not return G from high jian_zhao alone', () => {
    const g = new GameState(miniSk())
    g.startRealm()
    g.stats.jian_zhao = 95
    g.yishiEntries = [createYishiEntry('[疑伪] 一条记录')]
    g.choiceHistory.push({ text: '继续记下去', next: '__结案__', state: {} })

    expect(evaluateEnding(g)).not.toBe('G')
  })
})
