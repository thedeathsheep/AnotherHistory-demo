import type { Choice } from '@/game/types'

interface Props {
  choices: Choice[]
  onSelect: (index: number) => void
  disabled?: boolean
  className?: string
}

export function ChoiceList({ choices, onSelect, disabled, className = '' }: Props) {
  return (
    <div
      className={`px-3 py-2 overflow-y-auto overflow-x-hidden scrollbar-hidden choice-list flex flex-col min-h-0 ${className}`}
      aria-label="感应"
    >
      <ul className="space-y-1.5 flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hidden">
        {choices.map((c, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              disabled={disabled}
              className="ui-btn choice-button w-full text-left px-3 py-2 whitespace-normal break-words min-h-[2.5rem]"
              style={{ fontSize: 'var(--dot-size)' }}
            >
              {c.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
