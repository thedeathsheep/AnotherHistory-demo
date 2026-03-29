#!/usr/bin/env node
/**
 * Ensure build/icon.png is square (512×512) and generate build/icon.ico for Windows.
 * Run before electron-builder if you replace build/icon.png with a non-square asset.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const pngPath = path.join(root, 'build', 'icon.png')
const icoPath = path.join(root, 'build', 'icon.ico')

if (!fs.existsSync(pngPath)) {
  console.error('build-icons: missing build/icon.png')
  process.exit(1)
}

const meta = await sharp(pngPath).metadata()
const w = meta.width ?? 0
const h = meta.height ?? 0
let squarePng = pngPath
if (w !== h || w !== 512) {
  const tmp = path.join(root, 'build', '_icon-square.png')
  await sharp(pngPath).resize(512, 512, { fit: 'cover' }).png().toFile(tmp)
  fs.copyFileSync(tmp, pngPath)
  fs.unlinkSync(tmp)
  console.log('build-icons: normalized build/icon.png to 512×512')
}

const buf = await pngToIco(pngPath)
fs.writeFileSync(icoPath, buf)
console.log('build-icons: wrote build/icon.ico')
