import type { ReactNode } from 'react'

const FOOTER_HEIGHT = '2.75rem' // fixed height to avoid layout jump

/** Parse *keyword* and [highlight] for 鉴照高亮; jianZhaoLevel 障目时不高亮 */
function parseKeywordHighlights(
  content: string,
  jianZhaoLevel: '清彻' | '混浊' | '障目' | undefined
): ReactNode[] {
  if (!content) return []
  const showHighlight = jianZhaoLevel && jianZhaoLevel !== '障目'
  const segments = content.split(/(\*[^*]+\*|\[[^\]]+\])/g)
  return segments.map((seg, i) => {
    if (seg.startsWith('*') && seg.endsWith('*')) {
      return (
        <span
          key={i}
          className={showHighlight ? 'keyword-highlight' : undefined}
        >
          {seg.slice(1, -1)}
        </span>
      )
    }
    if (seg.startsWith('[') && seg.endsWith(']')) {
      return (
        <span
          key={i}
          className={showHighlight ? 'keyword-highlight-secondary' : undefined}
        >
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
  /** 鉴照档位：清彻/混浊显示高亮，障目时不高亮 */
  jianZhaoLevel?: '清彻' | '混浊' | '障目'
  /** When true, always show a fixed-height footer bar (stable layout when in conclusion) */
  reserveFooter?: boolean
  /** Rendered in the footer bar (e.g. "收入卷轴" button). Empty space when null. */
  footerAction?: ReactNode
}

export function NarrativeBox({ title, content, className = '', jianZhaoLevel, reserveFooter, footerAction }: Props) {
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
