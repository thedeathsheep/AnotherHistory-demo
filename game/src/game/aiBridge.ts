/**
 * AI Bridge: re-exports from aiEngine.
 * Kept for backward compatibility; new code should import from '@/game/aiEngine'.
 */

export {
  generateNodeNarrative,
  generateYishi,
  generateChoices,
  AI_DEBUG,
  narrativeMatchesPlotGuide,
  type NodeContext,
  type StateFilter,
  type GenerateNarrativeOptions,
} from './aiEngine'
