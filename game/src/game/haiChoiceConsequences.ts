import type { Choice, HaiId, StateDelta } from './types'

const SPEECH_RE = /说|问|喊|答|唤|开口|低声|出声|回话|报出|念出/
const FORCEFUL_ACTION_RE = /冲|撞|奔|扑|闯|拖|扛|搬|推开|撞开|跃|翻|攀|砸/

function cloneStateDelta(state?: StateDelta): StateDelta {
  return {
    ...(state ?? {}),
    hai_delta: { ...(state?.hai_delta ?? {}) },
  }
}

export function isSpeechChoice(text: string): boolean {
  return SPEECH_RE.test(text)
}

export function isForcefulActionChoice(text: string): boolean {
  return FORCEFUL_ACTION_RE.test(text)
}

export function applyHaiChoiceConsequences(
  choice: Choice,
  hais: Record<HaiId, number>,
): { state: StateDelta; haiDelta: Partial<Record<HaiId, number>> } {
  const state = cloneStateDelta(choice.state)
  const haiDelta = {
    ...(choice.hai_delta ?? {}),
    ...(state.hai_delta ?? {}),
  }

  if ((hais.duan_xiang ?? 0) >= 50) {
    for (const key of ['ming_zhu', 'gen_jiao', 'jian_zhao'] as const) {
      const value = state[key]
      if (typeof value === 'number' && value > 0) {
        state[key] = Math.floor(value / 2)
      }
    }
  }

  if ((hais.kou_zhai ?? 0) >= 50 && isSpeechChoice(choice.text)) {
    state.ming_zhu = (state.ming_zhu ?? 0) - 3
    haiDelta.ling_sun = (haiDelta.ling_sun ?? 0) + 6
  }

  if ((hais.chen_sha ?? 0) >= 50 && isForcefulActionChoice(choice.text)) {
    state.gen_jiao = (state.gen_jiao ?? 0) - 4
  }

  return { state, haiDelta }
}
