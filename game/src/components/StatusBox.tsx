import type { StatKey, HaiId } from '@/game/types'
import { HAI_LABELS } from '@/game/types'
import { HAI_PLAYER_HINTS } from '@/game/haiCatalog'
import { statLabel } from '@/game/state'
import { Tooltip } from '@/components/Tooltip'
import {
  ttHaiChip,
  TT_HAI_SEVERE_ROW,
  TT_STAT_GEN_JIAO,
  TT_STAT_JIAN_ZHAO,
  TT_STAT_MING_ZHU,
} from '@/content/playerTooltips'

interface Props {
  stats: Record<StatKey, number>
  hais?: Partial<Record<HaiId, number>>
  className?: string
  inline?: boolean
}

export function StatusBox({ stats, hais = {}, className = '', inline }: Props) {
  const activeHais = (Object.entries(hais) as [HaiId, number][]).filter(([, v]) => (v ?? 0) > 0)
  const severeHais = (Object.entries(hais) as [HaiId, number][]).filter(([, v]) => (v ?? 0) > 50)

  const ming = (
    <span className="text-[var(--dot-text)] cursor-default">
      命烛 [{statLabel('ming_zhu', stats.ming_zhu)}]
    </span>
  )
  const gen = (
    <span className="text-[var(--dot-text)] cursor-default">
      根脚 [{statLabel('gen_jiao', stats.gen_jiao)}]
    </span>
  )
  const jz = (
    <span className="text-[var(--dot-text)] cursor-default">
      鉴照 [{statLabel('jian_zhao', stats.jian_zhao)}]
    </span>
  )

  const content = (
    <>
      <Tooltip content={TT_STAT_MING_ZHU}>{ming}</Tooltip>
      <Tooltip content={TT_STAT_GEN_JIAO}>{gen}</Tooltip>
      <Tooltip content={TT_STAT_JIAN_ZHAO}>{jz}</Tooltip>
      {activeHais.map(([id]) => (
        <Tooltip key={id} content={ttHaiChip(id)}>
          <span className="text-[var(--dot-muted)] shrink-0 cursor-default">
            【{HAI_LABELS[id]}】
          </span>
        </Tooltip>
      ))}
      {severeHais.length > 0 ? (
        <Tooltip content={TT_HAI_SEVERE_ROW}>
          <span
            className="text-[var(--dot-muted)] shrink-0 w-full basis-full cursor-default"
            style={{ fontSize: '0.92em' }}
          >
            {severeHais.map(([id]) => (
              <span key={id} className="mr-2">
                {HAI_LABELS[id]}：{HAI_PLAYER_HINTS[id]}
              </span>
            ))}
          </span>
        </Tooltip>
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
