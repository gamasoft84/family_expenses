/** Lógica compartida SQLite ↔ Supabase (mapeo de filas y coerciones) */

const PERSON_DAFNE = 'Dafne Avila'
const PERSON_RICARDO = 'Ricardo Gama'

function stripAccents(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

function normKey(s) {
  return stripAccents(String(s).trim()).toLowerCase()
}

const DB_TO_SLUG = {
  comidas: 'comida',
  comida: 'comida',
  postres: 'postres',
  postre: 'postres',
  despensa: 'despensa',
  rufo: 'rufo',
  'gastos rufo': 'rufo',
  mascota: 'rufo',
  'gastos mascota': 'rufo',
  'gastos mascotas': 'rufo',
  transporte: 'transporte',
  seguro: 'seguro',
  seguros: 'seguro',
  entretenimiento: 'entretenimiento',
  salud: 'salud',
  servicios: 'servicios',
  capacitacion: 'capacitacion',
  'capacitacion personal': 'capacitacion',
  ropa: 'ropa',
  otro: 'otro',
  otros: 'otro',
}

const SLUG_TO_DB = {
  comida: 'Comidas',
  postres: 'Postres',
  despensa: 'Despensa',
  rufo: 'Gastos Rufo',
  transporte: 'Transporte',
  seguro: 'Seguro',
  entretenimiento: 'Entretenimiento',
  salud: 'Salud',
  servicios: 'Servicios',
  capacitacion: 'Capacitación',
  ropa: 'Ropa',
  otro: 'Otro',
}

function dbCategoryToSlug(dbCat) {
  const k = normKey(dbCat)
  if (DB_TO_SLUG[k]) return DB_TO_SLUG[k]
  if (k.includes('postre')) return 'postres'
  if (k.includes('despensa')) return 'despensa'
  if (k.includes('comida')) return 'comida'
  if (k.includes('transport')) return 'transporte'
  if (k.includes('seguro')) return 'seguro'
  if (k.includes('entreten')) return 'entretenimiento'
  if (k.includes('salud')) return 'salud'
  if (k.includes('servicio')) return 'servicios'
  if (k.includes('capacitacion')) return 'capacitacion'
  if (k.includes('ropa')) return 'ropa'
  if (k.includes('mascota')) return 'rufo'
  if (k.includes('rufo')) return 'rufo'
  return 'otro'
}

function slugToDbCategory(slug) {
  return SLUG_TO_DB[slug] || 'Otro'
}

function coercePerson(value) {
  if (value == null || String(value).trim() === '') return PERSON_DAFNE
  const v = String(value).trim()
  if (normKey(v) === normKey(PERSON_RICARDO)) return PERSON_RICARDO
  if (normKey(v) === normKey(PERSON_DAFNE)) return PERSON_DAFNE
  return PERSON_DAFNE
}

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

function coerceDateYmd(value) {
  if (value == null || String(value).trim() === '') return todayYmd()
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return todayYmd()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function currentYearMonth() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
}

function coerceYearMonth(ym) {
  if (ym == null || String(ym).trim() === '') return null
  const s = String(ym).trim()
  return /^\d{4}-\d{2}$/.test(s) ? s : null
}

function coerceAmountTip(importeRaw, propinaRaw) {
  const amount = Number(importeRaw)
  const tip = Math.max(0, Number(propinaRaw) || 0)
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (!Number.isFinite(tip) || tip < 0) return null
  return { amount, tip }
}

function rowToGasto(row) {
  const amount = Number(row.amount)
  const tipN = row.tip != null && row.tip !== '' ? Number(row.tip) : 0
  return {
    id: row.id,
    fecha: dateTextToIso(row.date),
    descripcion: row.description || '',
    importe: amount,
    propina: tipN,
    monto: amount + tipN,
    categoria: dbCategoryToSlug(row.category),
    persona: coercePerson(row.person),
  }
}

module.exports = {
  PERSON_DAFNE,
  PERSON_RICARDO,
  dbCategoryToSlug,
  slugToDbCategory,
  coercePerson,
  coerceDateYmd,
  coerceYearMonth,
  coerceAmountTip,
  rowToGasto,
  todayYmd,
  currentYearMonth,
}
