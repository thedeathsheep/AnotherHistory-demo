#!/usr/bin/env node
/**
 * 内容生成流水线 CLI
 * 用法: node scripts/generate-chapter.mjs [chapter_id]
 * 例: node scripts/generate-chapter.mjs prologue
 *
 * 章节 ID 为 prologue 时，读取 design/序章大纲.md
 * 其他章节需存在 design/{id}大纲.md
 * 合并结果写入 public/data/{chapterId}.json（prologue 仍为 prologue.json）
 * --all：对存在的 outline 依次跑（默认 prologue、折戟原）
 */

import { readText, readJson, writeJson, writeText, hash, stableJsonStringify, fileExists, getApiKey } from './utils.mjs'
import { resolvePath } from './utils.mjs'
import { runAi1 } from './ai1-outline.mjs'
import { runAi2 } from './ai2-nodes.mjs'
import { runAi3 } from './ai3-texts.mjs'
import { merge } from './merge.mjs'

const args = process.argv.slice(2)
const forceRegenerate = args.includes('--force')
const runAll = args.includes('--all')
const chapterIdArg = args.find((a) => !a.startsWith('--'))

function chapterOutlineMdName(chapterId) {
  return chapterId === 'prologue' ? '序章大纲.md' : `${chapterId}大纲.md`
}

function getPaths(chapterId) {
  const outlineFileName = chapterOutlineMdName(chapterId)
  const genDir = resolvePath('generated', 'chapters', chapterId)
  return {
    genDir,
    hashFile: resolvePath('generated', 'chapters', chapterId, 'input_hash.json'),
    outlineFile: resolvePath('generated', 'chapters', chapterId, 'outline.json'),
    nodesFile: resolvePath('generated', 'chapters', chapterId, 'nodes.json'),
    textsFile: resolvePath('generated', 'chapters', chapterId, 'texts.json'),
    mergedFile: resolvePath('generated', 'chapters', chapterId, 'merged.json'),
    outlineMd: resolvePath('design', '总设定.md'),
    ai1Md: resolvePath('design', 'AI功能设定', 'ai1_outline.md'),
    ai2Md: resolvePath('design', 'AI功能设定', 'ai2_nodes.md'),
    ai3Md: resolvePath('design', 'AI功能设定', 'ai3_texts.md'),
    chapterOutlineMd: resolvePath('design', outlineFileName),
  }
}

async function runChapter(chapterId) {
  const paths = getPaths(chapterId)

  if (!fileExists(paths.chapterOutlineMd)) {
    console.error(`Error: ${paths.chapterOutlineMd} not found`)
    throw new Error(`Missing outline for chapter ${chapterId}`)
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    console.error('Error: No API key. Set AIHUBMIX_API_KEY or VITE_AIHUBMIX_API_KEY, or add public/config.json with aihubmixApiKey.')
    process.exit(1)
  }

  let hashes = {}
  if (fileExists(paths.hashFile)) {
    hashes = readJson(paths.hashFile)
  }

  // Stage 1: AI-1 细纲
  const outlineInput = readText(paths.outlineMd) + readText(paths.ai1Md) + readText(paths.chapterOutlineMd)
  const outlineInputHash = hash(outlineInput)

  let outline
  if (!forceRegenerate && hashes.outline_input_hash === outlineInputHash && fileExists(paths.outlineFile)) {
    console.log('[PIPE] Stage 1: outline cached, skip')
    outline = readJson(paths.outlineFile)
  } else {
    console.log('[PIPE] Stage 1: AI-1 generating outline...')
    outline = await runAi1(apiKey, chapterId)
    writeJson(paths.outlineFile, outline)
    hashes.outline_input_hash = outlineInputHash
  }

  // Stage 2: AI-2 节点
  const nodesInput = readText(paths.ai2Md) + stableJsonStringify(outline)
  const nodesInputHash = hash(nodesInput)

  let realm
  if (!forceRegenerate && hashes.nodes_input_hash === nodesInputHash && fileExists(paths.nodesFile)) {
    console.log('[PIPE] Stage 2: nodes cached, skip')
    realm = readJson(paths.nodesFile)
  } else {
    console.log('[PIPE] Stage 2: AI-2 generating nodes...')
    realm = await runAi2(apiKey, outline)
    writeJson(paths.nodesFile, realm)
    hashes.nodes_input_hash = nodesInputHash
  }

  // Stage 3: AI-3 文本
  const textsInput = readText(paths.ai3Md) + stableJsonStringify(realm)
  const textsInputHash = hash(textsInput)

  let texts
  if (!forceRegenerate && hashes.texts_input_hash === textsInputHash && fileExists(paths.textsFile)) {
    console.log('[PIPE] Stage 3: texts cached, skip')
    texts = readJson(paths.textsFile)
  } else {
    console.log('[PIPE] Stage 3: AI-3 generating texts...')
    texts = await runAi3(apiKey, realm)
    writeJson(paths.textsFile, texts)
    hashes.texts_input_hash = textsInputHash
  }

  // Stage 4: 合并
  console.log('[PIPE] Stage 4: merging...')
  const merged = merge(realm, texts)
  writeJson(paths.mergedFile, merged)
  writeJson(paths.hashFile, hashes)

  const publicSlug = chapterId === 'prologue' ? 'prologue' : chapterId
  const destPath = resolvePath('public', 'data', `${publicSlug}.json`)
  writeText(destPath, JSON.stringify(merged, null, 2))
  console.log(`[PIPE] Done. ${publicSlug}.json -> ${destPath}`)
}

async function main() {
  if (runAll) {
    const candidates = ['prologue', '折戟原']
    const toRun = candidates.filter((id) => fileExists(resolvePath('design', chapterOutlineMdName(id))))
    if (toRun.length === 0) {
      console.error('Error: --all found no design/*大纲.md')
      process.exit(1)
    }
    for (const id of toRun) {
      console.log(`\n[PIPE] ===== chapter: ${id} =====`)
      await runChapter(id)
    }
    return
  }
  const chapterId = chapterIdArg || 'prologue'
  await runChapter(chapterId)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
