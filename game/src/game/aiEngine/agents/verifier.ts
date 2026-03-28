/**
 * Verifier: rule-based checks for narrative (Engine v2). Optional LLM later.
 */

import { violatesTaboo } from '@/game/state'
import { narrativeMatchesPlotGuide } from '../prompts/narrative'

export interface VerifyNarrativeResult {
  ok: boolean
  reason?: string
}

export function verifyNarrative(text: string, plotGuide: string[], taboo: string[]): VerifyNarrativeResult {
  const t = text?.trim() ?? ''
  if (!t) return { ok: false, reason: 'empty' }
  if (plotGuide.length && !narrativeMatchesPlotGuide(t, plotGuide)) {
    return { ok: false, reason: 'plot_guide' }
  }
  if (taboo.length && violatesTaboo(t, taboo)) {
    return { ok: false, reason: 'taboo' }
  }
  return { ok: true }
}
