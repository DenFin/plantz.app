/**
 * Open, overdue and done are derived, never stored. These three fragments are the only
 * place the definitions live, so the API and the INS-01 sampler cannot drift apart.
 */
export const REMINDER_FILTERS = {
  open: 'completed_at IS NULL',
  overdue: 'completed_at IS NULL AND remind_at < now()',
  completed: 'completed_at IS NOT NULL',
} as const

export type ReminderFilter = keyof typeof REMINDER_FILTERS

export function isReminderFilter(value: unknown): value is ReminderFilter {
  return typeof value === 'string' && value in REMINDER_FILTERS
}
