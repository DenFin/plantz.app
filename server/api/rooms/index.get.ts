import { defineEventHandler } from 'h3'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  const query = 'SELECT * FROM rooms'
  const plants = await queryDatabase(query)

  return {
    status: 200,
    data: plants,
  }
})
