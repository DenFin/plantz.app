import process from 'node:process'
import * as Minio from 'minio'
import pg from 'pg'
import 'dotenv/config'

/**
 * One-off: fills `photos.size_bytes` for rows that predate the column, by asking MinIO
 * how large each object is. New uploads set it inline, so this is meant to be run once
 * after migration 009 and never again. It is deliberately not part of startup: hammering
 * MinIO on every boot for a value that does not change is the risk section 7 names.
 *
 *   pnpm db:backfill-photo-sizes
 */
const client = new pg.Client({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.DATABASE_PORT),
})

const minio = new Minio.Client({
  endPoint: process.env.MINIO_HOST || '192.168.2.217',
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
})

const bucket = process.env.MINIO_BUCKET || 'plantz'

async function main() {
  await client.connect()

  const { rows } = await client.query(
    'SELECT id, image_url FROM photos WHERE size_bytes IS NULL;',
  )
  console.log(`${rows.length} photo(s) without a size`)

  let filled = 0
  let missing = 0

  for (const row of rows) {
    try {
      const stat = await minio.statObject(bucket, row.image_url)
      await client.query('UPDATE photos SET size_bytes = $2 WHERE id = $1;', [row.id, stat.size])
      filled++
    }
    catch (error) {
      // A row whose object is gone stays null rather than being guessed at. The gauge
      // sums what is known, and an absent object is not a size of zero.
      missing++
      console.warn(`No object for photo ${row.id} (${row.image_url}):`, (error as Error).message)
    }
  }

  console.log(`filled ${filled}, missing objects ${missing}`)
  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
