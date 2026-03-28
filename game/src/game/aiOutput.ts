/**
 * Parse AI text for structured game updates (AI-E5–E7).
 */
import type { YishiEntry, YishiTag } from './types'

export interface AIOutputParsed {
  itemGained: string[]
  clueGained: string[]
}

const BOOK_SINK = /\[书箱一沉[：:]\s*([^\]]+)\]/g
const HEART_BRIGHT = /\[心头一亮[：:]\s*([^\]]+)\]/g

export function parseRewardMarkers(text: string): AIOutputParsed {
  const itemGained: string[] = []
  const clueGained: string[] = []
  let m: RegExpExecArray | null
  const t1 = text
  BOOK_SINK.lastIndex = 0
  while ((m = BOOK_SINK.exec(t1)) !== null) {
    const name = m[1].trim().replace(/^["']|["']$/g, '')
    if (name) itemGained.push(name)
  }
  HEART_BRIGHT.lastIndex = 0
  while ((m = HEART_BRIGHT.exec(t1)) !== null) {
    const name = m[1].trim().replace(/^["']|["']$/g, '')
    if (name) clueGained.push(name)
  }
  return { itemGained, clueGained }
}

/** Extract tag markers from yishi body text. */
export function parseYishiTagsFromText(text: string): YishiTag[] {
  const tags: YishiTag[] = []
  if (text.includes('[真史]')) tags.push('zhenshi')
  if (text.includes('[疑伪]')) tags.push('yiwei')
  if (text.includes('[秽]')) tags.push('hui')
  return tags.length ? tags : ['none']
}

export function createYishiEntry(rawText: string): YishiEntry {
  const text = rawText.trim()
  return {
    text,
    tags: parseYishiTagsFromText(text),
  }
}

/** Strip reward lines from narrative for display (optional). */
export function stripRewardMarkers(text: string): string {
  return text
    .replace(/\[书箱一沉[：:][^\]]+\]/g, '')
    .replace(/\[心头一亮[：:][^\]]+\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
