/**
 * AI-3: 叙事文本生成器
 * 输入：总设定 + ai3_texts + nodes.json
 * 输出：texts.json (descriptions, choice_texts)
 * 支持按节点顺序生成，注入「上一节点描述 + 上一选择」以强化衔接。
 */

import { readText, chat } from './utils.mjs'
import { resolvePath } from './utils.mjs'

/** BFS from entry_node to get node order for sequential generation. */
function getNodeOrder(realm) {
  const order = []
  const seen = new Set()
  const queue = [realm.entry_node]
  const nodeMap = new Map((realm.nodes || []).map((n) => [n.node_id, n]))
  while (queue.length) {
    const nid = queue.shift()
    if (!nid || seen.has(nid)) continue
    seen.add(nid)
    order.push(nid)
    const node = nodeMap.get(nid)
    if (node?.choices) {
      for (const c of node.choices) {
        if (c.next && c.next !== '__结案__' && !seen.has(c.next)) queue.push(c.next)
      }
    }
  }
  return order
}

/** Find previous node (in order) that has a choice leading to currentId, and that choice's index. */
function getPrevNodeAndChoice(realm, order, currentIndex) {
  const currentId = order[currentIndex]
  for (let i = currentIndex - 1; i >= 0; i--) {
    const prevNode = realm.nodes.find((n) => n.node_id === order[i])
    if (!prevNode?.choices) continue
    const idx = prevNode.choices.findIndex((c) => c.next === currentId)
    if (idx !== -1) return { prevNodeId: order[i], choiceIndex: idx }
  }
  return null
}

export async function runAi3(apiKey, realm) {
  const outlineMd = readText(resolvePath('design', '总设定.md'))
  const ai3Md = readText(resolvePath('design', 'AI功能设定', 'ai3_texts.md'))

  const coreRules = `【优先阅读】三条铁律：①只写具体动作/物象/身体反应，不写思绪、内心、抽象环境；②1–2句点明处境即交选项，不罗列不比喻不浅白；③节点间有因果或情绪衔接。合格示例（请按此风格与信息密度）：scene_1 description「你醒过来的时候，草还挂着露。脚边是一条踩出来的土路，背上的东西压得肩头发酸。天刚亮。」choices「拎拎肩上那包，沉。」「先爬起来，瞅瞅四下。」scene_2「眼前一片草，黄不拉几的，风一过沙沙响。日头挺好，前头还能瞅见路。」「往前走。」「在草里坐会儿。」scene_3「路边有树，影子碎在地上，光一块一块的。你站住，没动。」「凑过去，看看那影子。」「不看，走。」`

  const systemOne = `你是《行旅》的叙事文本生成器。为本节点输出 description 和 choice_texts（仅本节点）。
必须严格输出合法的 JSON，不要任何解释或 markdown 代码块包裹。
格式：{ "descriptions": { "当前node_id": "1-2句叙事" }, "choice_texts": { "node_id_0": "选项文案", "node_id_1": "...", ... } }（索引从 0 开始）`

  const order = getNodeOrder(realm)
  const descriptions = {}
  const choice_texts = {}

  for (let i = 0; i < order.length; i++) {
    const nodeId = order[i]
    const node = realm.nodes.find((n) => n.node_id === nodeId)
    if (!node) continue

    const prevContext = getPrevNodeAndChoice(realm, order, i)
    let prevBlock = ''
    if (prevContext && descriptions[prevContext.prevNodeId] != null) {
      const prevChoiceKey = `${prevContext.prevNodeId}_${prevContext.choiceIndex}`
      const prevChoiceText = choice_texts[prevChoiceKey] || ''
      prevBlock = `【上一节点描述】${descriptions[prevContext.prevNodeId]}
【进入本节点的选择】${prevChoiceText}

当前描述须在情节上承接上一句/上一选择，再自然引出本节点选项。`
    } else {
      prevBlock = '（首节点，无上一节点；直接点明处境即可。）'
    }

    const nodeStub = {
      node_id: node.node_id,
      plot_guide: node.plot_guide,
      story_beat: node.story_beat,
      taboo: node.taboo,
      objective: node.objective,
      description: '',
      choices: (node.choices || []).map((c, idx) => ({
        text: '',
        next: c.next,
        state: c.state,
        conclusion_label: c.conclusion_label,
      })),
    }

    const user = `## 优先阅读：铁律与合格示例
${coreRules}

## 总设定（摘要）
${outlineMd.slice(0, 800)}

## 本节点与上下文
${prevBlock}

## 本节点骨架（请只为本节点生成 description 和 choice_texts）
${JSON.stringify(nodeStub, null, 2)}

请仅为 node_id="${nodeId}" 生成一条 description 和 ${(node.choices || []).length} 条 choice_text（key 为 ${nodeId}_0、${nodeId}_1 ...）。若含 story_beat，请改写为 1–2 句具体叙事。严格按铁律与示例风格；与上一节点衔接。输出 JSON：{ "descriptions": { "${nodeId}": "..." }, "choice_texts": { "${nodeId}_0": "...", ... } }`

    const content = await chat(apiKey, [
      { role: 'system', content: systemOne },
      { role: 'user', content: user },
    ], 1024)

    if (!content) throw new Error(`AI-3 returned empty for node ${nodeId}`)

    let part
    try {
      const raw = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      part = JSON.parse(raw)
    } catch (e) {
      throw new Error(`AI-3 output is not valid JSON for node ${nodeId}: ` + content.slice(0, 150))
    }

    Object.assign(descriptions, part.descriptions || {})
    Object.assign(choice_texts, part.choice_texts || {})
  }

  return { descriptions, choice_texts }
}
