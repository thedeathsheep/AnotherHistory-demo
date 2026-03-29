const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  regenerateGenerated: (chapterId) => ipcRenderer.invoke('regenerate-generated', chapterId || 'prologue'),
  writeSaveSlot: (slot, json) => ipcRenderer.invoke('write-save-slot', slot, json),
  readSaveSlot: (slot) => ipcRenderer.invoke('read-save-slot', slot),
  deleteSaveSlot: (slot) => ipcRenderer.invoke('delete-save-slot', slot),
  readAiSettings: () => ipcRenderer.invoke('read-ai-settings'),
  writeAiSettings: (payload) => ipcRenderer.invoke('write-ai-settings', payload),
  clearAiSettings: () => ipcRenderer.invoke('clear-ai-settings'),
})
