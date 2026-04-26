import { describe, expect, it } from 'vitest'
import { buildYishiCoreFacts } from '../src/game/yishiFacts'

describe('buildYishiCoreFacts', () => {
  it('includes mid-conclude marker and node id', () => {
    const facts = buildYishiCoreFacts({
      nodeId: 'n-1',
      conclusionLabel: '中途定稿',
      isMidConclude: true,
      plotGuide: ['线索A'],
      objective: '目标X',
      items: [{ id: 'i', name: '物证' }],
      clues: [{ id: 'c', name: '线索' }],
    })
    expect(facts.join(' ')).toContain('定稿于节点 n-1')
  })

  it('caps number of facts', () => {
    const facts = buildYishiCoreFacts({
      nodeId: 'n-2',
      conclusionLabel: '结案',
      plotGuide: ['a', 'b', 'c', 'd'],
      items: [{ id: 'i', name: '物证' }],
      clues: [{ id: 'c', name: '线索' }],
      maxFacts: 4,
    })
    expect(facts.length).toBeLessThanOrEqual(4)
  })

  it('falls back to truthAnchors and includes item/clue labels in order', () => {
    const facts = buildYishiCoreFacts({
      nodeId: 'n-3',
      conclusionLabel: '完结',
      plotGuide: [],
      truthAnchors: ['锚点A', '锚点B', '锚点C'],
      items: [{ id: 'i1', name: '旧书箱' }],
      clues: [{ id: 'c1', name: '信使身份' }],
    })
    expect(facts[0]).toBe('结案：完结')
    expect(facts).toContain('锚点A')
    expect(facts).toContain('锚点B')
    expect(facts).toContain('物证：旧书箱')
    expect(facts).toContain('线索：信使身份')
  })
})
