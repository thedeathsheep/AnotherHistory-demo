import { describe, it, expect } from 'vitest'
import { HAI_IDS, HAI_LABELS, normalizeHais } from '@/game/types'

describe('haiCatalog', () => {
  it('defines 44 GDD hais', () => {
    expect(HAI_IDS.length).toBe(44)
    expect(new Set(HAI_IDS).size).toBe(44)
  })

  it('normalizeHais fills all keys', () => {
    const h = normalizeHais({ ling_sun: 5 })
    expect(Object.keys(h).length).toBe(44)
    expect(h.ling_sun).toBe(5)
    expect(h.tan_ta).toBe(0)
  })

  it('every id has a Chinese label', () => {
    for (const id of HAI_IDS) {
      expect(HAI_LABELS[id]?.length).toBeGreaterThan(0)
    }
  })
})
