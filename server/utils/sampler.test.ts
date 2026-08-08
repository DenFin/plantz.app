// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryDatabase = vi.fn()
const plantsWithInterval = vi.fn()
const checkMinioConnection = vi.fn()

vi.mock('~~/server/utils/db', () => ({
  queryDatabase: (...args: any[]) => queryDatabase(...args),
}))
vi.mock('~~/server/utils/minio', () => ({
  checkMinioConnection: () => checkMinioConnection(),
}))
vi.mock('~~/server/utils/wateringDue', () => ({
  plantsWithInterval: (...args: any[]) => plantsWithInterval(...args),
}))

const { sampleOnce, tick, SAMPLE_INTERVAL_MS } = await import('./sampler')
const metrics = await import('./metrics')

function happyPath() {
  queryDatabase.mockImplementation((sql: string) => {
    if (sql.includes('GROUP BY p.status'))
      return Promise.resolve([{ status: 'healthy', room: 'Bath', count: 2 }])
    if (sql.includes('FROM care_events GROUP BY type'))
      return Promise.resolve([{ type: 'watering', count: 5 }])
    if (sql.includes('FROM reminders'))
      return Promise.resolve([{ open: 3, overdue: 1 }])
    if (sql.includes('FROM photos'))
      return Promise.resolve([{ count: 4, bytes: '123' }])
    return Promise.resolve([{ count: 1 }])
  })
  plantsWithInterval.mockResolvedValue([
    { name: 'Fern', care_age_seconds: '864000' },
  ])
  checkMinioConnection.mockResolvedValue(true)
}

describe('sampler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    happyPath()
  })

  it('runs on the interval the requirements ask for', () => {
    expect(SAMPLE_INTERVAL_MS).toBe(60_000)
  })

  it('caps the per-plant series at 20, so prometheus cannot grow one per plant', async () => {
    await sampleOnce()
    expect(plantsWithInterval).toHaveBeenCalledWith(20)
  })

  it('counts care events in SQL, so a restart does not reset them', async () => {
    await sampleOnce()
    const sql = queryDatabase.mock.calls.map(c => String(c[0])).join('\n')
    expect(sql).toContain('COUNT(*)::int AS count FROM care_events')
  })

  it('reuses the reminder filters instead of restating open and overdue', async () => {
    const { REMINDER_FILTERS } = await import('./reminders')
    await sampleOnce()
    const sql = queryDatabase.mock.calls.map(c => String(c[0])).join('\n')
    expect(sql).toContain(REMINDER_FILTERS.open)
    expect(sql).toContain(REMINDER_FILTERS.overdue)
  })

  it('probes both dependencies on every run, not only when someone opens a status page', async () => {
    await sampleOnce()
    expect(checkMinioConnection).toHaveBeenCalled()
    expect(await metrics.registry.getSingleMetric('plantz_minio_up')!.get()).toMatchObject({
      values: [{ value: 1 }],
    })
  })

  it('reports minio down without touching the db gauge', async () => {
    checkMinioConnection.mockResolvedValue(false)
    await sampleOnce()

    const minio = await metrics.registry.getSingleMetric('plantz_minio_up')!.get()
    const db = await metrics.registry.getSingleMetric('plantz_db_up')!.get()
    expect(minio.values[0].value).toBe(0)
    expect(db.values[0].value).toBe(1)
  })

  it('stamps the time of the last completed run', async () => {
    await sampleOnce()
    const stamp = await metrics.registry.getSingleMetric('plantz_sampler_timestamp_seconds')!.get()
    expect(stamp.values[0].value).toBeGreaterThan(0)
  })

  it('logs and returns when a sample fails, rather than taking the process down', async () => {
    queryDatabase.mockRejectedValue(new Error('postgres is gone'))

    // No rejection: an unhandled one here would kill the process on the next tick.
    await expect(tick()).resolves.toBeUndefined()
  })
})
