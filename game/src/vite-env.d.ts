/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_AIHUBMIX_API_KEY?: string
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
  }
}
