import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { loadSkeleton } from '@/game/skeleton'
import {
  GameState,
  statLabel,
  violatesTaboo,
  applyTabooViolationToState,
  dianPoConsumePercent,
  filterChoicesByClue,
  MID_CONCLUDE_LABEL,
} from '@/game/state'
import {
  hasSave,
  loadSaveData,
  restoreGameState,
  saveGameState,
  clearSave,
  listSaveSummaries,
  findFirstOccupiedSlot,
  hydrateSlotsFromElectron,
} from '@/game/save'
import { evaluateEnding, getEnding } from '@/game/endings'
import type { Skeleton, Node, Choice } from '@/game/types'
import { generateNodeNarrative, generateYishi, generateChoices, AI_DEBUG } from '@/game/aiBridge'
import { getApiKey } from '@/config'
import { NarrativeBox } from '@/components/NarrativeBox'
import { StatusBox } from '@/components/StatusBox'
import { ChoiceList } from '@/components/ChoiceList'
import { YishiBox } from '@/components/YishiBox'
import { Overlay } from '@/components/Overlay'
import { ItemBox } from '@/components/ItemBox'
import { ClueBox } from '@/components/ClueBox'
import { InteractionBox } from '@/components/InteractionBox'
import { NarrativeContextManager } from '@/game/narrativeContext'

type FlyState = {
  text: string
  sourceRect: DOMRect
  targetRect: DOMRect | null
  applyTarget: boolean
}

type Panel = null | 'items' | 'clues' | 'menu' | 'yishi'

