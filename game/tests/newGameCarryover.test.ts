import { describe, expect, it } from 'vitest'
import { resolveNewGameCarryover } from '@/game/newGameCarryover'
import { createEmptyWorldGraph } from '@/game/worldStateGraph'

describe('resolveNewGameCarryover', () => {
  it('prefers the current in-memory run over an unrelated saved slot', () => {
    const currentGraph = createEmptyWorldGraph()
    currentGraph.events.push({
      id: 'evt-current',
      step: 1,
      summary: 'current-run summary',
      choice_text: 'go',
    })

    const carryover = resolveNewGameCarryover(
      {
        playthroughGeneration: 4,
        worldGraph: currentGraph,
        lastPlaythroughSummary: '',
      },
      {
        version: 3,
        slot: 2,
        realmId: 'other',
        currentNodeId: 'n1',
        stats: { ming_zhu: 100, gen_jiao: 100, jian_zhao: 100 },
        hais: {},
        items: [],
        clues: [],
        choiceHistory: [],
        yishiEntries: [],
        stepsTaken: 0,
        playthroughGeneration: 9,
        worldGraph: createEmptyWorldGraph(),
        lastPlaythroughSummary: 'saved-slot summary',
      }
    )

    expect(carryover.playthroughGeneration).toBe(4)
    expect(carryover.lastPlaythroughSummary).toContain('current-run summary')
  })
})
