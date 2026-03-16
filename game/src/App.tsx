import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { loadSkeleton } from '@/game/skeleton'
import { GameState, statLabel, violatesTaboo } from '@/game/state'
import { hasSave, loadSaveData, restoreGameState, saveGameState, clearSave } from '@/game/save'
import { evaluateEnding, getEnding } from '@/game/endings'
import type { Skeleton, Node, Choice } from '@/game/types'
import { generateNodeNarrative, generateYishi, generateChoices, AI_DEBUG } from '@/game/aiBridge'
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
  const [cachedAiChoices, setCachedAiChoices] = useState<Record<string, Choice[]>>({})
  const [loading, setLoading] = useState(true)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [choicesLoading, setChoicesLoading] = useState(false)
  const [yishiLoading, setYishiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const [regenerating, setRegenerating] = useState(false)
  const [regenerateError, setRegenerateError] = useState<string | null>(null)
  const [pendingYishi, setPendingYishi] = useState<string | null>(null)
  const [flyState, setFlyState] = useState<FlyState | null>(null)
  const [dianPoRemovedIndex, setDianPoRemovedIndex] = useState<number | null>(null)
  const [itemsCluesOpen, setItemsCluesOpen] = useState(false)
  const [yishiHint, setYishiHint] = useState<string | null>(null)
  const pendingYishiRef = useRef<HTMLButtonElement>(null)
  const lastEntryRef = useRef<HTMLLIElement>(null)
  const forceUpdate = () => setTick((t) => t + 1)

  const [pendingStartChoice, setPendingStartChoice] = useState<boolean | null>(null)

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
          if (hasSave()) {
            setPendingStartChoice(true)
          } else {
            const g = new GameState(sk)
            g.startRealm()
            setGame(g)
          }
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
        hais: game.hais,
      })
      return desc?.trim() || node.description || null
    },
    [game, apiKey]
  )

  // Must run on every render so hook order is stable (no hooks after early return)
  const node = game?.getCurrentNode() ?? null
  const currentNodeId = node?.node_id ?? null
  const realmName = game?.realmName ?? ''
  // Use runtime AI when node has plot_guide and API key; skeleton description is fallback when AI fails
  const useAi = Boolean(
    apiKey && (node?.plot_guide ?? node?.truth_anchors)?.length
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
          const fallback = node.description?.trim() || node.story_beat || '（叙事加载失败）'
          setCachedNarrative((prev) => ({ ...prev, [nid]: desc || fallback }))
        }
      })
      .finally(() => {
        if (!cancelled) setNarrativeLoading(false)
      })
    return () => { cancelled = true }
  }, [loading, skeleton, game, currentNodeId, useAi, apiKey, node, refreshNodeNarrative, cachedNarrative])

  useEffect(() => {
    if (loading || !game || !node || !apiKey || !node.choices?.length) return
    if (node && !game.canEnterNode(node)) return
    const nid = node.node_id
    if (cachedAiChoices[nid] !== undefined) return

    let cancelled = false
    setChoicesLoading(true)
    if (AI_DEBUG) console.log('[App] Trigger AI choices for node:', nid)
    generateChoices(apiKey, node, game.realmName, game.items, game.clues)
      .then((aiChoices) => {
        if (!cancelled && aiChoices.length > 0) {
          const merged: Choice[] = aiChoices.map((ac) => {
            const skeleton = node.choices.find((c) => c.next === ac.next) ?? node.choices[0]
            return { ...skeleton, text: ac.text }
          })
          setCachedAiChoices((prev) => ({ ...prev, [nid]: merged }))
        }
      })
      .finally(() => {
        if (!cancelled) setChoicesLoading(false)
      })
    return () => { cancelled = true }
  }, [loading, game, node, apiKey, cachedAiChoices])

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

  const handleStartContinue = () => {
    if (!skeleton) return
    const data = loadSaveData()
    if (!data) return
    const g = restoreGameState(skeleton, data)
    setGame(g)
    setPendingStartChoice(false)
  }

  const handleStartNewGame = () => {
    if (!skeleton) return
    clearSave()
    const g = new GameState(skeleton)
    g.startRealm()
    setGame(g)
    setPendingStartChoice(false)
  }

  if (loading || !skeleton || (pendingStartChoice && !game)) {
    if (pendingStartChoice && skeleton && !game) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <p className="text-stone-400" style={{ fontSize: 'var(--dot-size)' }}>检测到存档</p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleStartContinue}
              className="ui-btn px-5 py-2"
              style={{ fontSize: 'var(--dot-size)' }}
            >
              继续
            </button>
            <button
              type="button"
              onClick={handleStartNewGame}
              className="ui-btn px-5 py-2"
              style={{ fontSize: 'var(--dot-size)' }}
            >
              新游戏
            </button>
          </div>
        </div>
      )
    }
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

  if (!game) return null

  const gateBlocked = node && !game.canEnterNode(node)
  const narrativeContent = yishiLoading
    ? (yishiHint || '正在整理行旅……')
    : gateBlocked
      ? '【无法进入】条件未满足，无法感应此境。'
      : node && useAi && cachedNarrative[node.node_id] !== undefined
        ? cachedNarrative[node.node_id]
        : node
          ? narrativeLoading
            ? '正在感应…'
            : node.description
          : ''

  const isConclusion = !node && game?.yishiEntries.length && !pendingYishi
  const endingId = isConclusion ? evaluateEnding(game) : null
  const ending = endingId ? getEnding(endingId) : null

  const showNarrativeContent =
    game?.isGameOver()
      ? '【命烛熄灭 / 根脚化外 / 鉴照障目】异史君已无法继续。游戏结束。'
      : !node && pendingYishi
        ? `【撰写完成】异史已成。点击下方「收入卷轴」收入卷轴。\n\n${pendingYishi}`
        : isConclusion && ending
          ? `【${ending.title}】\n\n${ending.description}`
          : isConclusion
            ? '【结案】本段行旅已归档，异史已入卷轴。'
            : narrativeContent || '（无当前节点）'

  const handleChoice = async (choice: Choice) => {
    if (!node || !choice) return
    const taboos = node.taboo ?? []
    if (violatesTaboo(choice.text, taboos)) {
      game.hais.ling_sun = Math.min(100, (game.hais.ling_sun ?? 0) + 50)
      game.stats.ming_zhu = Math.max(0, game.stats.ming_zhu - 10)
    }
    const { conclusionLabel } = game.applyChoice(choice)
    saveGameState(game)
    setDianPoRemovedIndex(null)
    forceUpdate()

    if (conclusionLabel) {
      setYishiHint(choice.yishi_hint || null)
      setYishiLoading(true)
      try {
        const text = apiKey
          ? await generateYishi(apiKey, game.realmName, game.getChoiceSummaryForYishi(), conclusionLabel)
          : null
        const fallback = `乙巳年，${game.realmName}。有行者入，记之曰：${conclusionLabel}。`
        const final = text?.trim() || fallback
        setPendingYishi(final)
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
    saveGameState(game)
    setPendingYishi(null)
    setFlyState({ text: pendingYishi, sourceRect, targetRect: null, applyTarget: false })
    forceUpdate()
  }

  const handleFlyTransitionEnd = () => {
    setFlyState(null)
  }

  const handleRestart = () => {
    clearSave()
    const g = new GameState(skeleton)
    g.startRealm()
    setGame(g)
    setCachedNarrative({})
    setCachedAiChoices({})
    setPendingYishi(null)
    setFlyState(null)
    setDianPoRemovedIndex(null)
  }

  const handleDianPo = () => {
    if (!game || !node || game.stats.jian_zhao < 10) return
    if (!game.consumeJianZhao(10)) return
    const baseChoices = [...node.choices, ...(cachedAiChoices[node.node_id] ?? [])]
    if (baseChoices.length <= 1) return
    const taboos = node.taboo ?? []
    const tabooIndices = baseChoices
      .map((c, i) => (violatesTaboo(c.text, taboos) ? i : -1))
      .filter((i) => i >= 0)
    const idx =
      tabooIndices.length > 0
        ? tabooIndices[Math.floor(Math.random() * tabooIndices.length)]
        : Math.floor(Math.random() * baseChoices.length)
    setDianPoRemovedIndex(idx)
    forceUpdate()
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
            title={node ? `【境遇：${realmName}】` : yishiLoading ? '【撰写异史】' : realmName ? `【境遇：${realmName}】` : ''}
            content={showNarrativeContent}
            className="flex-1 min-h-[200px]"
            jianZhaoLevel={game ? (statLabel('jian_zhao', game.stats.jian_zhao) as '清彻' | '混浊' | '障目') : undefined}
            reserveFooter={!node}
            footerAction={
              pendingYishi !== null ? (
                <button
                  ref={pendingYishiRef}
                  type="button"
                  onClick={handleWriteYishiToScroll}
                  onKeyDown={(e) => e.key === 'Enter' && handleWriteYishiToScroll()}
                  aria-label="收入卷轴"
                  className="ui-btn px-4 py-1.5 text-[var(--dot-size)] hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)] transition-colors"
                  style={{ fontSize: 'var(--dot-size)' }}
                >
                  收入卷轴
                </button>
              ) : null
            }
          />

          {/* Single bottom bar: title row (感应 left, status right) + fixed-height selection area */}
          <section
            className="ui-frame flex flex-col shrink-0 overflow-hidden"
            aria-label="选择区"
          >
            <div className="flex flex-col gap-1 shrink-0 border-b border-[var(--ui-frame-outer)]">
              <div className="flex justify-between items-center px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[var(--dot-muted)]"
                    style={{ fontSize: 'var(--dot-size)' }}
                  >
                    {node ? '【感应】' : ''}
                  </span>
                  {node && game.stats.jian_zhao >= 10 && (
                    <button
                      type="button"
                      onClick={handleDianPo}
                      disabled={narrativeLoading || yishiLoading}
                      className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)] disabled:opacity-50"
                      style={{ fontSize: 'var(--dot-size)' }}
                      title="消耗 10% 鉴照，剔除一个选项"
                    >
                      点破
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setItemsCluesOpen((o) => !o)}
                    className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)]"
                    style={{ fontSize: 'var(--dot-size)' }}
                    title="物证 / 线索"
                  >
                    物证/线索 {itemsCluesOpen ? '▼' : '▶'}
                  </button>
                  <StatusBox stats={game.stats} hais={game.hais} inline />
                </div>
              </div>
              {itemsCluesOpen && (
                <div className="px-3 pb-2 text-[var(--dot-muted)]" style={{ fontSize: 'var(--dot-size)' }}>
                  {game.items.length > 0 || game.clues.length > 0 ? (
                    <>
                      {game.items.length > 0 && <span>物证：{game.items.join('、')}</span>}
                      {game.items.length > 0 && game.clues.length > 0 && ' · '}
                      {game.clues.length > 0 && <span>线索：{game.clues.join('、')}</span>}
                    </>
                  ) : (
                    <span>（无物证/线索）</span>
                  )}
                </div>
              )}
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
              ) : node && !gateBlocked ? (() => {
                const baseChoices = [...node.choices, ...(cachedAiChoices[node.node_id] ?? [])]
                const filtered = baseChoices
                  .map((c, i) => ({ choice: c, origIndex: i }))
                  .filter(({ origIndex }) => origIndex !== dianPoRemovedIndex)
                return (
                  <ChoiceList
                    choices={filtered.map((x) => x.choice)}
                    onSelect={(fi) => handleChoice(filtered[fi].choice)}
                    disabled={narrativeLoading || yishiLoading || choicesLoading}
                    className="flex-1 min-h-0 overflow-y-auto"
                  />
                )
              })() : gateBlocked ? (
                <div className="flex-1 flex items-center justify-center text-[var(--dot-muted)]" style={{ fontSize: 'var(--dot-size)' }}>
                  需满足条件方可继续
                </div>
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
