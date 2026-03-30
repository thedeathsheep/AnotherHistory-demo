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
import { isAiEngineV2Enabled } from '@/game/aiEngine/v2Enabled'
import { tryBeginDynamicStory } from '@/game/aiEngine/beginDynamicStory'
import { WorldStateGraphManager, graphFromJSON } from '@/game/worldStateGraph'
import { evaluateEnding, getEnding } from '@/game/endings'
import type { Skeleton, Node, Choice } from '@/game/types'
import {
  generateNodeNarrative,
  generateYishi,
  generateChoices,
  generateDynamicBeatNarrative,
  generateDynamicBeatChoices,
  runDirector,
  AI_DEBUG,
  validateOpenAiCompatibleKey,
  type LayeredContextInput,
} from '@/game/aiBridge'
import { loadDesignSeed } from '@/game/designSeed'
import { beatNextToken, directorGateHintToNodeGatePatch, type NodeDirective } from '@/game/storyRuntime'
import {
  getApiKey,
  rememberAiSettings,
  clearStoredApiKeyOnly,
  hydrateAiSettingsFromElectron,
  normalizeOpenAiBaseUrl,
  getGateFormDefaults,
} from '@/config'
import { PLANNER_LOADING_HINT } from '@/plannerUi'
import { NarrativeBox } from '@/components/NarrativeBox'
import { Tooltip } from '@/components/Tooltip'
import { StatusBox } from '@/components/StatusBox'
import {
  ttDianPo,
  TT_CLUES,
  TT_DING_GAO,
  TT_ITEMS,
  ttNextRealm,
  TT_SCROLL_INCOME,
} from '@/content/playerTooltips'
import { ChoiceList } from '@/components/ChoiceList'
import { YishiBox } from '@/components/YishiBox'
import { Overlay } from '@/components/Overlay'
import { ItemBox } from '@/components/ItemBox'
import { ClueBox } from '@/components/ClueBox'
import { InteractionBox } from '@/components/InteractionBox'
import { AiDebugOverlay } from '@/components/AiDebugOverlay'
import { emitAiDebug } from '@/game/aiEngine/aiDebugBus'
import { NarrativeContextManager } from '@/game/narrativeContext'
import {
  mergeSkeletonChoicesWithAi,
  getDisplayChoicesForNode,
  isAwaitingChoiceHydration,
} from '@/game/choiceDisplay'

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
/** 感应与骨架合并完成前，不展示可点列表 */
const AI_CHOICE_LOADING_HINT = '感应凝练中…'

const UI_HINT_DIANPO_KEY = 'anothistory.uiHint.dianPoSeen'
const UI_HINT_MID_CONCLUDE_KEY = 'anothistory.uiHint.midConcludeSeen'

function readUiHintSeen(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return true
  }
}

const OPENAI_DOCS = 'https://platform.openai.com/docs'

function getNextRealmAfter(
  skeleton: Skeleton,
  currentRealmId: string | null
): { id: string; name: string } | null {
  if (!currentRealmId || skeleton.realms.length < 2) return null
  const i = skeleton.realms.findIndex((r) => r.id === currentRealmId)
  if (i < 0 || i >= skeleton.realms.length - 1) return null
  const r = skeleton.realms[i + 1]!
  return { id: r.id, name: r.name }
}

