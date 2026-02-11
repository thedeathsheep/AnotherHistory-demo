const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const isDev = process.env.NODE_ENV !== 'production'
const appRoot = path.join(__dirname, '..')

// Load .env: try game/.env first, then project root .env (so one .env at root works after pull)
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8')
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnvFile(path.join(appRoot, '.env'))
loadEnvFile(path.join(appRoot, '..', '.env'))

/** Read API key for renderer (live AI). Sources: env (.env already loaded above), config.json, api_key.txt */
function getApiKeyFromDisk() {
  const key = process.env.AIHUBMIX_API_KEY || process.env.VITE_AIHUBMIX_API_KEY
  if (key && key.startsWith('sk-')) return key
  try {
    const cfgPath = path.join(appRoot, 'public', 'config.json')
    if (fs.existsSync(cfgPath)) {
      const data = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'))
      if (data.aihubmixApiKey && data.aihubmixApiKey.startsWith('sk-')) return data.aihubmixApiKey
    }
  } catch (_) {}
  const apiKeyPath = path.join(appRoot, '..', 'api_key.txt')
  if (fs.existsSync(apiKeyPath)) {
    const text = fs.readFileSync(apiKeyPath, 'utf-8')
    const firstLine = text.trim().split('\n')[0]?.trim()
    if (firstLine && firstLine.startsWith('sk-')) return firstLine
    const match = text.match(/sk-[a-zA-Z0-9]+/)
    if (match) return match[0]
  }
  return null
}

ipcMain.handle('get-api-key', () => getApiKeyFromDisk())

ipcMain.handle('regenerate-generated', async (_event, chapterId = 'prologue') => {
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
    child.on('close', (code, signal) => {
      if (code === 0) finish({ ok: true })
      else finish({ ok: false, error: stderr || stdout || `exit ${code}` })
    })
    child.on('error', (err) => finish({ ok: false, error: err.message }))
  })
})

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
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

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
