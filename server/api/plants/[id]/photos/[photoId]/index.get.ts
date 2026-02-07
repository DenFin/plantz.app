import type { H3Event } from 'h3'
import { defineEventHandler } from 'h3'
import { requireUserId } from '~~/server/utils/auth-session'
import { database } from '~~/server/utils/db'
import { createMinioClient } from '~~/server/utils/minio'

export default defineEventHandler(async (event: H3Event) => {
  // Handle DELETE request for photo deletion
  if (event.method !== 'DELETE') {
    return { error: 'Method not allowed', status: 405 }
  }

  try {
    const userId = await requireUserId(event)
    const plantId = event.context.params?.id
    const photoId = event.context.params?.photoId

    if (!plantId || !photoId) {
      return { error: 'Plant ID and Photo ID are required', status: 400 }
    }

    // Start a database transaction
    const client = await database()
    try {
      await client.query('BEGIN')

      // Get the photo and ensure plant belongs to user
      const getPhotoQuery = `
                SELECT ph.image_url FROM photos ph
                JOIN plants p ON ph.plant_id = p.id
                WHERE ph.id = $1 AND ph.plant_id = $2 AND p.user_id = $3;
            `
      const photoResult = await client.query(getPhotoQuery, [photoId, plantId, userId])

      if (photoResult.rows.length === 0) {
        return { error: 'Photo not found', status: 404 }
      }

      const objectKey = photoResult.rows[0].image_url

      // Delete from Minio
      const minioClient = createMinioClient()
      const bucketName = process.env.MINIO_BUCKET || 'plantz'

      try {
        await minioClient.removeObject(bucketName, objectKey)
      }
      catch (error) {
        console.error('Error deleting from Minio:', error)
        // Continue with database deletion even if Minio deletion fails
      }

      // Delete from database
      const deletePhotoQuery = `
                DELETE FROM photos 
                WHERE id = $1 AND plant_id = $2;
            `
      await client.query(deletePhotoQuery, [photoId, plantId])

      await client.query('COMMIT')
      return { status: 200, message: 'Photo deleted successfully' }
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
    console.error('Error deleting photo:', error)
    return { error: 'Failed to delete photo', status: 500 }
  }
})
