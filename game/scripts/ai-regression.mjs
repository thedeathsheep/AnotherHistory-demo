#!/usr/bin/env node
/**
 * AI-E25: static checks (no network) + optional --live / --live-planner against aihubmix.
 * Run: npm run test:ai
 * Live: npm run test:ai -- --live   (needs VITE_AIHUBMIX_API_KEY or AIHUBMIX_API_KEY)
 * Planner smoke: npm run test:ai -- --live-planner
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

/** Mirrors agents/verifier.ts verifyNarrative */
function verifyNarrative(text, plotGuide, taboo) {
  const t = String(text ?? '').trim()
  if (!t) return { ok: false }
  if (plotGuide?.length && !narrativeMatchesPlotGuide(t, plotGuide)) return { ok: false }
  if (taboo?.length && violatesTaboo(t, taboo)) return { ok: false }
  return { ok: true }
}

/** Mirrors game/src/game/aiEngine/agents/planner.ts parseOutline */
function parseOutlinePlannerMirror(json, realmId) {
  try {
    const o = JSON.parse(json)
    if (!o || o.realm_id !== realmId || !Array.isArray(o.beats) || o.beats.length < 3) return null
    const allowed = new Set(['setup', 'rising', 'twist', 'climax', 'resolution'])
    const beats = []
    for (const b of o.beats) {
      if (!b || typeof b.beat_id !== 'string' || typeof b.summary !== 'string') continue
      const type = allowed.has(b.type) ? b.type : 'rising'
      const tension =
        typeof b.tension === 'number' && !Number.isNaN(b.tension) ? Math.max(0, Math.min(1, b.tension)) : 0.5
      beats.push({
        beat_id: b.beat_id,
        type,
        summary: b.summary,
        anchor_ref: typeof b.anchor_ref === 'string' ? b.anchor_ref : undefined,
        tension,
      })
    }
    if (beats.length < 3) return null
    return {
      realm_id: realmId,
      beats,
      divergence_note: typeof o.divergence_note === 'string' ? o.divergence_note : undefined,
    }
  } catch {
    return null
  }
}

const PLANNER_SYSTEM = `你是《行旅》的故事结构策划。只输出一个 JSON 对象，不要 markdown 代码块，不要解释。
Schema:
{"realm_id":"string","beats":[{"beat_id":"string","type":"setup|rising|twist|climax|resolution","summary":"string","anchor_ref":"string可选","tension":0.0}],"divergence_note":"string可选"}
要求：beats 至少 6 条、至多 18 条；summary 用中文短句；tension 在 0–1；覆盖种子中的 anchors（anchor_ref 填锚点 id）。`

function buildPlannerUserPrompt(realm, seed, playthroughHint) {
  const anchors = JSON.stringify(realm.anchors ?? [])
  const world = JSON.stringify(seed.world)
  const hint = playthroughHint?.trim()
    ? `【上周目摘要】${playthroughHint}\n请与上周目在情节走向上有所区分（divergence_note 简短说明）。\n`
    : ''
  return `${hint}【世界】${world}
【界】id=${realm.id} name=${realm.name}
【主题】${realm.theme}
【张力曲线】${realm.tension_curve ?? '（自定）'}
【建议拍数】${realm.estimated_beats ?? 10}
【禁忌】${JSON.stringify(realm.forbidden ?? [])}
【锚点】${anchors}
请生成完整 JSON。`
}

const fixturesPath = join(__dirname, 'ai-regression-fixtures.json')
const {
  staticCases = [],
  tabooCases = [],
  verifyCases = [],
  outlineCases = [],
} = JSON.parse(readFileSync(fixturesPath, 'utf8'))

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

for (const c of verifyCases) {
  const v = verifyNarrative(c.text, c.plotGuide ?? [], c.taboo ?? [])
  const want = c.expectOk !== false
  const pass = v.ok === want
  if (!pass) {
    console.error(`FAIL ${c.id}: verifyNarrative.ok=${v.ok} expected ${want}`)
    failed++
  } else {
    console.log(`ok   ${c.id}`)
  }
}

for (const c of outlineCases) {
  const parsed = parseOutlinePlannerMirror(c.json, c.realmId)
  const want = c.expectOk !== false
  const pass = (parsed != null) === want
  if (!pass) {
    console.error(`FAIL ${c.id}: parseOutline ok=${parsed != null} expected ${want}`)
    failed++
  } else {
    console.log(`ok   ${c.id}`)
  }
}

const designSeedPath = join(__dirname, '../public/data/design-seed.json')
try {
  const seed = JSON.parse(readFileSync(designSeedPath, 'utf8'))
  if (!seed?.world?.name || !Array.isArray(seed.realms)) {
    console.error('FAIL design-seed.json: invalid shape')
    failed++
  } else {
    console.log('ok   design-seed.json shape')
  }
} catch (e) {
  console.error('FAIL design-seed.json:', e.message)
  failed++
}

if (failed) {
  console.error(`\n${failed} static case(s) failed.`)
  process.exit(1)
}

console.log(
  `\nStatic: ${staticCases.length + tabooCases.length + verifyCases.length + outlineCases.length + 1} checks passed.`
)

const apiKey = process.env.VITE_AIHUBMIX_API_KEY || process.env.AIHUBMIX_API_KEY
const live = process.argv.includes('--live')
const livePlanner = process.argv.includes('--live-planner')

const API_BASE = 'https://aihubmix.com/v1'

if (livePlanner) {
  if (!apiKey) {
    console.error('Missing VITE_AIHUBMIX_API_KEY or AIHUBMIX_API_KEY for --live-planner')
    process.exit(1)
  }
  const seed = JSON.parse(readFileSync(designSeedPath, 'utf8'))
  const realm = seed.realms?.[0]
  if (!realm?.id) {
    console.error('LIVE PLANNER FAIL: no realm in design-seed.json')
    process.exit(1)
  }
  const model = process.env.VITE_AI_MODEL_PLANNER || 'gpt-4o-mini'
  const user = buildPlannerUserPrompt(realm, seed, undefined)
  const body = {
    model,
    messages: [
      { role: 'system', content: PLANNER_SYSTEM },
      { role: 'user', content: user },
    ],
    temperature: 0.35,
    max_tokens: 1800,
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
    console.error(`LIVE PLANNER FAIL: HTTP ${res.status}`)
    process.exit(1)
  }
  const data = await res.json()
  let text = data.choices?.[0]?.message?.content?.trim() ?? ''
  if (!text) {
    console.error('LIVE PLANNER FAIL: empty content')
    process.exit(1)
  }
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(text)
  if (fence) text = fence[1].trim()
  const outline = parseOutlinePlannerMirror(text, realm.id)
  if (!outline) {
    console.error('LIVE PLANNER FAIL: outline JSON failed validation')
    console.error(text.slice(0, 800))
    process.exit(1)
  }
  console.log(`Live planner ok (model=${model}, beats=${outline.beats.length}).`)
  process.exit(0)
}

if (live) {
  if (!apiKey) {
    console.error('Missing VITE_AIHUBMIX_API_KEY or AIHUBMIX_API_KEY for --live')
    process.exit(1)
  }
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
  console.log('Tip: npm run test:ai -- --live-planner  # planner outline smoke (uses API)')
}
