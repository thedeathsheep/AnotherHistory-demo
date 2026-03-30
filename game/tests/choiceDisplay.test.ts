import { describe, expect, it } from 'vitest'
import {
  mergeSkeletonChoicesWithAi,
  alignPingwuNextIfNeeded,
  getDisplayChoicesForNode,
  isAwaitingChoiceHydration,
} from '../src/game/choiceDisplay'
import type { Node } from '../src/game/types'

function nodeWithChoices(
  choices: { text: string; next: string }[]
): Node {
  return {
    node_id: 'n1',
    description: '',
    choices: choices.map((c) => ({ ...c })),
  } as Node
}

describe('mergeSkeletonChoicesWithAi', () => {
  it('keeps one row per skeleton branch and overwrites text by next', () => {
    const node = nodeWithChoices([
      { text: 'A', next: 'x' },
      { text: 'B', next: 'y' },
    ])
    const out = mergeSkeletonChoicesWithAi(node, [
      { text: 'AI-x', next: 'x' },
      { text: 'AI-y', next: 'y' },
    ])
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({ text: 'AI-x', next: 'x' })
    expect(out[1]).toMatchObject({ text: 'AI-y', next: 'y' })
  })

  it('returns skeleton when ai returns empty', () => {
    const node = nodeWithChoices([
      { text: 'A', next: 'x' },
      { text: 'B', next: 'y' },
    ])
    const out = mergeSkeletonChoicesWithAi(node, [])
    expect(out).toHaveLength(2)
    expect(out[0]!.text).toBe('A')
    expect(out[1]!.text).toBe('B')
  })

  it('falls back to skeleton text when AI gives identical lines for different branches', () => {
    const node = nodeWithChoices([
      { text: '进去看看。', next: 'scene_7' },
      { text: '绕过去，继续赶路。', next: 'scene_10' },
    ])
    const dup = '该去驿站讨碗水喝了'
    const out = mergeSkeletonChoicesWithAi(node, [
      { text: dup, next: 'scene_7' },
      { text: dup, next: 'scene_10' },
    ])
    expect(out[0]!.text).toBe(dup)
    expect(out[1]!.text).toBe('绕过去，继续赶路。')
  })
})

describe('alignPingwuNextIfNeeded', () => {
  it('rebinds pingwu away from retreat skeleton when body has no retreat words', () => {
    const node = nodeWithChoices([
      { text: '深入查看', next: 'forward' },
      { text: '折返离开', next: 'back' },
    ])
    const ac = alignPingwuNextIfNeeded({ text: '(凭物) 指腹摸到凹痕', next: 'back' }, node)
    expect(ac.next).toBe('forward')
  })

  it('keeps retreat next when pingwu text mentions return', () => {
    const node = nodeWithChoices([
      { text: '深入查看', next: 'forward' },
      { text: '折返离开', next: 'back' },
    ])
    const ac = alignPingwuNextIfNeeded({ text: '(凭物) 决定回头', next: 'back' }, node)
    expect(ac.next).toBe('back')
  })
})

describe('getDisplayChoicesForNode', () => {
  it('uses node.choices for dynamic beats regardless of empty cache marker', () => {
    const node = nodeWithChoices([{ text: 'D', next: 'z' }])
    const cached = { [node.node_id]: [] as typeof node.choices }
    const out = getDisplayChoicesForNode(node, cached, true)
    expect(out).toEqual(node.choices)
  })

  it('uses merged cache for skeleton when defined', () => {
    const node = nodeWithChoices([{ text: 'A', next: 'x' }])
    const merged = [{ text: 'M', next: 'x' }]
    const out = getDisplayChoicesForNode(node, { [node.node_id]: merged }, false)
    expect(out).toEqual(merged)
  })
})

describe('isAwaitingChoiceHydration', () => {
  it('is true when api key set and cache miss with choices', () => {
    const node = nodeWithChoices([{ text: 'A', next: 'x' }])
    expect(
      isAwaitingChoiceHydration({
        apiKey: 'sk-test',
        node,
        canEnterNode: true,
        cachedAiChoices: {},
        cachedNarrative: {},
        isDynamicBeat: false,
      })
    ).toBe(true)
  })

  it('is false when cache written', () => {
    const node = nodeWithChoices([{ text: 'A', next: 'x' }])
    expect(
      isAwaitingChoiceHydration({
        apiKey: 'sk-test',
        node,
        canEnterNode: true,
        cachedAiChoices: { [node.node_id]: node.choices },
        cachedNarrative: {},
        isDynamicBeat: false,
      })
    ).toBe(false)
  })

  it('is false without api key', () => {
    const node = nodeWithChoices([{ text: 'A', next: 'x' }])
    expect(
      isAwaitingChoiceHydration({
        apiKey: null,
        node,
        canEnterNode: true,
        cachedAiChoices: {},
        cachedNarrative: {},
        isDynamicBeat: false,
      })
    ).toBe(false)
  })
})
