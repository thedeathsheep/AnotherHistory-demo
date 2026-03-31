import type { SaveData } from './save'
import { graphFromJSON, WorldStateGraphManager, type WorldStateGraph } from './worldStateGraph'

export interface NewGameCarryover {
  playthroughGeneration: number
  lastPlaythroughSummary: string
}

interface CarryoverSource {
  playthroughGeneration?: number
  worldGraph?: WorldStateGraph
  lastPlaythroughSummary?: string
}

function summarizeCarryover(source: CarryoverSource | null | undefined): NewGameCarryover {
  if (!source) {
    return { playthroughGeneration: 0, lastPlaythroughSummary: '' }
  }

  const playthroughGeneration =
    typeof source.playthroughGeneration === 'number' ? source.playthroughGeneration : 0

  const worldGraph = source.worldGraph ? graphFromJSON(source.worldGraph) : null
  if (worldGraph && worldGraph.events.length > 0) {
    return {
      playthroughGeneration,
      lastPlaythroughSummary: new WorldStateGraphManager(worldGraph).summaryForPrompt(0, 600),
    }
  }

  return {
    playthroughGeneration,
    lastPlaythroughSummary:
      typeof source.lastPlaythroughSummary === 'string' ? source.lastPlaythroughSummary.trim() : '',
  }
}

export function resolveNewGameCarryover(
  currentRun: CarryoverSource | null | undefined,
  fallbackSave: SaveData | null | undefined
): NewGameCarryover {
  const current = summarizeCarryover(currentRun)
  if (current.playthroughGeneration > 0 || current.lastPlaythroughSummary) return current
  return summarizeCarryover(fallbackSave ?? null)
}
