const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const isDev = !app.isPackaged

function savesDir() {
  const dir = path.join(app.getPath('userData'), 'saves')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

const LEGACY_API_KEY_FILE = 'aihubmix-api-key.txt'
const AI_SETTINGS_FILE = 'ai-settings.json'
const DEFAULT_LEGACY_BASE = 'https://aihubmix.com/v1'

function aiSettingsPath() {
  return path.join(app.getPath('userData'), AI_SETTINGS_FILE)
}

function legacyApiKeyPath() {
  return path.join(app.getPath('userData'), LEGACY_API_KEY_FILE)
}

function readLegacyApiKeyText() {
  try {
    const p = legacyApiKeyPath()
    if (!fs.existsSync(p)) return null
    const t = fs.readFileSync(p, 'utf8').trim()
    return t || null
  } catch {
    return null
  }
}

function windowIconPath() {
  const candidates = isDev
    ? [
        path.join(__dirname, '..', 'build', 'icon.ico'),
        path.join(__dirname, '..', 'build', 'icon.png'),
      ]
    : [
        path.join(process.resourcesPath, 'build', 'icon.ico'),
        path.join(process.resourcesPath, 'build', 'icon.png'),
      ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return undefined
}

ipcMain.handle('write-save-slot', async (_event, slot, json) => {
  try {
    const p = path.join(savesDir(), `slot-${Number(slot)}.json`)
    fs.writeFileSync(p, String(json), 'utf8')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
})

ipcMain.handle('read-save-slot', async (_event, slot) => {
  try {
    const p = path.join(savesDir(), `slot-${Number(slot)}.json`)
    if (!fs.existsSync(p)) return null
    return fs.readFileSync(p, 'utf8')
  } catch {
    return null
  }
})

ipcMain.handle('delete-save-slot', async (_event, slot) => {
  try {
    const p = path.join(savesDir(), `slot-${Number(slot)}.json`)
    if (fs.existsSync(p)) fs.unlinkSync(p)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
})

ipcMain.handle('read-ai-settings', async () => {
  try {
    const jsonPath = aiSettingsPath()
    if (fs.existsSync(jsonPath)) {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      return raw && typeof raw === 'object' ? raw : null
    }
    const leg = readLegacyApiKeyText()
    if (leg) {
      return { apiKey: leg, baseUrl: DEFAULT_LEGACY_BASE, model: '' }
    }
    return null
  } catch {
    return null
  }
})

ipcMain.handle('write-ai-settings', async (_event, payload) => {
  try {
    const jsonPath = aiSettingsPath()
    let cur = {}
    if (fs.existsSync(jsonPath)) {
      cur = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      if (!cur || typeof cur !== 'object') cur = {}
    }
    const p = payload && typeof payload === 'object' ? payload : {}
    const merged = { apiKey: '', baseUrl: '', model: '', ...cur, ...p }
    const next = {
      apiKey: String(merged.apiKey ?? ''),
      baseUrl: String(merged.baseUrl ?? ''),
      model: String(merged.model ?? ''),
    }
    fs.writeFileSync(jsonPath, JSON.stringify(next), 'utf8')
    const leg = legacyApiKeyPath()
    if (fs.existsSync(leg)) fs.unlinkSync(leg)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
})

ipcMain.handle('clear-ai-settings', async () => {
  try {
    const jsonPath = aiSettingsPath()
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath)
    const leg = legacyApiKeyPath()
    if (fs.existsSync(leg)) fs.unlinkSync(leg)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
})

const appRoot = path.join(__dirname, '..')
let appVersion = ''
try {
  appVersion = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8')).version || ''
} catch {
  // ignore
}

ipcMain.handle('regenerate-generated', async (_event, chapterId = 'prologue') => {
  if (!isDev) {
    return { ok: false, error: 'Not available in packaged build' }
  }
  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    const scriptPath = path.join(appRoot, 'scripts', 'generate-chapter.mjs')
    const child = spawn(
      'node',
      [scriptPath, chapterId, '--force'],
      { cwd: appRoot, stdio: ['ignore', 'pipe', 'pipe'], shell: false }
    )
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d) => { stdout += d.toString() })
    child.stderr?.on('data', (d) => { stderr += d.toString() })
    child.on('close', (code) => {
      if (code === 0) finish({ ok: true })
      else finish({ ok: false, error: stderr || stdout || `exit ${code}` })
    })
    child.on('error', (err) => finish({ ok: false, error: err.message }))
  })
})

function createWindow() {
  const win = new BrowserWindow({
    title: appVersion ? `行旅 · Another History v${appVersion}` : '行旅 · Another History',
    width: 900,
    height: 700,
    minWidth: 720,
    minHeight: 540,
    show: false,
    icon: windowIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  if (isDev) {
    const url = process.env.VITE_DEV_URL || 'http://localhost:5173'
    win.webContents.on('did-fail-load', (_, code, desc, urlLoaded) => {
      console.error('[Electron] load failed:', code, desc, urlLoaded)
    })
    win.webContents.on('did-finish-load', () => {
      console.log('[Electron] page loaded:', win.webContents.getURL())
    })
    win.loadURL(url)
    const showAndDevTools = () => {
      win.show()
      win.webContents.openDevTools()
    }
    win.webContents.once('did-finish-load', showAndDevTools)
    setTimeout(() => { if (!win.isVisible()) showAndDevTools() }, 5000)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
    win.once('ready-to-show', () => win.show())
  }
}

app.whenReady().then(() => {
  if (!isDev) {
    Menu.setApplicationMenu(null)
  }
  createWindow()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
