import type { Clue } from '@/game/types'

interface Props {
  clues: Clue[]
}

export function ClueBox({ clues }: Props) {
  if (!clues.length) {
    return <p className="text-[var(--dot-muted)] m-0">尚无头绪。</p>
  }
  return (
    <ul className="list-none m-0 p-0 space-y-3" aria-label="线索">
      {clues.map((c) => (
        <li key={c.id} className="border-l-[3px] border-[var(--dot-accent-dim)] pl-2">
          <span className="text-[var(--dot-accent-dim)]">[{c.category}]</span> {c.name}
          {c.description ? (
            <p className="text-[var(--dot-muted)] mt-1 mb-0 whitespace-pre-wrap">{c.description}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
