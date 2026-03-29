#!/usr/bin/env node
/**
 * 1) Copy 目哉像素体 (MuzaiPixel) from node_modules to public/fonts.
 * 2) Download 凤凰点阵体 16px (Vonwaon Bitmap) to public/fonts if not present.
 * 3) Download Noto Sans SC woff2 (简体中文子集) 为本地回退，避免运行时依赖 Google Fonts CDN。
 * Vite serves public/ at /, so /fonts/* are local.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const destDir = path.join(root, 'public', 'fonts')
const vonwaonDest = path.join(destDir, 'VonwaonBitmap-16px.ttf')
const notoDest = path.join(destDir, 'NotoSansSC-400.woff2')

// Optional: mirror URL for 凤凰点阵体 16px TTF (CC0). If fails, download manually from https://timothyqiu.itch.io/vonwaon-bitmap
const VONWAON_16PX_URL = 'https://www.mianfeiziti.cn/static/upload/other/20210617/1623911667677963.ttf'

/** Noto Sans SC 400 (Simplified Chinese subset) — local fallback, no Google Fonts CDN at runtime */
const NOTO_SC_WOFF2_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.6/files/noto-sans-sc-chinese-simplified-400-normal.woff2'

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node/copy-fonts' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

fs.mkdirSync(destDir, { recursive: true })

// 1) Copy MuzaiPixel (目哉)
const srcDir = path.join(root, 'node_modules', '@chinese-fonts', 'mzxst', 'dist', 'MZPXflat')
if (fs.existsSync(srcDir)) {
  const toCopy = fs.readdirSync(srcDir).filter((name) => {
    const ext = path.extname(name).toLowerCase()
    return ext === '.css' || ext === '.woff2'
  })
  for (const name of toCopy) {
    fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name))
  }
  console.log('copy-fonts: copied', toCopy.length, 'files (MuzaiPixel) to public/fonts')
} else {
  console.warn('copy-fonts: @chinese-fonts/mzxst not found. Run npm install first. Skipping MuzaiPixel.')
}

// 2) Download 凤凰点阵体 16px if not present
async function ensureVonwaon() {
  if (fs.existsSync(vonwaonDest)) {
    console.log('copy-fonts: VonwaonBitmap-16px.ttf already in public/fonts')
    return
  }
  try {
    const buf = await download(VONWAON_16PX_URL)
    fs.writeFileSync(vonwaonDest, buf)
    console.log('copy-fonts: downloaded VonwaonBitmap-16px.ttf to public/fonts')
  } catch (err) {
    console.warn('copy-fonts: could not download 凤凰点阵体 16px:', err.message)
    console.warn('  Download from https://timothyqiu.itch.io/vonwaon-bitmap and save as public/fonts/VonwaonBitmap-16px.ttf')
  }
}

async function ensureNotoSansSc() {
  if (fs.existsSync(notoDest)) {
    console.log('copy-fonts: NotoSansSC-400.woff2 already in public/fonts')
    return
  }
  try {
    const buf = await download(NOTO_SC_WOFF2_URL)
    fs.writeFileSync(notoDest, buf)
    console.log('copy-fonts: downloaded NotoSansSC-400.woff2 to public/fonts')
  } catch (err) {
    console.warn('copy-fonts: could not download Noto Sans SC woff2:', err.message)
    console.warn('  Install @fontsource/noto-sans-sc and copy chinese-simplified-400-normal.woff2 to public/fonts/NotoSansSC-400.woff2')
  }
}

await Promise.all([ensureVonwaon(), ensureNotoSansSc()])
