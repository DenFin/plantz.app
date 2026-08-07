import type { H3Event } from 'h3'
import { createError, defineEventHandler, getQuery } from 'h3'
import { queryDatabase } from '~~/server/utils/db'
import { isReminderFilter, REMINDER_FILTERS } from '~~/server/utils/reminders'

export default defineEventHandler(async (event: H3Event) => {
  const { filter } = getQuery(event)

  if (filter !== undefined && !isReminderFilter(filter)) {
    throw createError({
      statusCode: 400,
      statusMessage: `filter must be one of: ${Object.keys(REMINDER_FILTERS).join(', ')}`,
    })
  }

  const where = filter ? `WHERE ${REMINDER_FILTERS[filter]}` : ''

  const rows = await queryDatabase(
    `SELECT r.*, p.name AS plant_name
     FROM reminders r
     JOIN plants p ON p.id = r.plant_id
     ${where}
     ORDER BY r.remind_at ASC;`,
  )

  return { status: 200, data: rows }
})
