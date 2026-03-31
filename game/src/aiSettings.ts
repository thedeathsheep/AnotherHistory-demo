/**
 * OpenAI-compatible API: key + base URL + optional default model (overrides per-role env).
 * Persists: localStorage + Electron ai-settings.json (+ legacy key migration).
 */

import { OPENAI_COMPAT_BASE_HEADER, OPENAI_COMPAT_PROXY_PREFIX } from '@/openaiProxyConstants'

const LS_KEY = 'anotherhistory_openai_api_key'
const LS_BASE = 'anotherhistory_openai_base_url'
const LS_MODEL = 'anotherhistory_openai_model'
const LEGACY_LS_KEY = 'anotherhistory_aihubmix_api_key'

export const DEFAULT_OPENAI_BASE = 'https://api.openai.com/v1'
export const DEFAULT_MODEL_SUGGESTION = 'gpt-4o-mini'

let cachedKey: string | null = null
let electronSettingsMerged = false

export function normalizeOpenAiBaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '')
  if (!u) return DEFAULT_OPENAI_BASE
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  if (!/\/v1$/i.test(u)) u = `${u}/v1`
  return u
}

/** Real API root for persistence (never the dev/preview proxy path). */
function getOpenAiBaseStoredOrDefaultNormalized(): string {
  try {
    const bu = localStorage.getItem(LS_BASE)?.trim()
    if (bu) return normalizeOpenAiBaseUrl(bu)
  } catch {
    // ignore
  }
  const env = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined)?.trim()
  if (env) return normalizeOpenAiBaseUrl(env)
  return DEFAULT_OPENAI_BASE
}

function useBrowserViteCompatProxy(): boolean {
  if (typeof window === 'undefined') return false
  const protocol = window.location?.protocol
  return protocol === 'http:' || protocol === 'https:'
}

export interface OpenAiFetchTarget {
  /** Prefix for fetch: `${urlBase}/models` or `/chat/completions` */
  urlBase: string
  /** Merge into fetch headers (browser + Vite dev/preview only). */
  headers: Record<string, string>
}

/**
 * 浏览器直连任意兼容网关会被 CORS 拦截；在 Vite dev / vite preview 下走同源代理，
 * 由请求头 `X-OpenAI-Compat-Base` 指定真实 Base。Electron 无此限制。
 */
export function resolveOpenAiFetchTarget(baseUrlRaw: string): OpenAiFetchTarget {
  const real = baseUrlRaw.trim()
    ? normalizeOpenAiBaseUrl(baseUrlRaw)
    : getOpenAiBaseStoredOrDefaultNormalized()
  if (!useBrowserViteCompatProxy()) {
    return { urlBase: real, headers: {} }
  }
  return {
    urlBase: `${window.location.origin}${OPENAI_COMPAT_PROXY_PREFIX}`,
    headers: { [OPENAI_COMPAT_BASE_HEADER]: real },
  }
}

/** @deprecated Prefer resolveOpenAiFetchTarget() for correct proxy headers. */
export function resolveOpenAiRequestBase(baseUrlRaw: string): string {
  return resolveOpenAiFetchTarget(baseUrlRaw).urlBase
}

/** Sync base URL for chat() / chatStream() (reads localStorage + Vite env + browser proxy). */
export function getOpenAiBaseUrlSync(): string {
  return resolveOpenAiRequestBase('')
}

/** If set, all agent roles use this model instead of VITE_AI_MODEL_* . */
export function getUserModelOverrideSync(): string | null {
  try {
    const m = localStorage.getItem(LS_MODEL)?.trim()
    return m || null
  } catch {
    return null
  }
}

function readApiKeyFromLs(): string | null {
  try {
    const v = localStorage.getItem(LS_KEY)?.trim()
    if (v) return v
    const leg = localStorage.getItem(LEGACY_LS_KEY)?.trim()
    if (leg) {
      localStorage.setItem(LS_KEY, leg)
      localStorage.removeItem(LEGACY_LS_KEY)
      return leg
    }
  } catch {
    // ignore
  }
  return null
}

function readBaseFromLs(): string | null {
  try {
    const b = localStorage.getItem(LS_BASE)?.trim()
    return b ? normalizeOpenAiBaseUrl(b) : null
  } catch {
    return null
  }
}

function readModelFromLs(): string | null {
  return getUserModelOverrideSync()
}

function gatherSettingsForElectron(): Record<string, string> {
  const apiKey = readApiKeyFromLs() ?? ''
  const baseUrl = readBaseFromLs() ?? getOpenAiBaseStoredOrDefaultNormalized()
  const model = readModelFromLs() ?? ''
  return { apiKey, baseUrl, model }
}

