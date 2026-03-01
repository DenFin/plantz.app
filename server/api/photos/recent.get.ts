import { defineEventHandler } from 'h3'
import { queryDatabase } from '~~/server/utils/db'
import { createMinioClient } from '~~/server/utils/minio'
import sharp from 'sharp'
import { Readable } from 'stream'

export default defineEventHandler(async () => {
  try {
    const query = `
            SELECT * FROM photos 
            WHERE taken_at >= (CURRENT_TIMESTAMP - INTERVAL '31 days')
            ORDER BY taken_at DESC`

    const plants = await queryDatabase(query)
    const minioClient = createMinioClient()
    const bucketName = process.env.MINIO_BUCKET || 'plantz'
    for (const plant of plants) {
      if (plant.image_url) {
        const objectStream = await minioClient.getObject(bucketName, plant.image_url)
        
        // Convert stream to buffer
        const chunks = []
        for await (const chunk of objectStream) {
          chunks.push(chunk)
        }
        const buffer = Buffer.concat(chunks)

        // Read and correct image orientation
        const correctedImage = await sharp(buffer)
          .rotate() // This will auto-rotate based on EXIF metadata
          .resize(500, 500, { fit: 'cover' }) // Standard size for dashboard
          .jpeg({ quality: 75 }) // Consistent quality
          .toBuffer()

        // Generate pre-signed URL with corrected image
        const correctedObjectKey = `corrected_${plant.image_url}`
        await minioClient.putObject(bucketName, correctedObjectKey, correctedImage)

        plant.image_url = await minioClient.presignedGetObject(
          bucketName,
          correctedObjectKey,
          24 * 60 * 60 // URL expires in 24 hours
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
