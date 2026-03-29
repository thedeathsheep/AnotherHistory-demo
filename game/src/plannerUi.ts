/** User-facing copy for Planner / chat failures (Chinese UI). */

function openAiErrorSnippet(message: string): string | null {
  const i = message.indexOf('{')
  if (i < 0) return null
  try {
    const j = JSON.parse(message.slice(i)) as { error?: { message?: string; code?: string } }
    const em = j.error?.message?.trim()
    return em ? em.slice(0, 200) : null
  } catch {
    return null
  }
}

export function humanizePlannerError(message: string): string {
  const m = message.toLowerCase()
  const apiDetail = openAiErrorSnippet(message)
  if (message.includes('401') || message.includes('403')) {
    return apiDetail
      ? `API 鉴权失败：${apiDetail}。请核对 Key、Base URL 是否与供应商一致；若在门闸保存过 Key，请清空 .env 里的 VITE_OPENAI_API_KEY 以免覆盖本地配置。`
      : 'API 鉴权失败，请检查 Key 与 Base URL 是否与供应商一致。'
  }
  if (message.includes('429')) return '请求过于频繁，请稍后再试。'
  if (message.includes('abort') || m.includes('failed to fetch') || m.includes('network'))
    return '网络异常或超时，请检查连接后重试。'
  if (message.includes('Empty model response')) return '模型无有效回复，请稍后重试或检查额度。'
  return `动态大纲失败：${message}`
}

export const PLANNER_LOADING_HINT = '正在构思故事大纲…'
export const PLANNER_FALLBACK_HINT =
  '故事大纲未生成有效结构，已使用骨架流程。可检查网络、API Key 与账户额度。'
