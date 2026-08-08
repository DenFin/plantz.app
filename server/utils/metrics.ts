import process from 'node:process'
import { Counter, Gauge, Histogram, Registry } from 'prom-client'

/**
 * The metric inventory is the contract, and it lives in
 * `homelab-root/docs/brainstorms/plantz-dashboard-requirements.md`. Names, types and
 * labels here follow that table. Node internals are deliberately not registered: the
 * inventory says what the board consumes, and nothing else belongs on the endpoint.
 */
export const registry = new Registry()

function gauge(name: string, help: string, labelNames: string[] = []) {
  return new Gauge({ name, help, labelNames, registers: [registry] })
}

function counter(name: string, help: string, labelNames: string[] = []) {
  return new Counter({ name, help, labelNames, registers: [registry] })
}

function histogram(name: string, help: string, labelNames: string[] = [], buckets?: number[]) {
  return new Histogram({ name, help, labelNames, buckets, registers: [registry] })
}

// --- build ------------------------------------------------------------------------

export const buildInfo = gauge('plantz_build_info', 'The commit the running image was built from', ['version'])
// DEL-04 passes the commit SHA as a build argument; the Dockerfile turns it into BUILD_TAG.
buildInfo.set({ version: process.env.BUILD_TAG || 'dev' }, 1)

// --- dependencies -----------------------------------------------------------------

export const dbUp = gauge('plantz_db_up', 'Whether Postgres answered the last probe')
export const minioUp = gauge('plantz_minio_up', 'Whether MinIO answered the last probe')

export const dbPoolConnections = gauge(
  'plantz_db_pool_connections',
  'Connections in the pg pool by state',
  ['state'],
)

export const dbQueryDuration = histogram(
  'plantz_db_query_duration_seconds',
  'Duration of a database query',
  [],
  [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
)

// --- http -------------------------------------------------------------------------

export const httpRequests = counter(
  'plantz_http_requests_total',
  'HTTP requests by matched route pattern',
  ['route', 'method', 'status'],
)

export const httpRequestDuration = histogram(
  'plantz_http_request_duration_seconds',
  'HTTP request duration by matched route pattern',
  ['route'],
  [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
)

// --- ai and photos ----------------------------------------------------------------

export const aiAnalyses = counter(
  'plantz_ai_analyses_total',
  'OpenRouter analyses by model and outcome',
  ['model', 'outcome'],
)

export const aiAnalysisDuration = histogram(
  'plantz_ai_analysis_duration_seconds',
  'Duration of an OpenRouter analysis',
  [],
  [0.5, 1, 2.5, 5, 10, 30, 60],
)

export const photoUploads = counter('plantz_photo_uploads_total', 'Photos uploaded')
export const photoUploadBytes = counter('plantz_photo_upload_bytes_total', 'Bytes of uploaded photos')

// --- domain, all fed by the sampler -----------------------------------------------

export const plants = gauge('plantz_plants', 'Plants by status and room', ['status', 'room'])
export const rooms = gauge('plantz_rooms', 'Rooms')
export const notes = gauge('plantz_notes', 'Notes')
export const photos = gauge('plantz_photos', 'Photos')
export const photoBytes = gauge('plantz_photo_bytes', 'Stored photo bytes')
export const propagations = gauge('plantz_propagations', 'Plants that came from another plant')
export const careEventsTotal = gauge('plantz_care_events_total', 'Care events by type', ['type'])
export const plantCareAge = gauge(
  'plantz_plant_care_age_seconds',
  'Seconds since a plant was last cared for, top 20 by overdue days',
  ['plant', 'type'],
)
export const remindersOpen = gauge('plantz_reminders_open', 'Reminders that are not completed')
export const remindersOverdue = gauge('plantz_reminders_overdue', 'Open reminders past their due date')
export const samplerTimestamp = gauge(
  'plantz_sampler_timestamp_seconds',
  'Unix time of the last completed sampler run',
)

/**
 * Times one database query. Used by `queryDatabase` so every query lands in the
 * histogram without each call site remembering to do it.
 */
export async function timeQuery<T>(run: () => Promise<T>): Promise<T> {
  const done = dbQueryDuration.startTimer()
  try {
    return await run()
  }
  finally {
    done()
  }
}