export default function App() {
  const [skeleton, setSkeleton] = useState<Skeleton | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [cachedNarrative, setCachedNarrative] = useState<Record<string, string>>({})
  const cachedNarrativeRef = useRef(cachedNarrative)
  cachedNarrativeRef.current = cachedNarrative
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
  const [dianPoGuideDismissed, setDianPoGuideDismissed] = useState(() => readUiHintSeen(UI_HINT_DIANPO_KEY))
  const [midConcludeGuideDismissed, setMidConcludeGuideDismissed] = useState(() =>
    readUiHintSeen(UI_HINT_MID_CONCLUDE_KEY)
  )
  const [yishiHint, setYishiHint] = useState<string | null>(null)
  const pendingYishiRef = useRef<HTMLButtonElement>(null)
  const lastEntryRef = useRef<HTMLLIElement>(null)
  const narrativeCtxRef = useRef(new NarrativeContextManager())
  const directiveRef = useRef<NodeDirective | null>(null)
  const [streamBody, setStreamBody] = useState<{ nid: string; text: string } | null>(null)
  const forceUpdate = useCallback(() => setTick((t) => t + 1), [])

  const [pendingStartChoice, setPendingStartChoice] = useState<boolean | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [activeSaveSlot, setActiveSaveSlot] = useState(0)
  const [saveSummaries, setSaveSummaries] = useState(listSaveSummaries())
  const [acquireBanner, setAcquireBanner] = useState<string | null>(null)
  const acquireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [plannerLoading, setPlannerLoading] = useState(false)
  const [v2FallbackToast, setV2FallbackToast] = useState<string | null>(null)
  const [awaitingApiKeyGate, setAwaitingApiKeyGate] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [baseUrlInput, setBaseUrlInput] = useState('')
  const [modelInput, setModelInput] = useState('')
  const [keyGateError, setKeyGateError] = useState<string | null>(null)
  const [keyGateValidating, setKeyGateValidating] = useState(false)
  const keyGateReasonRef = useRef<'bootstrap' | 'change'>('bootstrap')

  const refreshSaveSummaries = () => setSaveSummaries(listSaveSummaries())

  const runTryBeginDynamicStory = useCallback(async (g: GameState, key: string | null) => {
    const showPlannerWait = isAiEngineV2Enabled() && Boolean(key)
    if (showPlannerWait) setPlannerLoading(true)
    try {
      const r = await tryBeginDynamicStory(g, key)
      if (r.outcome === 'planner_empty' || r.outcome === 'error') {
        setV2FallbackToast(r.message ?? '')
        window.setTimeout(() => setV2FallbackToast(null), 10000)
      }
    } finally {
      if (showPlannerWait) setPlannerLoading(false)
      forceUpdate()
    }
  }, [forceUpdate])

  const completeBootstrapAfterKeyGate = useCallback(
    async (resolvedKey: string | null) => {
      if (!skeleton) return
      setAwaitingApiKeyGate(false)
      const g = new GameState(skeleton)
      g.startRealm()
      narrativeCtxRef.current.clear()
      const k = resolvedKey?.trim() ? resolvedKey.trim() : null
      setApiKey(k)
      await runTryBeginDynamicStory(g, k)
      setGame(g)
    },
    [skeleton, runTryBeginDynamicStory]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await hydrateAiSettingsFromElectron()
        await hydrateSlotsFromElectron()
        const sk = await loadSkeleton()
        const key = await getApiKey()
        if (cancelled) return
        setSkeleton(sk)
        setApiKey(key)
        refreshSaveSummaries()
        if (AI_DEBUG) {
          const m = `API key loaded: ${key ? `yes (${key.slice(0, 8)}…)` : 'no'}`
          console.log(`[App] ${m}`)
          emitAiDebug(`[App] ${m}`, 'log')
        }
        if (!key && !hasSave()) {
          setAwaitingApiKeyGate(true)
          setLoading(false)
          return
        }
        if (hasSave()) {
          setPendingStartChoice(true)
        } else {
          const g = new GameState(sk)
          g.startRealm()
          narrativeCtxRef.current.clear()
          const showPlannerWait = isAiEngineV2Enabled() && Boolean(key)
          if (showPlannerWait) setPlannerLoading(true)
          try {
            const r = await tryBeginDynamicStory(g, key)
            if (!cancelled && (r.outcome === 'planner_empty' || r.outcome === 'error')) {
              setV2FallbackToast(r.message ?? '')
              window.setTimeout(() => setV2FallbackToast(null), 10000)
            }
          } finally {
            if (!cancelled && showPlannerWait) setPlannerLoading(false)
            if (!cancelled) setGame(g)
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
    async (
      node: Node,
      options?: { onStreamChunk?: (full: string) => void; streamSignal?: AbortSignal }
    ): Promise<string | null> => {
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
        onStreamChunk: options?.onStreamChunk,
        streamSignal: options?.streamSignal,
      })
      return desc?.trim() || node.description || null
    },
    [game, apiKey]
  )
  const refreshNodeNarrativeRef = useRef(refreshNodeNarrative)
  refreshNodeNarrativeRef.current = refreshNodeNarrative

  const node = game?.getCurrentNode() ?? null
  const currentNodeId = node?.node_id ?? null
  const realmName = game?.realmName ?? ''
  const isDynamicBeat = Boolean(game?.engineMode === 'dynamic' && node?.node_id?.startsWith('dyn:'))
  const useAi = Boolean(
    apiKey && (isDynamicBeat || (node?.plot_guide ?? node?.truth_anchors)?.length)
  )

  useEffect(() => {
    if (!node?.node_id || !game) return
    narrativeCtxRef.current.appendFact(`入点 ${node.node_id}${node.story_beat ? `：${node.story_beat}` : ''}`)
  }, [currentNodeId, node?.story_beat, game])

  /** Fetch narrative when beat id / game / flags change only — not when `node` object identity or `cachedNarrative` updates (those would cancel in-flight stream or duplicate runs). */
  useEffect(() => {
    if (loading || !skeleton || !game) return
    if (!useAi || !apiKey) {
      setNarrativeLoading(false)
      return
    }
    const cur = game.getCurrentNode()
    if (!cur?.node_id) {
      setNarrativeLoading(false)
      return
    }
    const nid = cur.node_id
    if (cachedNarrativeRef.current[nid] !== undefined) {
      setNarrativeLoading(false)
      return
    }

    let cancelled = false

    const streamCtrl = new AbortController()
    const isDyn = game.engineMode === 'dynamic' && nid.startsWith('dyn:')
    const node = cur

    const runSkeleton = (): void => {
      setNarrativeLoading(true)
      setStreamBody({ nid, text: '' })
      if (AI_DEBUG) {
        const m = `Trigger AI narrative for node: ${nid}`
        console.log(`[App] ${m}`)
        emitAiDebug(`[App] ${m}`, 'log')
      }
      refreshNodeNarrativeRef.current(node, {
        onStreamChunk: (full) => {
          if (!cancelled) setStreamBody({ nid, text: full })
        },
        streamSignal: streamCtrl.signal,
      })
        .then((desc) => {
          if (!cancelled) {
            const fallback = node.description?.trim() || node.story_beat || '（叙事加载失败）'
            setCachedNarrative((prev) => ({ ...prev, [nid]: desc || fallback }))
          }
        })
        .finally(() => {
          if (!cancelled) setNarrativeLoading(false)
        })
    }

    const runDynamic = async (): Promise<void> => {
      setNarrativeLoading(true)
      setStreamBody({ nid, text: '' })
      try {
        const outline = game.storyOutline
        const beatIndex = game.currentBeatIndex ?? 0
        if (!outline?.beats?.length) {
          setStreamBody(null)
          runSkeleton()
          return
        }
        const seed = await loadDesignSeed(game.skeleton)
        const mgr = new WorldStateGraphManager(game.worldGraph)
        const pendingFs = mgr.pendingForeshadowingsForPrompt(beatIndex)
        const playerLine = `命烛${game.stats.ming_zhu}/根脚${game.stats.gen_jiao}/鉴照${game.stats.jian_zhao}；物证：${game.items.map((i) => i.name).join('、') || '无'}；线索：${game.clues.map((c) => c.name).join('、') || '无'}`
        const dir = await runDirector(
          apiKey,
          game.realmName,
          outline,
          beatIndex,
          mgr.summaryForPrompt(game.hais.ling_sun ?? 0),
          mgr.entitySummary(),
          playerLine,
          pendingFs
        )
        directiveRef.current = dir
        if (dir?.foreshadowing?.trim()) mgr.addForeshadowing(dir.foreshadowing.trim(), beatIndex)
        if (dir?.callback?.trim()) mgr.markResolvedByCallback(dir.callback.trim())
        game.worldGraph = mgr.getSnapshot()
        const layeredInput: LayeredContextInput = {
          designSeed: seed,
          outline,
          beatIndex,
          worldGraph: mgr,
          lingSunLevel: game.hais.ling_sun ?? 0,
          playerStateLine: playerLine,
          directive: dir,
          realmSeed: game.dynamicRealmSeed ?? undefined,
        }
        const stateFilter = {
          ming_zhu: game.stats.ming_zhu,
          gen_jiao: game.stats.gen_jiao,
          jian_zhao: game.stats.jian_zhao,
        }
        const plotGuide = [...(node.plot_guide ?? node.truth_anchors ?? [])]
        const taboo = node.taboo ?? []
        const text = await generateDynamicBeatNarrative(apiKey, layeredInput, stateFilter, plotGuide, taboo, node.objective, {
          hais: game.hais,
          onStreamChunk: (full) => {
            if (!cancelled) setStreamBody({ nid, text: full })
          },
          storyBeat: node.story_beat,
          streamSignal: streamCtrl.signal,
        })
        if (cancelled) return
        const body = text?.trim() || node.description?.trim() || '（叙事加载失败）'
        const gatePatch = directorGateHintToNodeGatePatch(dir?.gate_hint)
        const latest = game.getCurrentNode()
        const base = latest?.node_id === nid ? latest : node
        game.registerRuntimeNode({
          ...base,
          ...gatePatch,
          description: body,
          plot_guide: plotGuide.length ? plotGuide : ['境遇'],
          taboo,
        })
        setCachedNarrative((prev) => ({ ...prev, [nid]: body }))
      } catch {
        if (!cancelled) {
          const fallback = node.description?.trim() || node.story_beat || '（叙事加载失败）'
          setCachedNarrative((prev) => ({ ...prev, [nid]: fallback }))
        }
      } finally {
        if (!cancelled) {
          // Keep streamBody until cleanup (node/dep change): UI prefers cache over stream once committed; avoids empty-stream frame before cache.
          setNarrativeLoading(false)
        }
      }
    }

    if (isDyn) void runDynamic()
    else runSkeleton()

    return () => {
      cancelled = true
      streamCtrl.abort()
      setStreamBody(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see JSDoc on this effect; refresh via refreshNodeNarrativeRef
  }, [loading, skeleton, game, currentNodeId, useAi, apiKey])

  useEffect(() => {
    if (loading || !game || !node || !apiKey) return
    if (node && !game.canEnterNode(node)) return
    const nid = node.node_id
    if (cachedAiChoices[nid] !== undefined) return

    const isDyn = game.engineMode === 'dynamic' && nid.startsWith('dyn:')
    if (!isDyn && !node.choices?.length) return

    const nodeUseAi = Boolean(apiKey && (isDyn || (node.plot_guide ?? node.truth_anchors)?.length))
    if (nodeUseAi && cachedNarrative[nid] === undefined) return

    let cancelled = false
    setChoicesLoading(true)
    if (AI_DEBUG) {
      const m = `Trigger AI choices for node: ${nid}`
      console.log(`[App] ${m}`)
      emitAiDebug(`[App] ${m}`, 'log')
    }

    if (isDyn) {
      const outline = game.storyOutline
      const beatIndex = game.currentBeatIndex ?? 0
      const total = outline?.beats?.length ?? 1
      const isLast = beatIndex >= total - 1
      const sceneNarrative = cachedNarrative[nid] ?? ''
      const directions = directiveRef.current?.choices_hint?.directions?.length
        ? directiveRef.current.choices_hint.directions
        : ['前行', '停步', '辨位']
      generateDynamicBeatChoices(apiKey, game.realmName, sceneNarrative, node.taboo ?? [], directions, beatIndex, total)
        .then((dynChoices) => {
          if (cancelled) return
          let choices = dynChoices
          if (!choices.length) {
            if (isLast) {
              choices = [{ text: '封笔归档', next: '__结案__', conclusion_label: '行旅收束' }]
            } else {
              choices = [{ text: '继续前行', next: beatNextToken(beatIndex + 1) }]
            }
          }
          const cur = game.getCurrentNode()
          if (cur) game.registerRuntimeNode({ ...cur, choices })
          setCachedAiChoices((prev) => ({ ...prev, [nid]: [] }))
          saveGameState(game, activeSaveSlot)
          forceUpdate()
        })
        .finally(() => {
          if (!cancelled) setChoicesLoading(false)
        })
      return () => {
        cancelled = true
      }
    }

    const requireItemThought = game.items.length > 0
    const sceneNarrative = nodeUseAi
      ? cachedNarrative[nid]
      : (node.description?.trim() || node.story_beat || '')
    generateChoices(apiKey, node, game.realmName, game.items, game.clues, requireItemThought, sceneNarrative)
      .then((aiChoices) => {
        if (!cancelled) {
          const merged = mergeSkeletonChoicesWithAi(node, aiChoices ?? [])
          setCachedAiChoices((prev) => ({ ...prev, [nid]: merged }))
        }
      })
      .finally(() => {
        if (!cancelled) setChoicesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loading, game, node, apiKey, cachedAiChoices, cachedNarrative, activeSaveSlot])

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
      directiveRef.current = null
      setStreamBody(null)
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
      void runTryBeginDynamicStory(game, apiKey).finally(() => {
        saveGameState(game, activeSaveSlot)
        forceUpdate()
      })
      setPanel(null)
      forceUpdate()
    },
    [game, activeSaveSlot, apiKey, runTryBeginDynamicStory]
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
    let carryGen = 0
    let carrySummary = ''
    const slotToRead = findFirstOccupiedSlot()
    const prevData = loadSaveData(slotToRead)
    if (prevData) {
      carryGen = prevData.playthroughGeneration ?? 0
      const wg = prevData.worldGraph
      if (wg && Array.isArray(wg.events) && wg.events.length > 0) {
        carrySummary = new WorldStateGraphManager(graphFromJSON(wg)).summaryForPrompt(0, 600)
      } else if (typeof prevData.lastPlaythroughSummary === 'string' && prevData.lastPlaythroughSummary.trim()) {
        carrySummary = prevData.lastPlaythroughSummary.trim()
      }
    }
    clearSave()
    narrativeCtxRef.current.clear()
    directiveRef.current = null
    setStreamBody(null)
    const g = new GameState(skeleton)
    g.playthroughGeneration = carryGen
    g.lastPlaythroughSummary = carrySummary
    g.startRealm()
    setCachedNarrative({})
    setCachedAiChoices({})
    setGame(g)
    setActiveSaveSlot(0)
    setPendingStartChoice(false)
    refreshSaveSummaries()
    void runTryBeginDynamicStory(g, apiKey).then(() => forceUpdate())
  }

  const handleOpenChangeApiKey = async () => {
    await clearStoredApiKeyOnly()
    keyGateReasonRef.current = 'change'
    setApiKey(null)
    const d = getGateFormDefaults()
    setBaseUrlInput(d.baseUrl)
    setModelInput(d.model)
    setApiKeyInput('')
    setKeyGateError(null)
    setAwaitingApiKeyGate(true)
    setPanel(null)
  }

  useEffect(() => {
    if (awaitingApiKeyGate && skeleton) {
      const d = getGateFormDefaults()
      setBaseUrlInput(d.baseUrl)
      setModelInput(d.model)
      setKeyGateError(null)
    }
  }, [awaitingApiKeyGate, skeleton])

  if (awaitingApiKeyGate && skeleton) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 max-w-lg mx-auto w-full">
        <p className="text-stone-300 text-center" style={{ fontSize: 'var(--dot-size)' }}>
          使用 OpenAI 兼容接口（/v1/chat/completions）连接任意供应商：官方 OpenAI、AIHubMix、自建网关等。填写 Base URL、模型名与 API Key；也可跳过，仅玩骨架。
        </p>
        <p className="text-stone-500 text-center text-sm m-0">
          在浏览器里使用任意 OpenAI 兼容 Base（官方、中转、自建网关等）时，请求会经本机 Vite 开发/预览代理转发（避免 CORS）；直接打开静态 dist 或未走 Vite 时，请用 Electron 或使用方已开启 CORS 的网关。
        </p>
        <p className="text-stone-500 text-center text-sm m-0">
          Base URL 须指向带 <code className="text-stone-400">/v1</code> 的根，例如{' '}
          <code className="text-stone-400">https://api.openai.com/v1</code>。说明见{' '}
          <a
            href={OPENAI_DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--dot-accent-dim)] underline hover:text-[var(--dot-accent)]"
          >
            OpenAI 文档
          </a>
          。
        </p>
        <label className="w-full flex flex-col gap-1 text-stone-400 text-sm">
          <span>API Base URL</span>
          <input
            type="url"
            autoComplete="off"
            placeholder="https://api.openai.com/v1"
            value={baseUrlInput}
            onChange={(e) => {
              setBaseUrlInput(e.target.value)
              setKeyGateError(null)
            }}
            className="w-full px-3 py-2 rounded border border-stone-600 bg-stone-900 text-stone-200"
            style={{ fontSize: 'var(--dot-size)' }}
          />
        </label>
        <label className="w-full flex flex-col gap-1 text-stone-400 text-sm">
          <span>模型 ID（各角色共用；留空则用 .env 里分角色模型）</span>
          <input
            type="text"
            autoComplete="off"
            placeholder="gpt-4o-mini"
            value={modelInput}
            onChange={(e) => {
              setModelInput(e.target.value)
              setKeyGateError(null)
            }}
            className="w-full px-3 py-2 rounded border border-stone-600 bg-stone-900 text-stone-200"
            style={{ fontSize: 'var(--dot-size)' }}
          />
        </label>
        <label className="w-full flex flex-col gap-1 text-stone-400 text-sm">
          <span>API Key</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="your-api-key"
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value)
              setKeyGateError(null)
            }}
            className="w-full px-3 py-2 rounded border border-stone-600 bg-stone-900 text-stone-200"
            style={{ fontSize: 'var(--dot-size)' }}
          />
        </label>
        {keyGateError ? (
          <p className="text-red-400 text-sm text-center m-0" role="alert">
            {keyGateError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            className="ui-btn px-5 py-2"
            style={{ fontSize: 'var(--dot-size)' }}
            disabled={keyGateValidating}
            onClick={() => {
              void (async () => {
                const t = apiKeyInput.trim()
                if (!t) {
                  setKeyGateError('请填写 API Key')
                  return
                }
                const baseNorm = normalizeOpenAiBaseUrl(baseUrlInput)
                setKeyGateError(null)
                setKeyGateValidating(true)
                const v = await validateOpenAiCompatibleKey(t, baseNorm, 15000, modelInput.trim())
                setKeyGateValidating(false)
                if (!v.ok) {
                  setKeyGateError(v.error ?? '校验失败')
                  return
                }
                rememberAiSettings({
                  apiKey: t,
                  baseUrl: baseNorm,
                  model: modelInput.trim(),
                })
                if (keyGateReasonRef.current === 'change') {
                  keyGateReasonRef.current = 'bootstrap'
                  setApiKey(t)
                  setAwaitingApiKeyGate(false)
                  setApiKeyInput('')
                  return
                }
                setApiKeyInput('')
                void completeBootstrapAfterKeyGate(t)
              })()
            }}
          >
            {keyGateValidating ? '校验中…' : '校验并保存'}
          </button>
          <button
            type="button"
            className="ui-btn px-5 py-2"
            style={{ fontSize: 'var(--dot-size)' }}
            disabled={keyGateValidating}
            onClick={() => {
              setKeyGateError(null)
              if (keyGateReasonRef.current === 'change') {
                keyGateReasonRef.current = 'bootstrap'
                setAwaitingApiKeyGate(false)
                setApiKey(null)
                return
              }
              void completeBootstrapAfterKeyGate(null)
            }}
          >
            跳过，骨架游玩
          </button>
        </div>
      </div>
    )
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
        {error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <p className="text-stone-400">{plannerLoading ? PLANNER_LOADING_HINT : '加载中…'}</p>
        )}
        {import.meta.env.DEV && window.electronAPI?.isElectron && (
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
  const streamLine =
    streamBody && node && streamBody.nid === node.node_id ? streamBody.text : ''
  /** Prefer committed cache over stream so final frame matches trim/registerRuntimeNode body (avoids post-stream flicker). */
  const narrativeCached = node && cachedNarrative[node.node_id] !== undefined
  const narrativeContent = yishiLoading
    ? (yishiHint || '正在整理行旅……')
    : gateBlocked
      ? '【无法进入】条件未满足，无法感应此境。'
      : node && useAi && narrativeCached
        ? cachedNarrative[node.node_id]!
        : node && streamLine
          ? streamLine
          : node && useAi
            ? AI_BODY_LOADING_HINT
            : node
              ? narrativeAwaitingAi || narrativeLoading
                ? AI_BODY_LOADING_HINT
                : node.description
              : ''
  const isConclusion = !node && game?.yishiEntries.length && !pendingYishi
  const endingId = isConclusion ? evaluateEnding(game) : null
  const ending = endingId ? getEnding(endingId) : null
  const nextRealmAfter = getNextRealmAfter(skeleton, game.realmId)

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
    game.appendWorldGraphEvent({
      summary: `${node.node_id}：${choice.text}`,
      choice_text: choice.text,
      beat_id: game.currentBeatIndex != null ? String(game.currentBeatIndex) : undefined,
    })
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

  const dismissMidConcludeGuide = () => {
    try {
      localStorage.setItem(UI_HINT_MID_CONCLUDE_KEY, '1')
    } catch {
      /* ignore */
    }
    setMidConcludeGuideDismissed(true)
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
    dismissMidConcludeGuide()
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
    if (!game || !skeleton) return
    clearSave(activeSaveSlot)
    narrativeCtxRef.current.clear()
    directiveRef.current = null
    setStreamBody(null)
    const prev = game
    const g = new GameState(skeleton)
    g.playthroughGeneration = prev.playthroughGeneration
    if (prev.worldGraph.events.length > 0) {
      g.lastPlaythroughSummary = new WorldStateGraphManager(prev.worldGraph).summaryForPrompt(0, 600)
    } else {
      g.lastPlaythroughSummary = prev.lastPlaythroughSummary || ''
    }
    g.startRealm()
    setCachedNarrative({})
    setCachedAiChoices({})
    setGame(g)
    setPendingYishi(null)
    setFlyState(null)
    setDianPoRemovedIndex(null)
    setAcquireBanner(null)
    if (acquireTimerRef.current) {
      clearTimeout(acquireTimerRef.current)
      acquireTimerRef.current = null
    }
    refreshSaveSummaries()
    void runTryBeginDynamicStory(g, apiKey).then(() => forceUpdate())
  }

  const handleDianPo = () => {
    if (!game || !node || !canDianPo) return
    if (!game.consumeJianZhao(dianPoPct)) return
    try {
      localStorage.setItem(UI_HINT_DIANPO_KEY, '1')
    } catch {
      /* ignore */
    }
    setDianPoGuideDismissed(true)
    const baseChoices = getDisplayChoicesForNode(node, cachedAiChoices, isDynamicBeat)
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
      {v2FallbackToast ? (
        <div
          role="alert"
          className="fixed top-3 left-1/2 z-[8000] max-w-lg -translate-x-1/2 rounded border border-amber-600/80 bg-stone-900/95 px-4 py-2 text-sm text-amber-100 shadow-lg"
        >
          {v2FallbackToast}
          <button
            type="button"
            className="ml-2 text-stone-400 hover:text-stone-200"
            aria-label="关闭"
            onClick={() => setV2FallbackToast(null)}
          >
            ×
          </button>
        </div>
      ) : null}
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
          {import.meta.env.DEV && window.electronAPI?.isElectron && (
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
            streaming={Boolean(
              node &&
                streamBody?.nid === node.node_id &&
                narrativeLoading &&
                !narrativeCached
            )}
            reserveFooter={!node}
            footerAction={
              <>
                {pendingYishi !== null ? (
                  <Tooltip content={TT_SCROLL_INCOME}>
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
                  </Tooltip>
                ) : null}
                {isConclusion && !game.isGameOver() && nextRealmAfter ? (
                  <Tooltip content={ttNextRealm(nextRealmAfter.name)}>
                    <button
                      type="button"
                      onClick={() => handleEnterRealm(nextRealmAfter.id)}
                      className="ui-btn px-4 py-1.5 text-[var(--dot-size)] hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)] transition-colors"
                      style={{ fontSize: 'var(--dot-size)' }}
                    >
                      前往下一界：{nextRealmAfter.name}
                    </button>
                  </Tooltip>
                ) : null}
              </>
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
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {node && beatNarrativeReady && canDianPo ? (
                      <Tooltip content={ttDianPo(dianPoPct)}>
                        <button
                          type="button"
                          onClick={handleDianPo}
                          disabled={choicesInteractLocked}
                          className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)] disabled:opacity-50 shrink-0"
                          style={{ fontSize: 'var(--dot-size)' }}
                        >
                          点破
                        </button>
                      </Tooltip>
                    ) : null}
                    {node && beatNarrativeReady ? (
                      <Tooltip content={TT_DING_GAO}>
                        <button
                          type="button"
                          onClick={handleMidConclude}
                          disabled={choicesInteractLocked}
                          className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-muted)] hover:text-[var(--dot-text)] disabled:opacity-50 shrink-0"
                          style={{ fontSize: 'var(--dot-size)' }}
                        >
                          定稿
                        </button>
                      </Tooltip>
                    ) : null}
                    <Tooltip content={TT_ITEMS}>
                      <button
                        type="button"
                        onClick={() => setPanel('items')}
                        className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)] shrink-0"
                        style={{ fontSize: 'var(--dot-size)' }}
                      >
                        物证
                      </button>
                    </Tooltip>
                    <Tooltip content={TT_CLUES}>
                      <button
                        type="button"
                        onClick={() => setPanel('clues')}
                        className="ui-btn px-2 py-1 text-sm hover:border-[var(--dot-accent)] hover:text-[var(--dot-accent)] shrink-0"
                        style={{ fontSize: 'var(--dot-size)' }}
                      >
                        线索
                      </button>
                    </Tooltip>
                  </div>
                  {node && beatNarrativeReady && !dianPoGuideDismissed && canDianPo ? (
                    <p className="text-[var(--dot-muted)] mt-1 max-w-md" style={{ fontSize: '0.85em' }}>
                      消耗鉴照，可剔除一个感应。
                      <button
                        type="button"
                        className="ml-2 underline decoration-[var(--dot-muted)]/60 hover:text-[var(--dot-text)]"
                        style={{ fontSize: 'inherit' }}
                        onClick={() => {
                          try {
                            localStorage.setItem(UI_HINT_DIANPO_KEY, '1')
                          } catch {
                            /* ignore */
                          }
                          setDianPoGuideDismissed(true)
                        }}
                      >
                        知道了
                      </button>
                    </p>
                  ) : null}
                  {node && beatNarrativeReady && !midConcludeGuideDismissed ? (
                    <p className="text-[var(--dot-muted)] mt-1 max-w-md" style={{ fontSize: '0.85em' }}>
                      不选感应，直接封笔归档。
                      <button
                        type="button"
                        className="ml-2 underline decoration-[var(--dot-muted)]/60 hover:text-[var(--dot-text)]"
                        style={{ fontSize: 'inherit' }}
                        onClick={dismissMidConcludeGuide}
                      >
                        知道了
                      </button>
                    </p>
                  ) : null}
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
                ) : isAwaitingChoiceHydration({
                    apiKey,
                    node,
                    canEnterNode: game.canEnterNode(node),
                    cachedAiChoices,
                    cachedNarrative,
                    isDynamicBeat,
                  }) ? (
                  <div
                    className="flex-1 flex items-center justify-center text-[var(--dot-muted)] px-3 text-center"
                    style={{ fontSize: 'var(--dot-size)' }}
                    role="status"
                  >
                    {AI_CHOICE_LOADING_HINT}
                  </div>
                ) : (
                  (() => {
                    const baseChoices = getDisplayChoicesForNode(node, cachedAiChoices, isDynamicBeat)
                    const filtered = baseChoices
                      .map((choice, origIndex) => ({ choice, origIndex }))
                      .filter(({ choice }) => filterChoicesByClue([choice], game.clueIds()).length > 0)
                      .filter(({ origIndex }) => origIndex !== dianPoRemovedIndex)
                    return (
                      <ChoiceList
                        choices={filtered.map((x) => x.choice)}
                        onSelect={(fi) => handleChoice(filtered[fi].choice)}
                        disabled={yishiLoading}
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
            setCachedNarrative({})
            setCachedAiChoices({})
            setStreamBody(null)
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
            if (!skeleton) return
            let carryGen = 0
            let carrySummary = ''
            const slotToRead = findFirstOccupiedSlot()
            const prevData = loadSaveData(slotToRead)
            if (prevData) {
              carryGen = prevData.playthroughGeneration ?? 0
              const wg = prevData.worldGraph
              if (wg && Array.isArray(wg.events) && wg.events.length > 0) {
                carrySummary = new WorldStateGraphManager(graphFromJSON(wg)).summaryForPrompt(0, 600)
              } else if (typeof prevData.lastPlaythroughSummary === 'string' && prevData.lastPlaythroughSummary.trim()) {
                carrySummary = prevData.lastPlaythroughSummary.trim()
              }
            }
            clearSave()
            narrativeCtxRef.current.clear()
            directiveRef.current = null
            setStreamBody(null)
            const g = new GameState(skeleton)
            g.playthroughGeneration = carryGen
            g.lastPlaythroughSummary = carrySummary
            g.startRealm()
            setCachedNarrative({})
            setCachedAiChoices({})
            setGame(g)
            setActiveSaveSlot(0)
            setPanel(null)
            refreshSaveSummaries()
            void runTryBeginDynamicStory(g, apiKey).then(() => forceUpdate())
          }}
          realms={skeleton.realms.map((r) => ({ id: r.id, name: r.name }))}
          currentRealmId={game.realmId}
          onEnterRealm={handleEnterRealm}
          realmSwitchBusy={narrativeLoading || yishiLoading || choicesLoading || plannerLoading}
          onChangeApiKey={handleOpenChangeApiKey}
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

      <AiDebugOverlay />
    </div>
  )
}
