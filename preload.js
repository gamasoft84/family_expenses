const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('gastos', {
  getGastos: () => ipcRenderer.invoke('get-gastos'),
  addGasto: (gasto) => ipcRenderer.invoke('add-gasto', gasto),
  updateGasto: (gasto) => ipcRenderer.invoke('update-gasto', gasto),
  deleteGasto: (id) => ipcRenderer.invoke('delete-gasto', id),
  getStats: (payload) => ipcRenderer.invoke('get-stats', payload),
  exportExcel: (yearMonth) => ipcRenderer.invoke('export-excel', yearMonth),
})
