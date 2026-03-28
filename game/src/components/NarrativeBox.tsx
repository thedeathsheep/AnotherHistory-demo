import type { ReactNode } from 'react'

const FOOTER_HEIGHT = '2.75rem'

/** Parse *keyword* and [highlight] for 鉴照：清彻强高亮，混浊弱/糊，障目隐藏 */
function parseKeywordHighlights(
  content: string,
  jianZhaoLevel: '清彻' | '混浊' | '障目' | undefined
): ReactNode[] {
  if (!content) return []
  const showHighlight = jianZhaoLevel && jianZhaoLevel !== '障目'
  const starClass =
    jianZhaoLevel === '混浊'
      ? 'jianzhao-highlight jianzhao-highlight--turbid-star'
      : 'jianzhao-highlight jianzhao-highlight--clear-star'
  const bracketClass =
    jianZhaoLevel === '混浊'
      ? 'jianzhao-highlight-secondary jianzhao-highlight--turbid-bracket'
      : 'jianzhao-highlight-secondary jianzhao-highlight--clear-bracket'

  const segments = content.split(/(\*[^*]+\*|\[[^\]]+\])/g)
  return segments.map((seg, i) => {
    if (seg.startsWith('*') && seg.endsWith('*')) {
      return (
        <span key={i} className={showHighlight ? starClass : undefined}>
          {seg.slice(1, -1)}
        </span>
      )
    }
    if (seg.startsWith('[') && seg.endsWith(']')) {
      return (
        <span key={i} className={showHighlight ? bracketClass : undefined}>
          {seg.slice(1, -1)}
        </span>
      )
    }
    return seg
  })
}

interface Props {
  title: string
  content: string
  className?: string
  jianZhaoLevel?: '清彻' | '混浊' | '障目'
  reserveFooter?: boolean
  footerAction?: ReactNode
  /** True while Writer SSE is in progress (shows a subtle cursor). */
  streaming?: boolean
}

export function NarrativeBox({ title, content, className = '', jianZhaoLevel, reserveFooter, footerAction, streaming }: Props) {
  const parsedContent = parseKeywordHighlights(content, jianZhaoLevel)
  return (
    <section
      className={`ui-frame p-4 narrative-box flex flex-col min-h-0 overflow-hidden ${className}`}
      aria-label="叙事"
    >
      <h2 className="text-[var(--dot-muted)] mb-2 shrink-0" style={{ fontSize: 'var(--dot-size)' }}>{title}</h2>
      <div
        className="whitespace-pre-wrap text-[var(--dot-text)] narrative-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        style={{ fontSize: 'var(--dot-size)', lineHeight: 1.6 }}
      >
        {parsedContent}
        {streaming ? <span className="narrative-stream-cursor ml-0.5 inline-block w-2 animate-pulse opacity-70">▍</span> : null}
      </div>
      {reserveFooter ? (
        <div
          className="shrink-0 flex items-center mt-3 pt-3 border-t border-[var(--ui-frame-outer)]"
          style={{ minHeight: FOOTER_HEIGHT, height: FOOTER_HEIGHT }}
        >
          {footerAction ?? null}
        </div>
      ) : null}
    </section>
  )
}
