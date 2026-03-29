/** User-facing copy for Planner / chat failures (Chinese UI). */

export function humanizePlannerError(message: string): string {
  const m = message.toLowerCase()
  if (message.includes('401') || message.includes('403')) return 'API 鉴权失败，请检查 Key 是否有效。'
  if (message.includes('429')) return '请求过于频繁，请稍后再试。'
  if (message.includes('abort') || m.includes('failed to fetch') || m.includes('network'))
    return '网络异常或超时，请检查连接后重试。'
  if (message.includes('Empty model response')) return '模型无有效回复，请稍后重试或检查额度。'
  return `动态大纲失败：${message}`
}

export const PLANNER_LOADING_HINT = '正在构思故事大纲…'
export const PLANNER_FALLBACK_HINT =
  '故事大纲未生成有效结构，已使用骨架流程。可检查网络、API Key 与账户额度。'
