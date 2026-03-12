import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { loadSkeleton } from '@/game/skeleton'
import { GameState } from '@/game/state'
import type { Skeleton, Node } from '@/game/types'
import { generateNodeNarrative, generateYishi, AI_DEBUG } from '@/game/aiBridge'
import { getApiKey } from '@/config'
import { NarrativeBox } from '@/components/NarrativeBox'
import { StatusBox } from '@/components/StatusBox'
import { ChoiceList } from '@/components/ChoiceList'
import { YishiBox } from '@/components/YishiBox'

type FlyState = {
  text: string
  sourceRect: DOMRect
  targetRect: DOMRect | null
  applyTarget: boolean
}

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
  const [pendingYishi, setPendingYishi] = useState<string | null>(null)
  const [flyState, setFlyState] = useState<FlyState | null>(null)
  const pendingYishiRef = useRef<HTMLButtonElement>(null)
  const lastEntryRef = useRef<HTMLLIElement>(null)
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
  // Use runtime AI only when node has no batch/skeleton description (avoid overwriting merged copy)
  const useAi = Boolean(
    apiKey &&
      (node?.plot_guide ?? node?.truth_anchors)?.length &&
      !(node?.description?.trim())
  )

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

  // All hooks must run before any early return (same count every render)
  useEffect(() => {
    if (!flyState || flyState.targetRect !== null) return
    const id = requestAnimationFrame(() => {
      const el = lastEntryRef.current
      if (!el) return
      const targetRect = el.getBoundingClientRect()
      setFlyState((prev) => (prev ? { ...prev, targetRect } : null))
    })
    return () => cancelAnimationFrame(id)
  }, [flyState?.targetRect, flyState, game?.yishiEntries?.length])

  useLayoutEffect(() => {
    if (!flyState?.targetRect || flyState.applyTarget) return
    const id = requestAnimationFrame(() => {
      setFlyState((prev) => (prev ? { ...prev, applyTarget: true } : null))
    })
    return () => cancelAnimationFrame(id)
  }, [flyState?.targetRect, flyState?.applyTarget])

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

  const showNarrativeContent =
    game?.isGameOver()
      ? '【命烛熄灭 / 根脚化外 / 鉴照障目】异史君已无法继续。游戏结束。'
      : !node && pendingYishi
        ? `【凝练完成】异史已就。点击下方「写入卷轴」收入卷轴。\n\n${pendingYishi}`
        : !node && game?.yishiEntries.length && !pendingYishi
          ? '【结案】本段行旅已归档。异史已写入卷轴。'
          : narrativeContent || '（无当前节点）'

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
        const entryText = text?.trim() ? '【AI 凝练】 ' + final : final
        setPendingYishi(entryText)
      } finally {
        setYishiLoading(false)
        forceUpdate()
      }
    }
  }

  const handleWriteYishiToScroll = () => {
    if (!pendingYishi || !game || !pendingYishiRef.current) return
    const sourceRect = pendingYishiRef.current.getBoundingClientRect()
    game.addYishiEntry(pendingYishi)
    setPendingYishi(null)
    setFlyState({ text: pendingYishi, sourceRect, targetRect: null, applyTarget: false })
    forceUpdate()
  }

  const handleFlyTransitionEnd = () => {
    setFlyState(null)
  }

  const handleRestart = () => {
    const g = new GameState(skeleton)
    g.startRealm()
    setGame(g)
    setCachedNarrative({})
    setCachedAiIsReal({})
    setPendingYishi(null)
    setFlyState(null)
  }

  const showRestart =
    game?.isGameOver() || (!node && game?.yishiEntries.length && !pendingYishi)

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4 gap-4 min-h-0">
      <header className="text-center py-3 ui-frame flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <h1 className="text-[var(--dot-text)]" style={{ fontSize: 'var(--dot-size)' }}>行旅 · Another History</h1>
          {window.electronAPI?.isElectron && (
            <button
              type="button"
              onClick={handleRegenerateGenerated}
              disabled={regenerating}
              className="ui-btn px-3 py-1"
              style={{ fontSize: 'var(--dot-size)' }}
              title="重新生成 generated 下全部内容（outline/nodes/texts/merged）并刷新"
            >
              {regenerating ? '生成中…' : '重新生成内容'}
            </button>
          )}
        </div>
        {regenerateError && (
          <p className="text-[var(--dot-accent)]" style={{ fontSize: 'var(--dot-size)' }}>{regenerateError}</p>
        )}
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 min-h-0">
        <div className="flex flex-col gap-4 min-h-0 min-w-0">
          <NarrativeBox
            title={node ? `【境遇：${realmName}】` : yishiLoading ? '【凝练异史】' : realmName ? `【境遇：${realmName}】` : ''}
            content={showNarrativeContent}
            className="flex-1 min-h-[200px]"
            reserveFooter={!node}
            footerAction={
              pendingYishi !== null ? (
                <button
                  ref={pendingYishiRef}
                  type="button"
                  onClick={handleWriteYishiToScroll}
                  onKeyDown={(e) => e.key === 'Enter' && handleWriteYishiToScroll()}
                  aria-label="写入卷轴"
                  className="ui-btn px-4 py-1.5 text-[var(--dot-size)] hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)] transition-colors"
                  style={{ fontSize: 'var(--dot-size)' }}
                >
                  写入卷轴
                </button>
              ) : null
            }
          />

          {/* Single bottom bar: title row (感应 left, status right) + fixed-height selection area */}
          <section
            className="ui-frame flex flex-col shrink-0 overflow-hidden"
            aria-label="选择区"
          >
            <div className="flex justify-between items-center px-3 py-2 shrink-0 border-b border-[var(--ui-frame-outer)]">
              <span
                className="text-[var(--dot-muted)]"
                style={{ fontSize: 'var(--dot-size)' }}
              >
                {node ? '【感应】' : ''}
              </span>
              <StatusBox stats={game.stats} inline />
            </div>
            <div
              className="flex flex-col min-h-0 shrink-0"
              style={{ minHeight: '160px', height: '160px' }}
            >
              {showRestart ? (
                <div className="flex-1 flex justify-center items-center min-h-0">
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="ui-btn px-5 py-2"
                    style={{ fontSize: 'var(--dot-size)' }}
                  >
                    {game?.isGameOver() ? '重新开始' : '再玩一次'}
                  </button>
                </div>
              ) : node ? (
                <ChoiceList
                  choices={node.choices}
                  onSelect={handleChoice}
                  disabled={narrativeLoading || yishiLoading}
                  className="flex-1 min-h-0 overflow-y-auto"
                />
              ) : (
                <div className="flex-1 min-h-0" aria-hidden />
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col min-h-[200px] md:min-h-0 md:min-w-0">
          <YishiBox entries={game?.yishiEntries ?? []} lastEntryRef={lastEntryRef} className="h-full" />
        </aside>
      </div>

      {flyState?.sourceRect && flyState.targetRect &&
        createPortal(
          <div
            role="presentation"
            className="fixed z-[9999] ui-frame p-3 pointer-events-none"
            style={{
              fontSize: 'var(--dot-size)',
              width: flyState.applyTarget ? flyState.targetRect.width : flyState.sourceRect.width,
              height: flyState.applyTarget ? flyState.targetRect.height : flyState.sourceRect.height,
              left: flyState.applyTarget ? flyState.targetRect.left : flyState.sourceRect.left,
              top: flyState.applyTarget ? flyState.targetRect.top : flyState.sourceRect.top,
              transition: 'left 0.4s ease-out, top 0.4s ease-out, width 0.35s ease-out, height 0.35s ease-out',
            }}
            onTransitionEnd={handleFlyTransitionEnd}
          >
            <p className="text-[var(--dot-text)] truncate border-l-[3px] border-[var(--ui-frame)] pl-2">
              {flyState.text}
            </p>
          </div>,
          document.body
        )}
    </div>
  )
}
