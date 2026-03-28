#!/usr/bin/env node
/**
 * Pretty-print a JSON file in place (2-space indent).
 * Usage: node scripts/format-json.mjs <path-to.json>
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/format-json.mjs <path-to.json>')
  process.exit(1)
}
const abs = resolve(process.cwd(), file)
const raw = readFileSync(abs, 'utf8')
const data = JSON.parse(raw)
writeFileSync(abs, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
console.log('ok', abs)
