// API key: set VITE_AIHUBMIX_API_KEY in .env, or add public/config.json (gitignored) with { "aihubmixApiKey": "sk-..." }
let cachedKey: string | null = null

export async function getApiKey(): Promise<string | null> {
  if (cachedKey !== null) return cachedKey || null
  try {
    const key = import.meta.env.VITE_AIHUBMIX_API_KEY as string | undefined
    if (key?.startsWith('sk-')) {
      cachedKey = key
      return key
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
