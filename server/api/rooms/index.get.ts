import { defineEventHandler } from 'h3'
import { requireUserId } from '~~/server/utils/auth-session'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const query = 'SELECT * FROM rooms WHERE user_id = $1'
  const plants = await queryDatabase(query, [userId])

  return {
    status: 200,
    data: plants,
  }
})
