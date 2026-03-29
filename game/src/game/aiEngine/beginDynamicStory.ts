import type { GameState } from '@/game/state'
import { loadDesignSeed, realmSeedById } from '@/game/designSeed'
import { isAiEngineV2Enabled } from '@/game/aiEngine/v2Enabled'
import { runPlanner } from '@/game/aiEngine/agents/planner'
import { humanizePlannerError, PLANNER_FALLBACK_HINT } from '@/plannerUi'

export type BeginDynamicStoryResult =
  | { outcome: 'skipped' }
  | { outcome: 'success' }
  | { outcome: 'planner_empty'; message: string }
  | { outcome: 'error'; message: string }

/**
 * Run Planner and attach dynamic outline when v2 + key + seed allow.
 * On failure, game stays on skeleton; caller may show `message` to the user.
 */
export async function tryBeginDynamicStory(
  g: GameState,
  apiKey: string | null
): Promise<BeginDynamicStoryResult> {
  if (!isAiEngineV2Enabled() || !apiKey || !g.realmId) return { outcome: 'skipped' }
  const seed = await loadDesignSeed(g.skeleton)
  const rs = realmSeedById(seed, g.realmId)
  if (!seed || !rs) return { outcome: 'skipped' }
  const hint =
    g.playthroughGeneration >= 2
      ? (g.lastPlaythroughSummary || g.getChoiceSummaryForYishi()).trim() || undefined
      : undefined
  try {
    const outline = await runPlanner(apiKey, seed, g.realmId, hint)
    if (outline) {
      g.beginDynamicStory(outline, rs)
      return { outcome: 'success' }
    }
    return { outcome: 'planner_empty', message: PLANNER_FALLBACK_HINT }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { outcome: 'error', message: humanizePlannerError(msg) }
  }
}
