const BANNED_DESCRIPTION_PATTERNS = [
  /渐渐|逐渐|感受到|内心|熟悉又陌生|仿佛|一股说不清/u,
  /思绪|心中|意识/u,
  /宁静|静谧|气息|氛围/u,
]

const BANNED_CHOICE_PATTERNS = [
  /理清思绪|感受|体会/u,
]

function firstHit(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[0]
  }
  return null
}

export function validateAi3Part(nodeId, node, part) {
  const issues = []
  const desc = part?.descriptions?.[nodeId]
  if (typeof desc !== 'string' || !desc.trim()) {
    issues.push('description 为空')
  } else {
    const hit = firstHit(desc, BANNED_DESCRIPTION_PATTERNS)
    if (hit) issues.push(`description 含禁词「${hit}」`)
  }

  for (let i = 0; i < (node.choices || []).length; i++) {
    const key = `${nodeId}_${i}`
    const text = part?.choice_texts?.[key]
    if (typeof text !== 'string' || !text.trim()) {
      issues.push(`${key} 为空`)
      continue
    }
    const hit = firstHit(text, BANNED_CHOICE_PATTERNS)
    if (hit) issues.push(`${key} 含禁词「${hit}」`)
  }

  return issues
}

export async function resolveAi3Part({ nodeId, node, generatePart, maxAttempts = 3 }) {
  let part = null
  let issues = []

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    part = await generatePart({ attempt, issues, previousPart: part })
    issues = validateAi3Part(nodeId, node, part)
    if (issues.length === 0) {
      return part
    }
  }

  throw new Error(`AI-3 output rejected for node ${nodeId}: ${issues.join('；')}`)
}
