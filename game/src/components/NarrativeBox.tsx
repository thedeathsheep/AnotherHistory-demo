import type { ReactNode } from 'react'

const FOOTER_HEIGHT = '2.75rem' // fixed height to avoid layout jump

interface Props {
  title: string
  content: string
  className?: string
  /** When true, always show a fixed-height footer bar (stable layout when in conclusion) */
  reserveFooter?: boolean
  /** Rendered in the footer bar (e.g. "写入卷轴" button). Empty space when null. */
  footerAction?: ReactNode
}

export function NarrativeBox({ title, content, className = '', reserveFooter, footerAction }: Props) {
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
        {content}
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
