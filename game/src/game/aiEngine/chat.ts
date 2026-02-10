/**
 * Unified chat() wrapper: timeout, retries, optional debug logging.
 * Aligns with GDD 5.5 / TODO AI-E23.
 */

const API_BASE = 'https://aihubmix.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'
const REQUEST_TIMEOUT = 90000
const MAX_RETRIES = 2

export const AI_DEBUG = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_AI_DEBUG === '1' || import.meta.env?.VITE_AI_DEBUG === 'true')

function log(label: string, msg: string): void {
  if (AI_DEBUG) console.log(`[AI] ${label}: ${msg}`)
}

export interface ChatOptions {
  maxTokens?: number
  label?: string
}

export async function chat(
  apiKey: string,
  messages: { role: string; content: string }[],
  options: ChatOptions | number = {}
): Promise<string | null> {
  const opts = typeof options === 'number' ? { maxTokens: options, label: 'chat' } : { maxTokens: 1024, label: 'chat', ...options }
  const { maxTokens = 1024, label = 'chat' } = opts

  const start = Date.now()
  log(label, `request start → ${API_BASE}/chat/completions`)
  let lastErr: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ctrl = new AbortController()
      const id = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT)
      const res = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
        signal: ctrl.signal,
      })
      clearTimeout(id)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content
      const ms = Date.now() - start
      log(label, `done in ${ms}ms, ok=${Boolean(content?.trim())}`)
      return content?.trim() ?? null
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  if (AI_DEBUG) console.warn(`[AI] ${label}: failed after ${MAX_RETRIES + 1} attempts`, lastErr?.message)
  return null
}
