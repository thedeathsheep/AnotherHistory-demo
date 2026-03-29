import type { StatKey, HaiId } from '@/game/types'
import { HAI_LABELS } from '@/game/types'
import { HAI_PLAYER_HINTS } from '@/game/haiCatalog'
import { statLabel } from '@/game/state'

interface Props {
  stats: Record<StatKey, number>
  hais?: Partial<Record<HaiId, number>>
  className?: string
  inline?: boolean
}

export function StatusBox({ stats, hais = {}, className = '', inline }: Props) {
  const activeHais = (Object.entries(hais) as [HaiId, number][]).filter(([, v]) => (v ?? 0) > 0)
  const severeHais = (Object.entries(hais) as [HaiId, number][]).filter(([, v]) => (v ?? 0) > 50)
  const content = (
    <>
      <span className="text-[var(--dot-text)]">命烛 [{statLabel('ming_zhu', stats.ming_zhu)}]</span>
      <span className="text-[var(--dot-text)]">根脚 [{statLabel('gen_jiao', stats.gen_jiao)}]</span>
      <span className="text-[var(--dot-text)]">鉴照 [{statLabel('jian_zhao', stats.jian_zhao)}]</span>
      {activeHais.map(([id]) => (
        <span key={id} className="text-[var(--dot-muted)] shrink-0">
          【{HAI_LABELS[id]}】
        </span>
      ))}
      {severeHais.length > 0 ? (
        <span
          className="text-[var(--dot-muted)] shrink-0 w-full basis-full"
          style={{ fontSize: '0.92em' }}
          title="害势偏高时的体感提示"
        >
          {severeHais.map(([id]) => (
            <span key={id} className="mr-2">
              {HAI_LABELS[id]}：{HAI_PLAYER_HINTS[id]}
            </span>
          ))}
        </span>
      ) : null}
    </>
  )
  if (inline) {
    return (
      <div
        className={`flex flex-wrap gap-x-3 gap-y-1 max-w-[min(100%,520px)] justify-end ${className}`}
        style={{ fontSize: 'var(--dot-size)' }}
        aria-label="状态"
      >
        {content}
      </div>
    )
  }
  return (
    <section
      className={`ui-frame px-4 py-2 flex flex-wrap gap-x-3 gap-y-1 ${className}`}
      style={{ fontSize: 'var(--dot-size)' }}
      aria-label="状态"
    >
      {content}
    </section>
  )
}
