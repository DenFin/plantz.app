import type { H3Event } from 'h3'
import { createError, defineEventHandler, getRouterParam } from 'h3'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async (event: H3Event) => {
  const id = getRouterParam(event, 'id')

  const rows = await queryDatabase('DELETE FROM reminders WHERE id = $1 RETURNING id;', [id])
  if (rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Reminder not found' })
  }

  return { status: 200, data: { id: rows[0].id } }
})
