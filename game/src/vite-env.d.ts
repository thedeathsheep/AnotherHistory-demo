/// <reference types="vite/client" />

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
  }
}
