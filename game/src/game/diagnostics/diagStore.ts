import type { DiagEntry, DiagEvent, DiagLevel } from './diagTypes'
import { clipText } from './redact'

const MAX_ENTRIES_DEFAULT = 400

type Listener = (next: DiagEntry[]) => void

let seq = 0
let entries: DiagEntry[] = []
let listener: Listener | null = null
let maxEntries = MAX_ENTRIES_DEFAULT

export function setDiagMaxEntries(n: number): void {
  const next = Number.isFinite(n) ? Math.max(50, Math.min(2000, Math.round(n))) : MAX_ENTRIES_DEFAULT
  maxEntries = next
  if (entries.length > maxEntries) entries = entries.slice(-maxEntries)
  listener?.(entries)
}

export function subscribeDiagnostics(fn: Listener | null): void {
  listener = fn
  if (fn && entries.length) fn(entries)
}

export function clearDiagnostics(): void {
  entries = []
  listener?.(entries)
}

export function getDiagnosticsSnapshot(): DiagEntry[] {
  return entries
}

export function exportDiagnosticsJson(maxLen = 200_000): string {
  const payload = JSON.stringify(entries)
  return payload.length <= maxLen ? payload : clipText(payload, maxLen)
}

function normalizeLevel(e: DiagEvent): DiagLevel {
  if ((e as { level?: DiagLevel }).level) return (e as { level: DiagLevel }).level
  switch (e.type) {
    case 'ai:request_fail':
      return e.level === 'error' ? 'error' : 'warn'
    default:
      return 'info'
  }
}

export function emitDiag(event: DiagEvent): void {
  seq += 1
  const level = normalizeLevel(event)
  const entry: DiagEntry = { id: seq, t: Date.now(), level, event }
  entries = [...entries.slice(-(maxEntries - 1)), entry]
  listener?.(entries)
}

