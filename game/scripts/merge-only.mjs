#!/usr/bin/env node
/**
 * 仅合并 nodes + texts → merged.json，并（prologue 时）复制到 public/data/prologue.json
 * 用法: node scripts/merge-only.mjs [chapter_id]
 */

import { readJson, writeJson, writeText } from './utils.mjs'
import { resolvePath } from './utils.mjs'
import { merge } from './merge.mjs'

const chapterId = process.argv[2] || 'prologue'
const nodesPath = resolvePath('generated', 'chapters', chapterId, 'nodes.json')
const textsPath = resolvePath('generated', 'chapters', chapterId, 'texts.json')
const mergedPath = resolvePath('generated', 'chapters', chapterId, 'merged.json')

const realm = readJson(nodesPath)
const texts = readJson(textsPath)
const merged = merge(realm, texts)

writeJson(mergedPath, merged)
console.log(`[MERGE] ${mergedPath}`)

if (chapterId === 'prologue') {
  const destPath = resolvePath('public', 'data', 'prologue.json')
  writeText(destPath, JSON.stringify(merged, null, 2))
  console.log(`[MERGE] ${destPath}`)
}
