/**
 * AI Bridge: re-exports from aiEngine.
 * Kept for backward compatibility; new code should import from '@/game/aiEngine'.
 */

export {
  generateNodeNarrative,
  generateYishi,
  AI_DEBUG,
  type NodeContext,
  type StateFilter,
} from './aiEngine'
