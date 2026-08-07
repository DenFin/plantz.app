import type { PoolClient } from 'pg'
import consola from 'consola'
import { pool } from '~~/server/utils/db'

/**
 * `initial.sql` creates the tables that every numbered file alters, but it sorts last
 * alphabetically. Pin it to the front and order the rest by filename.
 */
const INITIAL = 'initial.sql'

/**
 * The column added by the newest migration (`004-add-parent-plant.sql`). Its presence is
 * the marker that a database without `schema_migrations` is already at the current head,
 * which is the case on terry where the files were applied by hand.
 */
const HEAD_MARKER = { table: 'plants', column: 'parent_plant_id' }

function compareMigrations(a: string, b: string) {
  if (a === b)
    return 0
  if (a === INITIAL)
    return -1
  if (b === INITIAL)
    return 1
  return a < b ? -1 : 1
}

async function readMigrationFiles() {
  const storage = useStorage('assets:migrations')
  const keys = await storage.getKeys()
  const filenames = keys.filter(key => key.endsWith('.sql')).sort(compareMigrations)

  return Promise.all(filenames.map(async (filename) => {
    const raw = await storage.getItem(filename)
    const sql = typeof raw === 'string' ? raw : new TextDecoder().decode(raw as ArrayBuffer)
    return { filename, sql }
  }))
}

async function hasSchemaMigrationsTable(client: PoolClient) {
  const res = await client.query(
    `SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present;`,
  )
  return res.rows[0].present as boolean
}

async function schemaIsAtHead(client: PoolClient) {
  const res = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     ) AS present;`,
    [HEAD_MARKER.table, HEAD_MARKER.column],
  )
  return res.rows[0].present as boolean
}

async function appliedFilenames(client: PoolClient) {
  const res = await client.query('SELECT filename FROM schema_migrations;')
  return new Set(res.rows.map(row => row.filename as string))
}

async function applyMigration(client: PoolClient, filename: string, sql: string) {
  // One transaction per file: 003-add-status-to-plants.sql contains four statements that
  // only make sense together.
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1);', [filename])
    await client.query('COMMIT')
  }
  catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

/**
 * Applies every migration file that is not yet recorded in `schema_migrations`.
 *
 * On the very first run the table does not exist yet. If the schema is already at the
 * current head the files are adopted (recorded without being executed), because re-running
 * them against a hand-migrated database would fail on `CREATE TABLE users`. Otherwise this
 * is a fresh database and every file runs in order.
 *
 * A failing file aborts the process. Serving traffic on a half-migrated schema is worse
 * than not starting (D-D1 in EPIC-PLANTZ-DELIVERY).
 */
export async function runMigrations() {
  const migrations = await readMigrationFiles()
  const client = await pool.connect()

  try {
    const firstRun = !(await hasSchemaMigrationsTable(client))

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `)

    if (firstRun && await schemaIsAtHead(client)) {
      const names = migrations.map(migration => migration.filename)
      await client.query(
        'INSERT INTO schema_migrations (filename) SELECT unnest($1::text[]);',
        [names],
      )
      consola.info(`Migrations: adopted ${names.length} file(s) without executing them, the schema is already at head: ${names.join(', ')}`)
      return
    }

    const applied = await appliedFilenames(client)
    const pending = migrations.filter(migration => !applied.has(migration.filename))

    if (pending.length === 0) {
      consola.info('Migrations: nothing pending')
      return
    }

    for (const migration of pending) {
      consola.info(`Migrations: applying ${migration.filename}`)
      try {
        await applyMigration(client, migration.filename, migration.sql)
      }
      catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        throw new Error(`Migration failed: ${migration.filename}: ${reason}`, { cause: error })
      }
      consola.success(`Migrations: applied ${migration.filename}`)
    }
  }
  finally {
    client.release()
  }
}
