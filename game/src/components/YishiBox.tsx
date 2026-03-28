import type { RefObject } from 'react'
import type { YishiEntry } from '@/game/types'

interface Props {
  entries: YishiEntry[]
  className?: string
  lastEntryRef?: RefObject<HTMLLIElement>
}

function tagLabel(tags: YishiEntry['tags']): string {
  if (tags.includes('zhenshi')) return '真史'
  if (tags.includes('yiwei')) return '疑伪'
  if (tags.includes('hui')) return '秽'
  return ''
}

export function YishiBox({ entries, className = '', lastEntryRef }: Props) {
  return (
    <section
      className={`ui-frame p-4 overflow-y-auto yishi-box min-h-0 flex-1 flex flex-col ${className}`}
      aria-label="卷轴"
    >
      <h2 className="text-[var(--dot-muted)] mb-2 shrink-0" style={{ fontSize: 'var(--dot-size)' }}>《异史》卷轴</h2>
      {entries.length === 0 ? (
        <p className="text-[var(--dot-muted)] yishi-empty" style={{ fontSize: 'var(--dot-size)' }}>尚未记录</p>
      ) : (
        <ul className="space-y-2 text-[var(--dot-text)] yishi-entries flex-1 min-h-0 overflow-y-auto" style={{ fontSize: 'var(--dot-size)' }}>
          {entries.map((entry, i) => {
            const tl = tagLabel(entry.tags)
            return (
              <li
                key={i}
                ref={i === entries.length - 1 ? lastEntryRef : undefined}
                className="border-l-[3px] border-[var(--ui-frame)] pl-2"
              >
                [{i + 1}]
                {tl ? <span className="text-[var(--dot-accent-dim)] ml-1">〔{tl}〕</span> : null}{' '}
                {entry.text}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
