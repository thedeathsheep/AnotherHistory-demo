import React, { useEffect, useState, useCallback } from 'react'
import { loadSkeleton } from '@/game/skeleton'
import { GameState, statLabel } from '@/game/state'
import type { Skeleton, Node, Choice, StatKey } from '@/game/types'
import { generateNodeNarrative, generateYishi } from '@/game/aiBridge'
import { getApiKey } from '@/config'
import { NarrativeBox } from '@/components/NarrativeBox'
import { StatusBox } from '@/components/StatusBox'
import { ChoiceList } from '@/components/ChoiceList'
import { YishiBox } from '@/components/YishiBox'

export default function App() {
  const [skeleton, setSkeleton] = useState<Skeleton | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [cachedNarrative, setCachedNarrative] = useState<Record<string, string>>({})
  const [cachedAiIsReal, setCachedAiIsReal] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [yishiLoading, setYishiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const forceUpdate = () => setTick((t) => t + 1)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const sk = await loadSkeleton()
        const key = await getApiKey()
        if (!cancelled) {
          setSkeleton(sk)
          setApiKey(key)
          const g = new GameState(sk)
          g.startRealm()
          setGame(g)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const refreshNodeNarrative = useCallback(
    async (node: Node) => {
      if (!game || !apiKey || !node.truth_anchors?.length) return
      const nid = node.node_id
      if (cachedNarrative[nid] !== undefined) return
      setNarrativeLoading(true)
      try {
        const stateFilter = {
          ming_zhu: game.stats.ming_zhu,
          gen_jiao: game.stats.gen_jiao,
          jian_zhao: game.stats.jian_zhao,
        }
        const desc = await generateNodeNarrative(apiKey, node, game.realmName, stateFilter)
        setCachedNarrative((prev) => ({ ...prev, [nid]: desc?.trim() || node.description }))
        setCachedAiIsReal((prev) => ({ ...prev, [nid]: Boolean(desc?.trim()) }))
      } finally {
        setNarrativeLoading(false)
      }
    },
    [game, apiKey, cachedNarrative]
  )

  if (loading || !skeleton || !game) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        {error ? <p className="text-red-400">{error}</p> : <p className="text-stone-400">加载中…</p>}
      </div>
    )
  }

  const node = game.getCurrentNode()
  const realmName = game.realmName
  const useAi = Boolean(apiKey && node?.truth_anchors?.length)
  const narrativeContent = yishiLoading
    ? '正在凝练异史…'
    : node && useAi && cachedNarrative[node.node_id] !== undefined
      ? (cachedAiIsReal[node.node_id] ? '【AI 生成】\n\n' : '') + cachedNarrative[node.node_id]
      : node
        ? narrativeLoading
          ? '正在感应…'
          : node.description
        : ''

  // Trigger AI fetch when entering a node that has truth_anchors and no cache yet
  if (node && useAi && cachedNarrative[node.node_id] === undefined && !narrativeLoading) {
    refreshNodeNarrative(node)
  }

  const handleChoice = async (index: number) => {
    if (!node || index < 0 || index >= node.choices.length) return
    const choice = node.choices[index]
    const { conclusionLabel } = game.applyChoice(choice)
    forceUpdate()

    if (conclusionLabel) {
      setYishiLoading(true)
      try {
        const text = apiKey
          ? await generateYishi(apiKey, game.realmName, game.getChoiceSummaryForYishi(), conclusionLabel)
          : null
        const fallback = `乙巳年，${game.realmName}。有行者入，记之曰：${conclusionLabel}。`
        const final = text?.trim() || fallback
        game.addYishiEntry(text?.trim() ? '【AI 凝练】 ' + final : final)
      } finally {
        setYishiLoading(false)
        forceUpdate()
      }
    }
  }

  const handleRestart = () => {
    const g = new GameState(skeleton)
    g.startRealm()
    setGame(g)
    setCachedNarrative({})
    setCachedAiIsReal({})
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 gap-4">
      <header className="text-center py-2 border-b border-stone-700">
        <h1 className="text-xl font-semibold text-stone-100">行旅 · Another History</h1>
      </header>

      <NarrativeBox
        title={node ? `【境遇：${realmName}】` : yishiLoading ? '【凝练异史】' : realmName ? `【境遇：${realmName}】` : ''}
        content={
          game.isGameOver()
            ? '【命烛熄灭 / 根脚化外 / 鉴照障目】异史君已无法继续。游戏结束。'
            : !node && game.yishiEntries.length
              ? '【结案】本段行旅已归档。异史已写入卷轴。'
              : narrativeContent || '（无当前节点）'
        }
        className="flex-1 min-h-[200px]"
      />

      <StatusBox stats={game.stats} />

      {game.isGameOver() ? (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={handleRestart}
            className="px-6 py-2 rounded border border-stone-500 bg-stone-800 hover:bg-stone-700"
          >
            重新开始
          </button>
        </div>
      ) : !node && game.yishiEntries.length ? (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={handleRestart}
            className="px-6 py-2 rounded border border-stone-500 bg-stone-800 hover:bg-stone-700"
          >
            再玩一次
          </button>
        </div>
      ) : node ? (
        <ChoiceList
          choices={node.choices}
          onSelect={handleChoice}
          disabled={narrativeLoading || yishiLoading}
          className="min-h-[120px]"
        />
      ) : null}

      <YishiBox entries={game.yishiEntries} className="max-h-[180px]" />
    </div>
  )
}
