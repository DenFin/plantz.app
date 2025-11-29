import { readFile } from 'fs/promises'
import type { H3Event } from 'h3'
import { defineEventHandler, getRouterParam } from 'h3'
import formidable from 'formidable'
import consola from 'consola'
import { uploadFile } from '~~/server/utils/minio'
import { database } from '~~/server/utils/db'

export default defineEventHandler(async (event: H3Event) => {
  try {
    const id = getRouterParam(event, 'id')
    consola.info('Processing photo upload for plant:', id)

    const form = formidable({})
    const [fields, files] = await form.parse(event.node.req)

    consola.info('Received files:', files)

    if (!files.photo?.[0]) {
      consola.error('No photo file found in request')
      return { error: 'No photo provided', status: 400 }
    }

    // Start a database transaction
    const client = await database()
    try {
      await client.query('BEGIN')
      consola.info('Started database transaction')

      const file = files.photo[0]
      const fileBuffer = await readFile(file.filepath)
      consola.info('Read file buffer, size:', fileBuffer.length)

      // For now, using a placeholder user ID until auth is implemented
      const userId = 'default-user'

      // Upload to Minio with user directory
      const objectKey = await uploadFile(
        fileBuffer,
        file.originalFilename || 'unnamed.jpg',
        file.mimetype || 'image/jpeg',
        userId,
      )
      consola.info('Uploaded to MinIO, objectKey:', objectKey)

      // Create photo record
      const createPhotoQuery = `
                INSERT INTO photos (plant_id, image_url)
                WHERE  plant_id = ?
                VALUES ($1, $2)
                  RETURNING id;
      `
      const result = await client.query(createPhotoQuery, [id, objectKey])
      consola.info('Created photo record:', result.rows[0])

      await client.query('COMMIT')
      return { status: 201, data: { id: result.rows[0].id } }
    }
    catch (error) {
      consola.error('Transaction error:', error)
      await client.query('ROLLBACK')
      throw error
    }
    finally {
      await client.end()
    }
  }
  catch (error) {
    consola.error('Error uploading photo:', error)
    return { error: 'Failed to upload photo', status: 500 }
  }
})
