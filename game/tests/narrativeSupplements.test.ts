import { describe, expect, it } from 'vitest'
import {
  formatSupplementBlock,
  isAsideLine,
  pickItemSupplement,
  pickNpcSupplements,
  wrapSupplementLine,
} from '../src/game/narrativeSupplements'

describe('narrativeSupplements', () => {
  it('picks up to 2 NPCs in order', () => {
    const npcs = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]
    expect(pickNpcSupplements(npcs).map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('picks the most recent item (last in list)', () => {
    const items = [{ id: 'x', name: 'X' }, { id: 'y', name: 'Y' }]
    expect(pickItemSupplement(items)?.id).toBe('y')
  })

  it('wraps supplement line with parentheses once', () => {
    expect(wrapSupplementLine('一段补光')).toBe('（一段补光）')
    expect(wrapSupplementLine('（已有括号）')).toBe('（已有括号）')
    expect(wrapSupplementLine('  （已有括号）  ')).toBe('（已有括号）')
  })

  it('formats supplement block with newline separation', () => {
    expect(formatSupplementBlock(['第一句', '第二句'])).toBe('（第一句）\n（第二句）')
    expect(formatSupplementBlock([])).toBe('')
  })

  it('detects aside line by parentheses', () => {
    expect(isAsideLine('（补光）')).toBe(true)
    expect(isAsideLine('(补光)')).toBe(true)
    expect(isAsideLine('正常正文')).toBe(false)
  })
})
