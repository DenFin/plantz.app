import type { Plants } from '~~/db-types'
import consola from 'consola'
import { defineEventHandler } from 'h3'
import { queryDatabase } from '~~/server/utils/db'

import { createMinioClient } from '~~/server/utils/minio'

type ApiResponse<T> = {
  status: number
  data: T
}

export default defineEventHandler(async () => {
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
            FROM plants p
            WHERE p.status != 'dead';
        `

    const plants = await queryDatabase(query)

    // Create Minio client to generate URLs for thumbnails
    const minioClient = createMinioClient()
    const config = useRuntimeConfig()
    const bucketName = config.minioBucket

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

    const apiResponse: ApiResponse<Plants[]> = { status: 200, data: plants }

    return apiResponse
  }
  catch (error) {
    consola.error('Error handling plants:', error)
    return { error: 'Failed to fetch plants' }
  }
})
