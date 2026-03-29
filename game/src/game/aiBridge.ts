/**
 * AI Bridge: re-exports from aiEngine.
 * Kept for backward compatibility; new code should import from '@/game/aiEngine'.
 */

export {
  generateNodeNarrative,
  generateYishi,
  generateItemNarrative,
  generateNpcDialogue,
  generateChoices,
  generateDynamicBeatNarrative,
  generateDynamicBeatChoices,
  runPlanner,
  runDirector,
  chat,
  chatStream,
  AI_DEBUG,
  narrativeMatchesPlotGuide,
  getModelForRole,
  type NodeContext,
  type StateFilter,
  type GenerateNarrativeOptions,
  type AIAgentRole,
  type LayeredContextInput,
  verifyNarrative,
  type VerifyNarrativeResult,
} from './aiEngine'
