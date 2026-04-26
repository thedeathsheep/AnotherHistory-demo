import type { Choice, HaiId } from './types'
import { isForcefulActionChoice, isSpeechChoice } from './haiChoiceConsequences'

const TRUST_RE = /托付|交给|托给|求他|求她|求助|请他|请她|信他|信她|跟他走|跟她走/

function isTrustLikeChoice(text: string): boolean {
  return TRUST_RE.test(text)
}

export function filterChoicesByHaiVisibility(
  choices: Choice[],
  hais: Record<HaiId, number>,
): Choice[] {
  if ((hais.duan_xiang ?? 0) < 60) return choices
  const trustChoices = choices.filter((choice) => isTrustLikeChoice(choice.text))
  const nonTrustChoices = choices.filter((choice) => !isTrustLikeChoice(choice.text))
  if (!trustChoices.length || !nonTrustChoices.length) return choices
  return nonTrustChoices
}

export function getHaiActionFeedback(
  choiceText: string,
  hais: Record<HaiId, number>,
): {
  preDelayMs: number
  preMessage: string | null
  postMessage: string | null
} {
  let preDelayMs = 0
  let preMessage: string | null = null
  let postMessage: string | null = null

  if ((hais.chen_sha ?? 0) >= 50 && isForcefulActionChoice(choiceText)) {
    preDelayMs = 700
    preMessage = '脚下一沉，动作慢了半拍。'
  }

  if ((hais.kou_zhai ?? 0) >= 50 && isSpeechChoice(choiceText)) {
    postMessage = '一开口，喉头像被讨去了一笔债。'
  }

  return { preDelayMs, preMessage, postMessage }
}
