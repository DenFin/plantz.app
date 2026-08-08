// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { REMINDER_FILTERS } from '~~/server/utils/reminders'

const queryDatabase = vi.fn()
const poolQuery = vi.fn()
const release = vi.fn()
const getRouterParam = vi.fn()
const getQuery = vi.fn()
const readBody = vi.fn()

vi.mock('~~/server/utils/db', () => ({
  queryDatabase: (...args: any[]) => queryDatabase(...args),
  database: async () => ({ query: (...args: any[]) => poolQuery(...args), release }),
}))
vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    getRouterParam: (...args: any[]) => getRouterParam(...args),
    getQuery: (...args: any[]) => getQuery(...args),
    readBody: (...args: any[]) => readBody(...args),
  }
})

const PLANT_ID = '11111111-1111-1111-1111-111111111111'
const REMINDER_ID = '22222222-2222-2222-2222-222222222222'

async function call(path: string, event: any = {}) {
  const mod = await import(path)
  return (mod.default as any)(event)
}

describe('reminder filters', () => {
  it('derives open, overdue and done rather than storing them', () => {
    expect(REMINDER_FILTERS.open).toBe('completed_at IS NULL')
    expect(REMINDER_FILTERS.overdue).toBe('completed_at IS NULL AND remind_at < now()')
    expect(REMINDER_FILTERS.completed).toBe('completed_at IS NOT NULL')
  })
})

describe('post /api/reminders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a reminder for an existing plant', async () => {
    readBody.mockResolvedValue({ plant_id: PLANT_ID, remind_at: '2026-08-01T09:00:00', message: 'repot' })
    const created = { id: REMINDER_ID, plant_id: PLANT_ID }
    queryDatabase.mockResolvedValueOnce([{ id: PLANT_ID }]).mockResolvedValueOnce([created])

    expect(await call('./index.post')).toEqual({ status: 201, data: created })
  })

  it('requires a plant, so a reminder is never a standalone todo', async () => {
    readBody.mockResolvedValue({ remind_at: '2026-08-01T09:00:00' })
    await expect(call('./index.post')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects a recurrence that is not a positive whole number of days', async () => {
    readBody.mockResolvedValue({ plant_id: PLANT_ID, remind_at: '2026-08-01T09:00:00', recurrence_days: 0 })
    await expect(call('./index.post')).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('get /api/reminders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('applies the overdue filter to the query', async () => {
    getQuery.mockReturnValue({ filter: 'overdue' })
    queryDatabase.mockResolvedValueOnce([])

    await call('./index.get')

    expect(queryDatabase.mock.calls[0][0]).toContain(REMINDER_FILTERS.overdue)
  })

  it('returns every reminder when no filter is given', async () => {
    getQuery.mockReturnValue({})
    queryDatabase.mockResolvedValueOnce([])

    await call('./index.get')

    expect(queryDatabase.mock.calls[0][0]).not.toContain('WHERE')
  })

  it('rejects an unknown filter', async () => {
    getQuery.mockReturnValue({ filter: 'nonsense' })
    await expect(call('./index.get')).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('post /api/reminders/:id/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRouterParam.mockReturnValue(REMINDER_ID)
  })

  it('creates one successor dated from the completion when the reminder recurs', async () => {
    const open = { id: REMINDER_ID, plant_id: PLANT_ID, message: 'water', recurrence_days: 7, completed_at: null }
    poolQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [open] }) // SELECT ... FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ ...open, completed_at: 'now' }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 'next', recurrence_days: 7 }] }) // INSERT successor
      .mockResolvedValueOnce({ rows: [] }) // COMMIT

    const result = await call('./[id]/complete.post')

    expect(result.data.successor).toEqual({ id: 'next', recurrence_days: 7 })
    // Dated from now(), not from the original due date: a due-date rule piles up
    // missed occurrences after an unused stretch.
    const insert = poolQuery.mock.calls[3][0]
    expect(insert).toContain('now() + make_interval')
    expect(release).toHaveBeenCalled()
  })

  it('creates no successor when the reminder does not recur', async () => {
    const open = { id: REMINDER_ID, plant_id: PLANT_ID, message: 'repot', recurrence_days: null, completed_at: null }
    poolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [open] })
      .mockResolvedValueOnce({ rows: [{ ...open, completed_at: 'now' }] })
      .mockResolvedValueOnce({ rows: [] }) // COMMIT

    const result = await call('./[id]/complete.post')

    expect(result.data.successor).toBeNull()
    expect(poolQuery.mock.calls.some(c => String(c[0]).includes('INSERT INTO reminders'))).toBe(false)
  })

  it('refuses to complete the same reminder twice', async () => {
    poolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: REMINDER_ID, completed_at: 'yesterday' }] })
      .mockResolvedValueOnce({ rows: [] }) // ROLLBACK

    await expect(call('./[id]/complete.post')).rejects.toMatchObject({ statusCode: 409 })
    expect(release).toHaveBeenCalled()
  })

  it('returns 404 for an unknown reminder', async () => {
    poolQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    await expect(call('./[id]/complete.post')).rejects.toMatchObject({ statusCode: 404 })
  })
})
