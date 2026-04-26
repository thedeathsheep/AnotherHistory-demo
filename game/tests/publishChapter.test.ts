import { describe, expect, it } from 'vitest'
import { buildPublishOutputs } from '../scripts/publish-chapter.mjs'

describe('buildPublishOutputs', () => {
  it('publishes prologue to its standalone data file', () => {
    const realm = { id: 'prologue', name: '序章', entry_node: 'scene_1', nodes: [] }

    const outputs = buildPublishOutputs('prologue', realm)

    expect(outputs).toHaveLength(1)
    expect(outputs[0]?.path).toBe('public/data/prologue.json')
    expect(outputs[0]?.content).toEqual(realm)
  })

  it('publishes generated realm back into skeleton while preserving planner seed', () => {
    const skeleton = {
      realms: [
        {
          id: 'ZheJiYuan',
          name: '折戟原',
          entry_node: 'old_entry',
          planner_seed: { theme: 'old theme' },
          custom_flag: true,
          nodes: [{ node_id: 'old_node', description: 'old' }],
        },
        {
          id: 'OtherRealm',
          name: '别界',
          entry_node: 'other_entry',
          nodes: [{ node_id: 'other_node', description: 'stay' }],
        },
      ],
    }
    const generatedRealm = {
      id: '折戟原',
      name: '折戟原',
      entry_node: 'ZheJiYuan_01',
      nodes: [{ node_id: 'ZheJiYuan_01', description: 'new' }],
    }

    const outputs = buildPublishOutputs('折戟原', generatedRealm, skeleton)

    expect(outputs).toHaveLength(1)
    expect(outputs[0]?.path).toBe('public/data/skeleton.json')
    expect(outputs[0]?.content).toEqual({
      realms: [
        {
          id: 'ZheJiYuan',
          name: '折戟原',
          entry_node: 'ZheJiYuan_01',
          planner_seed: { theme: 'old theme' },
          custom_flag: true,
          nodes: [{ node_id: 'ZheJiYuan_01', description: 'new' }],
        },
        {
          id: 'OtherRealm',
          name: '别界',
          entry_node: 'other_entry',
          nodes: [{ node_id: 'other_node', description: 'stay' }],
        },
      ],
    })
  })
})
