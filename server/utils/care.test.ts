// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CARE_TYPES, isCareType } from './care'

describe('care type validation', () => {
  it('accepts every type the migration defines', () => {
    for (const type of CARE_TYPES)
      expect(isCareType(type)).toBe(true)
  })

  it('rejects an unknown type, so the endpoint answers 400 instead of 500', () => {
    expect(isCareType('nonsense')).toBe(false)
    expect(isCareType('')).toBe(false)
    expect(isCareType(undefined)).toBe(false)
    expect(isCareType(42)).toBe(false)
  })

  it('lists the five types from the care_type enum', () => {
    expect([...CARE_TYPES]).toEqual([
      'watering',
      'fertilizing',
      'repotting',
      'pruning',
      'treatment',
    ])
  })
})
