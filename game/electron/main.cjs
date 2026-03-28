const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

function savesDir() {
  const dir = path.join(app.getPath('userData'), 'saves')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
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

const isDev = process.env.NODE_ENV !== 'production'
const appRoot = path.join(__dirname, '..')
let appVersion = ''
try {
  appVersion = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8')).version || ''
} catch {
  // ignore
}

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
    title: appVersion ? `行旅 · Another History v${appVersion}` : '行旅 · Another History',
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
