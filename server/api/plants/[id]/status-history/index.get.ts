import type { H3Event } from 'h3'
import { createError, defineEventHandler, getRouterParam } from 'h3'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async (event: H3Event) => {
  const plantId = getRouterParam(event, 'id')

  const plants = await queryDatabase('SELECT id FROM plants WHERE id = $1;', [plantId])
  if (plants.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Plant not found' })
  }

  const rows = await queryDatabase(
    `SELECT * FROM plant_status_events
     WHERE plant_id = $1
     ORDER BY changed_at DESC;`,
    [plantId],
  )

  return { status: 200, data: rows }
})
