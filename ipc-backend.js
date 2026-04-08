const {
  slugToDbCategory,
  coercePerson,
  coerceDateYmd,
  coerceYearMonth,
  coerceAmountTip,
  rowToGasto,
  todayYmd,
  currentYearMonth,
  dbCategoryToSlug,
} = require('./gasto-common')

function makeSqliteBackend(db) {
  return {
    mode: 'sqlite',

    async getGastos() {
      const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
      return rows.map(rowToGasto)
    },

    async addGasto(gasto) {
      const persona = coercePerson(gasto.persona)
      const at = coerceAmountTip(gasto.importe, gasto.propina)
      if (!at) {
        const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
        return rows.map(rowToGasto)
      }
      const insert = db.prepare(`
        INSERT INTO expenses (date, category, description, amount, tip, person)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      const fechaRegistro = coerceDateYmd(gasto.fecha) || todayYmd()
      insert.run(
        fechaRegistro,
        slugToDbCategory(gasto.categoria),
        gasto.descripcion,
        at.amount,
        at.tip,
        persona
      )
      const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
      return rows.map(rowToGasto)
    },

    async deleteGasto(id) {
      db.prepare('DELETE FROM expenses WHERE id = ?').run(id)
      const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
      return rows.map(rowToGasto)
    },

    async updateGasto(payload) {
      const id = Number(payload.id)
      if (!Number.isInteger(id) || id < 1) {
        const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
        return rows.map(rowToGasto)
      }
      const persona = coercePerson(payload.persona)
      const dateStr = coerceDateYmd(payload.fecha)
      const at = coerceAmountTip(payload.importe, payload.propina)
      if (!at) {
        const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
        return rows.map(rowToGasto)
      }
      const stmt = db.prepare(`
        UPDATE expenses
        SET date = ?, category = ?, description = ?, amount = ?, tip = ?, person = ?
        WHERE id = ?
      `)
      stmt.run(
        dateStr,
        slugToDbCategory(payload.categoria),
        String(payload.descripcion || ''),
        at.amount,
        at.tip,
        persona,
        id
      )
      const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all()
      return rows.map(rowToGasto)
    },

    async getStats(payload) {
      let ymRaw = null
      let personaFiltro = null
      if (typeof payload === 'string') {
        ymRaw = payload
      } else if (payload && typeof payload === 'object') {
        ymRaw = payload.yearMonth
        personaFiltro = payload.persona
      }
      const ym = coerceYearMonth(ymRaw) || currentYearMonth()
      const p =
        personaFiltro &&
        personaFiltro !== 'todos' &&
        String(personaFiltro).trim()
          ? String(personaFiltro).trim()
          : null

      const rows = p
        ? db
            .prepare(
              `SELECT category, amount, tip FROM expenses WHERE substr(date, 1, 7) = ? AND person = ?`
            )
            .all(ym, p)
        : db
            .prepare(
              `SELECT category, amount, tip FROM expenses WHERE substr(date, 1, 7) = ?`
            )
            .all(ym)

      return aggregateStats(rows, ym)
    },

    async getExportRows(yearMonth) {
      const ym = coerceYearMonth(yearMonth)
      if (ym) {
        return db
          .prepare(
            `SELECT date, category, description, amount, tip, person FROM expenses WHERE substr(date,1,7) = ? ORDER BY date ASC, id ASC`
          )
          .all(ym)
      }
      return db
        .prepare(
          `SELECT date, category, description, amount, tip, person FROM expenses ORDER BY date ASC, id ASC`
        )
        .all()
    },
  }
}

function aggregateStats(rows, ym) {
  const total = rows.reduce((s, r) => s + Number(r.amount) + Number(r.tip || 0), 0)
  const propinasTotal = rows.reduce((s, r) => s + Number(r.tip || 0), 0)
  const gastosConPropina = rows.filter((r) => Number(r.tip || 0) > 0).length
  const porCategoria = rows.reduce((acc, r) => {
    const slug = dbCategoryToSlug(r.category)
    acc[slug] = (acc[slug] || 0) + Number(r.amount) + Number(r.tip || 0)
    return acc
  }, {})
  return {
    total,
    propinasTotal,
    gastosConPropina,
    porCategoria,
    cantidad: rows.length,
    yearMonth: ym,
  }
}

function makeSupabaseBackend(client) {
  const table = 'expenses'

  async function fetchAllOrdered() {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map((row) =>
      rowToGasto({
        id: row.id,
        date: row.date,
        category: row.category,
        description: row.description,
        amount: row.amount,
        tip: row.tip,
        person: row.person,
      })
    )
  }

  return {
    mode: 'supabase',

    async getGastos() {
      return fetchAllOrdered()
    },

    async addGasto(gasto) {
      const persona = coercePerson(gasto.persona)
      const at = coerceAmountTip(gasto.importe, gasto.propina)
      if (!at) return fetchAllOrdered()
      const fechaRegistro = coerceDateYmd(gasto.fecha) || todayYmd()
      const { error } = await client.from(table).insert({
        date: fechaRegistro,
        category: slugToDbCategory(gasto.categoria),
        description: gasto.descripcion,
        amount: at.amount,
        tip: at.tip,
        person: persona,
      })
      if (error) throw new Error(error.message)
      return fetchAllOrdered()
    },

    async deleteGasto(id) {
      const { error } = await client.from(table).delete().eq('id', id)
      if (error) throw new Error(error.message)
      return fetchAllOrdered()
    },

    async updateGasto(payload) {
      const id = Number(payload.id)
      if (!Number.isInteger(id) || id < 1) return fetchAllOrdered()
      const persona = coercePerson(payload.persona)
      const dateStr = coerceDateYmd(payload.fecha)
      const at = coerceAmountTip(payload.importe, payload.propina)
      if (!at) return fetchAllOrdered()
      const { error } = await client
        .from(table)
        .update({
          date: dateStr,
          category: slugToDbCategory(payload.categoria),
          description: String(payload.descripcion || ''),
          amount: at.amount,
          tip: at.tip,
          person: persona,
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
      return fetchAllOrdered()
    },

    async getStats(payload) {
      let ymRaw = null
      let personaFiltro = null
      if (typeof payload === 'string') {
        ymRaw = payload
      } else if (payload && typeof payload === 'object') {
        ymRaw = payload.yearMonth
        personaFiltro = payload.persona
      }
      const ym = coerceYearMonth(ymRaw) || currentYearMonth()
      const p =
        personaFiltro &&
        personaFiltro !== 'todos' &&
        String(personaFiltro).trim()
          ? String(personaFiltro).trim()
          : null

      let q = client.from(table).select('category, amount, tip').like('date', `${ym}%`)
      if (p) q = q.eq('person', p)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return aggregateStats(data || [], ym)
    },

    async getExportRows(yearMonth) {
      const ym = coerceYearMonth(yearMonth)
      let q = client.from(table).select('date, category, description, amount, tip, person')
      if (ym) q = q.like('date', `${ym}%`)
      q = q.order('date', { ascending: true }).order('id', { ascending: true })
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return data || []
    },
  }
}

function readSupabaseConfig(app) {
  const url = process.env.SUPABASE_URL && String(process.env.SUPABASE_URL).trim()
  const key =
    process.env.SUPABASE_ANON_KEY && String(process.env.SUPABASE_ANON_KEY).trim()
  if (url && key) return { url, key }
  try {
    const path = require('path')
    const fs = require('fs')
    const p = path.join(app.getPath('userData'), 'supabase-config.json')
    if (!fs.existsSync(p)) return null
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    const u = j.url && String(j.url).trim()
    const k = (j.anonKey || j.anon_key) && String(j.anonKey || j.anon_key).trim()
    if (u && k) return { url: u, key: k }
  } catch (_) {
    /* ignorar */
  }
  return null
}

function createBackend(app, sqliteDb) {
  const cfg = readSupabaseConfig(app)
  if (cfg) {
    const { createClient } = require('@supabase/supabase-js')
    const client = createClient(cfg.url, cfg.key)
    return makeSupabaseBackend(client)
  }
  return makeSqliteBackend(sqliteDb)
}

module.exports = {
  createBackend,
  readSupabaseConfig,
  makeSqliteBackend,
  makeSupabaseBackend,
}
