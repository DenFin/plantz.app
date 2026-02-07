import consola from 'consola'
import { requireUserId } from '~~/server/utils/auth-session'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const userId = await requireUserId(event)
    consola.info('Burying plant')
    const id = getRouterParam(event, 'id')
    const query = `
        UPDATE plants
        SET status = $3
        WHERE id = $1 AND user_id = $2
        `
    const values = [id, userId, 'dead']
    const plants = await queryDatabase(query, values)

    return { status: 200, data: plants }
  }
  catch (error) {
    consola.error('Error burying plant:', error)
    return { error: 'Failed to bury plants' }
  }
})
