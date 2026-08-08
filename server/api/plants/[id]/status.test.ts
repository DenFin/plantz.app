// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const changePlantStatus = vi.fn()
const poolQuery = vi.fn()
const release = vi.fn()
const queryDatabase = vi.fn()
const readBody = vi.fn()
const getRouterParam = vi.fn()

vi.mock('~~/server/utils/plantStatus', async () => {
  const actual = await vi.importActual<typeof import('~~/server/utils/plantStatus')>('~~/server/utils/plantStatus')
  return { ...actual, changePlantStatus: (...args: any[]) => changePlantStatus(...args) }
})
vi.mock('~~/server/utils/db', () => ({
  queryDatabase: (...args: any[]) => queryDatabase(...args),
  database: async () => ({ query: (...args: any[]) => poolQuery(...args), release }),
}))

const PLANT_ID = '11111111-1111-1111-1111-111111111111'

// The PUT and bury handlers rely on nitro auto-imports for defineEventHandler, readBody,
// getRouterParam and database. Providing them as globals is what lets these two files be
// imported outside a nitro server.
beforeEach(() => {
  vi.clearAllMocks()
  const g = globalThis as any
  g.defineEventHandler = (fn: any) => fn
  g.readBody = (...args: any[]) => readBody(...args)
  g.getRouterParam = (...args: any[]) => getRouterParam(...args)
  g.database = async () => ({ query: (...a: any[]) => poolQuery(...a), release })
  poolQuery.mockResolvedValue({ rows: [] })
})

describe('put /api/plants/:id', () => {
  it('uses contiguous parameters, so the old $5 gap is gone', async () => {
    readBody.mockResolvedValue({ id: PLANT_ID, name: 'Fern' })
    const mod = await import('./index.put')

    await (mod.default as any)({})

    const update = poolQuery.mock.calls.find(c => String(c[0]).includes('UPDATE plants'))
    const sql = String(update?.[0])
    for (const p of ['$1', '$2', '$3', '$4', '$5', '$6'])
      expect(sql).toContain(p)
    expect(sql).toContain('WHERE id = $1')
    expect(update?.[1]).toHaveLength(6)
  })

  it('routes a status change through the helper rather than the update statement', async () => {
    readBody.mockResolvedValue({ id: PLANT_ID, name: 'Fern', status: 'sick' })
    changePlantStatus.mockResolvedValue({ from_status: 'healthy', to_status: 'sick' })
    const mod = await import('./index.put')

    await (mod.default as any)({})

    expect(changePlantStatus).toHaveBeenCalledWith(PLANT_ID, 'sick', expect.anything())
    const update = poolQuery.mock.calls.find(c => String(c[0]).includes('UPDATE plants'))
    expect(String(update?.[0])).not.toContain('status')
  })

  it('touches the status helper not at all when the body omits status', async () => {
    readBody.mockResolvedValue({ id: PLANT_ID, name: 'Fern' })
    const mod = await import('./index.put')

    await (mod.default as any)({})

    expect(changePlantStatus).not.toHaveBeenCalled()
  })

  it('rejects a status outside the enum with 400', async () => {
    readBody.mockResolvedValue({ id: PLANT_ID, status: 'thriving' })
    const mod = await import('./index.put')

    await expect((mod.default as any)({})).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('post /api/plants/:id/bury', () => {
  it('records the transition to dead through the same helper', async () => {
    getRouterParam.mockReturnValue(PLANT_ID)
    changePlantStatus.mockResolvedValue({ from_status: 'healthy', to_status: 'dead' })
    const mod = await import('./bury/index.post')

    const result = await (mod.default as any)({})

    expect(changePlantStatus).toHaveBeenCalledWith(PLANT_ID, 'dead')
    expect(result.data.to_status).toBe('dead')
  })
})
