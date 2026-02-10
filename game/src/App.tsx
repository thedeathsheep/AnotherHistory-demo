import { useEffect, useState, useCallback } from 'react'
import { loadSkeleton } from '@/game/skeleton'
import { GameState } from '@/game/state'
import type { Skeleton, Node } from '@/game/types'
import { generateNodeNarrative, generateYishi, AI_DEBUG } from '@/game/aiBridge'
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
  const [regenerating, setRegenerating] = useState(false)
  const [regenerateError, setRegenerateError] = useState<string | null>(null)
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
          if (AI_DEBUG) console.log('[App] API key loaded:', key ? `yes (${key.slice(0, 8)}…)` : 'no')
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
    async (node: Node): Promise<string | null> => {
      const hasPlotGuide = (node.plot_guide ?? node.truth_anchors)?.length
      if (!game || !apiKey || !hasPlotGuide) return null
      const stateFilter = {
        ming_zhu: game.stats.ming_zhu,
        gen_jiao: game.stats.gen_jiao,
        jian_zhao: game.stats.jian_zhao,
      }
      const desc = await generateNodeNarrative(apiKey, node, game.realmName, stateFilter, {
        yishiEntries: game.yishiEntries,
        choiceHistory: game.choiceHistory,
      })
      return desc?.trim() || node.description || null
    },
    [game, apiKey]
  )

  // Must run on every render so hook order is stable (no hooks after early return)
  const node = game?.getCurrentNode() ?? null
  const currentNodeId = node?.node_id ?? null
  const realmName = game?.realmName ?? ''
  const useAi = Boolean(apiKey && (node?.plot_guide ?? node?.truth_anchors)?.length)

  useEffect(() => {
    if (loading || !skeleton || !game || !node || !useAi || !apiKey) return
    const nid = node.node_id
    if (cachedNarrative[nid] !== undefined) return

    let cancelled = false
    setNarrativeLoading(true)
    if (AI_DEBUG) console.log('[App] Trigger AI narrative for node:', nid)
    refreshNodeNarrative(node)
      .then((desc) => {
        if (!cancelled) {
          setCachedNarrative((prev) => ({ ...prev, [nid]: desc || node.description }))
          setCachedAiIsReal((prev) => ({ ...prev, [nid]: Boolean(desc?.trim()) }))
        }
      })
      .finally(() => {
        if (!cancelled) setNarrativeLoading(false)
      })
    return () => { cancelled = true }
  }, [loading, skeleton, game, currentNodeId, useAi, apiKey, node, refreshNodeNarrative, cachedNarrative])

  const handleRegenerateGenerated = async () => {
    if (!window.electronAPI?.regenerateGenerated || regenerating) return
    setRegenerateError(null)
    setRegenerating(true)
    try {
      const result = await window.electronAPI.regenerateGenerated('prologue')
      if (result.ok) window.location.reload()
      else setRegenerateError(result.error ?? '生成失败')
    } catch (e) {
      setRegenerateError(e instanceof Error ? e.message : '生成失败')
    } finally {
      setRegenerating(false)
    }
  }

  if (loading || !skeleton || !game) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        {error ? <p className="text-red-400">{error}</p> : <p className="text-stone-400">加载中…</p>}
        {window.electronAPI?.isElectron && (
          <button
            type="button"
            onClick={handleRegenerateGenerated}
            disabled={regenerating}
            className="text-sm px-3 py-1.5 rounded border border-stone-600 bg-stone-800 text-stone-400 hover:bg-stone-700 disabled:opacity-50"
          >
            {regenerating ? '生成中…' : '重新生成内容'}
          </button>
        )}
        {regenerateError && <p className="text-red-400 text-sm">{regenerateError}</p>}
      </div>
    )
  }

  const narrativeContent = yishiLoading
    ? '正在凝练异史…'
    : node && useAi && cachedNarrative[node.node_id] !== undefined
      ? (cachedAiIsReal[node.node_id] ? '【AI 生成】\n\n' : '') + cachedNarrative[node.node_id]
      : node
        ? narrativeLoading
          ? '正在感应…'
          : node.description
        : ''

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
      <header className="text-center py-2 border-b border-stone-700 flex flex-col gap-2">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-xl font-semibold text-stone-100">行旅 · Another History</h1>
          {window.electronAPI?.isElectron && (
            <button
              type="button"
              onClick={handleRegenerateGenerated}
              disabled={regenerating}
              className="text-xs px-2 py-1 rounded border border-stone-600 bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300 disabled:opacity-50"
              title="重新生成 generated 下全部内容（outline/nodes/texts/merged）并刷新"
            >
              {regenerating ? '生成中…' : '重新生成内容'}
            </button>
          )}
        </div>
        {regenerateError && (
          <p className="text-red-400 text-sm">{regenerateError}</p>
        )}
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
