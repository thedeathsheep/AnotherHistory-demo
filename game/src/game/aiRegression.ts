/**
 * AI-E25: minimal regression fixtures — expand with saved contexts + expected keywords.
 * Static runner: `npm run test:ai`（`scripts/ai-regression.mjs` + `scripts/ai-regression-fixtures.json`）。
 */
import type { AIContext } from './aiEngine/dataAcquisition'

export interface NarrativeRegressionCase {
  id: string
  expectAnyOf: string[]
  expectAllOf?: string[]
  requireAll?: boolean
}

/** Placeholder: wire to CI or script that calls chat() with frozen prompts */
export const NARRATIVE_REGRESSION_FIXTURES: Array<{ context: Partial<AIContext>; case: NarrativeRegressionCase }> = []

export function checkNarrativeKeywords(output: string, c: NarrativeRegressionCase): boolean {
  const t = output.replace(/\s/g, '')
  if (c.requireAll && c.expectAllOf?.length)
    return c.expectAllOf.every((k) => t.includes(k.replace(/\s/g, '')))
  return c.expectAnyOf.some((k) => t.includes(k.replace(/\s/g, '')))
}

// satisfy TS when fixtures empty
void NARRATIVE_REGRESSION_FIXTURES