async function mergeElectronSettingsOnce(): Promise<void> {
  if (electronSettingsMerged) return
  electronSettingsMerged = true
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined
  if (!api?.readAiSettings) return
  try {
    const s = (await api.readAiSettings()) as Record<string, unknown> | null
    if (!s || typeof s !== 'object') return
    const key = typeof s.apiKey === 'string' ? s.apiKey.trim() : ''
    const baseUrl = typeof s.baseUrl === 'string' ? s.baseUrl.trim() : ''
    const model = typeof s.model === 'string' ? s.model.trim() : ''
    if (key) {
      try {
        localStorage.setItem(LS_KEY, key)
      } catch {
        // ignore
      }
    }
    if (baseUrl) {
      try {
        localStorage.setItem(LS_BASE, normalizeOpenAiBaseUrl(baseUrl))
      } catch {
        // ignore
      }
    }
    if (model) {
      try {
        localStorage.setItem(LS_MODEL, model)
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export async function hydrateAiSettingsFromElectron(): Promise<void> {
  electronSettingsMerged = false
  await mergeElectronSettingsOnce()
}

export async function getApiKey(): Promise<string | null> {
  if (cachedKey !== null) return cachedKey || null
  try {
    // User key (gate / localStorage / Electron) must win over VITE_* so refresh uses what they saved.
    await mergeElectronSettingsOnce()

    const fromLs = readApiKeyFromLs()
    if (fromLs) {
      cachedKey = fromLs
      void window.electronAPI?.writeAiSettings?.(gatherSettingsForElectron())
      return fromLs
    }

    const envKey =
      (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim() ||
      (import.meta.env.VITE_AIHUBMIX_API_KEY as string | undefined)?.trim()
    if (envKey) {
      cachedKey = envKey
      return envKey
    }

    const res = await fetch('/config.json')
    if (res.ok) {
      const data = (await res.json()) as {
        openaiApiKey?: string
        aihubmixApiKey?: string
        openaiBaseUrl?: string
        openaiModel?: string
      }
      const k = (data.openaiApiKey ?? data.aihubmixApiKey)?.trim()
      if (k) {
        cachedKey = k
        try {
          localStorage.setItem(LS_KEY, k)
          if (data.openaiBaseUrl?.trim()) {
            localStorage.setItem(LS_BASE, normalizeOpenAiBaseUrl(data.openaiBaseUrl))
          } else if (data.aihubmixApiKey && !data.openaiApiKey) {
            localStorage.setItem(LS_BASE, normalizeOpenAiBaseUrl('https://aihubmix.com/v1'))
          }
          if (data.openaiModel?.trim()) {
            localStorage.setItem(LS_MODEL, data.openaiModel.trim())
          }
        } catch {
          // ignore
        }
        void window.electronAPI?.writeAiSettings?.(gatherSettingsForElectron())
        return k
      }
    }
  } catch {
    // ignore
  }
  cachedKey = ''
  return null
}

export function rememberAiSettings(part: { apiKey?: string; baseUrl?: string; model?: string }): void {
  if (part.apiKey !== undefined) {
    const t = part.apiKey.trim()
    if (t) {
      try {
        localStorage.setItem(LS_KEY, t)
      } catch {
        // ignore
      }
      cachedKey = t
    }
  }
  if (part.baseUrl !== undefined) {
    const b = normalizeOpenAiBaseUrl(part.baseUrl || DEFAULT_OPENAI_BASE)
    try {
      localStorage.setItem(LS_BASE, b)
    } catch {
      // ignore
    }
  }
  if (part.model !== undefined) {
    const m = part.model.trim()
    try {
      if (m) localStorage.setItem(LS_MODEL, m)
      else localStorage.removeItem(LS_MODEL)
    } catch {
      // ignore
    }
  }
  void window.electronAPI?.writeAiSettings?.(gatherSettingsForElectron())
}

/** @deprecated Use rememberAiSettings({ apiKey }) */
export function rememberUserApiKey(key: string): void {
  rememberAiSettings({ apiKey: key })
}

/** Clear only the API key; keep base URL and model (e.g. 「修改 API Key」). */
export async function clearStoredApiKeyOnly(): Promise<void> {
  try {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LEGACY_LS_KEY)
  } catch {
    // ignore
  }
  cachedKey = null
  try {
    const api = window.electronAPI
    if (api?.readAiSettings && api?.writeAiSettings) {
      const s = ((await api.readAiSettings()) as Record<string, string> | null) ?? {}
      await api.writeAiSettings({ ...s, apiKey: '' })
    }
  } catch {
    // ignore
  }
}

export async function clearUserApiKeyFromStorage(): Promise<void> {
  try {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_BASE)
    localStorage.removeItem(LS_MODEL)
    localStorage.removeItem(LEGACY_LS_KEY)
  } catch {
    // ignore
  }
  cachedKey = null
  electronSettingsMerged = false
  try {
    await window.electronAPI?.clearAiSettings?.()
  } catch {
    // ignore
  }
}

export function getGateFormDefaults(): { baseUrl: string; model: string } {
  const envBase = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined)?.trim()
  const envModel = (import.meta.env.VITE_AI_MODEL_DEFAULT as string | undefined)?.trim()
  return {
    baseUrl: readBaseFromLs() ?? (envBase ? normalizeOpenAiBaseUrl(envBase) : DEFAULT_OPENAI_BASE),
    model: readModelFromLs() ?? envModel ?? DEFAULT_MODEL_SUGGESTION,
  }
}
