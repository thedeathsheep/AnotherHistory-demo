import { useEffect, useState, useRef } from 'react'
import { AI_DEBUG } from '@/game/aiBridge'
import { subscribeAiDebug, clearAiDebug, type AiDebugEntry } from '@/game/aiEngine/aiDebugBus'

/** Bottom-right scrollable log when VITE_AI_DEBUG=1; container is pointer-events-none except panel. */
export function AiDebugOverlay() {
  const [lines, setLines] = useState<AiDebugEntry[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!AI_DEBUG) return
    subscribeAiDebug(setLines)
    return () => subscribeAiDebug(null)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  if (!AI_DEBUG) return null

  return (
    <div
      className="fixed bottom-16 right-2 md:bottom-2 z-[10000] max-w-[min(24rem,calc(100vw-1rem))] pointer-events-none flex flex-col gap-1 items-end"
      aria-label="AI 调试日志"
    >
      <div
        className="pointer-events-auto ui-frame p-2 text-left w-full flex flex-col gap-1 shadow-lg border border-[var(--dot-accent-dim)] bg-[var(--dot-bg)]/95"
        style={{ fontSize: '0.7rem', lineHeight: 1.35 }}
      >
        <div className="flex justify-between items-center gap-2 shrink-0 border-b border-[var(--ui-frame-outer)] pb-1 mb-1">
          <span className="text-[var(--dot-muted)]">AI debug</span>
          <button
            type="button"
            className="ui-btn px-2 py-0.5 text-[0.65rem]"
            onClick={() => clearAiDebug()}
          >
            清空
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto font-mono whitespace-pre-wrap break-words text-[var(--dot-text)]">
          {lines.map((e) => (
            <div
              key={e.id}
              className={e.level === 'warn' ? 'text-amber-400/95' : 'text-[var(--dot-muted)]'}
            >
              {e.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  )
}
