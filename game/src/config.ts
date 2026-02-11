// API key: set VITE_AIHUBMIX_API_KEY in .env, or add public/config.json (gitignored) with { "aihubmixApiKey": "sk-..." }
let cachedKey: string | null = null

export async function getApiKey(): Promise<string | null> {
  if (cachedKey !== null) return cachedKey || null
  try {
    // Electron: use key from main process (reads .env / config.json / api_key.txt)
    if (typeof window !== 'undefined' && window.electronAPI?.getApiKey) {
      const key = await window.electronAPI.getApiKey()
      if (key?.startsWith('sk-')) {
        cachedKey = key
        return key
      }
    }
    const key = import.meta.env.VITE_AIHUBMIX_API_KEY as string | undefined
    if (key?.startsWith('sk-')) {
      cachedKey = key
      return key
    }
    const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/?$/, '/')
    const res = await fetch(`${base}config.json`)
    if (res.ok) {
      const data = (await res.json()) as { aihubmixApiKey?: string }
      if (data.aihubmixApiKey?.startsWith('sk-')) {
        cachedKey = data.aihubmixApiKey
        return cachedKey
      }
    }
  } catch {
    // ignore
  }
  cachedKey = ''
  return null
}
