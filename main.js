const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow
let db

const DATA_DIR = path.join(__dirname, 'data')
const DB_PATH = path.join(DATA_DIR, 'expenses.db')

function stripAccents(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

function normKey(s) {
  return stripAccents(String(s).trim()).toLowerCase()
}

/** Valores de `category` en BD del otro sistema → slug de la UI */
const DB_TO_SLUG = {
  comidas: 'comida',
  comida: 'comida',
  transporte: 'transporte',
  entretenimiento: 'entretenimiento',
  salud: 'salud',
  servicios: 'servicios',
  ropa: 'ropa',
  otro: 'otro',
  otros: 'otro',
}

/** Slug de la UI → etiqueta guardada en BD (compatible con el otro sistema) */
const SLUG_TO_DB = {
  comida: 'Comidas',
  transporte: 'Transporte',
  entretenimiento: 'Entretenimiento',
  salud: 'Salud',
  servicios: 'Servicios',
  ropa: 'Ropa',
  otro: 'Otro',
}

function dbCategoryToSlug(dbCat) {
  const k = normKey(dbCat)
  if (DB_TO_SLUG[k]) return DB_TO_SLUG[k]
  if (k.includes('comida')) return 'comida'
  if (k.includes('transport')) return 'transporte'
  if (k.includes('entreten')) return 'entretenimiento'
  if (k.includes('salud')) return 'salud'
  if (k.includes('servicio')) return 'servicios'
  if (k.includes('ropa')) return 'ropa'
  return 'otro'
}

function slugToDbCategory(slug) {
  return SLUG_TO_DB[slug] || 'Otro'
}

/** date TEXT 'YYYY-MM-DD' → ISO local (evita corrimientos por UTC) */
function dateTextToIso(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return new Date().toISOString()
  return new Date(y, m - 1, d, 12, 0, 0).toISOString()
}

function todayYmd() {
  const t = new Date()
  const y = t.getFullYear()
  const m = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function currentYearMonth() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
}

function rowToGasto(row) {
  return {
    id: row.id,
    fecha: dateTextToIso(row.date),
    descripcion: row.description || '',
    monto: Number(row.amount) + Number(row.tip || 0),
    categoria: dbCategoryToSlug(row.category),
  }
}

function initSqlite() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  const Database = require('better-sqlite3')
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      tip REAL NOT NULL DEFAULT 0
    );
  `)
}

function registerIpc() {
  ipcMain.handle('get-gastos', () => {
    const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
    return rows.map(rowToGasto)
  })

  ipcMain.handle('add-gasto', (_, gasto) => {
    const insert = db.prepare(`
      INSERT INTO expenses (date, category, description, amount, tip)
      VALUES (?, ?, ?, ?, 0)
    `)
    insert.run(
      todayYmd(),
      slugToDbCategory(gasto.categoria),
      gasto.descripcion,
      gasto.monto
    )
    const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
    return rows.map(rowToGasto)
  })

  ipcMain.handle('delete-gasto', (_, id) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
    return rows.map(rowToGasto)
  })

  ipcMain.handle('get-stats', () => {
    const ym = currentYearMonth()
    const rows = db
      .prepare(
        `SELECT category, amount, tip FROM expenses WHERE substr(date, 1, 7) = ?`
      )
      .all(ym)

    const total = rows.reduce((s, r) => s + Number(r.amount) + Number(r.tip || 0), 0)
    const porCategoria = rows.reduce((acc, r) => {
      const slug = dbCategoryToSlug(r.category)
      acc[slug] =
        (acc[slug] || 0) + Number(r.amount) + Number(r.tip || 0)
      return acc
    }, {})

    return { total, porCategoria, cantidad: rows.length }
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
  initSqlite()
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
  if (db) {
    db.close()
    db = null
  }
})
