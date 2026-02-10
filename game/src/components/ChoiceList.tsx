import type { Choice } from '@/game/types'

interface Props {
  choices: Choice[]
  onSelect: (index: number) => void
  disabled?: boolean
  className?: string
}

export function ChoiceList({ choices, onSelect, disabled, className = '' }: Props) {
  return (
    <section
      className={`rounded border border-stone-600 bg-stone-900/80 p-4 overflow-y-auto ${className}`}
      aria-label="感应"
    >
      <h2 className="text-stone-400 text-sm mb-2">【感应】</h2>
      <ul className="space-y-2">
        {choices.map((c, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              disabled={disabled}
              className="w-full text-left px-3 py-2 rounded border border-stone-600 hover:bg-stone-700 hover:border-stone-500 disabled:opacity-50 transition"
            >
              {c.text}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
