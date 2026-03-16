import type { StatKey, HaiId } from '@/game/types'
import { HAI_LABELS } from '@/game/types'
import { statLabel } from '@/game/state'

interface Props {
  stats: Record<StatKey, number>
  /** 害强度，仅展示名称（不展示数值） */
  hais?: Partial<Record<HaiId, number>>
  className?: string
  /** When true, render only the three stat spans (no ui-frame) for embedding in another bar */
  inline?: boolean
}

export function StatusBox({ stats, hais = {}, className = '', inline }: Props) {
  const activeHais = (Object.entries(hais) as [HaiId, number][]).filter(([, v]) => (v ?? 0) > 0)
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
      {activeHais.map(([id]) => (
        <span key={id} className="text-[var(--dot-muted)]">
          【{HAI_LABELS[id]}】
        </span>
      ))}
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
