import type { StatKey } from '@/game/types'
import { statLabel } from '@/game/state'

interface Props {
  stats: Record<StatKey, number>
  className?: string
  /** When true, render only the three stat spans (no ui-frame) for embedding in another bar */
  inline?: boolean
}

export function StatusBox({ stats, className = '', inline }: Props) {
  const content = (
    <>
      <span className="text-[var(--dot-text)]">
        命烛: {stats.ming_zhu}% [{statLabel('ming_zhu', stats.ming_zhu)}]
      </span>
      <span className="text-[var(--dot-text)]">
        根脚: {stats.gen_jiao}% [{statLabel('gen_jiao', stats.gen_jiao)}]
      </span>
      <span className="text-[var(--dot-text)]">
        鉴照: {stats.jian_zhao}% [{statLabel('jian_zhao', stats.jian_zhao)}]
      </span>
    </>
  )
  if (inline) {
    return (
      <div
        className={`flex flex-wrap gap-3 shrink-0 ${className}`}
        style={{ fontSize: 'var(--dot-size)' }}
        aria-label="状态"
      >
        {content}
      </div>
    )
  }
  return (
    <section
      className={`ui-frame px-4 py-2 flex flex-wrap gap-3 ${className}`}
      style={{ fontSize: 'var(--dot-size)' }}
      aria-label="状态"
    >
      {content}
    </section>
  )
}
