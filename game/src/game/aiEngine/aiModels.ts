/**
 * Per-agent model selection (AI Engine v2). Env: VITE_AI_MODEL_<ROLE>.
 * If the user set a default model in the API gate (localStorage), it overrides all roles.
 * Fallback: gpt-4o-mini for all.
 */

import { getUserModelOverrideSync } from '@/aiSettings'

export type AIAgentRole = 'planner' | 'director' | 'writer' | 'choice' | 'verifier' | 'yishi' | 'default'

const DEFAULT_MODEL = 'gpt-4o-mini'

function envModel(key: string): string | undefined {
  if (typeof import.meta === 'undefined') return undefined
  const v = import.meta.env?.[key] as string | undefined
  return v?.trim() || undefined
}

/** Resolved model name for chat/completions. */
export function getModelForRole(role: AIAgentRole): string {
  const user = getUserModelOverrideSync()
  if (user) return user
  const map: Record<AIAgentRole, string | undefined> = {
    planner: envModel('VITE_AI_MODEL_PLANNER'),
    director: envModel('VITE_AI_MODEL_DIRECTOR'),
    writer: envModel('VITE_AI_MODEL_WRITER'),
    choice: envModel('VITE_AI_MODEL_CHOICE'),
    verifier: envModel('VITE_AI_MODEL_VERIFIER'),
    yishi: envModel('VITE_AI_MODEL_YISHI'),
    default: envModel('VITE_AI_MODEL_DEFAULT'),
  }
  return map[role] || map.default || DEFAULT_MODEL
}
