import type { Item } from '@/game/types'

interface Props {
  items: Item[]
}

export function ItemBox({ items }: Props) {
  if (!items.length) {
    return <p className="text-[var(--dot-muted)] m-0">书箱空空。</p>
  }
  return (
    <ul className="list-none m-0 p-0 space-y-3" aria-label="物证">
      {items.map((it) => (
        <li key={it.id} className="border-l-[3px] border-[var(--ui-frame)] pl-2">
          <span className="text-[var(--dot-accent)]">[{it.category}]</span> {it.name}
          {it.description ? (
            <p className="text-[var(--dot-muted)] mt-1 mb-0 whitespace-pre-wrap">{it.description}</p>
          ) : null}
          {it.passiveEffect ? (
            <p className="text-[var(--dot-muted)] mt-1 mb-0 text-sm opacity-90">{it.passiveEffect}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
