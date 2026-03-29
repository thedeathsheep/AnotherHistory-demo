import { describe, it, expect } from 'vitest'
import { flattenRealmNodes, normalizeLoadedRealm } from '@/game/types'
import type { Realm } from '@/game/types'

describe('D-1 realm flatten', () => {
  it('keeps flat nodes when present', () => {
    const r: Realm = {
      id: 'x',
      name: 'x',
      entry_node: 'a',
      nodes: [{ node_id: 'a', description: '', choices: [] }],
    }
    expect(flattenRealmNodes(r)).toHaveLength(1)
    expect(normalizeLoadedRealm(r).nodes).toHaveLength(1)
  })

  it('expands events -> plot_points -> nodes', () => {
    const r: Realm = {
      id: 'x',
      name: 'x',
      entry_node: 'n1',
      nodes: [],
      events: [
        {
          id: 'e1',
          plot_points: [
            {
              id: 'p1',
              nodes: [
                { node_id: 'n1', description: '1', choices: [] },
                { node_id: 'n2', description: '2', choices: [] },
              ],
            },
          ],
        },
      ],
    }
    const flat = flattenRealmNodes(r)
    expect(flat.map((n) => n.node_id)).toEqual(['n1', 'n2'])
    expect(normalizeLoadedRealm(r).nodes).toHaveLength(2)
  })
})
