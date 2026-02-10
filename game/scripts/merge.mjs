/**
 * 合并 nodes.json 与 texts.json → 完整 realm
 * 输出到 generated/chapters/{id}/merged.json
 * 可复制到 public/data/prologue.json
 */

import { readJson, writeJson } from './utils.mjs'
import { resolvePath } from './utils.mjs'

export function merge(realm, texts) {
  const descriptions = texts.descriptions || {}
  const choiceTexts = texts.choice_texts || {}

  const merged = {
    ...realm,
    nodes: realm.nodes.map((node) => {
      const desc = descriptions[node.node_id] ?? node.description ?? ''
      const choices = (node.choices || []).map((c, i) => {
        const key = `${node.node_id}_${i}`
        const text = choiceTexts[key] ?? c.text ?? ''
        return { ...c, text }
      })
      return { ...node, description: desc, choices }
    }),
  }

  return merged
}
