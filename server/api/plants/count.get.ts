import { requireUserId } from '~~/server/utils/auth-session'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const query = `SELECT COUNT(*) from plants WHERE user_id = $1`
  const count = await queryDatabase(query, [userId])
  return {
    status: 200,
    data: count,
  }
})
