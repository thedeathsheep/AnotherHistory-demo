/**
 * AI-3: narrative text generation.
 * Input: overall design + ai3_texts + nodes.json
 * Output: texts.json (descriptions, choice_texts)
 * Generates node-by-node in order, injecting previous description + choice
 * to keep transitions grounded.
 */

import { readText, chat } from './utils.mjs'
import { resolvePath } from './utils.mjs'
import { resolveAi3Part } from './ai3-validation.mjs'

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

function parseJsonContent(nodeId, content) {
  try {
    const raw = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    return JSON.parse(raw)
  } catch {
    throw new Error(`AI-3 output is not valid JSON for node ${nodeId}: ${content.slice(0, 150)}`)
  }
}

export async function runAi3(apiKey, realm) {
  const outlineMd = readText(resolvePath('design', '总设定.md'))
  const ai3Md = readText(resolvePath('design', 'AI功能设定', 'ai3_texts.md'))

  const coreRules = `【优先阅读】三条铁律：①只写具体动作/物象/身体反应，不写思绪、内心、抽象环境；②1-2句点明处境与正在发生的事即可，不为气氛额外铺陈；③节点间必须有因果或情绪衔接。补充禁令：禁用“渐渐”“逐渐”“感受到”“内心觉察”“熟悉又陌生”“仿佛”“一股说不清”；禁用比喻、排比、场景清单。合格示例（请按此风格与信息密度）：scene_1 description“你醒了。草挂着露，背上的包压得肩头发酸。”choices“拽拽肩上那包，沉。”“先爬起来，瞥瞥四下。”scene_2“土路往前伸，草梗擦裤脚。前头还能看见路。”choices“往前走。”“在草里坐会儿。”scene_3“路边有树，影子碎在地上。你站住，没动。”choices“凑过去，看看那影子。”“不看，走。”`

  const systemOne = `你是《行旅》的叙事文本生成器。你只做一件事：把节点骨架改写成能直接上屏的短文本。必须严格输出合法 JSON，不要解释，不要代码块。硬规则：
1. description 只写 1-2 句，只保留眼前处境、动作、物象、身体反应。
2. 不为气氛额外铺陈；环境只有在影响行动或判断时才写。
3. 禁用抽象主语、浅白套词、比喻、排比、场景元素罗列。
4. choice_text 要短、直、像当下会冒出来的话，不重复 objective。
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

当前描述必须在情节上承接上一句 / 上一选择，再自然引出本节点选项。`
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
      choices: (node.choices || []).map((c) => ({
        text: '',
        next: c.next,
        state: c.state,
        conclusion_label: c.conclusion_label,
      })),
    }

    const user = `## 优先阅读：铁律与合格示例
${coreRules}

## 策划文风规则（必须服从）
${ai3Md.slice(0, 5000)}

## 总设定（摘要）
${outlineMd.slice(0, 800)}

## 本节点与上下文
${prevBlock}

## 本节点骨架（请只为本节点生成 description 和 choice_texts）
${JSON.stringify(nodeStub, null, 2)}

请仅为 node_id="${nodeId}" 生成一条 description 和 ${(node.choices || []).length} 条 choice_text（key 为 ${nodeId}_0、${nodeId}_1 ...）。
若含 story_beat，必须把它改写成更具体、更短、更硬的现场描述，不能照抄其中抽象词。
如果 description 出现“渐渐”“逐渐”“感受到”“内心”“熟悉又陌生”“仿佛”“一股说不清”、比喻，或单纯气氛铺陈，则视为失败，必须重写。
输出 JSON：{ "descriptions": { "${nodeId}": "..." }, "choice_texts": { "${nodeId}_0": "...", ... } }`

    const part = await resolveAi3Part({
      nodeId,
      node,
      maxAttempts: 3,
      generatePart: async ({ attempt, issues, previousPart }) => {
        const prompt =
          attempt === 1
            ? user
            : `${user}

## 上一版输出未通过校验
${JSON.stringify(previousPart, null, 2)}

## 未通过原因
${issues.map((x) => `- ${x}`).join('\n')}

请整份重写，只输出合法 JSON。description 与 choice_texts 必须更短、更具体，删掉禁词和空泛气氛句。`

        const content = await chat(
          apiKey,
          [
            { role: 'system', content: systemOne },
            { role: 'user', content: prompt },
          ],
          1024,
        )

        if (!content) {
          throw new Error(`AI-3 returned empty for node ${nodeId} on attempt ${attempt}`)
        }

        return parseJsonContent(nodeId, content)
      },
    })

    Object.assign(descriptions, part.descriptions || {})
    Object.assign(choice_texts, part.choice_texts || {})
  }

  return { descriptions, choice_texts }
}
