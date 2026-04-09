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
  runConductor,
  parseGenerationPlan,
  chat,
  chatStream,
  AI_DEBUG,
  validateOpenAiCompatibleKey,
  narrativeMatchesPlotGuide,
  getModelForRole,
  type NodeContext,
  type StateFilter,
  type GenerateNarrativeOptions,
  type AIAgentRole,
  type GenerationPlan,
  type ChoiceIntent,
  type LayeredContextInput,
  verifyNarrative,
  type VerifyNarrativeResult,
} from './aiEngine'
