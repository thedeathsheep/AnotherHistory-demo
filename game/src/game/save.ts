import { GameState, type EngineMode } from './state'
import type { Skeleton, Choice, HaiId, Item, Clue, YishiEntry, Node } from './types'
import { DEFAULT_STATS, normalizeHais } from './types'
import { itemFromId, clueFromId } from './catalog'
import { createYishiEntry } from './aiOutput'
import type { StoryOutline } from './storyRuntime'
import type { WorldStateGraph } from './worldStateGraph'
import { createEmptyWorldGraph, graphFromJSON } from './worldStateGraph'

export const SAVE_VERSION = 3
export const SAVE_SLOT_COUNT = 5
const LEGACY_KEY = 'anotherhistory_save'

export function saveStorageKey(slot: number): string {
  return `anotherhistory_save_${slot}`
}

function slotKey(slot: number): string {
  return saveStorageKey(slot)
}

export interface SaveDataV2 {
  version: number
  slot: number
  realmId: string | null
  currentNodeId: string | null
  stats: Record<string, number>
  hais: Record<string, number>
  items: Item[]
  clues: Clue[]
  choiceHistory: Array<{
    text: string
    next: string
    state?: unknown
    hai_delta?: unknown
    conclusion_label?: string
    jian_zhao_penalty?: number
    required_clue?: string
    drop_item?: string[]
  }>
  yishiEntries: YishiEntry[]
  stepsTaken: number
}

/** AI Engine v2 persistence */
export interface SaveDataV3 extends SaveDataV2 {
  version: 3
  engineMode?: EngineMode
  storyOutline?: StoryOutline | null
  currentBeatIndex?: number | null
  runtimeNodes?: Record<string, Node>
  playthroughGeneration?: number
  worldGraph?: WorldStateGraph
  /** Carried for next Planner call when generation >= 2 */
  lastPlaythroughSummary?: string
}

export type SaveData = SaveDataV3

function emptyHais(): Record<HaiId, number> {
  return normalizeHais()
}

function migrateLegacy(raw: unknown): SaveDataV3 | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Record<string, unknown>
  if (typeof d.version !== 'number' || d.version < 1) return null
  const itemsRaw = d.items
  const cluesRaw = d.clues
  const yishiRaw = d.yishiEntries
  const items: Item[] = Array.isArray(itemsRaw)
    ? (itemsRaw as unknown[]).map((x) =>
        typeof x === 'string' ? itemFromId(x) : (x as Item)
      )
    : []
  const clues: Clue[] = Array.isArray(cluesRaw)
    ? (cluesRaw as unknown[]).map((x) =>
        typeof x === 'string' ? clueFromId(x) : (x as Clue)
      )
    : []
  const yishiEntries: YishiEntry[] = Array.isArray(yishiRaw)
    ? (yishiRaw as unknown[]).map((x) =>
        typeof x === 'string' ? createYishiEntry(x) : (x as YishiEntry)
      )
    : []
  const base: SaveDataV3 = {
    version: SAVE_VERSION,
    slot: typeof d.slot === 'number' ? d.slot : 0,
    realmId: (d.realmId as string | null) ?? null,
    currentNodeId: (d.currentNodeId as string | null) ?? null,
    stats: { ...(d.stats as Record<string, number>) },
    hais: { ...((d.hais as Record<string, number>) ?? {}) },
    items,
    clues,
    choiceHistory: (Array.isArray(d.choiceHistory) ? d.choiceHistory : []) as SaveDataV2['choiceHistory'],
    yishiEntries,
    stepsTaken: typeof d.stepsTaken === 'number' ? d.stepsTaken : 0,
  }
  if (d.version >= 3) {
    base.engineMode = (d.engineMode as EngineMode) === 'dynamic' ? 'dynamic' : 'skeleton'
    base.storyOutline = (d.storyOutline as StoryOutline | null | undefined) ?? null
    base.currentBeatIndex = typeof d.currentBeatIndex === 'number' ? d.currentBeatIndex : null
    base.runtimeNodes =
      d.runtimeNodes && typeof d.runtimeNodes === 'object' ? { ...(d.runtimeNodes as Record<string, Node>) } : {}
    base.playthroughGeneration = typeof d.playthroughGeneration === 'number' ? d.playthroughGeneration : 0
    base.worldGraph = d.worldGraph ? graphFromJSON(d.worldGraph) : createEmptyWorldGraph()
    base.lastPlaythroughSummary =
      typeof d.lastPlaythroughSummary === 'string' ? d.lastPlaythroughSummary : ''
  } else {
    base.engineMode = 'skeleton'
    base.storyOutline = null
    base.currentBeatIndex = null
    base.runtimeNodes = {}
    base.playthroughGeneration = 0
    base.worldGraph = createEmptyWorldGraph()
    base.lastPlaythroughSummary = ''
  }
  return base
}

export function saveGameState(game: GameState, slot = 0): void {
  const s = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, slot))
  try {
    const data: SaveDataV3 = {
      version: SAVE_VERSION,
      slot: s,
      realmId: game.realmId,
      currentNodeId: game.currentNodeId,
      stats: { ...game.stats },
      hais: { ...game.hais },
      items: [...game.items],
      clues: [...game.clues],
      choiceHistory: [...game.choiceHistory],
      yishiEntries: [...game.yishiEntries],
      stepsTaken: game.stepsTaken,
      engineMode: game.engineMode,
      storyOutline: game.storyOutline,
      currentBeatIndex: game.currentBeatIndex,
      runtimeNodes: { ...game.runtimeNodes },
      playthroughGeneration: game.playthroughGeneration,
      worldGraph: game.worldGraph,
      lastPlaythroughSummary: game.lastPlaythroughSummary,
    }
    localStorage.setItem(slotKey(s), JSON.stringify(data))
    try {
      void window.electronAPI?.writeSaveSlot?.(s, JSON.stringify(data))
    } catch {
      // optional Electron mirror
    }
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[save] Failed to save:', e)
  }
}

