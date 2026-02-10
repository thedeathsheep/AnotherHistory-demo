/**
 * AI-3: 叙事文本生成器
 * 输入：总设定 + ai3_texts + nodes.json
 * 输出：texts.json (descriptions, choice_texts)
 */

import { readText, chat } from './utils.mjs'
import { resolvePath } from './utils.mjs'

export async function runAi3(apiKey, realm) {
  const outlineMd = readText(resolvePath('design', '总设定.md'))
  const ai3Md = readText(resolvePath('design', 'AI功能设定', 'ai3_texts.md'))

  const system = `你是《行旅》的叙事文本生成器。根据节点结构输出 texts.json，包含 descriptions 和 choice_texts。
必须严格输出合法的 JSON，不要任何解释或 markdown 代码块包裹。
descriptions: { "node_id": "1-2句叙事，点明处境即可，不罗列元素", ... }
choice_texts: { "node_id_0": "选项文案", "node_id_1": "...", ... }（索引从 0 开始）`

  const nodeIds = (realm.nodes || []).map((n) => n.node_id)
  const choiceKeys = (realm.nodes || []).flatMap((n) =>
    (n.choices || []).map((_, i) => `${n.node_id}_${i}`)
  )

  const user = `## 总设定
${outlineMd}

## AI-3 功能说明
${ai3Md}

## 节点结构（nodes.json）
${JSON.stringify(realm, null, 2)}

请为以上每个节点生成**独特**的 description，为每个选项生成 choice_text。
必须覆盖的 node_id: ${JSON.stringify(nodeIds)}
必须覆盖的 choice_texts keys: ${JSON.stringify(choiceKeys)}

重要：每个 description 必须具体（禁止抽象句，如「思绪在清晰的蓝天与宁静的环境中游走」——只写具体动作、物象、身体反应）；每个节点要有具体情节点，与前后节点/选择形成因果或情绪衔接，有叙事趣味与逻辑，避免节点孤立、无推进感。description 需体现 plot_guide 且不可雷同；choice_text 必须是角色此刻的念头/动作，不与 objective 字面相同、不与 description 重复。`

  const content = await chat(apiKey, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], 4096)

  if (!content) throw new Error('AI-3 returned empty')

  let texts
  try {
    const raw = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    texts = JSON.parse(raw)
  } catch (e) {
    throw new Error('AI-3 output is not valid JSON: ' + content.slice(0, 200))
  }

  texts.descriptions = texts.descriptions || {}
  texts.choice_texts = texts.choice_texts || {}
  return texts
}
