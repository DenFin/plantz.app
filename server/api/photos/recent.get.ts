import { defineEventHandler } from 'h3'
import { requireUserId } from '~~/server/utils/auth-session'
import { queryDatabase } from '~~/server/utils/db'
import { createMinioClient } from '~~/server/utils/minio'

export default defineEventHandler(async (event) => {
  try {
    const userId = await requireUserId(event)
    const query = `
            SELECT ph.* FROM photos ph
            JOIN plants p ON ph.plant_id = p.id
            WHERE p.user_id = $1 AND ph.taken_at >= (CURRENT_TIMESTAMP - INTERVAL '31 days')
            ORDER BY ph.taken_at DESC`

    const plants = await queryDatabase(query, [userId])
    const minioClient = createMinioClient()
    const bucketName = process.env.MINIO_BUCKET || 'plantz'
    for (const plant of plants) {
      if (plant.image_url) {
        plant.image_url = await minioClient.presignedGetObject(
          bucketName,
          plant.image_url,
          24 * 60 * 60, // URL expires in 24 hours
        )
      }
    }

    return {
      status: 200,
      data: plants,
    }
  }
  catch (error) {
    console.error(error)
    return { status: 400 }
  }
})