export function loadSaveData(slot = 0): SaveData | null {
  const s = Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, slot))
  try {
    let raw = localStorage.getItem(slotKey(s))
    if (!raw && s === 0) {
      const leg = localStorage.getItem(LEGACY_KEY)
      if (leg) {
        const data = JSON.parse(leg) as unknown
        const migrated = migrateLegacy(data)
        if (migrated) {
          localStorage.removeItem(LEGACY_KEY)
          localStorage.setItem(slotKey(0), JSON.stringify(migrated))
          raw = localStorage.getItem(slotKey(0))
        }
      }
    }
    if (!raw) return null
    const data = JSON.parse(raw) as unknown
    const migrated = migrateLegacy(data)
    return migrated
  } catch {
    return null
  }
}

export function findFirstOccupiedSlot(): number {
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    if (loadSaveData(i) !== null) return i
  }
  return 0
}

export function hasSave(slot?: number): boolean {
  if (slot !== undefined) return loadSaveData(slot) !== null
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    if (loadSaveData(i) !== null) return true
  }
  try {
    if (localStorage.getItem(LEGACY_KEY)) return true
  } catch {
    // ignore
  }
  return false
}

export function clearSave(slot?: number): void {
  try {
    if (slot !== undefined) {
      localStorage.removeItem(slotKey(slot))
      void window.electronAPI?.deleteSaveSlot?.(slot)
    } else {
      for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
        localStorage.removeItem(slotKey(i))
        void window.electronAPI?.deleteSaveSlot?.(i)
      }
      localStorage.removeItem(LEGACY_KEY)
    }
  } catch {
    // ignore
  }
}

export interface SaveSlotSummary {
  slot: number
  empty: boolean
  realmId: string | null
  yishiCount: number
  stepsTaken: number
}

export function listSaveSummaries(): SaveSlotSummary[] {
  const out: SaveSlotSummary[] = []
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const d = loadSaveData(i)
    if (!d) {
      out.push({ slot: i, empty: true, realmId: null, yishiCount: 0, stepsTaken: 0 })
    } else {
      out.push({
        slot: i,
        empty: false,
        realmId: d.realmId,
        yishiCount: d.yishiEntries?.length ?? 0,
        stepsTaken: d.stepsTaken ?? 0,
      })
    }
  }
  return out
}

export function restoreGameState(skeleton: Skeleton, data: SaveData): GameState {
  const game = new GameState(skeleton)
  game.realmId = data.realmId ?? null
  game.currentNodeId = data.currentNodeId ?? null
  game.stats = { ...DEFAULT_STATS, ...data.stats }
  const defaultHais = emptyHais()
  game.hais = { ...defaultHais, ...normalizeHais(data.hais as Partial<Record<HaiId, number>>) }
  game.items = Array.isArray(data.items) ? data.items.map((x) => (typeof x === 'string' ? itemFromId(x) : x)) : []
  game.clues = Array.isArray(data.clues) ? data.clues.map((x) => (typeof x === 'string' ? clueFromId(x) : x)) : []
  game.choiceHistory = (Array.isArray(data.choiceHistory) ? data.choiceHistory : []) as Choice[]
  game.yishiEntries = Array.isArray(data.yishiEntries)
    ? data.yishiEntries.map((x) => (typeof x === 'string' ? createYishiEntry(x) : x))
    : []
  game.stepsTaken = typeof data.stepsTaken === 'number' ? data.stepsTaken : 0

  const v3 = data as SaveDataV3
  game.engineMode = v3.engineMode === 'dynamic' ? 'dynamic' : 'skeleton'
  game.storyOutline = v3.storyOutline ?? null
  game.currentBeatIndex = typeof v3.currentBeatIndex === 'number' ? v3.currentBeatIndex : null
  game.runtimeNodes = v3.runtimeNodes && typeof v3.runtimeNodes === 'object' ? { ...v3.runtimeNodes } : {}
  game.playthroughGeneration = typeof v3.playthroughGeneration === 'number' ? v3.playthroughGeneration : 0
  game.worldGraph = v3.worldGraph ? graphFromJSON(v3.worldGraph) : createEmptyWorldGraph()
  game.lastPlaythroughSummary =
    typeof v3.lastPlaythroughSummary === 'string' ? v3.lastPlaythroughSummary : ''

  const realm = data.realmId ? skeleton.realms.find((r) => r.id === data.realmId) : null
  if (!realm) {
    game.startRealm()
    return game
  }
  const nodeExists =
    (game.currentNodeId && game.runtimeNodes[game.currentNodeId!] != null) ||
    realm.nodes.some((n) => n.node_id === game.currentNodeId)
  if (!nodeExists && realm.entry_node) {
    game.currentNodeId = realm.entry_node
    game.clearDynamicStory()
  }
  return game
}

/** Load mirrors from Electron userData when local slot is empty. */
export async function hydrateSlotsFromElectron(): Promise<void> {
  const api = window.electronAPI
  if (!api?.readSaveSlot) return
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    if (localStorage.getItem(slotKey(i))) continue
    try {
      const raw = await api.readSaveSlot(i)
      if (typeof raw === 'string' && raw.length) localStorage.setItem(slotKey(i), raw)
    } catch {
      // ignore
    }
  }
}
