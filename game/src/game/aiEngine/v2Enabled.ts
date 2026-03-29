/**
 * Feature gate for AI Engine v2 (dynamic Planner / Director / Writer pipeline).
 * When disabled, the game stays on skeleton traversal only (no Planner API calls).
 */

export function isAiEngineV2Enabled(): boolean {
  const v = import.meta.env.VITE_AI_ENGINE_V2
  if (v === '0' || v === 'false') return false
  // Default on for playable demo; set VITE_AI_ENGINE_V2=0 to force skeleton-only v2 path off
  return true
}
