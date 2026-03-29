import { describe, it, expect } from 'vitest'
import { parseOutline } from '@/game/aiEngine/agents/planner'

describe('parseOutline', () => {
  it('accepts valid JSON for realm', () => {
    const json = JSON.stringify({
      realm_id: 'prologue',
      beats: [
        { beat_id: 'b1', type: 'setup', summary: 'a', tension: 0.2 },
        { beat_id: 'b2', type: 'rising', summary: 'b', tension: 0.4 },
        { beat_id: 'b3', type: 'climax', summary: 'c', tension: 0.8 },
      ],
    })
    const o = parseOutline(json, 'prologue')
    expect(o?.beats.length).toBe(3)
    expect(o?.realm_id).toBe('prologue')
  })

  it('returns null on wrong realm_id', () => {
    const json = JSON.stringify({
      realm_id: 'other',
      beats: [
        { beat_id: 'b1', type: 'setup', summary: 'a', tension: 0.2 },
        { beat_id: 'b2', type: 'rising', summary: 'b', tension: 0.4 },
        { beat_id: 'b3', type: 'climax', summary: 'c', tension: 0.8 },
      ],
    })
    expect(parseOutline(json, 'prologue')).toBeNull()
  })
})
