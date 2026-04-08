#!/usr/bin/env node
/**
 * Migra expenses.db (SQLite) → tabla public.expenses en Supabase.
 *
 * Uso:
 *   node scripts/migrate-sqlite-to-supabase.js
 *   node scripts/migrate-sqlite-to-supabase.js --replace   # borra filas remotas antes (id >= 0)
 *   node scripts/migrate-sqlite-to-supabase.js --new-ids   # no copia id (Postgres asigna nuevos)
 *
 * Variables (.env en la raíz del proyecto):
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 * Opcional: SQLITE_DB_PATH=/ruta/a/expenses.db (por defecto ./data/expenses.db)
 */

const path = require('path')
const fs = require('fs')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const root = path.join(__dirname, '..')
const dbPath = process.env.SQLITE_DB_PATH || path.join(root, 'data', 'expenses.db')
const url = process.env.SUPABASE_URL && String(process.env.SUPABASE_URL).trim()
const key = process.env.SUPABASE_ANON_KEY && String(process.env.SUPABASE_ANON_KEY).trim()

const args = new Set(process.argv.slice(2))
const replaceRemote = args.has('--replace')
const newIdsOnly = args.has('--new-ids')

if (!url || !key) {
  console.error('Configura SUPABASE_URL y SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

if (!fs.existsSync(dbPath)) {
  console.error('No existe el archivo SQLite:', dbPath)
  process.exit(1)
}

const Database = require('better-sqlite3')
const { createClient } = require('@supabase/supabase-js')

const sqlite = new Database(dbPath, { readonly: true })
let rows
try {
  rows = sqlite
    .prepare(
      'SELECT id, date, category, description, amount, tip, person FROM expenses ORDER BY id ASC'
    )
    .all()
} catch (e) {
  console.error('Error leyendo SQLite:', e.message)
  process.exit(1)
}
sqlite.close()

if (rows.length === 0) {
  console.log('SQLite no tiene filas. Nada que migrar.')
  process.exit(0)
}

const supabase = createClient(url, key)

function mapRow(r) {
  const row = {
    date: r.date,
    category: r.category,
    description: r.description != null ? String(r.description) : '',
    amount: Number(r.amount),
    tip: r.tip != null && r.tip !== '' ? Number(r.tip) : 0,
    person: r.person != null && String(r.person).trim() !== '' ? String(r.person).trim() : 'Dafne Avila',
  }
  if (!newIdsOnly) row.id = Number(r.id)
  return row
}

async function main() {
  const { count: remoteCount, error: countErr } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })

  if (countErr) {
    console.error('No se pudo consultar Supabase:', countErr.message)
    process.exit(1)
  }

  if (remoteCount > 0 && !replaceRemote) {
    console.error(
      `Supabase ya tiene ${remoteCount} fila(s). Opciones:\n` +
        `  • SQL Editor en Supabase:  truncate table public.expenses restart identity cascade;\n` +
        `  • O ejecutar de nuevo con:  node scripts/migrate-sqlite-to-supabase.js --replace`
    )
    process.exit(1)
  }

  if (replaceRemote && remoteCount > 0) {
    const { error: delErr } = await supabase.from('expenses').delete().gte('id', 0)
    if (delErr) {
      console.error('No se pudieron borrar filas remotas:', delErr.message)
      console.error('Probá en SQL Editor: truncate table public.expenses restart identity cascade;')
      process.exit(1)
    }
    console.log('Filas remotas eliminadas.')
  }

  const batchSize = 250
  const mapped = rows.map(mapRow)

  for (let i = 0; i < mapped.length; i += batchSize) {
    const chunk = mapped.slice(i, i + batchSize)
    const { error } = await supabase.from('expenses').insert(chunk)
    if (error) {
      console.error('Error al insertar lote:', error.message)
      if (!newIdsOnly && error.message.includes('duplicate')) {
        console.error(
          'Puede ser conflicto de id. Vacía la tabla en Supabase (truncate …) o usa --new-ids'
        )
      }
      process.exit(1)
    }
    const end = Math.min(i + batchSize, mapped.length)
    console.log(`Insertadas ${end} / ${mapped.length}`)
  }

  console.log(`Migración lista: ${mapped.length} gasto(s) desde ${dbPath}`)
}

main()
