import * as Minio from 'minio'
import pg from 'pg'
import sharp from 'sharp'
import 'dotenv/config'

(async function main() {
  async function database() {
    const { Client } = pg

    const client = new Client({
      user: process.env.DATABASE_USER,
      host: process.env.DATABASE_HOST,
      database: process.env.DATABASE_NAME,
      password: process.env.DATABASE_PASSWORD,
      port: Number(process.env.DATABASE_PORT),
    })
    await client.connect()
    return client
  }

  async function queryDatabase(query: string, params: any[] = []) {
    const client = await database()
    try {
      const res = await client.query(query, params)
      return res.rows // Return the rows of the result
    }
    catch (err) {
      console.error('Database query error:', err)
      throw err // Rethrow the error to be handled by the caller
    }
    finally {
      await client.end() // Make sure to close the connection
    }
  }

  function createMinioClient() {
    return new Minio.Client({
      endPoint: process.env.MINIO_HOST!,
      port: Number(process.env.MINIO_PORT),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    })
  }

  function addCompSuffix(url: string) {
    const dotIndex = url.lastIndexOf('.')
    if (dotIndex === -1)
      return url // kein Punkt gefunden
    return `${url.slice(0, dotIndex)}-comp${url.slice(dotIndex)}`
  }

  const query = 'SELECT * FROM photos'
  console.info('Starting to compress existing images...')
  const photos = await queryDatabase(query)

  const minio = createMinioClient()
  const bucketName = process.env.MINIO_BUCKET || 'plantz'

  console.log(bucketName)

  for (let i = 0; i < photos.length; i++) {
    //   const newUrl = addCompSuffix( photos[i].image_url)

    //     // Update in der DB
    //      const updateQuery = `
    //         UPDATE photos
    //         SET image_url = $1
    //         WHERE id = $2
    //     `
    //     await queryDatabase(updateQuery, [newUrl,  photos[i].id])
    //     console.log(`Updated photo ${ photos[i].id}: ${newUrl}`)

    const photoUrl = photos[i].image_url.replace(/(-comp)+(\.[^.]+)$/, '$2')

    const objectStream = await minio.getObject(
      bucketName,
      photoUrl,
    )
    const chunks: Buffer[] = []
    for await (const chunk of objectStream) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    const resizedBuffer = await sharp(buffer)
      .rotate()
      .resize(800)
      .withMetadata() // behält EXIF, wenn nötig
      .jpeg({ quality: 80 })
      .toBuffer()

    const newUrl = photoUrl.replace(/(\.[^./]+)$/, '-comp$1')

    await minio.putObject(
      bucketName,
      newUrl,
      resizedBuffer,
    )
    console.log('Compressed image: ', newUrl)
  }
})()

// Database connection
// Get all images from db
// Store image urls
// Iterate over all images
// Compress image
// Save to bucket
// Save new name to databse
