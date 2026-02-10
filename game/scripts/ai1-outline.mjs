/**
 * AI-1: 细纲生成器
 * 输入：总设定 + ai1_outline + 序章大纲
 * 输出：outline.json
 */

import { readText, writeJson, chat, hash } from './utils.mjs'
import { resolvePath } from './utils.mjs'

export async function runAi1(apiKey, chapterId = 'prologue') {
  const outlineMd = readText(resolvePath('design', '总设定.md'))
  const ai1Md = readText(resolvePath('design', 'AI功能设定', 'ai1_outline.md'))
  const chapterOutlineMd = readText(resolvePath('design', chapterId === 'prologue' ? '序章大纲.md' : `${chapterId}大纲.md`))

  const system = `你是《行旅》的细纲生成器。根据策划输入，输出 JSON 格式的章节细纲。
必须严格输出合法的 JSON，不要任何解释或 markdown 代码块包裹。`

  const user = `## 总设定
${outlineMd}

## AI-1 功能说明
${ai1Md}

## 本章大纲（策划输入）
${chapterOutlineMd}

请输出 outline.json 格式的 JSON，包含 chapter_id、scenes、branches、conclusion_types。chapter_id 为 "${chapterId}"。`

  const content = await chat(apiKey, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], 2048)

  if (!content) throw new Error('AI-1 returned empty')

  let outline
  try {
    const raw = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    outline = JSON.parse(raw)
  } catch (e) {
    throw new Error('AI-1 output is not valid JSON: ' + content.slice(0, 200))
  }

  outline.chapter_id = chapterId
  return outline
}
