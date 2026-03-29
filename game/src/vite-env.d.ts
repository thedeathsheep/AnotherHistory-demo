/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** OpenAI-compatible API key (preferred). */
  readonly VITE_OPENAI_API_KEY?: string
  /** Legacy alias for VITE_OPENAI_API_KEY. */
  readonly VITE_AIHUBMIX_API_KEY?: string
  /** OpenAI-compatible API root, e.g. https://api.openai.com/v1 */
  readonly VITE_OPENAI_BASE_URL?: string
  /** Set to "1" or "true" to enable Engine v2 (Planner + dynamic beats). Default: off. */
  readonly VITE_AI_ENGINE_V2?: string
  readonly VITE_AI_DEBUG?: string
  readonly VITE_AI_MODEL_DEFAULT?: string
  readonly VITE_AI_MODEL_PLANNER?: string
  readonly VITE_AI_MODEL_DIRECTOR?: string
  readonly VITE_AI_MODEL_WRITER?: string
  readonly VITE_AI_MODEL_CHOICE?: string
  readonly VITE_AI_MODEL_VERIFIER?: string
  readonly VITE_AI_MODEL_YISHI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  electronAPI?: {
    isElectron: true
    regenerateGenerated: (chapterId?: string) => Promise<{ ok: boolean; error?: string }>
    writeSaveSlot?: (slot: number, json: string) => Promise<{ ok: boolean; error?: string }>
    readSaveSlot?: (slot: number) => Promise<string | null>
    deleteSaveSlot?: (slot: number) => Promise<{ ok: boolean; error?: string }>
    readAiSettings?: () => Promise<{ apiKey?: string; baseUrl?: string; model?: string } | null>
    writeAiSettings?: (payload: { apiKey?: string; baseUrl?: string; model?: string }) => Promise<{ ok: boolean; error?: string }>
    clearAiSettings?: () => Promise<{ ok: boolean; error?: string }>
  }
}
