import { useCallback, useState } from 'react'
import type { Choice } from '@/game/types'

interface Props {
  choices: Choice[]
  onSelect: (index: number) => void
  disabled?: boolean
  className?: string
  /** 【惊蛰】害强度 0–100：选项抖动；高值时概率误触不生效 */
  jingZheLevel?: number
  /** 误触时回调（叠害、扣根脚等由上层处理） */
  onJingZheMisclick?: () => void
}

function misclickProbability(level: number): number {
  if (level <= 0) return 0
  return Math.min(0.38, 0.08 + level / 220)
}

export function ChoiceList({
  choices,
  onSelect,
  disabled,
  className = '',
  jingZheLevel = 0,
  onJingZheMisclick,
}: Props) {
  const [flash, setFlash] = useState<string | null>(null)
  const jz = jingZheLevel ?? 0
  const jitter = jz > 0
  const heavy = jz > 55

  const handlePick = useCallback(
    (index: number) => {
      if (disabled) return
      if (jz > 30 && onJingZheMisclick && Math.random() < misclickProbability(jz)) {
        onJingZheMisclick()
        setFlash('手一抖，点偏了——神经被响动扯了一下。')
        window.setTimeout(() => setFlash(null), 2200)
        return
      }
      onSelect(index)
    },
    [disabled, jz, onJingZheMisclick, onSelect]
  )

  return (
    <div
      className={`px-3 py-2 overflow-y-auto overflow-x-hidden scrollbar-hidden choice-list flex flex-col min-h-0 gap-1 ${className}`}
      aria-label="感应"
    >
      {flash ? (
        <p
          className="text-[var(--dot-accent)] shrink-0 mb-1 border border-[var(--dot-accent-dim)] px-2 py-1"
          style={{ fontSize: 'var(--dot-size)' }}
          role="status"
        >
          {flash}
        </p>
      ) : null}
      <ul className="space-y-1.5 flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hidden">
        {choices.map((c, i) => (
          <li
            key={i}
            className={jitter ? `jingzhe-choice-li ${heavy ? 'jingzhe-choice-li--heavy' : ''}` : undefined}
            style={
              jitter
                ? { animationDelay: `${(i % 5) * 0.12}s` }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => handlePick(i)}
              disabled={disabled}
              className={`ui-btn choice-button w-full text-left px-3 py-2 whitespace-normal break-words min-h-[2.5rem] ${jitter ? 'jingzhe-choice-btn' : ''}`}
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
