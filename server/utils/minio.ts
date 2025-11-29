import { randomUUID } from 'crypto'
import * as Minio from 'minio'

export function createMinioClient() {
  return new Minio.Client({
    endPoint: process.env.MINIO_HOST || '192.168.2.217',
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'root',
    secretKey: process.env.MINIO_SECRET_KEY || 'changeme',
  })
}

export async function checkMinioConnection() {
  const minioClient = createMinioClient()
  const bucketName = process.env.MINIO_BUCKET || 'plantz'

  try {
    // List buckets to check connection
    await minioClient.listBuckets()

    // Check if our bucket exists, create if it doesn't
    const bucketExists = await minioClient.bucketExists(bucketName)
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, 'us-east-1')
    }

    return true
  }
  catch (error) {
    console.error('Minio connection error:', error)
    return false
  }
}

export async function uploadFile(fileBuffer: Buffer, originalFilename: string, contentType: string, userId: string): Promise<string> {
  const minioClient = createMinioClient()
  const bucketName = process.env.MINIO_BUCKET || 'plantz'

  // Create a unique filename using UUID and original filename
  const extension = originalFilename.split('.').pop()
  const uniqueFilename = `${userId}/${randomUUID()}-${originalFilename}`

  try {
    await minioClient.putObject(
      bucketName,
      uniqueFilename,
      fileBuffer,
      undefined,
      {
        'Content-Type': contentType,
      },
    )

    return uniqueFilename
  }
  catch (error) {
    console.error('Error uploading file to Minio:', error)
    throw error
  }
}
