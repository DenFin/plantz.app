import { defineEventHandler } from 'h3'
import { requireUserId } from '~~/server/utils/auth-session'
import { queryDatabase } from '../utils/db'

/** Gibt nur den aktuell eingeloggten User zurück (Better-Auth-Tabelle "user"). */
export default defineEventHandler(async (event) => {
  try {
    const userId = await requireUserId(event)
    const rows = await queryDatabase(
      'SELECT id, name, email, image, "emailVerified" FROM "user" WHERE id = $1',
      [userId],
    )
    if (!rows?.length) {
      return { error: 'User not found' }
    }
    return { user: rows[0] }
  }
  catch (error) {
    console.error('Error fetching user:', error)
    return { error: 'Failed to fetch user' }
  }
})
