import type { Item, RealmNpc } from './types'

export function pickNpcSupplements(npcs: RealmNpc[] = []): RealmNpc[] {
  return npcs.slice(0, 2)
}

export function pickItemSupplement(items: Item[] = []): Item | null {
  if (!items.length) return null
  return items[items.length - 1] ?? null
}

export function wrapSupplementLine(text: string): string {
  const t = text.trim()
  if (!t) return ''
  if ((t.startsWith('（') && t.endsWith('）')) || (t.startsWith('(') && t.endsWith(')'))) return t
  return `（${t}）`
}

export function formatSupplementBlock(lines: string[]): string {
  return lines.map((line) => wrapSupplementLine(line)).filter(Boolean).join('\n')
}

export function isAsideLine(line: string): boolean {
  const t = line.trim()
  return (t.startsWith('（') && t.endsWith('）')) || (t.startsWith('(') && t.endsWith(')'))
}
