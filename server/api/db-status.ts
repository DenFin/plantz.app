import { defineEventHandler } from 'h3'
import { database } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    // Establish connection using the `database()` function
    const client = await database()

    // Try a simple query to check the DB connection
    const result = await client.query('SELECT NOW();')

    // Close the client connection after the query
    await client.end()

    // Return a success response with the result
    return {
      status: 'connected',
      message: 'Database is connected successfully.',
      result: result.rows, // Returning the result of the query (current timestamp)
    }
  }
  catch (error) {
    console.error('Database connection error:', error)

    // Return an error response if something goes wrong
    return {
      status: 'error',
      message: 'Failed to connect to the database.',
    }
  }
})
