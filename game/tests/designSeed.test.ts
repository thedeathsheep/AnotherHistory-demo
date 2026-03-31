import { describe, expect, it } from 'vitest'
import { mergeDesignSeedWithSkeleton, type DesignSeed } from '@/game/designSeed'
import type { Skeleton } from '@/game/types'

describe('mergeDesignSeedWithSkeleton', () => {
  it('preserves an existing realm mode when planner_seed overrides other fields', () => {
    const raw: DesignSeed = {
      world: {
        name: 'w',
        era: 'e',
        tone: ['t'],
        core_theme: 'c',
      },
      protagonist: {
        identity: 'p',
        goal: 'g',
      },
      realms: [
        {
          id: 'prologue',
          name: 'Prologue',
          mode: 'skeleton',
          theme: 'old',
          anchors: [],
        },
      ],
    }

    const skeleton: Skeleton = {
      realms: [
        {
          id: 'prologue',
          name: 'Prologue',
          entry_node: 'n1',
          nodes: [{ node_id: 'n1', description: '', choices: [] }],
          planner_seed: {
            theme: 'new',
            anchors: [
              {
                id: 'a1',
                description: 'anchor',
                position: 'early',
                must_include: ['x'],
              },
            ],
          },
        },
      ],
    }

    const merged = mergeDesignSeedWithSkeleton(raw, skeleton)
    expect(merged.realms).toHaveLength(1)
    expect(merged.realms[0]?.mode).toBe('skeleton')
    expect(merged.realms[0]?.theme).toBe('new')
  })
})
