/**
 * Narrative context within current realm / event (AI-E9–E11).
 * Facts are short strings; 灵损 only affects prompt summary (non-destructive).
 */

const MAX_FACTS = 12
const SUMMARY_MAX_CHARS = 400

export class NarrativeContextManager {
  private facts: string[] = []

  clear(): void {
    this.facts = []
  }

  appendFact(line: string): void {
    const t = line.trim()
    if (!t) return
    this.facts.push(t)
    if (this.facts.length > MAX_FACTS) this.facts = this.facts.slice(-MAX_FACTS)
  }

  /** Ling sun truncates only the summary shown to the model, not stored facts. */
  getSummaryForPrompt(lingSunLevel = 0): string {
    let facts = [...this.facts]
    if (lingSunLevel > 66) {
      facts = facts.slice(Math.floor(facts.length * 0.4))
    } else if (lingSunLevel > 33) {
      facts = facts.slice(Math.floor(facts.length * 0.65))
    }
    if (!facts.length) return '（无）'
    let s = facts.join('；')
    if (s.length > SUMMARY_MAX_CHARS) s = `…${s.slice(-SUMMARY_MAX_CHARS)}`
    return s
  }
}
