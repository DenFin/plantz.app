import formidable from 'formidable'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    console.log('Creating room')
    const form = formidable({})
    const [fields] = await form.parse(event.node.req)
    console.log(fields)
    console.log('Creating room 2')
    if (!fields.name?.[0] || !fields.color?.[0] || !fields.icon?.[0] || !fields.orientation?.[0]) {
      return { error: 'Missing required fields', status: 400 }
    }
    console.log('Creating room 3')
    // Start a database transaction
    const client = await database()
    try {
      await client.query('BEGIN')

      // 1. Create the plant
      const createPlantQuery = `
                    INSERT INTO rooms (name, color, icon, orientation)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id;
                `
      const plantResult = await client.query(createPlantQuery, [
        fields.name[0],
        fields.color[0],
        fields.icon[0],
        fields.orientation[0],
      ])
      const plantId = plantResult.rows[0].id
      console.log('plantId', plantId)
      await client.query('COMMIT')
      return { status: 201, data: { id: plantId } }
    }
    catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
    finally {
      await client.end()
    }
  }
  catch (error) {
    console.error('Error creating plant:', error)
    return { error: 'Failed to create plant', status: 500 }
  }
})
