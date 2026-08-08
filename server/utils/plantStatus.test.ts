// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryDatabase = vi.fn()
vi.mock('~~/server/utils/db', () => ({
  queryDatabase: (...args: any[]) => queryDatabase(...args),
}))

const { changePlantStatus, isPlantStatus, PLANT_STATUSES } = await import('./plantStatus')

const PLANT_ID = '11111111-1111-1111-1111-111111111111'

describe('plant status validation', () => {
  it('knows the four values the enum defines', () => {
    expect([...PLANT_STATUSES]).toEqual(['healthy', 'sick', 'dead', 'needs_repotting'])
    for (const status of PLANT_STATUSES)
      expect(isPlantStatus(status)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isPlantStatus('thriving')).toBe(false)
    expect(isPlantStatus(null)).toBe(false)
  })
})

describe('changePlantStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('records one event carrying the status it came from', async () => {
    const recorded = { id: 'e1', plant_id: PLANT_ID, from_status: 'healthy', to_status: 'sick' }
    queryDatabase.mockResolvedValueOnce([recorded])

    expect(await changePlantStatus(PLANT_ID, 'sick')).toEqual(recorded)
  })

  it('writes nothing when the status is already the requested value', async () => {
    // The statement updates only `WHERE status IS DISTINCT FROM`, so a no-op update
    // returns no row and the insert sees nothing to write.
    queryDatabase.mockResolvedValueOnce([])

    expect(await changePlantStatus(PLANT_ID, 'sick')).toBeNull()
  })

  it('does the read and the write in one statement, so no transition can be lost', async () => {
    queryDatabase.mockResolvedValueOnce([])
    await changePlantStatus(PLANT_ID, 'dead')

    expect(queryDatabase).toHaveBeenCalledTimes(1)
    const sql = queryDatabase.mock.calls[0][0]
    expect(sql).toContain('IS DISTINCT FROM')
    expect(sql).toContain('INSERT INTO plant_status_events')
  })

  it('joins a caller transaction when given a client', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: 'e2' }] })
    const result = await changePlantStatus(PLANT_ID, 'sick', { client: { query } as any })

    expect(result).toEqual({ id: 'e2' })
    expect(queryDatabase).not.toHaveBeenCalled()
  })
})
