// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryDatabase = vi.fn()
vi.mock('~~/server/utils/db', () => ({
  queryDatabase: (...args: any[]) => queryDatabase(...args),
}))

const { overduePlants, plantsWithInterval, wateringDueForPlant } = await import('./wateringDue')

function sqlOf(callIndex = 0) {
  return String(queryDatabase.mock.calls[callIndex][0])
}

describe('watering due definition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryDatabase.mockResolvedValue([])
  })

  it('excludes plants without an interval, so they are never due', async () => {
    await overduePlants()
    expect(sqlOf()).toContain('p.watering_interval_days IS NOT NULL')
  })

  it('falls back to created_at when a plant has never been watered', async () => {
    // Without this a plant added today would be overdue the moment an interval is set.
    await overduePlants()
    expect(sqlOf()).toContain('COALESCE(w.last_watering, p.created_at)')
  })

  it('takes the newest watering event, ignoring other care types', async () => {
    await overduePlants()
    const sql = sqlOf()
    expect(sql).toContain('MAX(occurred_at) AS last_watering')
    expect(sql).toContain(`WHERE type = 'watering'`)
  })

  it('orders the overdue list by how overdue each plant is', async () => {
    await overduePlants()
    expect(sqlOf()).toContain('ORDER BY days_overdue DESC')
  })

  it('accepts a limit, which is how the INS-01 sampler caps its series', async () => {
    await plantsWithInterval(20)
    expect(sqlOf()).toContain('LIMIT $1')
    expect(queryDatabase.mock.calls[0][1]).toEqual([20])
  })

  it('leaves the limit out when none is asked for', async () => {
    await overduePlants()
    expect(sqlOf()).not.toContain('LIMIT')
    expect(queryDatabase.mock.calls[0][1]).toEqual([])
  })

  it('reports care age in seconds, which is what the sampler exports', async () => {
    await plantsWithInterval()
    expect(sqlOf()).toContain('AS care_age_seconds')
  })

  it('returns null for a plant that has no interval', async () => {
    queryDatabase.mockResolvedValueOnce([])
    expect(await wateringDueForPlant('some-id')).toBeNull()
  })

  it('builds the overdue list from the same select as the full list', async () => {
    await overduePlants()
    const overdueSql = sqlOf()
    vi.clearAllMocks()
    queryDatabase.mockResolvedValue([])
    await plantsWithInterval()
    const allSql = sqlOf()

    // One definition, two entry points: the overdue variant is the full select plus a
    // filter, not a second query that could drift.
    const shared = 'FROM plants p'
    expect(overdueSql).toContain(shared)
    expect(allSql).toContain(shared)
    expect(overdueSql).toContain('now() >')
    expect(allSql).not.toContain('now() >')
  })
})
