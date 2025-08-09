import { readFile } from 'fs/promises'
import { defineEventHandler } from 'h3'
import formidable from 'formidable'
import consola from 'consola'
import { uploadFile } from '~~/server/utils/minio'
import { database } from '~~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    consola.info('Creating plant')
    const form = formidable({})
    const [fields, files] = await form.parse(event.node.req)

    if (!fields.name?.[0] || !fields.species?.[0] || !fields.location?.[0] || !fields.room?.[0]) {
      return { error: 'Missing required fields', status: 400 }
    }

    // Start a database transaction
    const client = await database()
    try {
      await client.query('BEGIN')

      // 1. Create the plant
      const createPlantQuery = `
                    INSERT INTO plants (name, species, location, room_id)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id;
                `
      const plantResult = await client.query(createPlantQuery, [
        fields.name[0],
        fields.species[0],
        fields.location[0],
        fields.room[0],
      ])
      const plantId = plantResult.rows[0].id

      // 2. Handle photo upload if present
      if (files.photo?.[0]) {
        const file = files.photo[0]
        const fileBuffer = await readFile(file.filepath)

        // For now, using a placeholder user ID until auth is implemented
        const userId = 'default-user'

        // Upload to Minio with user directory
        const objectKey = await uploadFile(
          fileBuffer,
          file.originalFilename || 'unnamed.jpg',
          file.mimetype || 'image/jpeg',
          userId,
        )

        // Create photo record
        const createPhotoQuery = `
                        INSERT INTO photos (plant_id, image_url)
                        VALUES ($1, $2)
                        RETURNING id;
                    `
        await client.query(createPhotoQuery, [plantId, objectKey])
      }

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
    consola.error('Error creating plant:', error)
    return { error: 'Failed to create plant', status: 500 }
  }
})
