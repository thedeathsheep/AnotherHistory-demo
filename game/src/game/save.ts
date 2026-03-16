import { GameState } from './state'
import type { Skeleton, Choice, HaiId } from './types'
import { DEFAULT_STATS, HAI_IDS } from './types'

const SAVE_KEY = 'anotherhistory_save'
const SAVE_VERSION = 1

export interface SaveData {
  version: number
  realmId: string | null
  currentNodeId: string | null
  stats: Record<string, number>
  hais: Record<string, number>
  items: string[]
  clues: string[]
  choiceHistory: Array<{ text: string; next: string; state?: unknown; hai_delta?: unknown; conclusion_label?: string; jian_zhao_penalty?: number }>
  yishiEntries: string[]
}

function emptyHais(): Record<HaiId, number> {
  return Object.fromEntries(HAI_IDS.map((k) => [k, 0])) as Record<HaiId, number>
}

export function saveGameState(game: GameState): void {
  try {
    const data: SaveData = {
      version: SAVE_VERSION,
      realmId: game.realmId,
      currentNodeId: game.currentNodeId,
      stats: { ...game.stats },
      hais: { ...game.hais },
      items: [...game.items],
      clues: [...game.clues],
      choiceHistory: [...game.choiceHistory],
      yishiEntries: [...game.yishiEntries],
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[save] Failed to save:', e)
  }
}

export function loadSaveData(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SaveData
    if (!data || typeof data.version !== 'number') return null
    return data
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  return loadSaveData() !== null
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}

export function restoreGameState(skeleton: Skeleton, data: SaveData): GameState {
  const game = new GameState(skeleton)
  game.realmId = data.realmId ?? null
  game.currentNodeId = data.currentNodeId ?? null
  game.stats = { ...DEFAULT_STATS, ...data.stats }
  const defaultHais = emptyHais()
  game.hais = { ...defaultHais, ...data.hais } as Record<HaiId, number>
  game.items = Array.isArray(data.items) ? data.items : []
  game.clues = Array.isArray(data.clues) ? data.clues : []
  game.choiceHistory = (Array.isArray(data.choiceHistory) ? data.choiceHistory : []) as Choice[]
  game.yishiEntries = Array.isArray(data.yishiEntries) ? data.yishiEntries : []

  // Validate: if realm or node missing, fall back to realm entry
  const realm = data.realmId ? skeleton.realms.find((r) => r.id === data.realmId) : null
  if (!realm) {
    game.startRealm()
    return game
  }
  const nodeExists = realm.nodes.some((n) => n.node_id === game.currentNodeId)
  if (!nodeExists && realm.entry_node) {
    game.currentNodeId = realm.entry_node
  }
  return game
}
