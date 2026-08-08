import { queryDatabase } from '~~/server/utils/db'

/**
 * The single definition of "when is this plant due for water".
 *
 * Everything here is derived, nothing is stored:
 *
 *   last_watering = the newest watering care event, or the plant's created_at when there
 *                   is none yet. Using created_at as the baseline is what stops a plant
 *                   added today from showing up overdue immediately.
 *   due_at        = last_watering + watering_interval_days
 *   days_overdue  = whole days between due_at and now, negative when not yet due
 *
 * A plant with `watering_interval_days IS NULL` is filtered out before any of this, so it
 * is never due and never overdue.
 *
 * INS-01 samples `plantz_plant_care_age_seconds` from this same query with a limit, which
 * is why the definition lives here and not inside an endpoint. Two copies of it is how the
 * board ends up disagreeing with the app.
 */
const DUE_SELECT = `
  SELECT
    p.id,
    p.name,
    p.species,
    p.room_id,
    p.status,
    p.watering_interval_days,
    COALESCE(w.last_watering, p.created_at)                        AS last_watering,
    w.last_watering IS NULL                                        AS never_watered,
    COALESCE(w.last_watering, p.created_at)
      + make_interval(days => p.watering_interval_days)            AS due_at,
    FLOOR(
      EXTRACT(EPOCH FROM (
        now() - (COALESCE(w.last_watering, p.created_at)
                 + make_interval(days => p.watering_interval_days))
      )) / 86400
    )::int                                                         AS days_overdue,
    EXTRACT(EPOCH FROM (now() - COALESCE(w.last_watering, p.created_at)))::bigint
                                                                   AS care_age_seconds
  FROM plants p
  LEFT JOIN (
    SELECT plant_id, MAX(occurred_at) AS last_watering
    FROM care_events
    WHERE type = 'watering'
    GROUP BY plant_id
  ) w ON w.plant_id = p.id
  WHERE p.watering_interval_days IS NOT NULL
`

export type WateringDueRow = {
  id: string
  name: string
  species: string | null
  room_id: number | null
  status: string
  watering_interval_days: number
  last_watering: string
  never_watered: boolean
  due_at: string
  days_overdue: number
  care_age_seconds: string
}

/**
 * Plants that are past their due date, most overdue first.
 * `limit` exists for the INS-01 sampler, which caps the per-plant metric at 20 series.
 */
export async function overduePlants(limit?: number): Promise<WateringDueRow[]> {
  const params: any[] = []
  let sql = `${DUE_SELECT} AND now() > COALESCE(w.last_watering, p.created_at)
                                       + make_interval(days => p.watering_interval_days)
             ORDER BY days_overdue DESC`
  if (limit) {
    params.push(limit)
    sql += ` LIMIT $${params.length}`
  }
  return queryDatabase(`${sql};`, params) as Promise<WateringDueRow[]>
}

/**
 * Every plant that has an interval, due or not, most overdue first. The sampler uses this
 * for the care-age gauge, where a plant watered on time still has a value worth reporting.
 */
export async function plantsWithInterval(limit?: number): Promise<WateringDueRow[]> {
  const params: any[] = []
  let sql = `${DUE_SELECT} ORDER BY days_overdue DESC`
  if (limit) {
    params.push(limit)
    sql += ` LIMIT $${params.length}`
  }
  return queryDatabase(`${sql};`, params) as Promise<WateringDueRow[]>
}

/** The due state of one plant, or null when it has no interval. */
export async function wateringDueForPlant(plantId: string): Promise<WateringDueRow | null> {
  const rows = await queryDatabase(`${DUE_SELECT} AND p.id = $1;`, [plantId])
  return (rows[0] as WateringDueRow) ?? null
}
