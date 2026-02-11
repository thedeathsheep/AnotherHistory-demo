const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  regenerateGenerated: (chapterId) => ipcRenderer.invoke('regenerate-generated', chapterId || 'prologue'),
})
