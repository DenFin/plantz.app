import type { H3Event } from 'h3'
import consola from 'consola'
import { defineEventHandler, getRouterParam } from 'h3'
import { requireUserId } from '~~/server/utils/auth-session'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async (event: H3Event) => {
  try {
    const userId = await requireUserId(event)
    const id = getRouterParam(event, 'id')
    const query = `DELETE FROM plants WHERE id = $1 AND user_id = $2`
    const plants = await queryDatabase(query, [id, userId])

    return { status: 200, data: plants }
  }
  catch (error) {
    consola.error('Error handling plants:', error)
    return { error: 'Failed to fetch plants' }
  }
})
