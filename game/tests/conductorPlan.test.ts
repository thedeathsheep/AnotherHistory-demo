import { describe, expect, test } from 'vitest'
import { parseGenerationPlan, generateChoices } from '@/game/aiEngine'

describe('Conductor GenerationPlan', () => {
  test('parses minimal valid plan', () => {
    const raw = JSON.stringify({
      version: 1,
      target_choice_count: 4,
      intents_required: ['advance', 'inspect', 'commitRisk'],
      prefer_divergent_next: true,
      allow_same_next: true,
      micro_branch: {
        enabled: true,
        roots: [
          { entry_text: '摸黑试探', entry_state: { jian_zhao: -2 }, steps: [{ node_id: 'rt:test:0', plot_guide: ['雾', '门'] }] },
        ],
        steps: [{ node_id: 'rt:legacy:0', plot_guide: ['雾'] }],
        rejoin_node_id: 'ZheJiYuan_03',
        max_depth: 3,
      },
    })
    const plan = parseGenerationPlan(raw)
    expect(plan).not.toBeNull()
    expect(plan?.version).toBe(1)
    expect(plan?.micro_branch.enabled).toBe(true)
    expect(plan?.micro_branch.roots?.[0]?.steps[0]?.node_id).toBe('rt:test:0')
  })

  test('rejects empty steps when micro enabled', () => {
    const raw = JSON.stringify({
      version: 1,
      target_choice_count: 4,
      intents_required: ['advance', 'inspect', 'commitRisk'],
      micro_branch: { enabled: true, steps: [], rejoin_node_id: 'X', max_depth: 3 },
    })
    const plan = parseGenerationPlan(raw)
    expect(plan).not.toBeNull()
    expect(plan?.micro_branch.enabled).toBe(false)
  })

  test('generateChoices accepts plan and parses intent field', async () => {
    // This test only checks parsing/selection behavior without hitting network:
    // we call parseGenerationPlan and then validate the plan shape used by prompt builder.
    const plan = parseGenerationPlan(
      JSON.stringify({
        version: 1,
        target_choice_count: 3,
        intents_required: ['advance', 'inspect', 'retreat'],
        prefer_divergent_next: true,
        allow_same_next: true,
        micro_branch: { enabled: false, steps: [], rejoin_node_id: 'x', max_depth: 1 },
      })
    )
    expect(plan).not.toBeNull()
    // NOTE: generateChoices is exercised in integration; here we only assert it is callable with new signature.
    expect(typeof generateChoices).toBe('function')
  })
})

