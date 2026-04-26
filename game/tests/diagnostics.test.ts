import { describe, expect, it } from 'vitest'
import { clipText, redactSecrets } from '@/game/diagnostics/redact'
import {
  clearDiagnostics,
  emitDiag,
  exportDiagnosticsJson,
  getDiagnosticsSnapshot,
  setDiagMaxEntries,
} from '@/game/diagnostics/diagStore'
import { mergeSkeletonChoicesWithAi } from '@/game/choiceDisplay'

describe('diagnostics redact', () => {
  it('redacts common secret patterns', () => {
    const input = 'Authorization: Bearer sk-1234567890ABCDEF ping'
    const out = redactSecrets(input)
    expect(out).toContain('[REDACTED]')
    expect(out).not.toContain('sk-1234567890ABCDEF')
  })

  it('clips long text with ellipsis', () => {
    const t = 'a'.repeat(500)
    const out = clipText(t, 40)
    expect(out.length).toBeGreaterThan(0)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('diagnostics store', () => {
  it('keeps a bounded number of entries', () => {
    clearDiagnostics()
    setDiagMaxEntries(50)
    for (let i = 0; i < 120; i++) {
      emitDiag({ type: 'ai:request_start', phase: 'ai', label: `t${i}` })
    }
    const snap = getDiagnosticsSnapshot()
    expect(snap.length).toBe(50)
    expect(snap[0]!.event.type).toBe('ai:request_start')
  })

  it('exports JSON', () => {
    clearDiagnostics()
    emitDiag({ type: 'ai:request_start', phase: 'ai', label: 'x' })
    const json = exportDiagnosticsJson()
    expect(json.startsWith('[')).toBe(true)
    expect(json.includes('"ai:request_start"')).toBe(true)
  })
})

describe('choiceDisplay diagnostics', () => {
  it('emits a choices:merged event', () => {
    clearDiagnostics()
    const node = {
      node_id: 'test_node',
      description: '',
      plot_guide: ['x'],
      choices: [
        { text: 'A', next: 'n1', state: {} },
        { text: 'B', next: 'n2', state: {} },
      ],
    } as any
    const ai = [
      { text: 'AI-A', next: 'n1' },
      { text: 'AI-B', next: 'n2' },
    ] as any
    const out = mergeSkeletonChoicesWithAi(node, ai)
    expect(out.length).toBe(2)
    const snap = getDiagnosticsSnapshot()
    const merged = snap.find((e) => e.event.type === 'choices:merged')
    expect(merged).toBeTruthy()
    expect((merged!.event as any).nodeId).toBe('test_node')
  })
})

