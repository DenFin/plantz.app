import { defineEventHandler } from 'h3'
import consola from 'consola'
import { createMinioClient } from '~/server/utils/minio'
import { queryDatabase } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  try {
    const query = `
            SELECT p.*,
                   (SELECT json_build_object(
                                   'id', ph.id,
                                   'image_url', ph.image_url
                           )
                    FROM photos ph
                    WHERE ph.plant_id = p.id
                    ORDER BY ph.taken_at DESC
                    LIMIT 1) as thumbnail
            FROM plants p;
        `

    const plants = await queryDatabase(query)

    // Create Minio client to generate URLs for thumbnails
    const minioClient = createMinioClient()
    const bucketName = process.env.MINIO_BUCKET || 'plantz'

    // Generate presigned URLs for thumbnails
    for (const plant of plants) {
      if (plant.thumbnail) {
        plant.thumbnail.url = await minioClient.presignedGetObject(
          bucketName,
          plant.thumbnail.image_url,
          24 * 60 * 60, // URL expires in 24 hours
        )
      }
    }

    return { status: 200, data: plants }
  }
  catch (error) {
    consola.error('Error handling plants:', error)
    return { error: 'Failed to fetch plants' }
  }
})