/** AI 正在写境遇正文（非「感应」阶段） */
const AI_BODY_LOADING_HINT = '境遇正文凝练中…'
/** 正文未出时不占位展示选项，仅作说明 */
const SENSE_AFTER_BODY_HINT = '待正文落定，感应方显。'

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
  const [yishiHint, setYishiHint] = useState<string | null>(null)
  const pendingYishiRef = useRef<HTMLButtonElement>(null)
  const lastEntryRef = useRef<HTMLLIElement>(null)
  const narrativeCtxRef = useRef(new NarrativeContextManager())
  const forceUpdate = () => setTick((t) => t + 1)

  const [pendingStartChoice, setPendingStartChoice] = useState<boolean | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [activeSaveSlot, setActiveSaveSlot] = useState(0)
  const [saveSummaries, setSaveSummaries] = useState(listSaveSummaries())
  const [acquireBanner, setAcquireBanner] = useState<string | null>(null)
  const acquireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshSaveSummaries = () => setSaveSummaries(listSaveSummaries())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await hydrateSlotsFromElectron()
        const sk = await loadSkeleton()
        const key = await getApiKey()
        if (!cancelled) {
          setSkeleton(sk)
          setApiKey(key)
          refreshSaveSummaries()
          if (AI_DEBUG) console.log('[App] API key loaded:', key ? `yes (${key.slice(0, 8)}…)` : 'no')
          if (hasSave()) {
            setPendingStartChoice(true)
          } else {
            const g = new GameState(sk)
            g.startRealm()
            narrativeCtxRef.current.clear()
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
        yishiEntryTexts: game.getYishiTexts(),
        choiceHistory: game.choiceHistory,
        hais: game.hais,
        narrativeFactSummary: narrativeCtxRef.current.getSummaryForPrompt(game.hais.ling_sun ?? 0),
      })
      return desc?.trim() || node.description || null
    },
    [game, apiKey]
  )

  const node = game?.getCurrentNode() ?? null
  const currentNodeId = node?.node_id ?? null
  const realmName = game?.realmName ?? ''
  const useAi = Boolean(
    apiKey && (node?.plot_guide ?? node?.truth_anchors)?.length
  )

  useEffect(() => {
    if (!node?.node_id || !game) return
    narrativeCtxRef.current.appendFact(`入点 ${node.node_id}${node.story_beat ? `：${node.story_beat}` : ''}`)
  }, [currentNodeId, node?.story_beat, game])

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

    const nodeUseAi = Boolean(apiKey && (node.plot_guide ?? node.truth_anchors)?.length)
    if (nodeUseAi && cachedNarrative[nid] === undefined) return

    let cancelled = false
    setChoicesLoading(true)
    if (AI_DEBUG) console.log('[App] Trigger AI choices for node:', nid)
    const requireItemThought = game.items.length > 0
    const sceneNarrative = nodeUseAi
      ? cachedNarrative[nid]
      : (node.description?.trim() || node.story_beat || '')
    generateChoices(apiKey, node, game.realmName, game.items, game.clues, requireItemThought, sceneNarrative)
      .then((aiChoices) => {
        if (!cancelled && aiChoices.length > 0) {
          const merged: Choice[] = aiChoices.map((ac) => {
            const skeletonCh = node.choices.find((c) => c.next === ac.next) ?? node.choices[0]
            return { ...skeletonCh, text: ac.text }
          })
          setCachedAiChoices((prev) => ({ ...prev, [nid]: merged }))
        }
      })
      .finally(() => {
        if (!cancelled) setChoicesLoading(false)
      })
    return () => { cancelled = true }
  }, [loading, game, node, apiKey, cachedAiChoices, cachedNarrative])

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

  const handleEnterRealm = useCallback(
    (realmId: string) => {
      if (!game) return
      if (game.realmId === realmId) return
      if (!game.enterRealm(realmId)) return
      setCachedNarrative({})
      setCachedAiChoices({})
      setDianPoRemovedIndex(null)
      setPendingYishi(null)
      setYishiHint(null)
      setFlyState(null)
      setAcquireBanner(null)
      if (acquireTimerRef.current) {
        clearTimeout(acquireTimerRef.current)
        acquireTimerRef.current = null
      }
      narrativeCtxRef.current.appendFact(`入界：${game.realmName}`)
      saveGameState(game, activeSaveSlot)
      setPanel(null)
      forceUpdate()
    },
    [game, activeSaveSlot]
  )

  useEffect(() => {
    return () => {
      if (acquireTimerRef.current) clearTimeout(acquireTimerRef.current)
    }
  }, [])

  const handleJingZheMisclick = useCallback(() => {
    if (!game) return
    game.hais.jing_zhe = Math.min(100, (game.hais.jing_zhe ?? 0) + 22)
    game.stats.gen_jiao = Math.max(0, game.stats.gen_jiao - 4)
    saveGameState(game, activeSaveSlot)
    forceUpdate()
  }, [game, activeSaveSlot])

  const handleStartContinue = () => {
    if (!skeleton) return
    const slot = findFirstOccupiedSlot()
    const data = loadSaveData(slot)
    if (!data) return
    const g = restoreGameState(skeleton, data)
    narrativeCtxRef.current.clear()
    setActiveSaveSlot(slot)
    setGame(g)
    setPendingStartChoice(false)
  }

  const handleStartNewGame = () => {
    if (!skeleton) return
    clearSave()
    narrativeCtxRef.current.clear()
    const g = new GameState(skeleton)
    g.startRealm()
    setGame(g)
    setActiveSaveSlot(0)
    setPendingStartChoice(false)
    refreshSaveSummaries()
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
  /** 有 AI 叙事且尚未写入缓存（含 effect 首帧尚未 set narrativeLoading 时） */
  const narrativeAwaitingAi =
    Boolean(node && useAi && cachedNarrative[node.node_id] === undefined)
  const narrativeContent = yishiLoading
    ? (yishiHint || '正在整理行旅……')
    : gateBlocked
      ? '【无法进入】条件未满足，无法感应此境。'
      : node && useAi && cachedNarrative[node.node_id] !== undefined
        ? cachedNarrative[node.node_id]
        : node
          ? narrativeAwaitingAi || narrativeLoading
            ? AI_BODY_LOADING_HINT
            : node.description
          : ''

  const isConclusion = !node && game?.yishiEntries.length && !pendingYishi
  const endingId = isConclusion ? evaluateEnding(game) : null
  const ending = endingId ? getEnding(endingId) : null

  const dianPoPct = dianPoConsumePercent(game.clues.length)
  const canDianPo = node && game.stats.jian_zhao >= dianPoPct
  /** 境遇正文已可供阅读：无 AI 叙事则立即可；有 AI 则须缓存已写入 */
  const beatNarrativeReady = !node || !useAi || cachedNarrative[node.node_id] !== undefined
  /** 正文已出之后，仅异史/补念加载时锁住操作 */
  const choicesInteractLocked = yishiLoading || choicesLoading

  const showNarrativeContent =
    game?.isGameOver()
      ? '【命烛熄灭 / 根脚化外 / 鉴照障目】异史君已无法继续。游戏结束。'
      : !node && pendingYishi
        ? `【撰写完成】异史已成。点击下方「收入卷轴」收入卷轴。\n\n${pendingYishi}`
        : isConclusion && ending
          ? `【${ending.series}｜${ending.title}】\n\n${ending.description}`
          : isConclusion
            ? '【结案】本段行旅已归档，异史已入卷轴。'
            : narrativeContent || '（无当前节点）'

  const handleChoice = async (choice: Choice) => {
    if (!node || !choice) return
    const taboos = node.taboo ?? []
    const coreFacts = [
      ...(node.plot_guide ?? []).slice(0, 3),
      ...(node.objective ? [node.objective] : []),
    ].filter(Boolean)
    if (violatesTaboo(choice.text, taboos)) {
      applyTabooViolationToState(game.stats, game.hais)
    }
    const itemsBefore = new Set(game.itemIds())
    const cluesBefore = new Set(game.clueIds())
    const { conclusionLabel } = game.applyChoice(choice)
    const newItems = game.items.filter((i) => !itemsBefore.has(i.id))
    const newClues = game.clues.filter((c) => !cluesBefore.has(c.id))
    if (newItems.length || newClues.length) {
      const parts: string[] = []
      if (newItems.length) parts.push(`[书箱一沉：${newItems.map((i) => i.name).join('、')}]`)
      if (newClues.length) parts.push(`[心头一亮：${newClues.map((c) => c.name).join('、')}]`)
      if (acquireTimerRef.current) clearTimeout(acquireTimerRef.current)
      setAcquireBanner(parts.join(' '))
      acquireTimerRef.current = setTimeout(() => {
        setAcquireBanner(null)
        acquireTimerRef.current = null
      }, 4500)
    }
    narrativeCtxRef.current.appendFact(`${node.node_id}：${choice.text}`)
    saveGameState(game, activeSaveSlot)
    setDianPoRemovedIndex(null)
    forceUpdate()

    if (conclusionLabel) {
      setYishiHint(choice.yishi_hint || null)
      setYishiLoading(true)
      try {
        const text = apiKey
          ? await generateYishi(apiKey, game.realmName, game.getChoiceSummaryForYishi(), conclusionLabel, coreFacts)
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

  const handleMidConclude = async () => {
    if (!game || !node) return
    if (!beatNarrativeReady || choicesInteractLocked) return
    if (
      !window.confirm(
        '确定要中途定稿吗？将离开当前境遇，以「中途定稿」凝练一条异史；命烛、根脚、鉴照与书箱保留。'
      )
    )
      return
    const coreFacts = [
      `定稿于节点 ${node.node_id}`,
      ...(node.plot_guide ?? node.truth_anchors ?? []).slice(0, 2),
      ...(node.objective ? [node.objective] : []),
    ].filter(Boolean)
    narrativeCtxRef.current.appendFact(`${node.node_id}：${MID_CONCLUDE_LABEL}`)
    game.beginMidConclude()
    saveGameState(game, activeSaveSlot)
    setDianPoRemovedIndex(null)
    setAcquireBanner(null)
    if (acquireTimerRef.current) {
      clearTimeout(acquireTimerRef.current)
      acquireTimerRef.current = null
    }
    forceUpdate()
    setYishiHint(null)
    setYishiLoading(true)
    try {
      const text = apiKey
        ? await generateYishi(
            apiKey,
            game.realmName,
            game.getChoiceSummaryForYishi(),
            MID_CONCLUDE_LABEL,
            coreFacts
          )
        : null
      const fallback = `乙巳年，${game.realmName}。有行者入，记之曰：${MID_CONCLUDE_LABEL}。`
      setPendingYishi(text?.trim() || fallback)
    } finally {
      setYishiLoading(false)
      forceUpdate()
    }
  }

  const handleWriteYishiToScroll = () => {
    if (!pendingYishi || !game || !pendingYishiRef.current) return
    const sourceRect = pendingYishiRef.current.getBoundingClientRect()
    game.addYishiEntry(pendingYishi)
    saveGameState(game, activeSaveSlot)
    setPendingYishi(null)
    setFlyState({ text: pendingYishi, sourceRect, targetRect: null, applyTarget: false })
    refreshSaveSummaries()
    forceUpdate()
  }

  const handleFlyTransitionEnd = () => {
    setFlyState(null)
  }

  const handleRestart = () => {
    clearSave(activeSaveSlot)
    narrativeCtxRef.current.clear()
    const g = new GameState(skeleton)
    g.startRealm()
    setGame(g)
    setCachedNarrative({})
    setCachedAiChoices({})
    setPendingYishi(null)
    setFlyState(null)
    setDianPoRemovedIndex(null)
    setAcquireBanner(null)
    if (acquireTimerRef.current) {
      clearTimeout(acquireTimerRef.current)
      acquireTimerRef.current = null
    }
    refreshSaveSummaries()
  }

  const handleDianPo = () => {
    if (!game || !node || !canDianPo) return
    if (!game.consumeJianZhao(dianPoPct)) return
    const baseChoices = [...node.choices, ...(cachedAiChoices[node.node_id] ?? [])]
    const indexed = baseChoices
      .map((choice, origIndex) => ({ choice, origIndex }))
      .filter(({ choice }) => filterChoicesByClue([choice], game.clueIds()).length > 0)
    if (indexed.length <= 1) return
    const taboos = node.taboo ?? []
    const tabooPool = indexed.filter(({ choice }) => violatesTaboo(choice.text, taboos))
    const pool = tabooPool.length > 0 ? tabooPool : indexed
    const pick = pool[Math.floor(Math.random() * pool.length)]!
    setDianPoRemovedIndex(pick.origIndex)
    forceUpdate()
  }

  const showRestart =
    game?.isGameOver() || (!node && game?.yishiEntries.length && !pendingYishi)

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4 gap-4 min-h-0">
      <header className="text-center py-3 ui-frame flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <h1 className="text-[var(--dot-text)]" style={{ fontSize: 'var(--dot-size)' }}>
            行旅 · Another History
            <span className="text-[var(--dot-muted)] font-normal ml-2" style={{ fontSize: '0.85em' }}>
              v{__APP_VERSION__}
            </span>
          </h1>
          <button
            type="button"
            className="ui-btn px-2 py-1 text-sm"
            style={{ fontSize: 'var(--dot-size)' }}
            onClick={() => setPanel('menu')}
          >
            交互
          </button>
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

          <section
            className="ui-frame flex flex-col shrink-0 overflow-hidden"
            aria-label="选择区"
          >
            {acquireBanner ? (
              <div
                className="px-3 py-2 border-b border-[var(--dot-accent-dim)] text-[var(--dot-accent)] shrink-0"
                style={{ fontSize: 'var(--dot-size)' }}
                role="status"
              >
                {acquireBanner}
              </div>
            ) : null}
            <div className="flex flex-col gap-1 shrink-0 border-b border-[var(--ui-frame-outer)]">
              <div className="flex justify-between items-start gap-2 px-3 py-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[var(--dot-muted)]"
                      style={{ fontSize: 'var(--dot-size)' }}
                    >
                      {node && beatNarrativeReady ? '【感应】' : ''}
                    </span>
                    {node && beatNarrativeReady && canDianPo && (
                      <button
                        type="button"
                        onClick={handleDianPo}
                        disabled={choicesInteractLocked}
                        className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)] disabled:opacity-50"
                        style={{ fontSize: 'var(--dot-size)' }}
                        title={`消耗 ${dianPoPct}% 鉴照，剔除一个选项`}
                      >
                        点破
                      </button>
                    )}
                    {node && beatNarrativeReady && (
                      <button
                        type="button"
                        onClick={handleMidConclude}
                        disabled={choicesInteractLocked}
                        className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-muted)] hover:text-[var(--dot-text)] disabled:opacity-50"
                        style={{ fontSize: 'var(--dot-size)' }}
                        title="不选当前感应，直接封笔：凝练一条异史后可收入卷轴；门禁未满足时也可借此离场。三相与书箱不变。"
                      >
                        定稿
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPanel('items')}
                      className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)]"
                      style={{ fontSize: 'var(--dot-size)' }}
                    >
                      物证
                    </button>
                    <button
                      type="button"
                      onClick={() => setPanel('clues')}
                      className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)]"
                      style={{ fontSize: 'var(--dot-size)' }}
                    >
                      线索
                    </button>
                  </div>
                </div>
                <StatusBox stats={game.stats} hais={game.hais} inline />
              </div>
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
              ) : node && !gateBlocked ? (
                !beatNarrativeReady ? (
                  <div
                    className="flex-1 flex items-center justify-center text-[var(--dot-muted)] px-3 text-center"
                    style={{ fontSize: 'var(--dot-size)' }}
                    role="status"
                  >
                    {SENSE_AFTER_BODY_HINT}
                  </div>
                ) : (
                  (() => {
                    const baseChoices = [...node.choices, ...(cachedAiChoices[node.node_id] ?? [])]
                    const filtered = baseChoices
                      .map((choice, origIndex) => ({ choice, origIndex }))
                      .filter(({ choice }) => filterChoicesByClue([choice], game.clueIds()).length > 0)
                      .filter(({ origIndex }) => origIndex !== dianPoRemovedIndex)
                    return (
                      <ChoiceList
                        choices={filtered.map((x) => x.choice)}
                        onSelect={(fi) => handleChoice(filtered[fi].choice)}
                        disabled={choicesInteractLocked}
                        className="flex-1 min-h-0 overflow-y-auto"
                        jingZheLevel={game.hais.jing_zhe ?? 0}
                        onJingZheMisclick={handleJingZheMisclick}
                      />
                    )
                  })()
                )
              ) : gateBlocked ? (
                <div className="flex-1 flex items-center justify-center text-[var(--dot-muted)]" style={{ fontSize: 'var(--dot-size)' }}>
                  需满足条件方可继续
                </div>
              ) : (
                <div className="flex-1 min-h-0" aria-hidden />
              )}
            </div>
          </section>
        </div>

        <aside className="hidden md:flex flex-col min-h-[200px] md:min-h-0 md:min-w-0">
          <YishiBox entries={game?.yishiEntries ?? []} lastEntryRef={lastEntryRef} className="h-full" />
        </aside>
      </div>

      <Overlay open={panel === 'items'} title="物证" onClose={() => setPanel(null)}>
        <ItemBox items={game.items} />
      </Overlay>
      <Overlay open={panel === 'clues'} title="线索" onClose={() => setPanel(null)}>
        <ClueBox clues={game.clues} />
      </Overlay>
      <Overlay open={panel === 'yishi'} title="《异史》卷轴" onClose={() => setPanel(null)}>
        <YishiBox entries={game.yishiEntries} />
      </Overlay>
      <Overlay open={panel === 'menu'} title="交互" onClose={() => setPanel(null)} wide>
        <InteractionBox
          summaries={saveSummaries}
          activeSlot={activeSaveSlot}
          onSelectSlot={(s) => {
            setActiveSaveSlot(s)
            refreshSaveSummaries()
          }}
          onLoadSlot={(s) => {
            if (!skeleton) return
            const data = loadSaveData(s)
            if (!data) return
            setGame(restoreGameState(skeleton, data))
            setActiveSaveSlot(s)
            narrativeCtxRef.current.clear()
            setPanel(null)
            forceUpdate()
          }}
          onSaveCurrent={() => {
            saveGameState(game, activeSaveSlot)
            refreshSaveSummaries()
          }}
          onClearSlot={(s) => {
            clearSave(s)
            refreshSaveSummaries()
          }}
          onNewGameAll={() => {
            clearSave()
            narrativeCtxRef.current.clear()
            const g = new GameState(skeleton)
            g.startRealm()
            setGame(g)
            setActiveSaveSlot(0)
            setPanel(null)
            refreshSaveSummaries()
          }}
          realms={skeleton.realms.map((r) => ({ id: r.id, name: r.name }))}
          currentRealmId={game.realmId}
          onEnterRealm={handleEnterRealm}
          realmSwitchBusy={narrativeLoading || yishiLoading || choicesLoading}
        />
      </Overlay>

      <div className="md:hidden fixed bottom-2 right-2 z-[7000] flex gap-2">
        <button
          type="button"
          className="ui-btn px-3 py-2"
          style={{ fontSize: 'var(--dot-size)' }}
          onClick={() => setPanel((p) => (p === 'yishi' ? null : 'yishi'))}
        >
          卷轴
        </button>
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
