import type { H3Event } from 'h3'
import consola from 'consola'
import { defineEventHandler, getRouterParam } from 'h3'
import { queryDatabase } from '~~/server/utils/db'
import { createMinioClient } from '~~/server/utils/minio'

export default defineEventHandler(async (event: H3Event) => {
  try {
    const id = getRouterParam(event, 'id')
    consola.info('Fetching plant details for ID:', id)

    const query = `
            SELECT
                p.*,
                CASE
                    WHEN COUNT(ph.id) = 0 THEN '[]'::json
                    ELSE json_agg(ph ORDER BY ph.taken_at DESC)
                    END as photos,
                COALESCE(
                        (SELECT json_agg(n ORDER BY n.created_at DESC)
                         FROM notes n
                         WHERE n.plant_id = p.id), '[]'::json
                ) as notes
            FROM plants p
                     LEFT JOIN (
                SELECT * FROM photos ORDER BY taken_at DESC
            ) ph ON p.id = ph.plant_id
            WHERE p.id = $1
            GROUP BY p.id;
        `

    const queryChildren = `SELECT * FROM plants WHERE parent_plant_id = $1`

    const plants = await queryDatabase(query, [id])
    const children = await queryDatabase(queryChildren, [id])
    // TODO: Add logging for retrieving data from DB

    if (!plants || plants.length === 0) {
      consola.info('No plant found with ID:', id)
      return { status: 404, error: 'Plant not found' }
    }

    // Create Minio client to generate URLs
    const minioClient = createMinioClient()
    const bucketName = process.env.MINIO_BUCKET || 'plantz'

    // If there are photos, and they're not null, generate pre-signed URLs
    if (plants[0].photos && plants[0].photos[0] !== null) {
      plants[0].photos = await Promise.all(plants[0].photos.map(async (photo: any) => {
        const url = await minioClient.presignedGetObject(
          bucketName,
          photo.image_url,
          24 * 60 * 60, // URL expires in 24 hours
        )
        return { ...photo, url }
      }))
    }
    else {
      plants[0].photos = []
    }

    consola.info('Returning plant with photos:', plants[0].photos.length)
    return { status: 200, data: plants, children }
  }
  catch (error) {
    consola.error('Error fetching plant:', error)
    return { error: 'Failed to fetch plant', status: 500 }
  }
})
