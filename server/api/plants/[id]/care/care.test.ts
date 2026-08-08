// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The handlers are pure request logic on top of two things: the router param and one
// query function. Both are mocked, so these cases run without a database and still
// exercise the exact branches the DoD names: created, unknown type, unknown plant.
const queryDatabase = vi.fn()
const getRouterParam = vi.fn()
const readBody = vi.fn()

vi.mock('~~/server/utils/db', () => ({ queryDatabase: (...args: any[]) => queryDatabase(...args) }))
vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    getRouterParam: (...args: any[]) => getRouterParam(...args),
    readBody: (...args: any[]) => readBody(...args),
  }
})

const PLANT_ID = '11111111-1111-1111-1111-111111111111'

async function callPost(event: any = {}) {
  const mod = await import('./index.post')
  return (mod.default as any)(event)
}

async function callGet(event: any = {}) {
  const mod = await import('./index.get')
  return (mod.default as any)(event)
}

describe('post /api/plants/:id/care', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRouterParam.mockReturnValue(PLANT_ID)
  })

  it('creates an event and returns the created row', async () => {
    readBody.mockResolvedValue({ type: 'watering' })
    const created = { id: 'abc', plant_id: PLANT_ID, type: 'watering' }
    queryDatabase
      .mockResolvedValueOnce([{ id: PLANT_ID }]) // plant exists
      .mockResolvedValueOnce([created]) // insert returning

    const result = await callPost()

    expect(result).toEqual({ status: 201, data: created })
  })

  it('rejects an unknown type with 400, not 500', async () => {
    readBody.mockResolvedValue({ type: 'nonsense' })

    await expect(callPost()).rejects.toMatchObject({ statusCode: 400 })
    // The plant lookup must not even run: the body is invalid before any query.
    expect(queryDatabase).not.toHaveBeenCalled()
  })

  it('rejects an unknown plant with 404', async () => {
    readBody.mockResolvedValue({ type: 'watering' })
    queryDatabase.mockResolvedValueOnce([]) // no such plant

    await expect(callPost()).rejects.toMatchObject({ statusCode: 404 })
    expect(queryDatabase).toHaveBeenCalledTimes(1)
  })
})

describe('get /api/plants/:id/care', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRouterParam.mockReturnValue(PLANT_ID)
  })

  it('returns the plant events newest first', async () => {
    const events = [{ id: 'b', occurred_at: '2026-08-02' }, { id: 'a', occurred_at: '2026-08-01' }]
    queryDatabase
      .mockResolvedValueOnce([{ id: PLANT_ID }])
      .mockResolvedValueOnce(events)

    const result = await callGet()

    expect(result).toEqual({ status: 200, data: events })
    expect(queryDatabase.mock.calls[1][0]).toContain('ORDER BY occurred_at DESC')
  })

  it('rejects an unknown plant with 404', async () => {
    queryDatabase.mockResolvedValueOnce([])
    await expect(callGet()).rejects.toMatchObject({ statusCode: 404 })
  })
})
