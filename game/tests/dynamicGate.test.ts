import { describe, expect, it } from 'vitest'
import { GameState } from '@/game/state'
import { beatNextToken, buildDynamicBeatRuntimeNode, type StoryOutline } from '@/game/storyRuntime'
import type { RealmSeed } from '@/game/designSeed'
import type { Choice, Skeleton } from '@/game/types'

function makeSkeleton(): Skeleton {
  return {
    realms: [
      {
        id: 'prologue',
        name: 'Prologue',
        entry_node: 'n1',
        nodes: [{ node_id: 'n1', description: '', choices: [] }],
      },
    ],
  }
}

describe('dynamic beat gating', () => {
  it('applies director gate hints to the upcoming beat and blocks the transition until satisfied', () => {
    const game = new GameState(makeSkeleton())
    game.startRealm('prologue')

    const outline: StoryOutline = {
      realm_id: 'prologue',
      beats: [
        { beat_id: 'b0', type: 'setup', summary: 'start', tension: 0.2 },
        { beat_id: 'b1', type: 'rising', summary: 'locked', tension: 0.6 },
      ],
    }
    const realmSeed: RealmSeed = {
      id: 'prologue',
      name: 'Prologue',
      theme: 'mystery',
      anchors: [],
    }

    game.beginDynamicStory(outline, realmSeed)

    const currentNode = game.getCurrentNode()
    expect(currentNode).not.toBeNull()

    const nextNode = buildDynamicBeatRuntimeNode({
      realmId: 'prologue',
      beatIndex: 1,
      outline,
      previousNode: currentNode,
      realmSeed,
      gateHint: { item: 'seal' },
    })

    expect(nextNode?.gate?.item).toBe('seal')
    game.registerRuntimeNode(nextNode!)

    const choice: Choice = { text: '继续前行', next: beatNextToken(1) }
    expect(game.canTakeChoice(choice)).toBe(false)

    game.items = [{ id: 'seal', name: 'Seal', category: '厌胜' }]
    expect(game.canTakeChoice(choice)).toBe(true)
  })
})
