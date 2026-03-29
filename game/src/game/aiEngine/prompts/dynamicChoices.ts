/**
 * Dynamic beat choices (Engine v2): JSON { text, next } with constrained next tokens.
 */

export function buildDynamicChoicesUserPrompt(input: {
  realmName: string
  sceneNarrative: string
  taboo: string[]
  directions: string[]
  validNextTokens: string[]
  isLastBeat: boolean
}): string {
  const { realmName, sceneNarrative, taboo, directions, validNextTokens, isLastBeat } = input
  const concludeHint = isLastBeat
    ? '此为最后一拍：每条选项的 next 必须为 "__结案__"，且必须带 conclusion_label（四至六字收束，如「野路封笔」）。至少 2 条。'
    : ''
  return `【境遇】${realmName}
【当前境遇正文】
${sceneNarrative}
【念头方向】${directions.join('、')}
【禁忌】${JSON.stringify(taboo)}
【允许的 next 值】（必须逐字使用其一）${validNextTokens.join(', ')}
${concludeHint}

输出严格 JSON 数组，每项 {"text":"选项文案","next":"…"${isLastBeat ? ',"conclusion_label":"…"' : ''}}。
文案 5–18 字，中文；须为第一人称的念头或行动；条数不少于 2。只输出 JSON。`
}

export const DYNAMIC_CHOICES_SYSTEM =
  '你只输出 JSON 数组，每项含 text、next；next 必须来自用户给出的允许列表。每条 text 须是**角色当下的念头或身体动作**，第一人称、口语化、5–18 字。用中文。'
