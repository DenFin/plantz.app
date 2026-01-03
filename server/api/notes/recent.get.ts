import { defineEventHandler } from 'h3'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  try {
    const query = `
            SELECT * FROM notes 
            WHERE created_at >= (CURRENT_TIMESTAMP - INTERVAL \'31 days\')
            ORDER BY created_at DESC`

    const plants = await queryDatabase(query)

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
