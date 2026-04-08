const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')

try {
  require('dotenv').config({ path: path.join(__dirname, '.env') })
} catch (_) {
  /* dotenv opcional */
}

const { createBackend, readSupabaseConfig } = require('./ipc-backend')

let mainWindow
let backend

const IPC_CHANNELS = [
  'get-gastos',
  'add-gasto',
  'delete-gasto',
  'update-gasto',
  'get-stats',
  'export-excel',
  'get-backend-info',
]

function emptyStats(ym) {
  return {
    total: 0,
    propinasTotal: 0,
    gastosConPropina: 0,
    porCategoria: {},
    cantidad: 0,
    yearMonth: ym,
  }
}

function registerIpc() {
  IPC_CHANNELS.forEach((ch) => {
    ipcMain.removeHandler(ch)
  })

  ipcMain.handle('get-gastos', async () => {
    try {
      return await backend.getGastos()
    } catch (e) {
      console.error('[GastoFlow] get-gastos', e)
      return []
    }
  })

  ipcMain.handle('add-gasto', async (_, gasto) => {
    try {
      return await backend.addGasto(gasto)
    } catch (e) {
      console.error('[GastoFlow] add-gasto', e)
      try {
        return await backend.getGastos()
      } catch (_) {
        return []
      }
    }
  })

  ipcMain.handle('delete-gasto', async (_, id) => {
    try {
      return await backend.deleteGasto(id)
    } catch (e) {
      console.error('[GastoFlow] delete-gasto', e)
      try {
        return await backend.getGastos()
      } catch (_) {
        return []
      }
    }
  })

  ipcMain.handle('update-gasto', async (_, payload) => {
    try {
      return await backend.updateGasto(payload)
    } catch (e) {
      console.error('[GastoFlow] update-gasto', e)
      try {
        return await backend.getGastos()
      } catch (_) {
        return []
      }
    }
  })

  ipcMain.handle('get-stats', async (_, payload) => {
    try {
      return await backend.getStats(payload)
    } catch (e) {
      console.error('[GastoFlow] get-stats', e)
      const { currentYearMonth, coerceYearMonth } = require('./gasto-common')
      let ymRaw = null
      if (typeof payload === 'string') ymRaw = payload
      else if (payload && typeof payload === 'object') ymRaw = payload.yearMonth
      const ym = coerceYearMonth(ymRaw) || currentYearMonth()
      return emptyStats(ym)
    }
  })

  ipcMain.handle('get-backend-info', async () => ({
    mode: backend.mode,
    supabase: Boolean(readSupabaseConfig(app)),
  }))

  ipcMain.handle('export-excel', async (_, yearMonth) => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow
    const ym = require('./gasto-common').coerceYearMonth(yearMonth)
    const suffix = ym || 'todos'
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Guardar Excel',
      defaultPath: `gastos-${suffix}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    })
    if (canceled || !filePath) return { ok: false, canceled: true }

    const XLSX = require('xlsx')
    let rows
    try {
      rows = await backend.getExportRows(yearMonth)
    } catch (e) {
      console.error('[GastoFlow] export-excel', e)
      return { ok: false, error: e.message || String(e) }
    }

    const data = [
      ['Fecha', 'Categoría', 'Descripción', 'Importe', 'Propina', 'Total (MXN)', 'Persona'],
      ...rows.map((r) => {
        const imp = Number(r.amount)
        const prop = Number(r.tip || 0)
        return [
          r.date,
          r.category,
          r.description || '',
          imp,
          prop,
          imp + prop,
          r.person || '',
        ]
      }),
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
    XLSX.writeFile(wb, filePath)
    return { ok: true, path: filePath }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 720,
    minHeight: 560,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f13',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'icon.png'),
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  // Solo Supabase: si no hay config, queda sin datos y se notará en getBackendInfo.
  backend = createBackend(app)
  registerIpc()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('before-quit', () => {
  // Sin SQLite local.
})
