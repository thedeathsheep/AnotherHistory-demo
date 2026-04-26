import { describe, expect, it } from 'vitest'
import { buildGenerateChapterArgs, REGENERATE_ALL } from '../electron/regenerateArgs.cjs'

describe('buildGenerateChapterArgs', () => {
  it('uses --all for the all-content sentinel', () => {
    expect(buildGenerateChapterArgs(REGENERATE_ALL)).toEqual(['--all', '--force'])
  })

  it('uses chapter id for single-chapter regeneration', () => {
    expect(buildGenerateChapterArgs('prologue')).toEqual(['prologue', '--force'])
  })
})
