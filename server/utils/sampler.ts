import consola from 'consola'
import { queryDatabase } from '~~/server/utils/db'
import {
  careEventsTotal,
  dbUp,
  minioUp,
  notes,
  photoBytes,
  photos,
  plantCareAge,
  plants,
  propagations,
  remindersOpen,
  remindersOverdue,
  rooms,
  samplerTimestamp,
} from '~~/server/utils/metrics'
import { checkMinioConnection } from '~~/server/utils/minio'
import { REMINDER_FILTERS } from '~~/server/utils/reminders'
import { plantsWithInterval } from '~~/server/utils/wateringDue'

/** D-I4: the per-plant metric is capped so Prometheus cannot grow a series per plant. */
const CARE_AGE_SERIES_LIMIT = 20

export const SAMPLE_INTERVAL_MS = 60_000

let running = false

/**
 * The two reachability gauges. They run on the sampler tick rather than only when
 * someone opens the status endpoints, so a dependency that goes down while nobody is
 * using the app still shows up on the board within one interval (AE6).
 */
async function probeDependencies() {
  await Promise.all([
    queryDatabase('SELECT 1;').then(() => dbUp.set(1)).catch(() => dbUp.set(0)),
    checkMinioConnection().then(ok => minioUp.set(ok ? 1 : 0)).catch(() => minioUp.set(0)),
  ])
}

/**
 * Runs the domain SQL once and writes the result into the gauges.
 *
 * Nothing here is reachable from `/metrics`: the endpoint renders the registry, and the
 * registry is only ever written from this function. That is what makes a scrape unable to
 * put load on Postgres (R2, AE2).
 */
export async function sampleOnce() {
  const started = Date.now()

  await probeDependencies()

  const [
    plantRows,
    roomRow,
    noteRow,
    photoRow,
    propagationRow,
    careRows,
    reminderRow,
    careAgeRows,
  ] = await Promise.all([
    queryDatabase(`
      SELECT p.status::text AS status, COALESCE(r.name, 'none') AS room, COUNT(*)::int AS count
      FROM plants p
      LEFT JOIN rooms r ON r.id = p.room_id
      GROUP BY p.status, COALESCE(r.name, 'none');
    `),
    queryDatabase('SELECT COUNT(*)::int AS count FROM rooms;'),
    queryDatabase('SELECT COUNT(*)::int AS count FROM notes;'),
    queryDatabase('SELECT COUNT(*)::int AS count, COALESCE(SUM(size_bytes), 0)::bigint AS bytes FROM photos;'),
    queryDatabase('SELECT COUNT(*)::int AS count FROM plants WHERE parent_plant_id IS NOT NULL;'),
    // D-I3: a SQL count, not a process counter, so a container restart does not reset it.
    queryDatabase('SELECT type::text AS type, COUNT(*)::int AS count FROM care_events GROUP BY type;'),
    // The same fragments the API uses, so the board and the app cannot disagree.
    queryDatabase(`
      SELECT
        COUNT(*) FILTER (WHERE ${REMINDER_FILTERS.open})::int    AS open,
        COUNT(*) FILTER (WHERE ${REMINDER_FILTERS.overdue})::int AS overdue
      FROM reminders;
    `),
    plantsWithInterval(CARE_AGE_SERIES_LIMIT),
  ])

  // Reset first: a plant that moved room or died would otherwise leave its old series
  // behind at the last value it had.
  plants.reset()
  for (const row of plantRows)
    plants.set({ status: row.status, room: row.room }, row.count)

  rooms.set(roomRow[0]?.count ?? 0)
  notes.set(noteRow[0]?.count ?? 0)
  photos.set(photoRow[0]?.count ?? 0)
  photoBytes.set(Number(photoRow[0]?.bytes ?? 0))
  propagations.set(propagationRow[0]?.count ?? 0)

  careEventsTotal.reset()
  for (const row of careRows)
    careEventsTotal.set({ type: row.type }, row.count)

  remindersOpen.set(reminderRow[0]?.open ?? 0)
  remindersOverdue.set(reminderRow[0]?.overdue ?? 0)

  plantCareAge.reset()
  for (const row of careAgeRows)
    plantCareAge.set({ plant: row.name, type: 'watering' }, Number(row.care_age_seconds))

  samplerTimestamp.set(Math.floor(Date.now() / 1000))
  return Date.now() - started
}

/**
 * One tick. A failure logs and returns: the next tick tries again rather than taking the
 * process down through an unhandled rejection. A tick that is still running skips the
 * next one instead of piling up.
 */
export async function tick() {
  if (running) {
    consola.warn('Sampler: previous run still in flight, skipping this tick')
    return
  }
  running = true
  try {
    const ms = await sampleOnce()
    consola.debug(`Sampler: sampled in ${ms}ms`)
  }
  catch (error) {
    consola.error('Sampler: sample failed, retrying on the next tick:', error)
  }
  finally {
    running = false
  }
}
