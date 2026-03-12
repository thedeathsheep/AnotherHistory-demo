import type { RefObject } from 'react'

interface Props {
  entries: string[]
  className?: string
  /** Ref for the last entry <li> so parent can read its rect for fly-in animation */
  lastEntryRef?: RefObject<HTMLLIElement>
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
          {entries.map((text, i) => (
            <li
              key={i}
              ref={i === entries.length - 1 ? lastEntryRef : undefined}
              className="border-l-[3px] border-[var(--ui-frame)] pl-2"
            >
              [{i + 1}] {text}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
