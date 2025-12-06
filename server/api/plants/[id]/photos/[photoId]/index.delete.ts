import type { H3Event } from 'h3'
import { defineEventHandler, getRouterParam } from 'h3'
import consola from 'consola'
import { database } from '~~/server/utils/db'
import { createMinioClient } from '~~/server/utils/minio'

export default defineEventHandler(async (event: H3Event) => {
  try {
    const plantId = getRouterParam(event, 'plantId')
    const photoId = getRouterParam(event, 'photoId')

    console.log('plantId', plantId)
    console.log('photoId', photoId)

    // Start a database transaction
    const client = await database()
    try {
      await client.query('BEGIN')

      // Get the photo details first
      const getPhotoQuery = `
                    SELECT image_url FROM photos 
                    WHERE id = $1 AND plant_id = $2;
                `
      const photoResult = await client.query(getPhotoQuery, [photoId, plantId])

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
        consola.error('Error deleting from Minio:', error)
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
    consola.error('Error deleting photo:', error)
    return { error: 'Failed to delete photo', status: 500 }
  }
})
