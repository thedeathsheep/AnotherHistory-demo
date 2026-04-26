export type DiagLevel = 'debug' | 'info' | 'warn' | 'error'

export type DiagPhase =
  | 'bootstrap'
  | 'narrative'
  | 'supplement'
  | 'choices'
  | 'choice_apply'
  | 'yishi'
  | 'save'
  | 'ui'
  | 'ai'

export type DiagEvent =
  | {
      type: 'ai:request_start'
      phase: 'ai'
      label: string
      agentRole?: string
      model?: string
      stream?: boolean
      urlBase?: string
      promptSummary?: {
        messageCount: number
        charsApprox: number
        head?: string
      }
    }
  | {
      type: 'ai:request_ok'
      phase: 'ai'
      label: string
      agentRole?: string
      model?: string
      stream?: boolean
      ms: number
      outputSummary?: { chars: number; head?: string }
    }
  | {
      type: 'ai:request_fail'
      phase: 'ai'
      level: 'warn' | 'error'
      label: string
      agentRole?: string
      model?: string
      stream?: boolean
      ms: number
      error: string
    }
  | {
      type: 'app:node_enter'
      phase: 'ui'
      nodeId: string
      engineMode?: string
      beatIndex?: number | null
      realmId?: string | null
      realmName?: string
      storyBeat?: string | undefined
    }
  | {
      type: 'narrative:trigger'
      phase: 'narrative'
      nodeId: string
      dynamic: boolean
      reason: string
    }
  | {
      type: 'narrative:cached'
      phase: 'narrative'
      nodeId: string
      chars: number
    }
  | {
      type: 'supplement:done'
      phase: 'supplement'
      nodeId: string
      npcCount: number
      itemUsed: boolean
      addedLines: number
      finalChars: number
    }
  | {
      type: 'choices:trigger'
      phase: 'choices'
      nodeId: string
      dynamic: boolean
      reason: string
    }
  | {
      type: 'choices:merged'
      phase: 'choices'
      nodeId: string
      skeletonCount: number
      aiCount: number
      finalCount: number
      deduped: number
      notes?: string
    }
  | {
      type: 'choice:applied'
      phase: 'choice_apply'
      fromNodeId: string
      choiceText: string
      next: string
      tabooViolated?: boolean
      conclusionLabel?: string | null
      newItems?: string[]
      newClues?: string[]
    }
  | {
      type: 'yishi:done'
      phase: 'yishi'
      realmName: string
      conclusionLabel: string
      chars: number
      usedFallback: boolean
    }
  | {
      type: 'save:written'
      phase: 'save'
      slot: number
      nodeId: string | null
      engineMode?: string
    }

export type DiagEntry = {
  id: number
  t: number
  level: DiagLevel
  event: DiagEvent
}

