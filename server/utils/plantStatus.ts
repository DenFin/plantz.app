import type { PoolClient } from 'pg'
import { queryDatabase } from '~~/server/utils/db'

export const PLANT_STATUSES = ['healthy', 'sick', 'dead', 'needs_repotting'] as const

export type PlantStatus = typeof PLANT_STATUSES[number]

export function isPlantStatus(value: unknown): value is PlantStatus {
  return typeof value === 'string' && (PLANT_STATUSES as readonly string[]).includes(value)
}

/**
 * The only way `plants.status` is written. Both `bury` and the PUT endpoint go through
 * here, so a third write site added later cannot silently skip the history event.
 *
 * Read and write happen in one statement: the `WHERE ... IS DISTINCT FROM` clause makes a
 * no-op update write nothing, and the insert only sees rows the update actually touched.
 * That also removes the read-then-write race, which is theoretical with one user but free
 * to avoid here.
 *
 * Returns the recorded event, or null when the status was already the requested value.
 */
export async function changePlantStatus(
  plantId: string,
  toStatus: PlantStatus,
  options: { note?: string | null, client?: PoolClient } = {},
) {
  const sql = `
    WITH prev AS (
      SELECT id, status FROM plants WHERE id = $1
    ),
    upd AS (
      UPDATE plants p
         SET status = $2::plant_status
        FROM prev
       WHERE p.id = prev.id
         AND p.status IS DISTINCT FROM $2::plant_status
      RETURNING p.id, prev.status AS from_status, p.status AS to_status
    )
    INSERT INTO plant_status_events (plant_id, from_status, to_status, note)
    SELECT id, from_status, to_status, $3 FROM upd
    RETURNING *;
  `
  const params = [plantId, toStatus, options.note ?? null]

  if (options.client) {
    const result = await options.client.query(sql, params)
    return result.rows[0] ?? null
  }

  const rows = await queryDatabase(sql, params)
  return rows[0] ?? null
}
