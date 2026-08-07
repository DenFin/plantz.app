import process from 'node:process'
import pg from 'pg'

const { Pool } = pg

// The pool lives for the lifetime of the process. In dev the server module can be
// re-evaluated on reload, so it is cached on globalThis to avoid stacking up pools
// that each hold their own connections.
const globalForDb = globalThis as typeof globalThis & { plantzPool?: pg.Pool }

function createPool() {
  const created = new Pool({
    user: process.env.DATABASE_USER,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: Number(process.env.DATABASE_PORT),
  })

  // An idle client dropped by Postgres emits on the pool, not on a query. Without a
  // listener that is an unhandled error event and takes the process down.
  created.on('error', (err) => {
    console.error('Unexpected error on idle database client:', err)
  })

  return created
}

/**
 * The connection pool. INS-01 reads `totalCount`, `idleCount` and `waitingCount` off it.
 * Never close this per request: closing it takes every later query down with it.
 */
export const pool = globalForDb.plantzPool ?? createPool()
globalForDb.plantzPool = pool

/**
 * Checks a client out of the pool for callers that need several statements on the same
 * connection (a transaction). The caller must `release()` it in a `finally` block.
 */
export async function database() {
  return pool.connect()
}

export async function queryDatabase(query: string, params: any[] = []) {
  try {
    const res = await pool.query(query, params)
    return res.rows // Return the rows of the result
  }
  catch (err) {
    console.error('Database query error:', err)
    throw err // Rethrow the error to be handled by the caller
  }
}
