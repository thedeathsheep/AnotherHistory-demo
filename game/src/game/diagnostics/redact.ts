const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9]{10,}\b/g,
  /\bsk-proj-[A-Za-z0-9]{10,}\b/g,
  /\bBearer\s+[A-Za-z0-9_\-\.]{10,}\b/gi,
]

export function redactSecrets(input: string): string {
  let out = input || ''
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, '[REDACTED]')
  }
  return out
}

export function clipText(input: string, maxLen = 220): string {
  const t = redactSecrets((input || '').replace(/\s+/g, ' ').trim())
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`
}

export function safeJsonStringify(x: unknown, maxLen = 800): string {
  try {
    const raw = JSON.stringify(x)
    return clipText(raw, maxLen)
  } catch {
    return '[UNSERIALIZABLE]'
  }
}

export function summarizeMessages(messages: { role?: string; content?: string }[]): {
  messageCount: number
  charsApprox: number
  head?: string
} {
  const msgCount = Array.isArray(messages) ? messages.length : 0
  const flat = (Array.isArray(messages) ? messages : [])
    .map((m) => `${m?.role || 'unknown'}: ${String(m?.content || '')}`)
    .join('\n')
  const red = redactSecrets(flat)
  return {
    messageCount: msgCount,
    charsApprox: red.length,
    head: clipText(red, 260),
  }
}

