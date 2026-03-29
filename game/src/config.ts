// API key: .env VITE_AIHUBMIX_API_KEY → localStorage → public/config.json (gitignored)
const LS_API_KEY = 'anotherhistory_aihubmix_api_key'

let cachedKey: string | null = null

function readKeyFromLocalStorage(): string | null {
  try {
    const v = localStorage.getItem(LS_API_KEY)?.trim()
    return v?.startsWith('sk-') ? v : null
  } catch {
    return null
  }
}

export async function getApiKey(): Promise<string | null> {
  if (cachedKey !== null) return cachedKey || null
  try {
    const key = import.meta.env.VITE_AIHUBMIX_API_KEY as string | undefined
    if (key?.startsWith('sk-')) {
      cachedKey = key
      return key
    }
    const fromLs = readKeyFromLocalStorage()
    if (fromLs) {
      cachedKey = fromLs
      return fromLs
    }
    const res = await fetch('/config.json')
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

/** Persist key in localStorage and refresh in-memory cache (browser session). */
export function rememberUserApiKey(key: string): void {
  const t = key.trim()
  if (!t.startsWith('sk-')) return
  try {
    localStorage.setItem(LS_API_KEY, t)
  } catch {
    // ignore
  }
  cachedKey = t
}

export function clearUserApiKeyFromStorage(): void {
  try {
    localStorage.removeItem(LS_API_KEY)
  } catch {
    // ignore
  }
  cachedKey = null
}
