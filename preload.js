const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('gastos', {
  getGastos: () => ipcRenderer.invoke('get-gastos'),
  addGasto: (gasto) => ipcRenderer.invoke('add-gasto', gasto),
  deleteGasto: (id) => ipcRenderer.invoke('delete-gasto', id),
  getStats: () => ipcRenderer.invoke('get-stats')
})
