import { useEffect, useMemo, useState } from 'react'
import {
  subscribeDiagnostics,
  clearDiagnostics,
  exportDiagnosticsJson,
  type DiagEntry,
} from '@/game/diagnostics'

type LevelFilter = 'all' | 'debug' | 'info' | 'warn' | 'error'

function matchesLevel(e: DiagEntry, level: LevelFilter): boolean {
  if (level === 'all') return true
  return e.level === level
}

function findNodeId(e: DiagEntry): string | null {
  const ev = e.event as any
  if (typeof ev?.nodeId === 'string') return ev.nodeId
  if (typeof ev?.fromNodeId === 'string') return ev.fromNodeId
  return null
}

function formatTime(t: number): string {
  try {
    const d = new Date(t)
    return d.toLocaleTimeString()
  } catch {
    return String(t)
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function DiagnosticsPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [lines, setLines] = useState<DiagEntry[]>([])
  const [level, setLevel] = useState<LevelFilter>('all')
  const [nodeFilter, setNodeFilter] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    subscribeDiagnostics(setLines)
    return () => subscribeDiagnostics(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const nf = nodeFilter.trim()
    return lines.filter((e) => {
      if (!matchesLevel(e, level)) return false
      if (!nf) return true
      const nid = findNodeId(e)
      return Boolean(nid && nid.includes(nf))
    })
  }, [lines, level, nodeFilter])

  const selected = useMemo(() => {
    if (selectedId == null) return null
    return lines.find((x) => x.id === selectedId) ?? null
  }, [lines, selectedId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10001] flex items-stretch justify-end" aria-label="诊断面板">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="relative w-[min(46rem,calc(100vw-1rem))] h-full ui-frame p-3 flex flex-col gap-3">
        <header className="flex items-center justify-between gap-2 border-b border-[var(--ui-frame-outer)] pb-2">
          <div className="text-[var(--dot-muted)]">Diagnostics</div>
          <div className="flex items-center gap-2">
            <button type="button" className="ui-btn px-2 py-1" onClick={onClose}>
              关闭
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[var(--dot-muted)]">Level</label>
          <select
            className="ui-btn px-2 py-1 bg-[var(--dot-bg)]"
            value={level}
            onChange={(e) => setLevel(e.target.value as LevelFilter)}
          >
            <option value="all">all</option>
            <option value="debug">debug</option>
            <option value="info">info</option>
            <option value="warn">warn</option>
            <option value="error">error</option>
          </select>

          <label className="text-[var(--dot-muted)] ml-2">nodeId</label>
          <input
            className="ui-btn px-2 py-1 bg-[var(--dot-bg)]"
            value={nodeFilter}
            onChange={(e) => setNodeFilter(e.target.value)}
            placeholder="e.g. prologue_01 / dyn:..."
          />

          <div className="flex-1" />
          <button
            type="button"
            className="ui-btn px-2 py-1"
            onClick={() => {
              clearDiagnostics()
              setSelectedId(null)
            }}
          >
            清空
          </button>
          <button
            type="button"
            className="ui-btn px-2 py-1"
            onClick={async () => {
              const ok = await copyText(exportDiagnosticsJson())
              setCopied(ok ? '已复制诊断 JSON' : '复制失败（浏览器权限）')
              window.setTimeout(() => setCopied(null), 2000)
            }}
          >
            导出 JSON
          </button>
        </div>

        {copied ? <div className="text-[var(--dot-accent-dim)]">{copied}</div> : null}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 min-h-0 flex-1">
          <section className="ui-frame p-2 min-h-0 flex flex-col gap-2">
            <div className="text-[var(--dot-muted)]">Timeline ({filtered.length}/{lines.length})</div>
            <div className="min-h-0 flex-1 overflow-y-auto font-mono text-[0.75rem] whitespace-pre-wrap break-words scrollbar-hidden">
              {filtered.map((e) => {
                const nid = findNodeId(e)
                const brief = `${formatTime(e.t)} [${e.level}] ${e.event.type}${nid ? ` (${nid})` : ''}`
                const active = selectedId === e.id
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`w-full text-left px-2 py-1 ui-btn ${active ? 'ui-btn-active' : ''}`}
                    onClick={() => setSelectedId(e.id)}
                  >
                    {brief}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="ui-frame p-2 min-h-0 flex flex-col gap-2">
            <div className="text-[var(--dot-muted)]">Details</div>
            <div className="min-h-0 flex-1 overflow-y-auto font-mono text-[0.75rem] whitespace-pre-wrap break-words scrollbar-hidden">
              {selected ? JSON.stringify(selected, null, 2) : '选择左侧一条事件查看细节。'}
            </div>
          </section>
        </div>

        <footer className="text-[var(--dot-muted)] text-[0.75rem] border-t border-[var(--ui-frame-outer)] pt-2">
          Tips: Esc 关闭；导出 JSON 后可直接粘贴给我定位问题。
        </footer>
      </aside>
    </div>
  )
}

