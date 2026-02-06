import React from 'react'
import type { StatKey } from '@/game/types'
import { statLabel } from '@/game/state'

interface Props {
  stats: Record<StatKey, number>
  className?: string
}

export function StatusBox({ stats, className = '' }: Props) {
  return (
    <section
      className={`rounded border border-stone-600 bg-stone-900/60 px-4 py-2 flex flex-wrap gap-4 ${className}`}
      aria-label="状态"
    >
      <span>
        命烛: {stats.ming_zhu}% [{statLabel('ming_zhu', stats.ming_zhu)}]
      </span>
      <span>
        根脚: {stats.gen_jiao}% [{statLabel('gen_jiao', stats.gen_jiao)}]
      </span>
      <span>
        鉴照: {stats.jian_zhao}% [{statLabel('jian_zhao', stats.jian_zhao)}]
      </span>
    </section>
  )
}
