
interface Props {
  entries: string[]
  className?: string
}

export function YishiBox({ entries, className = '' }: Props) {
  return (
    <section
      className={`rounded border border-stone-600 bg-stone-900/60 p-4 overflow-y-auto ${className}`}
      aria-label="卷轴"
    >
      <h2 className="text-stone-400 text-sm mb-2">《异史》卷轴</h2>
      {entries.length === 0 ? (
        <p className="text-stone-500 text-sm">尚未记录</p>
      ) : (
        <ul className="space-y-2 text-sm text-stone-300">
          {entries.map((text, i) => (
            <li key={i} className="border-l-2 border-stone-600 pl-2">
              [{i + 1}] {text}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
