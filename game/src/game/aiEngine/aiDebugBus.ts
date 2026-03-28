/**
 * In-memory bus for VITE_AI_DEBUG UI overlay (mirrors console, does not replace it).
 */

const MAX_ENTRIES = 30

export type AiDebugLevel = 'log' | 'warn'

export interface AiDebugEntry {
  id: number
  t: number
  level: AiDebugLevel
  text: string
}

let seq = 0
let entries: AiDebugEntry[] = []
let listener: ((next: AiDebugEntry[]) => void) | null = null

export function subscribeAiDebug(fn: ((next: AiDebugEntry[]) => void) | null): void {
  listener = fn
  if (fn && entries.length) fn(entries)
}

export function emitAiDebug(text: string, level: AiDebugLevel = 'log'): void {
  seq += 1
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), { id: seq, t: Date.now(), level, text }]
  listener?.(entries)
}

export function clearAiDebug(): void {
  entries = []
  listener?.(entries)
}
