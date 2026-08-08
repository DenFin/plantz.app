import { defineEventHandler } from 'h3'
import { database } from '~~/server/utils/db'
import { dbUp } from '~~/server/utils/metrics'

export default defineEventHandler(async () => {
  try {
    // Check a client out of the pool using the `database()` function
    const client = await database()

    try {
      // Try a simple query to check the DB connection
      const result = await client.query('SELECT NOW();')

      dbUp.set(1)

      // Return a success response with the result
      return {
        status: 'connected',
        message: 'Database is connected successfully.',
        result: result.rows, // Returning the result of the query (current timestamp)
      }
    }
    finally {
      // Return the connection to the pool, never close it
      client.release()
    }
  }
  catch (error) {
    dbUp.set(0)
    console.error('Database connection error:', error)

    // Return an error response if something goes wrong
    return {
      status: 'error',
      message: 'Failed to connect to the database.',
    }
  }
})
