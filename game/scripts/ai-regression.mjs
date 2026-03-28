#!/usr/bin/env node
/**
 * AI-E25: static checks (no network) + optional --live smoke against aihubmix.
 * Run: npm run test:ai
 * Live: npm run test:ai -- --live   (needs VITE_AIHUBMIX_API_KEY or AIHUBMIX_API_KEY)
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Mirrors game/src/game/state.ts violatesTaboo (choices + narrative) */
function violatesTaboo(choiceText, taboo) {
  if (!taboo?.length) return false
  for (const t of taboo) {
    const word = t.startsWith('不可') ? t.slice(2).trim() : t.trim()
    if (word && choiceText.includes(word)) return true
  }
  return false
}

/** Mirrors game/src/game/aiEngine/prompts/narrative.ts narrativeMatchesPlotGuide */
function narrativeMatchesPlotGuide(text, plotGuide) {
  if (!plotGuide?.length) return true
  const t = text.replace(/\s/g, '')
  return plotGuide.some((kw) => {
    const k = String(kw)
      .replace(/^禁忌[：:]\s*/, '')
      .replace(/^破解[：:]\s*/, '')
      .trim()
    return k.length >= 2 && t.includes(k)
  })
}

const fixturesPath = join(__dirname, 'ai-regression-fixtures.json')
const { staticCases = [], tabooCases = [] } = JSON.parse(readFileSync(fixturesPath, 'utf8'))

let failed = 0
for (const c of staticCases) {
  const ok = narrativeMatchesPlotGuide(c.output, c.plotGuide)
  const want = c.expectMatch !== false
  const pass = ok === want
  if (!pass) {
    console.error(`FAIL ${c.id}: match=${ok} expected ${want}`)
    failed++
  } else {
    console.log(`ok   ${c.id}`)
  }
}

for (const c of tabooCases) {
  const hit = violatesTaboo(c.text, c.taboo ?? [])
  const want = c.expectViolates !== false
  const pass = hit === want
  if (!pass) {
    console.error(`FAIL ${c.id}: violatesTaboo=${hit} expected ${want}`)
    failed++
  } else {
    console.log(`ok   ${c.id}`)
  }
}

if (failed) {
  console.error(`\n${failed} static case(s) failed.`)
  process.exit(1)
}

console.log(`\nStatic: ${staticCases.length + tabooCases.length} passed.`)

const live = process.argv.includes('--live')
const apiKey = process.env.VITE_AIHUBMIX_API_KEY || process.env.AIHUBMIX_API_KEY
if (live) {
  if (!apiKey) {
    console.error('Missing VITE_AIHUBMIX_API_KEY or AIHUBMIX_API_KEY for --live')
    process.exit(1)
  }
  const API_BASE = 'https://aihubmix.com/v1'
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: '只输出一个词：行' },
      { role: 'user', content: '回复一个字表示收到。' },
    ],
    temperature: 0.2,
    max_tokens: 8,
  }
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error(`LIVE FAIL: HTTP ${res.status}`)
    process.exit(1)
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) {
    console.error('LIVE FAIL: empty content')
    process.exit(1)
  }
  console.log(`Live smoke ok (model replied, len=${text.length}).`)
} else {
  console.log('Tip: npm run test:ai -- --live  # optional API smoke test')
}
