export const CARE_TYPES = ['watering', 'fertilizing', 'repotting', 'pruning', 'treatment'] as const

export type CareType = typeof CARE_TYPES[number]

export function isCareType(value: unknown): value is CareType {
  return typeof value === 'string' && (CARE_TYPES as readonly string[]).includes(value)
}
