import type { H3Event } from 'h3'
import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { queryDatabase } from '~~/server/utils/db'
import { isReminderFilter, REMINDER_FILTERS } from '~~/server/utils/reminders'

export default defineEventHandler(async (event: H3Event) => {
  const plantId = getRouterParam(event, 'id')
  const { filter } = getQuery(event)

  if (filter !== undefined && !isReminderFilter(filter)) {
    throw createError({
      statusCode: 400,
      statusMessage: `filter must be one of: ${Object.keys(REMINDER_FILTERS).join(', ')}`,
    })
  }

  const plants = await queryDatabase('SELECT id FROM plants WHERE id = $1;', [plantId])
  if (plants.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Plant not found' })
  }

  const rows = await queryDatabase(
    `SELECT * FROM reminders
     WHERE plant_id = $1
     ${filter ? `AND ${REMINDER_FILTERS[filter]}` : ''}
     ORDER BY remind_at ASC;`,
    [plantId],
  )

  return { status: 200, data: rows }
})
