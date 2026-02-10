/**
 * AI-2: 节点与游玩内容生成器
 * 输入：总设定 + ai2_nodes + outline.json
 * 输出：nodes.json (realm 结构，description 和 choice.text 可为占位)
 */

import { readText, writeJson, chat } from './utils.mjs'
import { resolvePath } from './utils.mjs'

export async function runAi2(apiKey, outline) {
  const outlineMd = readText(resolvePath('design', '总设定.md'))
  const ai2Md = readText(resolvePath('design', 'AI功能设定', 'ai2_nodes.md'))

  const system = `你是《行旅》的节点与游玩内容生成器。根据细纲输出 JSON 格式的 realm（节点+选项骨架）。
必须严格输出合法的 JSON，不要任何解释或 markdown 代码块包裹。
节点必须含 node_id、plot_guide、taboo、objective、description、choices。
description 可为空字符串；choices 每项含 text、next、可选 state、conclusion_label。
next 为 "__结案__" 时表示结案分支。`

  const user = `## 总设定
${outlineMd}

## AI-2 功能说明
${ai2Md}

## 细纲（outline.json）
${JSON.stringify(outline, null, 2)}

请输出 nodes.json（realm 结构），包含 id、name、entry_node、nodes。id 与 name 根据 chapter_id 推导。`

  const content = await chat(apiKey, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], 4096)

  if (!content) throw new Error('AI-2 returned empty')

  let realm
  try {
    const raw = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    realm = JSON.parse(raw)
  } catch (e) {
    throw new Error('AI-2 output is not valid JSON: ' + content.slice(0, 200))
  }

  if (!realm.nodes?.length) throw new Error('AI-2 output has no nodes')
  return realm
}
