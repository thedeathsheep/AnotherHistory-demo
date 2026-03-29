/**
 * Unified chat() wrapper: timeout, retries, optional debug logging.
 * Supports per-role model + streaming (Writer). Aligns with GDD 5.5 / AI Engine v2.
 */

import { resolveOpenAiFetchTarget, type OpenAiFetchTarget } from '@/aiSettings'
import { getModelForRole, type AIAgentRole } from './aiModels'
import { emitAiDebug } from './aiDebugBus'

const REQUEST_TIMEOUT = 90000
const MAX_RETRIES = 2

function defaultFetchTarget(): OpenAiFetchTarget {
  return resolveOpenAiFetchTarget('')
}

/** Lightweight OpenAI-compatible check (GET …/v1/models). Some gateways return 404; then try a tiny chat request. */
export async function validateOpenAiCompatibleKey(
  apiKey: string,
  baseUrlRaw: string,
  timeoutMs = 15000,
  modelForProbe?: string
): Promise<{ ok: boolean; error?: string }> {
  const t = apiKey.trim()
  if (!t) return { ok: false, error: '请填写 API Key' }
  const target = resolveOpenAiFetchTarget(baseUrlRaw.trim())
  try {
    const ctrl = new AbortController()
    const id = setTimeout(() => ctrl.abort(), timeoutMs)
    const modelsUrl = `${target.urlBase}/models`
    const res = await fetch(modelsUrl, {
      headers: { Authorization: `Bearer ${t}`, ...target.headers },
      signal: ctrl.signal,
    })
    clearTimeout(id)
    if (res.ok) return { ok: true }
    if (res.status === 404) {
      return validateWithMinimalChat(t, target, timeoutMs, modelForProbe)
    }
    const body = await res.text().catch(() => '')
    const hint = body ? `: ${body.slice(0, 160)}` : ''
    return { ok: false, error: `校验失败 HTTP ${res.status}${hint}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort')) return { ok: false, error: '校验超时，请检查网络' }
    return { ok: false, error: msg }
  }
}

async function validateWithMinimalChat(
  apiKey: string,
  target: OpenAiFetchTarget,
  timeoutMs: number,
  modelForProbe?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctrl = new AbortController()
    const id = setTimeout(() => ctrl.abort(), timeoutMs)
    const model = modelForProbe?.trim() || getModelForRole('default')
    const res = await fetch(`${target.urlBase}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...target.headers,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
      signal: ctrl.signal,
    })
    clearTimeout(id)
    if (res.ok) return { ok: true }
    const body = await res.text().catch(() => '')
    const hint = body ? `: ${body.slice(0, 160)}` : ''
    return { ok: false, error: `校验失败 HTTP ${res.status}${hint}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort')) return { ok: false, error: '校验超时，请检查网络' }
    return { ok: false, error: msg }
  }
}

export const AI_DEBUG = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_AI_DEBUG === '1' || import.meta.env?.VITE_AI_DEBUG === 'true')

function log(label: string, msg: string): void {
  if (!AI_DEBUG) return
  const line = `${label}: ${msg}`
  console.log(`[AI] ${line}`)
  emitAiDebug(line, 'log')
}

export interface ChatOptions {
  maxTokens?: number
  label?: string
  /** Explicit model; overrides agentRole if both set. */
  model?: string
  /** When set, model defaults via getModelForRole(role). */
  agentRole?: AIAgentRole
  /** After retries, throw last error instead of returning null (for user-visible failures). */
  throwOnFailure?: boolean
}

function resolveModel(opts: ChatOptions): string {
  if (opts.model?.trim()) return opts.model.trim()
  if (opts.agentRole) return getModelForRole(opts.agentRole)
  return getModelForRole('default')
}

export async function chat(
  apiKey: string,
  messages: { role: string; content: string }[],
  options: ChatOptions | number = {}
): Promise<string | null> {
  const opts =
    typeof options === 'number'
      ? { maxTokens: options, label: 'chat', throwOnFailure: false }
      : { maxTokens: 1024, label: 'chat', throwOnFailure: false, ...options }
  const { maxTokens = 1024, label = 'chat', throwOnFailure = false } = opts
  const model = resolveModel(opts)

  const start = Date.now()
  const ft = defaultFetchTarget()
  log(label, `request start → ${ft.urlBase}/chat/completions model=${model}`)
  let lastErr: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ctrl = new AbortController()
      const id = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT)
      const res = await fetch(`${ft.urlBase}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...ft.headers,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
        signal: ctrl.signal,
      })
      clearTimeout(id)
      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        const snippet = errBody.replace(/\s+/g, ' ').trim().slice(0, 280)
        throw new Error(snippet ? `HTTP ${res.status}: ${snippet}` : `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content
      const ms = Date.now() - start
      log(label, `done in ${ms}ms, ok=${Boolean(content?.trim())}`)
      const trimmed = content?.trim() ?? null
      if (!trimmed && throwOnFailure) throw new Error('Empty model response')
      return trimmed
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  if (AI_DEBUG) {
    const w = `${label}: failed after ${MAX_RETRIES + 1} attempts — ${lastErr?.message ?? 'unknown'}`
    console.warn(`[AI] ${w}`)
    emitAiDebug(w, 'warn')
  }
  if (throwOnFailure && lastErr) throw lastErr
  return null
}

export interface ChatStreamOptions extends ChatOptions {
  onChunk: (text: string) => void
  signal?: AbortSignal
}

/**
 * Streaming chat (SSE). OpenAI-compatible: data: { choices[0].delta.content }.
 * Aggregates full text; calls onChunk for each delta. Returns full trimmed text or null on failure.
 */
export async function chatStream(
  apiKey: string,
  messages: { role: string; content: string }[],
  options: ChatStreamOptions
): Promise<string | null> {
  const { maxTokens = 1024, label = 'chatStream', onChunk, signal } = options
  const model = resolveModel(options)
  const start = Date.now()
  const ft = defaultFetchTarget()
  log(label, `stream start → ${ft.urlBase}/chat/completions model=${model}`)

  const ctrl = new AbortController()
  const outerSignal = signal
  const onAbort = (): void => ctrl.abort()
  if (outerSignal) {
    if (outerSignal.aborted) {
      ctrl.abort()
    } else {
      outerSignal.addEventListener('abort', onAbort, { once: true })
    }
  }
  const timeoutId = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT)

  try {
    const res = await fetch(`${ft.urlBase}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...ft.headers,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: ctrl.signal,
    })
    if (!res.ok || !res.body) {
      clearTimeout(timeoutId)
      if (AI_DEBUG) {
        const w = `${label}: HTTP ${res.status}`
        console.warn(`[AI] ${w}`)
        emitAiDebug(w, 'warn')
      }
      return null
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[]
          }
          const piece = json.choices?.[0]?.delta?.content
          if (piece) {
            full += piece
            onChunk(full)
          }
        } catch {
          // ignore partial JSON lines
        }
      }
    }

    clearTimeout(timeoutId)
    const ms = Date.now() - start
    log(label, `stream done in ${ms}ms, len=${full.length}`)
    return full.trim() || null
  } catch (e) {
    clearTimeout(timeoutId)
    if (outerSignal) outerSignal.removeEventListener('abort', onAbort)
    const err = e instanceof Error ? e : new Error(String(e))
    if (AI_DEBUG) {
      const w = `${label}: stream failed — ${err.message}`
      console.warn(`[AI] ${w}`)
      emitAiDebug(w, 'warn')
    }
    return null
  } finally {
    if (outerSignal) outerSignal.removeEventListener('abort', onAbort)
  }
}
