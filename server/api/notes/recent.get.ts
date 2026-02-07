import { defineEventHandler } from 'h3'
import { requireUserId } from '~~/server/utils/auth-session'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const userId = await requireUserId(event)
    const query = `
            SELECT n.* FROM notes n
            JOIN plants p ON n.plant_id = p.id
            WHERE p.user_id = $1 AND n.created_at >= (CURRENT_TIMESTAMP - INTERVAL '31 days')
            ORDER BY n.created_at DESC`

    const plants = await queryDatabase(query, [userId])

    return {
      status: 200,
      data: plants,
    }
  }
  catch (error) {
    console.error(error)
    return { status: 400 }
  }
})
