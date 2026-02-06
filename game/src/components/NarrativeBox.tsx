import React from 'react'

interface Props {
  title: string
  content: string
  className?: string
}

export function NarrativeBox({ title, content, className = '' }: Props) {
  return (
    <section
      className={`rounded border border-stone-600 bg-stone-900/80 p-4 overflow-y-auto ${className}`}
      aria-label="叙事"
    >
      <h2 className="text-stone-400 text-sm mb-2">{title}</h2>
      <div className="whitespace-pre-wrap text-stone-200 leading-relaxed">{content}</div>
    </section>
  )
}
