const API_BASE = 'https://aihubmix.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'
const REQUEST_TIMEOUT = 90000 // read timeout ms
const MAX_RETRIES = 2

export interface NodeContext {
  node_id: string
  truth_anchors?: string[]
  taboo?: string[]
  objective?: string
  description: string
}

export interface StateFilter {
  ming_zhu: number
  gen_jiao: number
  jian_zhao: number
}

async function chat(
  apiKey: string,
  messages: { role: string; content: string }[],
  maxTokens = 1024
): Promise<string | null> {
  let lastErr: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ctrl = new AbortController()
      const id = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT)
      const res = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
        signal: ctrl.signal,
      })
      clearTimeout(id)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content
      return content?.trim() ?? null
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
  return null
}

export async function generateNodeNarrative(
  apiKey: string,
  node: NodeContext,
  realmName: string,
  stateFilter: StateFilter
): Promise<string | null> {
  const anchors = node.truth_anchors ?? []
  const taboo = node.taboo ?? []
  const objective = node.objective ?? ''
  const user = `你扮演《行旅》的叙事引擎。根据以下骨架写一段2–4句的叙事描述，用于当前节点。

【境遇】${realmName}
【真理锚点】必须自然融入描述中：${JSON.stringify(anchors)}
【禁忌】描述中不可让角色触犯：${JSON.stringify(taboo)}
【目标】${objective}
【当前状态】命烛/根脚/鉴照约：${JSON.stringify(stateFilter)}

要求：文风冷峻、带前科学时代荒野感；只输出这段描述，不要选项或标题。`
  const content = await chat(
    apiKey,
    [
      { role: 'system', content: '你只输出游戏内的叙事文本，不要解释或加标题。用中文。' },
      { role: 'user', content: user },
    ],
    400
  )
  return content
}

export async function generateYishi(
  apiKey: string,
  realmName: string,
  choiceSummary: string,
  conclusionLabel: string
): Promise<string | null> {
  const user = `将以下行旅记录凝练为一段「异史」：第三人称、冷峻古籍风、不超过100字。

【地域】${realmName}
【行旅概要】
${choiceSummary}

结尾以「记之曰：${conclusionLabel}。」收束。只输出异史正文，不要解释。`
  const content = await chat(
    apiKey,
    [
      { role: 'system', content: '你只输出异史正文，古文风格，不要任何解释或标题。用中文。' },
      { role: 'user', content: user },
    ],
    256
  )
  return content
}
