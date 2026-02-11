/**
 * Shared utilities for content generation pipeline.
 */

import { createHash } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

export function resolvePath(...parts) {
  return join(ROOT, ...parts)
}

export function readText(path) {
  return readFileSync(path, 'utf-8')
}

export function readJson(path) {
  return JSON.parse(readText(path))
}

export function writeText(path, content) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf-8')
}

export function writeJson(path, obj) {
  writeText(path, JSON.stringify(obj, null, 2))
}

export function hash(str) {
  return createHash('sha256').update(str, 'utf-8').digest('hex').slice(0, 16)
}

/** Stable JSON stringify for deterministic hashing (sorts object keys) */
export function stableJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return '[' + obj.map(stableJsonStringify).join(',') + ']'
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableJsonStringify(obj[k])).join(',') + '}'
}

export function fileExists(path) {
  return existsSync(path)
}

const API_BASE = 'https://aihubmix.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'
const TIMEOUT_MS = 90000

export async function chat(apiKey, messages, maxTokens = 2048) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.6,
      max_tokens: maxTokens,
    }),
    signal: ctrl.signal,
  })
  clearTimeout(id)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content?.trim() ?? null
  return content
}

function loadEnv() {
  for (const envPath of [resolvePath('.env'), resolvePath('..', '.env')]) {
    if (!fileExists(envPath)) continue
    const content = readText(envPath)
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

export function getApiKey() {
  loadEnv()
  const key = process.env.AIHUBMIX_API_KEY || process.env.VITE_AIHUBMIX_API_KEY
  if (key?.startsWith('sk-')) return key
  try {
    const cfgPath = resolvePath('public', 'config.json')
    if (fileExists(cfgPath)) {
      const cfg = readJson(cfgPath)
      if (cfg.aihubmixApiKey?.startsWith('sk-')) return cfg.aihubmixApiKey
    }
  } catch (_) {}
  const apiKeyPath = resolvePath('..', 'api_key.txt')
  if (fileExists(apiKeyPath)) {
    const text = readText(apiKeyPath)
    const firstLine = text.trim().split('\n')[0]?.trim()
    if (firstLine?.startsWith('sk-')) return firstLine
    const match = text.match(/sk-[a-zA-Z0-9]+/)
    if (match) return match[0]
  }
  return null
}
