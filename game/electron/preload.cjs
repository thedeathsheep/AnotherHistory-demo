const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  regenerateGenerated: (chapterId) => ipcRenderer.invoke('regenerate-generated', chapterId || 'prologue'),
})
